import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export const HOSTED_DEPLOYMENT_SCHEMA_VERSION = 1;

const STATES = new Set([
  "prepared",
  "requesting",
  "ambiguous",
  "remote-complete",
  "local-complete",
  "failed",
]);
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const DEPLOYMENT_KEY = /^[0-9a-f]{40}$/;

function text(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function segment(value, label) {
  text(value, label);
  if (
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new Error(`${label} must be one path segment`);
  }
  return value;
}

async function optionalStat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJsonAtomic(path, value) {
  const temporary = join(dirname(path), `.${basename(path)}.tmp-${randomUUID()}`);
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export function deploymentKeyFor({
  accountId,
  projectName,
  outputId,
  reviewId,
  draftDigest,
  contentHash,
}) {
  const binding = JSON.stringify({
    accountId: text(accountId, "Cloudflare account ID"),
    projectName: text(projectName, "Cloudflare project name"),
    outputId: segment(outputId, "hosted output ID"),
    reviewId: text(reviewId, "hosted review ID"),
    draftDigest: text(draftDigest, "hosted draft digest"),
    contentHash: text(contentHash, "hosted content hash"),
  });
  if (!SHA256.test(draftDigest)) throw new Error("hosted draft digest must be sha256");
  return createHash("sha256")
    .update(`splash-hosted-deployment-v1\0${binding}`)
    .digest("hex")
    .slice(0, 40);
}

export function hostedDeploymentRecordPath(recordDir, outputId, deploymentKey) {
  text(recordDir, "hosted deployment record directory");
  segment(outputId, "hosted output ID");
  if (!DEPLOYMENT_KEY.test(deploymentKey)) {
    throw new Error("hosted deployment key must be 40 lowercase hexadecimal characters");
  }
  return join(recordDir, `.${outputId}-hosted-deployment-${deploymentKey}.json`);
}

export function validateHostedDeployment(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("hosted deployment record must be a JSON object");
  }
  if (record.schemaVersion !== HOSTED_DEPLOYMENT_SCHEMA_VERSION) {
    throw new Error(
      `hosted deployment record has unsupported schemaVersion ${JSON.stringify(record.schemaVersion)}`,
    );
  }
  if (!DEPLOYMENT_KEY.test(record.deploymentKey)) {
    throw new Error("hosted deployment record has an invalid deployment key");
  }
  segment(record.outputId, "hosted output ID");
  text(record.accountId, "Cloudflare account ID");
  text(record.projectName, "Cloudflare project name");
  text(record.reviewId, "hosted review ID");
  if (!SHA256.test(record.draftDigest)) {
    throw new Error("hosted deployment record has an invalid draft digest");
  }
  text(record.contentHash, "hosted content hash");
  text(record.fileName, "hosted file name");
  text(record.deployedAs, "hosted deployment file name");
  if (!STATES.has(record.state)) {
    throw new Error(`hosted deployment record has unknown state ${JSON.stringify(record.state)}`);
  }
  if (!Array.isArray(record.deliveryOperationIds) || record.deliveryOperationIds.length === 0) {
    throw new Error("hosted deployment record must name its delivery operation");
  }
  record.deliveryOperationIds.forEach((id, index) =>
    segment(id, `deliveryOperationIds[${index}]`),
  );
  text(record.createdAt, "hosted deployment createdAt");
  text(record.updatedAt, "hosted deployment updatedAt");
  if (record.deploymentId !== undefined) text(record.deploymentId, "Cloudflare deployment ID");
  if (record.url !== undefined) text(record.url, "Cloudflare deployment URL");
  if (
    (record.state === "remote-complete" || record.state === "local-complete") &&
    (!record.deploymentId || !record.url)
  ) {
    throw new Error("a completed hosted deployment record must name its deployment ID and URL");
  }
  return record;
}

export async function readHostedDeployment(binding) {
  const path = hostedDeploymentRecordPath(
    binding.recordDir,
    binding.outputId,
    binding.deploymentKey,
  );
  const stat = await optionalStat(path);
  if (stat === null) return null;
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`hosted deployment record must be a regular file: ${path}`);
  }
  let record;
  try {
    record = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`hosted deployment record is not valid JSON: ${path}`, { cause: error });
    }
    throw error;
  }
  validateHostedDeployment(record);
  for (const field of [
    "deploymentKey",
    "outputId",
    "accountId",
    "projectName",
    "reviewId",
    "draftDigest",
    "contentHash",
    "fileName",
    "deployedAs",
  ]) {
    if (record[field] !== binding[field]) {
      throw new Error(`hosted deployment record ${field} does not match the current output`);
    }
  }
  return { record, path };
}

export async function writeHostedDeployment(binding, state, patch = {}) {
  if (!STATES.has(state)) {
    throw new Error(`unknown hosted deployment state ${JSON.stringify(state)}`);
  }
  const existing = await readHostedDeployment(binding);
  const now = new Date().toISOString();
  const operationIds = [
    ...(existing?.record.deliveryOperationIds ?? []),
    segment(binding.deliveryOperationId, "delivery operation ID"),
  ];
  const record = {
    ...(existing?.record ?? {}),
    ...patch,
    schemaVersion: HOSTED_DEPLOYMENT_SCHEMA_VERSION,
    deploymentKey: binding.deploymentKey,
    outputId: binding.outputId,
    accountId: binding.accountId,
    projectName: binding.projectName,
    reviewId: binding.reviewId,
    draftDigest: binding.draftDigest,
    contentHash: binding.contentHash,
    fileName: binding.fileName,
    deployedAs: binding.deployedAs,
    state,
    deliveryOperationIds: [...new Set(operationIds)],
    createdAt: existing?.record.createdAt ?? now,
    updatedAt: now,
  };
  validateHostedDeployment(record);
  const path = hostedDeploymentRecordPath(
    binding.recordDir,
    binding.outputId,
    binding.deploymentKey,
  );
  await writeJsonAtomic(path, record);
  return { record, path };
}

export async function markHostedDeploymentLocalComplete(recordPath, deliveryOperationId) {
  const stat = await optionalStat(recordPath);
  if (!stat?.isFile() || stat.isSymbolicLink()) {
    throw new Error(`hosted deployment record must be a regular file: ${recordPath}`);
  }
  const record = validateHostedDeployment(JSON.parse(await readFile(recordPath, "utf8")));
  const now = new Date().toISOString();
  const updated = {
    ...record,
    state: "local-complete",
    deliveryOperationIds: [
      ...new Set([
        ...record.deliveryOperationIds,
        segment(deliveryOperationId, "delivery operation ID"),
      ]),
    ],
    localCompletedAt: now,
    updatedAt: now,
  };
  validateHostedDeployment(updated);
  await writeJsonAtomic(recordPath, updated);
  return updated;
}
