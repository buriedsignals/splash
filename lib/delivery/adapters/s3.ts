// The S3-compatible publisher — SigV4 in pure `fetch`, no aws-sdk (same discipline as the
// refusal of wrangler at the Cloudflare spike: no CLI, no Node-runtime requirement).
//
// Every behaviour asserted here was MEASURED against a real S3 server (MinIO, real SigV4 signed
// by hand, real XML error bodies) before this file was written — spec §5.1, facts F1-F7, all
// binding. The two that shape the whole file:
//   F3 — a freshly uploaded object answers 403 to an anonymous GET. "Upload succeeded" is NOT
//        "the embed works"; this adapter verifies anonymous serving before returning success,
//        the way cloudflare-pages.ts verifies served bytes rather than trusting a bare 200.
//   F4 — a bucket policy would make the object public, and this adapter must NOT set one:
//        granting public access rewrites the newsroom's OWN infrastructure policy with a scope
//        far wider than the one object being delivered. It refuses with an actionable message
//        instead — a deliberate limit on what this tool does to someone else's infrastructure.
import { readFileSync } from "node:fs";
import type {
  Publisher,
  PublishOutcome,
  PublishRequest,
} from "../../core/publishers";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { isSafeId, unsafeIdMessage } from "../../core/id-safety";
import { renderSnippet } from "../snippet";
import { signS3Request, canonicalUri } from "./s3-sign";
import { contentTypeFor } from "./cloudflare-pages";

// F5: the public URL is NOT constructible from the endpoint — path-style, virtual-host and an
// attached custom domain all produce a different URL, and MinIO's own path-style shape is only
// one of the three. It is configured by the newsroom instead, exactly like the lesson from the
// Cloudflare adapter ("never construct the URL — read it, or here, take it as configured").
const REQUIRED_SETTINGS = [
  "endpoint",
  "region",
  "bucket",
  "publicBaseUrl",
] as const;

// A URL used only to render the snippet ONCE before any I/O — same role as PREFLIGHT_URL in
// cloudflare-pages.ts. The refusals renderSnippet owns (an unfillable placeholder, a responsive
// template that still demands {height}) depend only on the template and the metadata, never on
// the real URL, so they are knowable before a byte moves.
const PREFLIGHT_URL = "https://preflight.invalid/";

function trimSlashes(s: string): string {
  return s.replace(/^\/+/, "").replace(/\/+$/, "");
}

// The one place "prefix + filename" is joined, so the S3 object key written by the PUT and the
// URL segment read back by the anonymous GET can never drift apart — both call this.
function withPrefix(prefix: string | undefined, filename: string): string {
  const p = prefix ? trimSlashes(prefix) : "";
  return p ? `${p}/${filename}` : filename;
}

/**
 * `publicBaseUrl` + optional `prefix` + `key`, tolerating a trailing slash on the base and a
 * leading/trailing slash on the prefix (F5). Takes a settings-shaped object, not the whole
 * PublishRequest, so it is usable both from `publish()` and from a caller building a link to
 * show a journalist before anything is uploaded.
 */
export function publicUrlFor(
  settings: Record<string, string | undefined>,
  key: string,
): string {
  // Only the TRAILING slash is stripped here (never the leading one) — the base is a full URL
  // like "https://embeds.example.org", and stripping leading slashes would eat the "//" after
  // the scheme.
  const base = (settings.publicBaseUrl ?? "").replace(/\/+$/, "");
  return `${base}/${withPrefix(settings.prefix, key)}`;
}

function parseS3ErrorCode(body: string): string {
  // F6: errors come back as XML with a <Code>. The body can also be empty, truncated, or (a
  // proxy in front of the real endpoint) not XML at all — the regex simply fails to match
  // rather than throwing, so a malformed body degrades to "Unknown" instead of crashing the
  // refusal path itself.
  const m = /<Code>([^<]*)<\/Code>/.exec(body);
  return m && m[1].trim() ? m[1].trim() : "Unknown";
}

function snippetFor(req: PublishRequest, url: string): VerbResult<string> {
  return renderSnippet({
    url,
    id: req.id,
    metadata: req.metadata,
    ...(req.settings.snippetTemplate
      ? { template: req.settings.snippetTemplate }
      : {}),
  });
}

async function publish(
  req: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  // Step 1: validate settings — endpoint, region, bucket, publicBaseUrl. Refuse naming the
  // missing one; never guess or default a destination.
  for (const name of REQUIRED_SETTINGS) {
    if (!(req.settings[name] ?? "").trim())
      return fail(
        "invalid-request",
        `s3: settings.${name} is required — the newsroom's S3-compatible destination must be fully configured before Splash uploads anything`,
      );
  }

  // Still settings validation: a malformed endpoint is a config problem, not a runtime one, so
  // it is parsed here — alongside the rest of Step 1 — rather than after the artifact read.
  // Nothing here is irreversible either way, but this is the right place for it.
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(req.settings.endpoint);
  } catch (e) {
    return fail(
      "invalid-request",
      `s3: settings.endpoint "${req.settings.endpoint}" is not a valid URL: ${(e as Error).message}`,
    );
  }

  // Step 2: validate credentials — refuse naming the missing VARIABLE, never a value. Checked
  // one at a time and returned on the FIRST miss, so a message about one variable never
  // mentions the other (the secret's name literally contains "SECRET" — this ordering is what
  // keeps that word out of the access-key-id refusal).
  const accessKeyId = req.credentials.SPLASH_S3_ACCESS_KEY_ID;
  if (!(accessKeyId ?? "").trim())
    return fail(
      "invalid-request",
      "s3: missing credential SPLASH_S3_ACCESS_KEY_ID",
    );
  const secretAccessKey = req.credentials.SPLASH_S3_SECRET_ACCESS_KEY;
  if (!(secretAccessKey ?? "").trim())
    return fail(
      "invalid-request",
      "s3: missing credential SPLASH_S3_SECRET_ACCESS_KEY",
    );

  // Defence in depth, as zip.ts does: req.id is already slug-checked at the verb
  // (lib/core/verbs/publish.ts), but this adapter is the one that turns it into an object key
  // and a path, so it re-asserts the guard itself rather than trusting an upstream promise.
  if (!isSafeId(req.id))
    return fail("invalid-request", unsafeIdMessage(req.id));

  // Step 3: pre-flight the snippet against a sentinel URL, BEFORE any I/O — the L1 lesson
  // (spec §4.6, the Cloudflare I5 fix): a config-only refusal (an unfillable placeholder, a
  // responsive/{height} conflict) must never land AFTER an upload has already happened. This is
  // also what makes settings.snippetTemplate a field this adapter demonstrably consumes,
  // per the L1 C3 regression (a publisher that silently dropped it shipped the wrong snippet).
  const preflight = snippetFor(req, PREFLIGHT_URL);
  if (!preflight.ok) return preflight;

  // Step 4: read the artifact — bounded failure, same shape as zip.ts.
  let artifact: Buffer;
  try {
    artifact = readFileSync(req.artifactPath);
  } catch (e) {
    return fail(
      "engine-failed",
      `s3: cannot read the artifact ${req.artifactPath}: ${(e as Error).message}`,
    );
  }

  const filename = `${req.id}.html`;
  const key = withPrefix(req.settings.prefix, filename);

  // basePath: normally "" (root endpoint). Kept because an S3-compatible service can be
  // reverse-proxied under a path (e.g. "https://host/s3proxy") — dropping it would silently
  // request the wrong resource on such a deployment.
  const basePath = endpointUrl.pathname.replace(/\/+$/, "");
  const path = `${basePath}/${req.settings.bucket}/${key}`;
  const contentType = contentTypeFor(key);

  // Step 5: PUT, signed by signS3Request with `new Date()` supplied HERE — the signer itself
  // stays pure (no clock, no I/O; that is what makes its golden tests deterministic). Wrapped
  // even though the signer is pure and not expected to throw on well-formed strings: invariant
  // I1 says a publisher NEVER throws, and this is the one call in the file that is not this
  // module's own code.
  const now = new Date();
  let signed: ReturnType<typeof signS3Request>;
  try {
    signed = signS3Request({
      method: "PUT",
      path,
      query: "",
      body: artifact,
      headers: { "content-type": contentType },
      host: endpointUrl.host,
      region: req.settings.region,
      accessKeyId,
      secretAccessKey,
      now,
    });
  } catch (e) {
    return fail(
      "engine-failed",
      `s3: could not sign the request: ${(e as Error).message}`,
    );
  }
  // canonicalUri is IMPORTED from s3-sign.ts, not re-implemented here: signS3Request signs the
  // RAW (unencoded) `path` internally via that same function, so the actual fetch() URL below
  // must be percent-encoded the identical way or the signature this module computed would not
  // match what a real server recomputes from the bytes on the wire.
  const requestUrl = `${endpointUrl.protocol}//${endpointUrl.host}${canonicalUri(path)}`;

  let putStatus: number;
  try {
    const res = await fetch(requestUrl, {
      method: "PUT",
      headers: signed.headers,
      body: artifact,
    });
    putStatus = res.status;
    // Step 6: on non-2xx, parse the XML <Code> (F6) and refuse with it — otherwise the
    // newsroom cannot tell a bad key from a clock skew from a permissions problem.
    if (!res.ok) {
      const body = await res.text();
      return fail(
        "engine-failed",
        `s3: PUT ${key} failed (HTTP ${putStatus}, ${parseS3ErrorCode(body)})`,
      );
    }
  } catch (e) {
    return fail(
      "engine-failed",
      `s3: PUT ${key} to ${req.settings.endpoint} failed: ${(e as Error).message}`,
    );
  }

  // Step 7: verify anonymous serving (F3) — "upload succeeded" is not "the embed works". An
  // unauthenticated GET of the public URL must return 2xx AND the served bytes must match the
  // artifact, exactly as verifyServed does for the Cloudflare adapter.
  //
  // Deliberately a SINGLE attempt, no retry/poll window: unlike Cloudflare's cold-start (a
  // MEASURED ~100s DNS-propagation window, spec 2026-07-19), no fact was measured about a fresh
  // S3 upload being transiently invisible before this 403 check runs (spec §5.2 — F7 only
  // measured that an OVERWRITE is immediately consistent). Do not "fix" a future flake here by
  // adding a retry on 403: that would conflate "permanently unauthorized" (F4 — the real,
  // common case, since Splash never sets a bucket policy) with "not yet visible" without any
  // measurement backing the second case, and would delay or mask exactly the F4 refusal this
  // adapter exists to surface. If Task 4's live proof shows real propagation delay, add a
  // bounded window sized from THAT measurement — not a guessed number.
  const url = publicUrlFor(req.settings, filename);
  try {
    const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
    if (res.status === 403) {
      // F4: this is the refusal, not a policy change. Granting public read is the newsroom's
      // infrastructure decision to make — Splash names the object and stops.
      return fail(
        "engine-failed",
        `s3: uploaded ${key} but it is not publicly readable (anonymous GET of ${url} returned 403) — ` +
          `Splash will not change the bucket's access policy on the newsroom's behalf. Grant public ` +
          `read to this object (or its prefix) yourself — for example a bucket policy scoped to "${key}" — then retry.`,
      );
    }
    if (!res.ok) {
      return fail(
        "engine-failed",
        `s3: uploaded ${key} but ${url} did not serve it back (HTTP ${res.status})`,
      );
    }
    const served = Buffer.from(await res.arrayBuffer());
    if (!served.equals(artifact)) {
      return fail(
        "engine-failed",
        `s3: uploaded ${key} but ${url} served different bytes than the artifact — check for a caching layer between the bucket and publicBaseUrl`,
      );
    }
  } catch (e) {
    return fail(
      "engine-failed",
      `s3: uploaded ${key} but verifying ${url} failed: ${(e as Error).message}`,
    );
  }

  // Step 8: render the REAL snippet. It cannot refuse where the pre-flight above passed — same
  // template, same metadata, only the substituted URL differs — but the result is still
  // checked rather than asserted away, the same discipline embedSnippet's second call keeps in
  // the Cloudflare adapter.
  const snippet = snippetFor(req, url);
  if (!snippet.ok) return snippet;

  return ok({
    publisherId: "embed-s3",
    kind: "hosted",
    url,
    snippet: snippet.value,
    publishedAt: now.toISOString(),
  });
}

export const s3Publisher: Publisher = {
  id: "embed-s3",
  kind: "hosted",
  implemented: true,
  publish,
};
