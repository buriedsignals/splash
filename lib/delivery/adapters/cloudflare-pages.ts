// EXPORT (embed form): deploy a produced artifact directory to the journalist's own
// Cloudflare Pages account using pure fetch — no wrangler CLI, no Node.js runtime.
//
// Three of the endpoints below (upload-token, check-missing, upload) are NOT publicly
// documented; they were reconstructed from wrangler's bundled source and every behaviour
// asserted here was measured against the live API on 2026-07-19. Design + measurements:
// docs/superpowers/specs/2026-07-19-cloudflare-pages-embed-adapter-design.md
//
// Because that surface can change without notice, delivery is NEVER concluded from an exit
// code or a bare HTTP 200 — the caller verifies the artifact's own bytes are served.
import { blake3 } from "@noble/hashes/blake3.js";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { extname, join, relative } from "node:path";
import type {
  Publisher,
  PublishOutcome,
  PublishRequest,
} from "../../core/publishers";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { renderSnippet } from "../snippet";

const API = "https://api.cloudflare.com/client/v4";

// A brand-new project needs ~100s of edge/DNS provisioning before ANY of its URLs answer
// (measured); later deploys on an existing project land in seconds. The window must cover
// the cold case, otherwise a perfectly valid first embed reads as a failure.
export const COLD_START_WINDOW_MS = 200_000;
const POLL_INTERVAL_MS = 2_000;

// Cloudflare truncates a branch alias label to 28 chars and, on collision, appends its OWN
// non-deterministic suffix. Staying inside the budget keeps the alias predictable and lets
// our deterministic digest — not Cloudflare's dice — separate two similar visuals.
const ALIAS_LABEL_BUDGET = 28;
const SLUG_DIGEST_CHARS = 3;
const SLUG_READABLE_MAX = ALIAS_LABEL_BUDGET - SLUG_DIGEST_CHARS - 1;

// A generic project name would put every newsroom on the same URL. The project name is the
// newsroom's identity in `<slug>.<project>.pages.dev`, so it has to identify a newsroom.
const GENERIC_PROJECT_NAMES = new Set([
  "splash",
  "embed",
  "embeds",
  "splash-embed",
  "splash-embeds",
  "splash-embed-demo",
  "demo",
  "test",
  "tests",
  "preview",
  "project",
  "newsroom",
  "viz",
  "dataviz",
]);

const CONTENT_TYPES: Record<string, string> = {
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  woff2: "font/woff2",
  woff: "font/woff",
  csv: "text/csv",
};

export type EmbedConfig = { token: string; accountId: string; project: string };

/**
 * Per-visual branch slug. Normalised HERE rather than left to Cloudflare, which rewrites the
 * label lossily: `_`→`-`, truncation at 28, and — measured — it DELETES an accented character
 * instead of transliterating it (`Élections` → `lections`). A French newsroom would get
 * mangled URLs. Same id always yields the same slug, so redeploys keep their URL.
 */
export function embedSlug(id: string): string {
  const ascii = id.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const readable = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_READABLE_MAX)
    .replace(/-+$/g, "");
  // Distinguishes two visuals whose readable parts collide after truncation — deterministically,
  // where Cloudflare's own suffix would be unpredictable and therefore unusable as a URL.
  const digest = BigInt(
    `0x${createHash("sha256").update(id).digest("hex").slice(0, 12)}`,
  )
    .toString(36)
    .slice(0, SLUG_DIGEST_CHARS);
  return readable ? `${readable}-${digest}` : `embed-${digest}`;
}

export function assertEmbedProject(name: string): string {
  const project = (name ?? "").trim();
  if (!project) {
    throw new Error(
      'embed delivery needs SPLASH_EMBED_PROJECT — the newsroom\'s own Cloudflare Pages project name (e.g. "heidi-news-splash"). Add it to /splash/.env',
    );
  }
  if (!/^[a-z0-9][a-z0-9-]{2,54}$/.test(project)) {
    throw new Error(
      `invalid SPLASH_EMBED_PROJECT "${project}" — use lowercase letters, digits and hyphens (3-55 chars), starting with a letter or digit`,
    );
  }
  if (GENERIC_PROJECT_NAMES.has(project)) {
    throw new Error(
      `SPLASH_EMBED_PROJECT "${project}" is too generic — it becomes the public URL <visual>.${project}.pages.dev and must identify THIS newsroom (e.g. "heidi-news-splash")`,
    );
  }
  return project;
}

// Whether an embed deploy is even POSSIBLE here. The caller refuses up front rather than
// half-deploying or handing back a placeholder URL that fakes "delivered".
export function embedTokenConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (
    (env.CLOUDFLARE_API_TOKEN ?? "").trim() !== "" &&
    (env.CLOUDFLARE_ACCOUNT_ID ?? "").trim() !== "" &&
    (env.SPLASH_EMBED_PROJECT ?? "").trim() !== ""
  );
}

export function resolveEmbedConfig(
  env: Record<string, string | undefined> = process.env,
): EmbedConfig {
  const token = (env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const accountId = (env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  if (!token) {
    throw new Error(
      'embed delivery needs CLOUDFLARE_API_TOKEN — create an account API token with the "Cloudflare Pages: Edit" permission at https://dash.cloudflare.com (Manage Account -> API Tokens), then add it to /splash/.env, or choose the standalone HTML form instead',
    );
  }
  if (!accountId) {
    throw new Error(
      "embed delivery needs CLOUDFLARE_ACCOUNT_ID — copy it from the Workers & Pages page of the Cloudflare dashboard, then add it to /splash/.env",
    );
  }
  return {
    token,
    accountId,
    project: assertEmbedProject(env.SPLASH_EMBED_PROJECT ?? ""),
  };
}

export function contentTypeFor(filepath: string): string {
  return (
    CONTENT_TYPES[extname(filepath).slice(1).toLowerCase()] ??
    "application/octet-stream"
  );
}

// wrangler hashes the BASE64 TEXT plus the bare extension — not the raw bytes. Getting this
// wrong yields a manifest pointing at blobs that were never stored, i.e. a 404 for a
// "successful" deploy.
export function hashAsset(contents: Buffer, filepath: string): string {
  const payload = contents.toString("base64") + extname(filepath).slice(1);
  return Buffer.from(blake3(new TextEncoder().encode(payload)))
    .toString("hex")
    .slice(0, 32);
}

async function cf(
  path: string,
  init: RequestInit,
  bearer: string,
): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${bearer}`, ...(init.headers ?? {}) },
  });
  const body = (await res.json()) as {
    success?: boolean;
    result?: unknown;
    errors?: unknown;
  };
  if (!body.success)
    throw new Error(
      `cloudflare ${path} failed: ${JSON.stringify(body.errors)}`,
    );
  return body.result;
}

function walk(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const full = join(root, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Never deployed to, so every visual is a NON-production branch and therefore always gets a
// `<slug>.<project>.pages.dev` alias. The production branch is served at the project root
// instead and has no alias at all — a visual pinned there would be unreachable by slug.
export const RESERVED_PRODUCTION_BRANCH = "splash-production-unused";

export async function ensureProject(cfg: EmbedConfig): Promise<void> {
  try {
    await cf(
      `/accounts/${cfg.accountId}/pages/projects/${cfg.project}`,
      {},
      cfg.token,
    );
    return;
  } catch {
    // Absent (or unreadable) — fall through to create; a real auth/permission problem
    // surfaces from the create call with its own message.
  }
  await cf(
    `/accounts/${cfg.accountId}/pages/projects`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cfg.project,
        production_branch: RESERVED_PRODUCTION_BRANCH,
      }),
    },
    cfg.token,
  );
}

export type DeployResult = {
  deploymentId: string;
  deploymentUrl: string;
  fileCount: number;
};

export async function deployDirectory(
  dir: string,
  branch: string,
  cfg: EmbedConfig,
): Promise<DeployResult> {
  const files = walk(dir).map((filepath) => {
    const contents = readFileSync(filepath);
    return {
      sitePath: `/${relative(dir, filepath).split(/[\\/]/).join("/")}`,
      key: hashAsset(contents, filepath),
      value: contents.toString("base64"),
      contentType: contentTypeFor(filepath),
    };
  });
  if (files.length === 0)
    throw new Error(`refusing to deploy an empty directory: ${dir}`);

  const { jwt } = await cf(
    `/accounts/${cfg.accountId}/pages/projects/${cfg.project}/upload-token`,
    {},
    cfg.token,
  );

  const missing: string[] = await cf(
    "/pages/assets/check-missing",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashes: files.map((f) => f.key) }),
    },
    jwt,
  );

  // Measured: Cloudflare does NOT dedupe — identical bytes come back as missing every time.
  // The filter is kept because the API defines it, not as an optimisation to rely on.
  const payload = files
    .filter((f) => missing.includes(f.key))
    .map((f) => ({
      key: f.key,
      value: f.value,
      metadata: { contentType: f.contentType },
      base64: true,
    }));
  if (payload.length > 0) {
    await cf(
      "/pages/assets/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      jwt,
    );
  }

  const form = new FormData();
  form.append(
    "manifest",
    JSON.stringify(Object.fromEntries(files.map((f) => [f.sitePath, f.key]))),
  );
  form.append("branch", branch);
  form.append("commit_dirty", "true");

  const deployment = await cf(
    `/accounts/${cfg.accountId}/pages/projects/${cfg.project}/deployments`,
    { method: "POST", body: form },
    cfg.token,
  );
  return {
    deploymentId: deployment.id,
    deploymentUrl: deployment.url,
    fileCount: files.length,
  };
}

/**
 * The alias URL is READ, never constructed. Constructing it was measured wrong in four ways:
 * underscores are rewritten, accents dropped, long labels truncated, collisions suffixed.
 * `aliases` is also null immediately after the deploy, so it is polled.
 *
 * NOTE: the deployments list is fetched WITHOUT `per_page` — passing `per_page=100` returns
 * an empty list with `success: true` (measured), which would silently resolve no alias.
 */
export async function resolveAliasUrl(
  deploymentId: string,
  cfg: EmbedConfig,
  timeoutMs = COLD_START_WINDOW_MS,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list: any[] = await cf(
      `/accounts/${cfg.accountId}/pages/projects/${cfg.project}/deployments`,
      {},
      cfg.token,
    );
    const alias = list.find((d) => d.id === deploymentId)?.aliases?.[0];
    if (alias) return alias;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(
    `cloudflare never published an alias URL for deployment ${deploymentId}`,
  );
}

/**
 * The delivery proof. On an undocumented protocol the served bytes are the only trustworthy
 * signal — this is what caught wrangler exiting 0 while deploying nothing. Network errors are
 * retried too: a new project's subdomain is unresolvable for ~100s and DNS failures surface
 * as THROWN fetch errors, not status codes.
 */
export async function verifyServed(
  url: string,
  expected: (body: string) => boolean,
  timeoutMs = COLD_START_WINDOW_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: string | number = "no response";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "cache-control": "no-cache" },
      });
      last = res.status;
      if (res.ok && expected(await res.text())) return;
    } catch (err) {
      last = (err as { code?: string }).code ?? String(err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(
    `embed deployed but ${url} never served the expected artifact (last: ${last})`,
  );
}

// Cloudflare serves a directory, so a single self-contained artifact is staged as index.html.
// Accepts a directory unchanged, for the day an artifact ships with sibling assets.
export function stageArtifact(pathArg: string, stageDir: string): void {
  if (statSync(pathArg).isDirectory()) {
    cpSync(pathArg, stageDir, { recursive: true });
    return;
  }
  mkdirSync(stageDir, { recursive: true });
  cpSync(pathArg, join(stageDir, "index.html"));
}

// The delivery proof. The upload endpoints are undocumented, so a 200 alone is not evidence
// the RIGHT bytes landed — the served body must carry a distinctive slice of the artifact.
export function servedMatcher(sourceHtml: string): (body: string) => boolean {
  const marker = sourceHtml.replace(/\s+/g, " ").trim().slice(0, 120);
  return (body: string) =>
    body.includes(marker) || body.length === sourceHtml.length;
}

// The Publisher face of an adapter that already existed and was MEASURED against the live API
// (docs/superpowers/specs/2026-07-19-cloudflare-pages-embed-adapter-design.md). Nothing about
// the protocol changes here — the wrapper only turns thrown errors into typed refusals (I1)
// and reads its credentials from the request instead of the environment (I5).
async function publishToPages(
  req: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  let cfg: EmbedConfig;
  try {
    cfg = resolveEmbedConfig(req.credentials);
  } catch (e) {
    return fail("engine-failed", (e as Error).message);
  }

  const slug = embedSlug(req.id);
  // A random temp dir, never derived from req.id — the branch slug above is what carries the
  // (already-sanitized) id into the protocol, so there is no path built from req.id here for
  // id-safety to guard.
  let tmpBase: string | undefined;
  let stageDir: string;
  try {
    tmpBase = mkdtempSync(join(tmpdir(), "splash-embed-"));
    stageDir = join(tmpBase, "site");
    stageArtifact(req.artifactPath, stageDir);
  } catch (e) {
    // A half-created temp dir from a failed stage must not linger either.
    if (tmpBase) {
      try {
        rmSync(tmpBase, { recursive: true, force: true });
      } catch {
        // Best-effort: cleanup failure must never mask the real refusal below.
      }
    }
    return fail(
      "engine-failed",
      `cloudflare: cannot stage ${req.artifactPath} for upload: ${(e as Error).message}`,
    );
  }

  try {
    await ensureProject(cfg);
    const { deploymentId } = await deployDirectory(stageDir, slug, cfg);
    const url = await resolveAliasUrl(deploymentId, cfg);
    // The delivery proof: a 200 is not evidence the right bytes landed. Without this check no
    // outcome is recorded at all.
    await verifyServed(
      url,
      servedMatcher(readFileSync(join(stageDir, "index.html"), "utf8")),
    );
    const snippet = renderSnippet({
      url,
      id: req.id,
      metadata: req.metadata,
      ...(req.settings.snippetTemplate
        ? { template: req.settings.snippetTemplate }
        : {}),
    });
    if (!snippet.ok) return snippet;
    return ok({
      publisherId: "embed-cloudflare",
      kind: "hosted",
      url,
      snippet: snippet.value,
      publishedAt: new Date().toISOString(),
    });
  } catch (e) {
    return fail(
      "engine-failed",
      `cloudflare pages deploy failed: ${(e as Error).message}`,
    );
  } finally {
    // The staged copy of the artifact (potentially a full video/interactive bundle) has no
    // other owner once the deploy has been attempted — leaving it would leak one directory per
    // publish call for the life of the process. Best-effort: never let cleanup failure override
    // the real publish outcome returned above.
    if (tmpBase) {
      try {
        rmSync(tmpBase, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
}

export const cloudflarePublisher: Publisher = {
  id: "embed-cloudflare",
  kind: "hosted",
  implemented: true,
  publish: publishToPages,
};
