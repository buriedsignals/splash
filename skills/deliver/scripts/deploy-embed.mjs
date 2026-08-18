// The HOSTED EMBED delivery form's mechanism: Cloudflare Pages, direct upload, one file. Nothing
// here reaches for a build step, a framework, or a wrangler config — a plain direct-upload sequence
// against api.cloudflare.com does the whole job, matched by hand against Wrangler's own
// `packages/wrangler/src/pages/{upload,validate}.ts` and `packages/wrangler/src/api/pages/deploy.ts`
// (cloudflare/workers-sdk) rather than guessed:
//
//   1. GET  /accounts/{account}/pages/projects/{project}/upload-token       -> a short-lived jwt
//   2. POST /pages/assets/check-missing  (bearer: jwt)  { hashes: [hash] }  -> which hashes are new
//   3. POST /pages/assets/upload         (bearer: jwt)  [{key, value, metadata, base64}]
//   4. POST /accounts/{account}/pages/projects/{project}/deployments  (multipart) { manifest }
//
// Step 4 also carries a stable `commit_hash`. If its response is lost, a later call lists the
// project's deployments and reconciles against that hash instead of creating a duplicate.
// Its `manifest` maps `"/index.html"` (the path a request resolves) to the SAME hash that
// named the file in step 3 — a plain content-addressed key, not a real signature. Wrangler computes
// that key with blake3 (`packages/deploy-helpers/src/deploy/helpers/hash.ts`), which is not
// available here without a new dependency (this skill's own boundary: `twin/skills/deliver/`
// only, nothing added to the shared root's package.json). The API contract uses the key as the
// content address shared by upload and manifest. `contentHash` below keeps Wrangler's key SHAPE
// (hash of base64(content) + extension,
// truncated to 32 hex) for readability, on a different algorithm, because only the shape needs to
// match, not the exact function.
//
// One deploy is one file, always named `index.html` (or `index.<ext>`) in the manifest, so the
// returned deployment URL alone — no path to append — is the whole embed link. A beat's owned
// artifact under `<beatDir>/renders/` is format "web"'s single self-contained HTML file; nothing
// here inspects its name beyond that there must be exactly one.

import {
  deploymentKeyFor,
  readHostedDeployment,
  writeHostedDeployment,
} from "./hosted-deployment.mjs";
import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "https://api.cloudflare.com/client/v4";
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

const MAX_PROJECT_NAME = 58;
const PROJECT_STEM_LENGTH = 28;
const PROJECT_DIGEST_LENGTH = 20;
export const DEPLOYMENT_RECEIPT_SCHEMA_VERSION = 2;

export const SPLASH_INSTANCE_FILE = ".splash-instance-id";
const INSTANCE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readInstanceId(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Splash instance identity must be a regular file: ${path}`);
  }
  const value = (await readFile(path, "utf8")).trim();
  if (!INSTANCE_ID.test(value)) throw new Error(`Splash instance identity is invalid at ${path}`);
  return value;
}

async function optionalStat(path) {
  try { return await lstat(path); } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function receiptText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function receiptSegment(value, label) {
  receiptText(value, label);
  if (value === "." || value === ".." || value.includes("/") || value.includes("\\") || value.includes("\0")) {
    throw new Error(`${label} must be one path segment`);
  }
  return value;
}

/** Validate the versioned public deployment receipt; v1 is read-only migration input. */
export function validateDeploymentReceipt(receipt, { storyId, outputId } = {}) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new Error("deployment receipt must be a JSON object");
  }
  if (receipt.provider !== "cloudflare-pages") {
    throw new Error("deployment receipt has an unsupported provider");
  }
  if (![1, DEPLOYMENT_RECEIPT_SCHEMA_VERSION].includes(receipt.schemaVersion)) {
    throw new Error(`deployment receipt has unsupported schemaVersion ${JSON.stringify(receipt.schemaVersion)}`);
  }
  if (storyId !== undefined && receipt.storyId !== storyId) {
    throw new Error("deployment receipt belongs to a different story");
  }
  if (outputId !== undefined && receipt.outputId !== outputId) {
    throw new Error("deployment receipt belongs to a different output");
  }

  if (receipt.schemaVersion === 1) {
    if (receipt.splashInstanceId !== undefined) {
      if (!INSTANCE_ID.test(receipt.splashInstanceId)) {
        throw new Error("deployment receipt has an invalid Splash instance ID");
      }
    } else if (!(receipt.legacySharedProject === true && receipt.stableAcrossRevisions === false)) {
      throw new Error("legacy deployment receipt lacks an explicit migration marker");
    }
    return receipt;
  }

  receiptSegment(receipt.storyId, "deployment storyId");
  receiptSegment(receipt.outputId, "deployment outputId");
  receiptSegment(receipt.projectName, "Cloudflare Pages project name");
  receiptText(receipt.deploymentId, "Cloudflare deployment ID");
  receiptText(receipt.reviewId, "deployment review ID");
  if (!/^sha256:[0-9a-f]{64}$/.test(receipt.draftDigest)) {
    throw new Error("deployment receipt has an invalid draft digest");
  }
  for (const field of ["editableSource", "renderedArtifact", "currentDelivery", "publishedAt"]) {
    receiptText(receipt[field], `deployment ${field}`);
  }
  if (!INSTANCE_ID.test(receipt.splashInstanceId ?? "")) {
    throw new Error("deployment receipt has an invalid Splash instance ID");
  }
  if (receipt.stableAcrossRevisions !== true) {
    throw new Error("current deployment receipt must promise a stable revision URL");
  }
  const stable = stableProjectUrl(receipt.projectName);
  if (validatedDeploymentUrl(receipt.publicUrl, receipt.projectName, "deployment public URL") !== stable) {
    throw new Error("deployment receipt public URL is not the stable project URL");
  }
  validatedDeploymentUrl(
    receipt.immutableDeploymentUrl,
    receipt.projectName,
    "deployment immutable URL",
  );
  return receipt;
}

export async function readDeploymentReceipt(path, expected = {}) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`deployment receipt must be a regular file: ${path}`);
  }
  let receipt;
  try {
    receipt = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`deployment receipt is not valid JSON: ${path}`, { cause: error });
    }
    throw error;
  }
  return validateDeploymentReceipt(receipt, expected);
}

// Recover the ignored installation namespace from versioned deployment receipts after a copied or
// restored workspace. Explicit legacy receipts are the one allowed no-namespace case: their next
// approved deployment intentionally migrates to a new stable project once.
async function deploymentInstanceIds(storiesRoot) {
  const root = await lstat(storiesRoot);
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`stories root must be a real directory: ${storiesRoot}`);
  }
  const ids = new Set();
  for (const story of await readdir(storiesRoot, { withFileTypes: true })) {
    if (!story.isDirectory()) continue;
    const exportRoot = join(storiesRoot, story.name, "export");
    const exportStat = await optionalStat(exportRoot);
    if (!exportStat) continue;
    if (exportStat.isSymbolicLink() || !exportStat.isDirectory()) {
      throw new Error(`story export root must be a real directory: ${exportRoot}`);
    }
    for (const output of await readdir(exportRoot, { withFileTypes: true })) {
      if (!output.isDirectory()) continue;
      const path = join(exportRoot, output.name, "DEPLOYMENT.json");
      const stat = await optionalStat(path);
      if (!stat) continue;
      if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new Error(`deployment receipt must be a regular file: ${path}`);
      }
      const receipt = await readDeploymentReceipt(path, {
        storyId: story.name,
        outputId: output.name,
      });
      if (receipt.splashInstanceId !== undefined) {
        if (!INSTANCE_ID.test(receipt.splashInstanceId)) {
          throw new Error(`deployment receipt has an invalid Splash instance ID: ${path}`);
        }
        ids.add(receipt.splashInstanceId);
      } else if (!(receipt.legacySharedProject === true && receipt.stableAcrossRevisions === false)) {
        throw new Error(`deployment history cannot recover its Splash instance ID: ${path}`);
      }
    }
  }
  if (ids.size > 1) throw new Error("deployment history contains conflicting Splash instance IDs");
  return [...ids][0] ?? null;
}

/** Persist one deployment namespace per Splash root so separate installs cannot share a project. */
export async function resolveSplashInstanceId(storiesRoot) {
  const path = join(storiesRoot, SPLASH_INSTANCE_FILE);
  try {
    const recorded = await readInstanceId(path);
    const recovered = await deploymentInstanceIds(storiesRoot);
    if (recovered && recovered !== recorded) {
      throw new Error("Splash instance identity conflicts with existing deployment history");
    }
    return recorded;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const id = (await deploymentInstanceIds(storiesRoot)) ?? randomUUID();
  try {
    await writeFile(path, `${id}\n`, { flag: "wx", mode: 0o600 });
    return id;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    return readInstanceId(path);
  }
}

// One Pages project per installation and output. The stable project URL then becomes the embed contract: publishing
// a reviewed revision updates that URL in place, while Cloudflare keeps the immutable deployment
// URL in the receipt for rollback/audit. The short digest prevents two long slugs with the same
// truncated prefix from colliding. This is derived from story/output identity and is never a
// journalist-facing provider question.
export function cloudflareProjectName(instanceId, storyId, outputId) {
  const identity = `${instanceId ?? ""}\0${storyId ?? ""}\0${outputId ?? ""}`;
  if (!INSTANCE_ID.test(instanceId ?? "") || !storyId || !outputId) {
    throw new Error("a Cloudflare project name needs a persisted Splash instance ID, storyId, and outputId");
  }
  const stem = `${storyId}-${outputId}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PROJECT_STEM_LENGTH)
    .replace(/-+$/g, "");
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, PROJECT_DIGEST_LENGTH);
  const project = `splash-${stem || "visual"}-${digest}`;
  if (project.length > MAX_PROJECT_NAME || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(project)) {
    throw new Error(`could not derive a valid Cloudflare Pages project name from ${storyId}/${outputId}`);
  }
  return project;
}

export function cloudflareScrollerProjectName(accountId) {
  if (typeof accountId !== "string" || !/^[A-Za-z0-9_-]+$/.test(accountId)) {
    throw new Error("a Splash scroller project needs one Cloudflare account ID path segment");
  }
  const identity = /^[0-9a-f]{32}$/i.test(accountId) ? accountId.toLowerCase() : accountId;
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 20);
  return `splash-scroller-${digest}`;
}

export function cloudflareScrollerUrl(accountId) {
  return stableProjectUrl(cloudflareScrollerProjectName(accountId));
}

function stableProjectUrl(projectName) {
  return `https://${projectName}.pages.dev`;
}

function providerPathSegment(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} must be one Cloudflare provider path segment`);
  }
  return encodeURIComponent(value);
}

function validatedDeploymentUrl(value, projectName, label) {
  let url;
  try { url = new URL(value); } catch {
    throw new Error(`${label} is not a valid Cloudflare Pages URL`);
  }
  const stableHost = `${projectName}.pages.dev`;
  if (
    url.protocol !== "https:" || url.username || url.password || url.port ||
    (url.hostname !== stableHost && !url.hostname.endsWith(`.${stableHost}`))
  ) {
    throw new Error(`${label} does not belong to Cloudflare Pages project ${projectName}`);
  }
  return url.toString().replace(/\/$/, "");
}

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

// Both env vars named in this project's own instructions, read here without a cross-skill runtime
// import. Splash preflight probes the same capability independently; this delivery check remains
// a local presence decision. A live provider call belongs at deploy time (`materialise`
// already makes a real network call there, and a rejected token surfaces as a real API error) —
// `offerForms` stays synchronous and fast, so a form can be enabled or disabled without a network
// round trip on every call. A present-but-wrong token still enables the form; it fails loudly the
// moment `materialise` actually tries to use it, never silently.
export function resolveCloudflareCredentials(env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

class CloudflareRequestError extends Error {
  constructor(message, { ambiguous = false, cause } = {}) {
    super(message, { cause });
    this.name = "CloudflareRequestError";
    this.ambiguous = ambiguous;
  }
}

async function cf(
  path,
  init,
  fetchFn,
  { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ambiguousOnFailure = false } = {},
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Cloudflare request timeout must be greater than zero");
  }
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new CloudflareRequestError(`Cloudflare API ${path} timed out after ${timeoutMs}ms`, {
          ambiguous: ambiguousOnFailure,
        }),
      );
    }, timeoutMs);
  });

  let res;
  let json;
  try {
    try {
      res = await Promise.race([
        Promise.resolve().then(() =>
          fetchFn(`${API}${path}`, { ...init, signal: controller.signal }),
        ),
        timeout,
      ]);
    } catch (error) {
      if (error instanceof CloudflareRequestError) throw error;
      throw new CloudflareRequestError(`Cloudflare API ${path} request failed: ${error.message}`, {
        ambiguous: ambiguousOnFailure,
        cause: error,
      });
    }
    try {
      json = await Promise.race([res.json(), timeout]);
    } catch (error) {
      if (error instanceof CloudflareRequestError) throw error;
      throw new CloudflareRequestError(`Cloudflare API ${path} returned unreadable JSON`, {
        ambiguous: ambiguousOnFailure && (res.ok || res.status >= 500),
        cause: error,
      });
    }
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok || json?.success === false) {
    const detail = json?.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new CloudflareRequestError(
      `Cloudflare API ${path} failed (${res.status}): ${detail}`,
      { ambiguous: ambiguousOnFailure && res.status >= 500 },
    );
  }
  return json;
}

// Same hash SHAPE Cloudflare's own manifest expects (see this file's header comment) — a
// content-addressed key derived from the file's own bytes and extension, on sha256 (native to
// Bun's `CryptoHasher`) rather than blake3 (not available here without a new dependency). Proven
// against deterministic request-contract tests; a current credential-gated smoke remains separate.
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
async function ensureProject({ accountId, apiToken, projectName, fetchFn, timeoutMs }) {
  const account = providerPathSegment(accountId, "Cloudflare account ID");
  providerPathSegment(projectName, "Cloudflare Pages project name");
  try {
    await cf(
      `/accounts/${account}/pages/projects`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, production_branch: "main" }),
      },
      fetchFn,
      { timeoutMs },
    );
  } catch (error) {
    if (!/already exists/i.test(error.message)) throw error;
  }
}

/**
 * Uploads exactly one file to a Cloudflare Pages project via direct upload. Returns both the
 * stable project URL, which keeps existing embeds current across approved revisions, and the
 * deployment-specific URL retained in the operation record for diagnosis and provenance.
 */
export async function deployFile({
  accountId,
  apiToken,
  projectName,
  filePath,
  fileName,
  recordDir,
  outputId,
  reviewId,
  draftDigest,
  deliveryOperationId,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  fetchFn = fetch,
}) {
  const account = providerPathSegment(accountId, "Cloudflare account ID");
  const project = providerPathSegment(projectName, "Cloudflare Pages project name");
  const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer());
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  const hash = contentHash(buffer, extension);
  const deployedAs = extension ? `index.${extension}` : "index";
  const deploymentKey = deploymentKeyFor({
    accountId,
    projectName,
    outputId,
    reviewId,
    draftDigest,
    contentHash: hash,
  });
  const binding = {
    recordDir,
    deploymentKey,
    accountId,
    projectName,
    outputId,
    reviewId,
    draftDigest,
    contentHash: hash,
    fileName,
    deployedAs,
    deliveryOperationId,
  };

  const recorded = await readHostedDeployment(binding);
  if (recorded?.record.state === "remote-complete" || recorded?.record.state === "local-complete") {
    // Completed operation records are durable recovery state, not authority by themselves. Verify
    // the recorded deployment against Cloudflare before allowing it to suppress publication.
    const remote = await cf(
      `/accounts/${account}/pages/projects/${project}/deployments/${providerPathSegment(recorded.record.deploymentId, "Cloudflare deployment ID")}`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
      fetchFn,
      { timeoutMs },
    );
    const deployment = remote.result;
    if (
      deployment?.id !== recorded.record.deploymentId ||
      deployment?.deployment_trigger?.metadata?.commit_hash !== deploymentKey
    ) {
      throw new Error("recorded Cloudflare deployment no longer matches its operation binding");
    }
    const url = stableProjectUrl(projectName);
    const deploymentUrl = validatedDeploymentUrl(
      deployment.url,
      projectName,
      "reconciled immutable deployment URL",
    );
    return {
      url,
      deploymentUrl,
      deploymentId: recorded.record.deploymentId,
      deploymentKey,
      recordPath: recorded.path,
      reused: true,
    };
  }

  if (
    recorded?.record.state === "prepared" ||
    recorded?.record.state === "requesting" ||
    recorded?.record.state === "ambiguous"
  ) {
    const deployments = await cf(
      `/accounts/${account}/pages/projects/${project}/deployments?per_page=100`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
      fetchFn,
      { timeoutMs },
    );
    const deployment = deployments.result?.find(
      (candidate) =>
        candidate?.deployment_trigger?.metadata?.commit_hash === deploymentKey,
    );
    if (deployment?.id && deployment?.url) {
      const url = stableProjectUrl(projectName);
      const deploymentUrl = validatedDeploymentUrl(
        deployment.url,
        projectName,
        "Cloudflare immutable deployment URL",
      );
      const completed = await writeHostedDeployment(binding, "remote-complete", {
        deploymentId: deployment.id,
        url,
        deploymentUrl,
        reconciledAt: new Date().toISOString(),
        ambiguousReason: undefined,
      });
      return {
        url,
        deploymentUrl: deployment.url,
        deploymentId: deployment.id,
        deploymentKey,
        recordPath: completed.path,
        reused: true,
      };
    }
    await writeHostedDeployment(binding, "ambiguous", {
      lastReconciledAt: new Date().toISOString(),
    });
    throw new Error(
      `Cloudflare deployment ${deploymentKey} remains ambiguous; no matching deployment is visible yet`,
    );
  }

  await ensureProject({ accountId, apiToken, projectName, fetchFn, timeoutMs });

  const { jwt } = (
    await cf(
      `/accounts/${account}/pages/projects/${project}/upload-token`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
      fetchFn,
      { timeoutMs },
    )
  ).result;

  const missing = (
    await cf(
    "/pages/assets/check-missing",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hashes: [hash] }),
    },
    fetchFn,
    { timeoutMs },
    )
  ).result;
  if (!Array.isArray(missing)) {
    throw new Error("Cloudflare check-missing response did not contain a hash list");
  }

  if (missing.includes(hash)) {
    await cf(
      "/pages/assets/upload",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            key: hash,
            value: buffer.toString("base64"),
            metadata: { contentType: contentTypeFor(fileName) },
            base64: true,
          },
        ]),
      },
      fetchFn,
      { timeoutMs },
    );
  }

  const formData = new FormData();
  // Always served at the deployment's own root — the whole point of naming every upload
  // "index.<ext>" in the manifest regardless of the beat's own file name, so the returned URL is
  // the complete embed link with nothing to append.
  formData.append("manifest", JSON.stringify({ [`/${deployedAs}`]: hash }));
  formData.append("commit_hash", deploymentKey);
  formData.append("commit_message", `Splash deployment ${deploymentKey}`);
  formData.append("commit_dirty", "false");

  await writeHostedDeployment(binding, "prepared");
  await writeHostedDeployment(binding, "requesting", {
    requestStartedAt: new Date().toISOString(),
  });

  let deployment;
  try {
    deployment = await cf(
      `/accounts/${account}/pages/projects/${project}/deployments`,
      { method: "POST", headers: { Authorization: `Bearer ${apiToken}` }, body: formData },
      fetchFn,
      { timeoutMs, ambiguousOnFailure: true },
    );
  } catch (error) {
    await writeHostedDeployment(binding, error.ambiguous ? "ambiguous" : "failed", {
      failureReason: error.message,
      failedAt: new Date().toISOString(),
    });
    throw error;
  }

  if (!deployment.result?.id || !deployment.result?.url) {
    const error = new CloudflareRequestError(
      "Cloudflare deployment response did not name its deployment ID and URL",
      { ambiguous: true },
    );
    await writeHostedDeployment(binding, "ambiguous", {
      failureReason: error.message,
      failedAt: new Date().toISOString(),
    });
    throw error;
  }

  const completed = await writeHostedDeployment(binding, "remote-complete", {
    deploymentId: deployment.result.id,
    url: stableProjectUrl(projectName),
    deploymentUrl: validatedDeploymentUrl(
      deployment.result.url,
      projectName,
      "Cloudflare immutable deployment URL",
    ),
    remoteCompletedAt: new Date().toISOString(),
    failureReason: undefined,
  });

  return {
    url: completed.record.url,
    deploymentUrl: deployment.result.url,
    deploymentId: deployment.result.id,
    deploymentKey,
    recordPath: completed.path,
    reused: false,
  };
}
