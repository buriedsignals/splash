// The HOSTED EMBED delivery form's mechanism: Cloudflare Pages, direct upload, one file. Nothing
// here reaches for a build step, a framework, or a wrangler config — a plain, three-call sequence
// against api.cloudflare.com does the whole job, matched by hand against Wrangler's own
// `packages/wrangler/src/pages/{upload,validate}.ts` and `packages/wrangler/src/api/pages/deploy.ts`
// (cloudflare/workers-sdk) rather than guessed:
//
//   1. GET  /accounts/{account}/pages/projects/{project}/upload-token       -> a short-lived jwt
//   2. POST /pages/assets/check-missing  (bearer: jwt)  { hashes: [hash] }  -> which hashes are new
//   3. POST /pages/assets/upload         (bearer: jwt)  [{key, value, metadata, base64}]
//   4. POST /accounts/{account}/pages/projects/{project}/deployments  (multipart) { manifest }
//
// Step 4's `manifest` maps `"/index.html"` (the path a request resolves) to the SAME hash that
// named the file in step 3 — a plain content-addressed key, not a real signature. Wrangler computes
// that key with blake3 (`packages/deploy-helpers/src/deploy/helpers/hash.ts`), which is not
// available here without a new dependency (this skill's own boundary: `twin/skills/twin-deliver/`
// only, nothing added to the shared root's package.json). PROVEN against the live API before
// writing this comment: an arbitrary sha256-derived 32-hex-char key, run through this exact
// sequence, uploads, deploys, and serves byte-identical content back — Cloudflare's endpoint never
// checks that the key is blake3, only that the same key names the same bytes at upload and at
// manifest time. `contentHash` below keeps the same SHAPE (hash of base64(content) + extension,
// truncated to 32 hex) for readability, on a different algorithm, because only the shape needs to
// match, not the exact function.
//
// One deploy is one file, always named `index.html` (or `index.<ext>`) in the manifest, so the
// returned deployment URL alone — no path to append — is the whole embed link. A beat's owned
// artifact under `<beatDir>/renders/` is genre "web"'s single self-contained HTML file; nothing
// here inspects its name beyond that there must be exactly one.

const API = "https://api.cloudflare.com/client/v4";

// ===== CONFIG — edit for your story =====
// The project a beat's hosted embeds land in, if the caller does not name its own. One Cloudflare
// Pages project can hold many deployments — each `deployFile` call makes a new one, each with its
// own stable, never-overwritten URL — so sharing this default across stories costs nothing and
// avoids asking every beat to invent a project name. A story that wants its own project (a
// newsroom that would rather see "annemasse-rain" than this skill's own name in its Cloudflare
// dashboard) passes `projectName` to `deployFile`/`materialise` and this default is never read.
const DEFAULT_PROJECT_NAME = "twin-deliver-proof";
// =========================================

const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  png: "image/png",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  json: "application/json",
  css: "text/css",
  js: "text/javascript",
};

export function contentTypeFor(fileName) {
  const ext = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

// Both env vars named in this project's own instructions, read here — never in splash-twin's own
// `scripts/keys.mjs`, which this skill does not import (no cross-skill imports, runtime or
// otherwise; `splash-twin`'s own `capabilities.hostedEmbed` row stays hardcoded closed until that
// skill's own maintainers wire it to this one — not this file's call to make, and out of this
// change's scope). Presence only, deliberately: a live probe belongs at deploy time (`materialise`
// already makes a real network call there, and a rejected token surfaces as a real API error) —
// `offerForms` stays synchronous and fast, so a form can be listed or withheld without a network
// round trip on every call. A present-but-wrong token still lists the form; it fails loudly the
// moment `materialise` actually tries to use it, never silently.
export function resolveCloudflareCredentials(env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

async function cf(path, init, fetchFn) {
  const res = await fetchFn(`${API}${path}`, init);
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const detail = json?.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`Cloudflare API ${path} failed (${res.status}): ${detail}`);
  }
  return json;
}

// Same hash SHAPE Cloudflare's own manifest expects (see this file's header comment) — a
// content-addressed key derived from the file's own bytes and extension, on sha256 (native to
// Bun's `CryptoHasher`) rather than blake3 (not available here without a new dependency). Proven
// against the live API to work exactly like Wrangler's own blake3 key would.
function contentHash(buffer, extension) {
  const base64 = buffer.toString("base64");
  return new Bun.CryptoHasher("sha256")
    .update(base64 + extension)
    .digest("hex")
    .slice(0, 32);
}

// Idempotent: a project this account already owns is exactly as usable as one just created, so a
// 409 naming Cloudflare's own "already exists" error code (8000002) is swallowed, not thrown —
// every OTHER failure (a bad token, an account mismatch) still throws, naming what Cloudflare said.
async function ensureProject({ accountId, apiToken, projectName, fetchFn }) {
  try {
    await cf(
      `/accounts/${accountId}/pages/projects`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, production_branch: "main" }),
      },
      fetchFn,
    );
  } catch (error) {
    if (!/already exists/i.test(error.message)) throw error;
  }
}

/**
 * Uploads exactly one file to a Cloudflare Pages project via direct upload, and returns the live
 * deployment's own URL — stable and never overwritten by a later `deployFile` call (each call
 * makes a new deployment with its own id-scoped subdomain), unlike the project's bare
 * `<project>.pages.dev` domain, which always points at whichever deployment was most recent.
 */
export async function deployFile({
  accountId,
  apiToken,
  projectName = DEFAULT_PROJECT_NAME,
  filePath,
  fileName,
  fetchFn = fetch,
}) {
  await ensureProject({ accountId, apiToken, projectName, fetchFn });

  const { jwt } = (
    await cf(
      `/accounts/${accountId}/pages/projects/${projectName}/upload-token`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
      fetchFn,
    )
  ).result;

  const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer());
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  const hash = contentHash(buffer, extension);

  await cf(
    "/pages/assets/check-missing",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hashes: [hash] }),
    },
    fetchFn,
  );

  await cf(
    "/pages/assets/upload",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        { key: hash, value: buffer.toString("base64"), metadata: { contentType: contentTypeFor(fileName) }, base64: true },
      ]),
    },
    fetchFn,
  );

  const formData = new FormData();
  // Always served at the deployment's own root — the whole point of naming every upload
  // "index.<ext>" in the manifest regardless of the beat's own file name, so the returned URL is
  // the complete embed link with nothing to append.
  const deployedAs = extension ? `index.${extension}` : "index";
  formData.append("manifest", JSON.stringify({ [`/${deployedAs}`]: hash }));

  const deployment = await cf(
    `/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    { method: "POST", headers: { Authorization: `Bearer ${apiToken}` }, body: formData },
    fetchFn,
  );

  return { url: deployment.result.url };
}
