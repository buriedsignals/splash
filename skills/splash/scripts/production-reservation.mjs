import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";

export const PRODUCTION_ATTEMPTS_FILE = "PRODUCTION-ATTEMPTS.json";
export const PRODUCTION_ATTEMPTS_SCHEMA_VERSION = 1;
export const MAX_PRODUCTION_ATTEMPTS = 3;
export const PRODUCTION_ATTEMPTS_LOCK = `.${PRODUCTION_ATTEMPTS_FILE}.lock`;

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const PRODUCTION_INPUTS = Object.freeze({
  "map-bake": "MAP-BAKE.json",
  "datawrapper-produce": "spec.json",
});

export function describeProductionOperation(operation, outputId) {
  const inputPath = PRODUCTION_INPUTS[operation];
  if (!inputPath || !nonEmptyText(outputId)) {
    throw new Error("production operation requires a known operation and outputId");
  }
  return Object.freeze({ operation, outputId, inputPath });
}

export function isProductionReceiptApplicable(
  receipt,
  currentOperation,
  inputDigest,
) {
  return Boolean(
    receipt &&
      currentOperation &&
      receipt.operation === currentOperation.operation &&
      receipt.outputId === currentOperation.outputId &&
      receipt.inputPath === currentOperation.inputPath &&
      receipt.inputDigest === inputDigest,
  );
}

function nonEmptyText(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function validateProductionAttempts(receipt, path) {
  const expectedInputPath = PRODUCTION_INPUTS[receipt?.operation];
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt) ||
    receipt.schemaVersion !== PRODUCTION_ATTEMPTS_SCHEMA_VERSION ||
    !expectedInputPath ||
    !nonEmptyText(receipt.outputId) ||
    receipt.inputPath !== expectedInputPath ||
    !SHA256.test(receipt.inputDigest ?? "") ||
    !Number.isSafeInteger(receipt.attempts) ||
    receipt.attempts < 1 ||
    receipt.attempts > MAX_PRODUCTION_ATTEMPTS ||
    !["failed", "blocked", "reserved"].includes(receipt.status) ||
    !nonEmptyText(receipt.reason) ||
    (receipt.status === "blocked" &&
      receipt.attempts !== MAX_PRODUCTION_ATTEMPTS) ||
    (receipt.status === "failed" &&
      receipt.attempts === MAX_PRODUCTION_ATTEMPTS) ||
    (receipt.status === "reserved" &&
      (!nonEmptyText(receipt.reservationId) ||
        !Number.isSafeInteger(receipt.pid) ||
        receipt.pid < 1))
  ) {
    throw new Error(`production attempt receipt is invalid at ${path}`);
  }
  return receipt;
}

function regularReceiptError(path, cause) {
  return new Error(
    `production attempt receipt must be a regular file at ${path}`,
    cause ? { cause } : undefined,
  );
}

async function readRegularReceipt(path) {
  const leaf = await lstat(path);
  if (!leaf.isFile() || leaf.isSymbolicLink()) {
    throw regularReceiptError(path);
  }

  let handle;
  try {
    handle = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    if (error?.code === "ELOOP") throw regularReceiptError(path, error);
    throw error;
  }

  try {
    if (!(await handle.stat()).isFile()) throw regularReceiptError(path);
    return await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
}

export async function readProductionAttempts(path, owningOutputId) {
  if (!nonEmptyText(owningOutputId)) {
    throw new Error(
      `production attempt receipt requires an owning beat outputId at ${path}`,
    );
  }
  try {
    const receipt = validateProductionAttempts(
      JSON.parse(await readRegularReceipt(path)),
      path,
    );
    if (receipt.outputId !== owningOutputId) {
      throw new Error(
        `production attempt receipt outputId ${JSON.stringify(receipt.outputId)} does not match owning beat ${JSON.stringify(owningOutputId)} at ${path}`,
      );
    }
    return receipt;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      throw new Error(
        `production attempt receipt is not valid JSON at ${path}`,
        { cause: error },
      );
    }
    throw error;
  }
}

function exhaustedResume(reason) {
  return /attempt limit reached/i.test(reason)
    ? reason
    : `${reason}; attempt limit reached`;
}

function classification(receipt, state, status, resume, reason = receipt?.reason ?? null) {
  return {
    state,
    status,
    attempts: receipt?.attempts ?? 0,
    reason,
    resume,
  };
}

export function productionFailureStatus(attempts) {
  return attempts === MAX_PRODUCTION_ATTEMPTS ? "blocked" : "failed";
}

export function classifyProductionReservation(receipt, ownerIsAlive) {
  if (!receipt) {
    return classification(
      null,
      "clear",
      "ready",
      "Start the first production attempt.",
    );
  }
  if (receipt.status === "failed") {
    return classification(
      receipt,
      "retryable",
      "ready",
      `Production attempt ${receipt.attempts} failed; resume with attempt ${receipt.attempts + 1}.`,
    );
  }
  if (receipt.status === "blocked") {
    return classification(
      receipt,
      "exhausted",
      "blocked",
      exhaustedResume(receipt.reason),
    );
  }
  if (ownerIsAlive) {
    return classification(
      receipt,
      "live",
      "blocked",
      `Production attempt ${receipt.attempts} owner is still running.`,
    );
  }
  if (receipt.attempts < MAX_PRODUCTION_ATTEMPTS) {
    return classification(
      receipt,
      "retryable",
      "ready",
      `Production attempt ${receipt.attempts} owner is no longer running; resume with attempt ${receipt.attempts + 1}.`,
    );
  }
  const reason = `production owner is no longer running after attempt ${receipt.attempts}; attempt limit reached`;
  return classification(
    receipt,
    "exhausted",
    "blocked",
    reason,
    reason,
  );
}
