import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export const REPLACEMENT_SCHEMA_VERSION = 1;
export const DELIVERY_MANIFEST_FILE = ".delivery-manifest.json";

const JOURNAL_STATES = new Set(["staged", "previous-moved", "published", "cleanup-pending"]);
const queues = new Map();

async function optionalStat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function optionalJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if (error instanceof SyntaxError) throw new Error(`${path} is not valid JSON`, { cause: error });
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

function segment(value, label) {
  if (
    typeof value !== "string" ||
    value === "" ||
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

export function replacementArtifacts(exportDir, operationId) {
  const outputId = segment(basename(exportDir), "output ID");
  const id = segment(operationId, "replacement operation ID");
  const exportRoot = dirname(exportDir);
  return {
    outputId,
    exportRoot,
    journalPath: join(exportRoot, `.${outputId}-delivery-replacement.json`),
    lockDir: join(exportRoot, `.${outputId}-delivery.lock`),
    stagingDir: join(exportRoot, `.${outputId}-delivery-staging-${id}`),
    backupDir: join(exportRoot, `.${outputId}-delivery-backup-${id}`),
  };
}

function validateJournal(record, exportDir) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("delivery replacement journal must be a JSON object");
  }
  if (record.schemaVersion !== REPLACEMENT_SCHEMA_VERSION) {
    throw new Error(
      `delivery replacement journal has unsupported schemaVersion ${JSON.stringify(record.schemaVersion)}`,
    );
  }
  const artifacts = replacementArtifacts(exportDir, record.operationId);
  if (record.outputId !== artifacts.outputId) {
    throw new Error("delivery replacement journal belongs to a different output");
  }
  if (!JOURNAL_STATES.has(record.state)) {
    throw new Error(`delivery replacement journal has unknown state ${JSON.stringify(record.state)}`);
  }
  if (
    record.exportName !== artifacts.outputId ||
    record.stagingName !== basename(artifacts.stagingDir) ||
    record.backupName !== basename(artifacts.backupDir)
  ) {
    throw new Error("delivery replacement journal names unexpected filesystem paths");
  }
  return { record, artifacts };
}

async function readJournal(exportDir) {
  const outputId = basename(exportDir);
  const path = join(dirname(exportDir), `.${outputId}-delivery-replacement.json`);
  const stat = await optionalStat(path);
  if (stat === null) return null;
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`delivery replacement journal must be a regular file: ${path}`);
  }
  return validateJournal(await optionalJson(path), exportDir);
}

async function writeJournal(exportDir, operationId, state, createdAt) {
  const artifacts = replacementArtifacts(exportDir, operationId);
  const now = new Date().toISOString();
  const record = {
    schemaVersion: REPLACEMENT_SCHEMA_VERSION,
    operationId,
    outputId: artifacts.outputId,
    exportName: artifacts.outputId,
    stagingName: basename(artifacts.stagingDir),
    backupName: basename(artifacts.backupDir),
    state,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
  validateJournal(record, exportDir);
  await writeJsonAtomic(artifacts.journalPath, record);
  return record;
}

async function directory(path, label) {
  const stat = await optionalStat(path);
  if (stat === null) return null;
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} must be a real directory: ${path}`);
  }
  return stat;
}

async function removeDirectory(path, label) {
  if ((await directory(path, label)) !== null) await rm(path, { recursive: true, force: true });
}

async function manifestFor(directoryPath) {
  if ((await directory(directoryPath, "delivery directory")) === null) return null;
  const path = join(directoryPath, DELIVERY_MANIFEST_FILE);
  const stat = await optionalStat(path);
  if (stat === null) return null;
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`delivery manifest must be a regular file: ${path}`);
  }
  const manifest = await optionalJson(path);
  if (manifest?.schemaVersion !== REPLACEMENT_SCHEMA_VERSION || manifest?.state !== "complete") {
    throw new Error(`delivery manifest has an unsupported contract at ${path}`);
  }
  segment(manifest.operationId, "delivery manifest operation ID");
  if (manifest.outputId !== basename(directoryPath)) {
    throw new Error(`delivery manifest belongs to a different output at ${path}`);
  }
  return manifest;
}

async function orphanNames(exportDir) {
  const outputId = basename(exportDir);
  const names = await readdir(dirname(exportDir));
  return {
    staging: names.filter((name) => name.startsWith(`.${outputId}-delivery-staging-`)),
    backup: names.filter((name) => name.startsWith(`.${outputId}-delivery-backup-`)),
  };
}

async function reconcileOrphans(exportDir) {
  const exportRoot = dirname(exportDir);
  const { staging, backup } = await orphanNames(exportDir);
  for (const name of staging) {
    await removeDirectory(join(exportRoot, name), "orphaned delivery staging directory");
  }

  const current = await directory(exportDir, "delivery export directory");
  if (current === null && backup.length === 1) {
    const backupDir = join(exportRoot, backup[0]);
    await directory(backupDir, "orphaned delivery backup directory");
    await rename(backupDir, exportDir);
    return { state: "restored-orphaned-backup" };
  }
  if (current === null && backup.length > 1) {
    throw new Error(`delivery recovery found multiple backups for ${exportDir}`);
  }
  if (current !== null && backup.length > 0) {
    const manifest = await manifestFor(exportDir);
    for (const name of backup) {
      const operationId = name.slice(`.${basename(exportDir)}-delivery-backup-`.length);
      if (!manifest || manifest.operationId !== operationId) {
        throw new Error(`delivery recovery found an untracked backup at ${join(exportRoot, name)}`);
      }
      await removeDirectory(join(exportRoot, name), "orphaned delivery backup directory");
    }
    return { state: "cleaned-orphaned-backup" };
  }
  return { state: staging.length ? "discarded-orphaned-staging" : "clean" };
}

/** Restore the last good export or finish cleanup by inspecting the journal and manifest. */
export async function reconcileDeliveryReplacement(exportDir) {
  await mkdir(dirname(exportDir), { recursive: true });
  const found = await readJournal(exportDir);
  if (!found) return reconcileOrphans(exportDir);

  const { record, artifacts } = found;
  const current = await directory(exportDir, "delivery export directory");
  const staging = await directory(artifacts.stagingDir, "delivery staging directory");
  const backup = await directory(artifacts.backupDir, "delivery backup directory");
  const manifest = current ? await manifestFor(exportDir) : null;

  if (manifest?.operationId === record.operationId) {
    if (staging) await removeDirectory(artifacts.stagingDir, "delivery staging directory");
    if (backup) await removeDirectory(artifacts.backupDir, "delivery backup directory");
    await rm(artifacts.journalPath, { force: true });
    await reconcileOrphans(exportDir);
    return { state: "completed-published-replacement" };
  }

  if (backup) {
    if (current) {
      throw new Error(`delivery recovery found both an unverified export and its backup at ${exportDir}`);
    }
    await rename(artifacts.backupDir, exportDir);
    if (staging) await removeDirectory(artifacts.stagingDir, "delivery staging directory");
    await rm(artifacts.journalPath, { force: true });
    await reconcileOrphans(exportDir);
    return { state: "restored-previous-export" };
  }

  if (staging) await removeDirectory(artifacts.stagingDir, "delivery staging directory");
  await rm(artifacts.journalPath, { force: true });
  await reconcileOrphans(exportDir);
  return { state: current ? "kept-previous-export" : "discarded-unpublished-staging" };
}

/** Publish under a journal. A cleanup failure leaves a record for the next call to reconcile. */
export async function publishStagedDelivery({
  stagingDir,
  exportDir,
  manifest,
  hooks = {},
}) {
  const operationId = segment(manifest?.operationId, "delivery manifest operation ID");
  const artifacts = replacementArtifacts(exportDir, operationId);
  if (resolve(stagingDir) !== resolve(artifacts.stagingDir)) {
    throw new Error(`delivery staging directory must be ${artifacts.stagingDir}`);
  }
  await directory(stagingDir, "delivery staging directory");

  const completeManifest = {
    ...manifest,
    schemaVersion: REPLACEMENT_SCHEMA_VERSION,
    outputId: artifacts.outputId,
    state: "complete",
  };
  await writeJsonAtomic(join(stagingDir, DELIVERY_MANIFEST_FILE), completeManifest);

  const existing = await directory(exportDir, "delivery export directory");
  const createdAt = new Date().toISOString();
  await writeJournal(exportDir, operationId, "staged", createdAt);
  let previousMoved = false;
  let published = false;

  try {
    if (existing) {
      await hooks.beforeMovePrevious?.();
      await rename(exportDir, artifacts.backupDir);
      previousMoved = true;
      await hooks.afterMovePrevious?.();
      await writeJournal(exportDir, operationId, "previous-moved", createdAt);
    }
    await hooks.beforePublishStaging?.();
    await rename(stagingDir, exportDir);
    published = true;
    await hooks.afterPublishStaging?.();
    await writeJournal(exportDir, operationId, "published", createdAt);
  } catch (error) {
    if (published) throw error;
    if (previousMoved) {
      try {
        await rename(artifacts.backupDir, exportDir);
        await rm(artifacts.journalPath, { force: true });
      } catch (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          `delivery replacement failed and the previous export could not be restored at ${exportDir}`,
        );
      }
    } else {
      await rm(artifacts.journalPath, { force: true });
    }
    throw error;
  }

  if (previousMoved) {
    try {
      await hooks.beforeCleanupBackup?.();
      await removeDirectory(artifacts.backupDir, "delivery backup directory");
    } catch (cleanupError) {
      await writeJournal(exportDir, operationId, "cleanup-pending", createdAt);
      console.warn(
        `delivery published at ${exportDir}, but its previous backup still needs cleanup at ${artifacts.backupDir}: ${cleanupError.message}`,
      );
      return;
    }
  }
  await rm(artifacts.journalPath, { force: true });
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function acquireFilesystemLock(exportDir, waitMs) {
  const operationId = randomUUID();
  const { lockDir } = replacementArtifacts(exportDir, operationId);
  const ownerPath = join(lockDir, "owner.json");
  const deadline = Date.now() + waitMs;

  while (true) {
    try {
      await mkdir(lockDir);
      try {
        await writeFile(
          ownerPath,
          `${JSON.stringify({ schemaVersion: 1, operationId, pid: process.pid, hostname: hostname() })}\n`,
          { flag: "wx" },
        );
      } catch (error) {
        await rm(lockDir, { recursive: true, force: true });
        throw error;
      }
      return async () => {
        const owner = await optionalJson(ownerPath);
        if (owner?.operationId !== operationId) {
          throw new Error(`delivery lock ownership changed at ${lockDir}`);
        }
        await rm(lockDir, { recursive: true, force: true });
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }

    const owner = await optionalJson(ownerPath).catch(() => null);
    const lockStat = await optionalStat(lockDir);
    const abandoned =
      (owner?.hostname === hostname() && !processIsAlive(owner.pid)) ||
      (!owner && lockStat && Date.now() - lockStat.mtimeMs > 1_000);
    if (abandoned) {
      const stale = `${lockDir}-stale-${randomUUID()}`;
      try {
        await rename(lockDir, stale);
        await rm(stale, { recursive: true, force: true });
        continue;
      } catch (error) {
        if (error?.code === "ENOENT") continue;
        throw error;
      }
    }
    if (Date.now() >= deadline) {
      throw new Error(`another delivery still holds the output lock at ${lockDir}`);
    }
    await wait(25);
  }
}

async function queued(key, task) {
  const previous = queues.get(key) ?? Promise.resolve();
  let releaseTurn;
  const turn = new Promise((resolveTurn) => {
    releaseTurn = resolveTurn;
  });
  const tail = previous.then(() => turn);
  queues.set(key, tail);
  await previous;
  try {
    return await task();
  } finally {
    releaseTurn();
    if (queues.get(key) === tail) queues.delete(key);
  }
}

/** Serialize same-output work in this process and across processes. */
export async function withDeliveryLock(exportDir, task, { waitMs = 30_000 } = {}) {
  const key = resolve(exportDir);
  return queued(key, async () => {
    await mkdir(dirname(exportDir), { recursive: true });
    const release = await acquireFilesystemLock(exportDir, waitMs);
    try {
      return await task();
    } finally {
      await release();
    }
  });
}
