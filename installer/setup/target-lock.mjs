import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rmdir, unlink } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";

const OWNER_FILE = "owner.json";
const TOKEN = /^[0-9a-f-]{36}$/i;

function delay(milliseconds) {
  return new Promise((settle) => setTimeout(settle, milliseconds));
}

async function realParent(target) {
  if (!isAbsolute(target) || resolve(target) !== target) {
    throw new Error("lock target must be a clean absolute path");
  }
  const parent = dirname(target);
  const canonical = await realpath(parent);
  const info = await lstat(canonical);
  if (canonical !== parent || !info.isDirectory() || info.isSymbolicLink()) {
    throw new Error("lock target parent must be a real directory without symlinks");
  }
  return parent;
}

function parseOwner(bytes) {
  let owner;
  try {
    owner = JSON.parse(bytes);
  } catch {
    return null;
  }
  if (!owner || typeof owner !== "object" || Array.isArray(owner)) return null;
  const fields = Object.keys(owner).sort();
  if (JSON.stringify(fields) !== JSON.stringify(["createdAt", "host", "pid", "schemaVersion", "token"])) return null;
  if (owner.schemaVersion !== "splash-target-lock/v1" || !TOKEN.test(owner.token ?? "")) return null;
  if (typeof owner.host !== "string" || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) return null;
  if (!Number.isSafeInteger(owner.createdAt) || owner.createdAt <= 0) return null;
  return owner;
}

async function ownerBytes(lockPath) {
  const ownerPath = `${lockPath}/${OWNER_FILE}`;
  const info = await lstat(ownerPath);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) return null;
  return readFile(ownerPath, "utf8");
}

function processIsProvablyGone(pid, kill = process.kill) {
  try {
    kill(pid, 0);
    return false;
  } catch (error) {
    return error?.code === "ESRCH";
  }
}

async function reclaimAbandoned(lockPath, { localHost, kill }) {
  let observed;
  try {
    const info = await lstat(lockPath);
    if (!info.isDirectory() || info.isSymbolicLink()) return false;
    observed = await ownerBytes(lockPath);
  } catch {
    return false;
  }
  const owner = observed && parseOwner(observed);
  if (!owner || owner.host !== localHost || !processIsProvablyGone(owner.pid, kill)) return false;

  // The PID check is only authority to remove the exact owner record we observed. Re-read it
  // immediately before unlinking so a replaced owner can never be reclaimed by the stale result.
  const current = await ownerBytes(lockPath).catch(() => null);
  if (current !== observed) return false;
  try {
    await unlink(`${lockPath}/${OWNER_FILE}`);
    await rmdir(lockPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire an adjacent cross-process lock. An abandoned lock is reclaimed only on the same host
 * after the operating system proves that its recorded PID no longer exists. Unknown, malformed,
 * foreign-host, permission-denied, and live-owner states fail closed.
 */
export async function acquireTargetLock(target, {
  timeoutMs = 5000,
  pollMs = 25,
  localHost = hostname(),
  pid = process.pid,
  token = randomUUID(),
  now = Date.now,
  kill = process.kill,
} = {}) {
  await realParent(target);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > 60_000) {
    throw new Error("lock timeout must be between 0 and 60000ms");
  }
  if (!Number.isFinite(pollMs) || pollMs < 1 || pollMs > 1000) {
    throw new Error("lock poll interval must be between 1 and 1000ms");
  }
  if (!TOKEN.test(token) || !Number.isSafeInteger(pid) || pid <= 0 || !localHost) {
    throw new Error("lock owner identity is invalid");
  }

  const lockPath = `${target}.lock`;
  const started = now();
  while (true) {
    try {
      await mkdir(lockPath, { mode: 0o700 });
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (await reclaimAbandoned(lockPath, { localHost, kill })) continue;
      if (now() - started >= timeoutMs) {
        const conflict = new Error("target is locked by another live or unverifiable writer");
        conflict.code = "LOCKED";
        throw conflict;
      }
      await delay(pollMs);
    }
  }

  const ownerPath = `${lockPath}/${OWNER_FILE}`;
  const owner = `${JSON.stringify({
    schemaVersion: "splash-target-lock/v1",
    token,
    host: localHost,
    pid,
    createdAt: now(),
  })}\n`;
  let handle;
  try {
    handle = await open(ownerPath, "wx", 0o600);
    await handle.writeFile(owner, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    await handle?.close().catch(() => {});
    await unlink(ownerPath).catch(() => {});
    await rmdir(lockPath).catch(() => {});
    throw error;
  }

  let released = false;
  return {
    path: lockPath,
    token,
    async release() {
      if (released) return;
      const current = await ownerBytes(lockPath).catch(() => null);
      const parsed = current && parseOwner(current);
      if (!parsed || parsed.token !== token) {
        throw new Error("target lock ownership changed before release");
      }
      await unlink(ownerPath);
      await rmdir(lockPath);
      released = true;
    },
  };
}
