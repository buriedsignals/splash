import { createHash, randomUUID } from "node:crypto";
import { lstat, open, readFile, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import {
  isDeclinedProfile,
  parseNewsroom,
  REQUIRED_FIELDS,
  SERVICE_FIELDS,
  validateNewsroom,
} from "../../skills/splash/scripts/newsroom.mjs";
import { acquireTargetLock } from "./target-lock.mjs";

const MAX_NEWSROOM_BYTES = 1 << 20;
const MANAGED_FIELDS = Object.freeze([
  ...REQUIRED_FIELDS,
  "languages",
  "language",
  "accents",
  "credit",
  ...SERVICE_FIELDS,
]);
const MANAGED_SET = new Set([...MANAGED_FIELDS, "decision"]);

function digest(exists, text) {
  return `sha256:${createHash("sha256").update(exists ? "present\0" : "missing\0").update(text).digest("hex")}`;
}

async function validateTarget(path) {
  if (!isAbsolute(path) || resolve(path) !== path || basename(path) !== "NEWSROOM.md") {
    throw new Error("newsroom path must be a clean absolute NEWSROOM.md path");
  }
  const parent = dirname(path);
  const canonical = await realpath(parent);
  const parentInfo = await lstat(canonical);
  if (canonical !== parent || !parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
    throw new Error("newsroom parent must be a real directory without symlinks");
  }
}

async function readStable(path) {
  await validateTarget(path);
  let before;
  try {
    before = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, text: "", mode: 0o644 };
    throw error;
  }
  if (!before.isFile() || before.isSymbolicLink() || before.size > MAX_NEWSROOM_BYTES) {
    throw new Error("NEWSROOM.md must be a bounded real file, not a symlink");
  }
  const text = await readFile(path, "utf8");
  const after = await lstat(path);
  if (!after.isFile() || after.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
    throw new Error("NEWSROOM.md changed while it was being read");
  }
  return { exists: true, text, mode: before.mode & 0o777 };
}

function frontMatter(text) {
  const match = /^---(\r?\n)([\s\S]*?)(\r?\n)---(?=\r?\n|$)/.exec(text);
  if (!match) throw new Error("NEWSROOM.md has no front matter");
  const bodyAt = match[0].length;
  return { newline: match[1], lines: match[2].split(/\r?\n/), body: text.slice(bodyAt) };
}

function assertNoManagedDuplicates(text) {
  const { lines } = frontMatter(text);
  const seen = new Set();
  for (const line of lines) {
    const pair = /^\s*([A-Za-z][A-Za-z0-9]*):/.exec(line);
    if (!pair || !MANAGED_SET.has(pair[1])) continue;
    if (seen.has(pair[1])) throw new Error(`NEWSROOM.md contains duplicate managed field ${pair[1]}`);
    seen.add(pair[1]);
  }
}

function publicSnapshot(source) {
  if (!source.exists) {
    return { exists: false, revision: digest(false, ""), profile: null, declined: false };
  }
  assertNoManagedDuplicates(source.text);
  const profile = parseNewsroom(source.text);
  return { exists: true, revision: digest(true, source.text), profile, declined: isDeclinedProfile(profile) };
}

export async function readNewsroom(path) {
  return publicSnapshot(await readStable(path));
}

function validateChanges(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new Error("newsroom changes must be an object");
  }
  for (const [field, value] of Object.entries(changes)) {
    if (!MANAGED_FIELDS.includes(field)) throw new Error(`newsroom field ${field} is not owned by setup`);
    if (value !== null && (typeof value !== "string" || value.length > 4096 || /[\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))) {
      throw new Error(`newsroom field ${field} has an invalid value`);
    }
  }
}

function applyChanges(current, changes) {
  const next = { ...(current ?? {}) };
  delete next.decision;
  for (const [field, value] of Object.entries(changes)) {
    if (value === null || value.trim() === "") delete next[field];
    else next[field] = value.trim();
  }
  return next;
}

function render(text, profile, declined) {
  const source = text || "---\n\n---\n";
  const parsed = frontMatter(source);
  const retained = [];
  const seen = new Set();
  for (const line of parsed.lines) {
    const pair = /^\s*([A-Za-z][A-Za-z0-9]*):/.exec(line);
    if (pair && MANAGED_SET.has(pair[1])) {
      if (seen.has(pair[1])) throw new Error(`NEWSROOM.md contains duplicate managed field ${pair[1]}`);
      seen.add(pair[1]);
      continue;
    }
    retained.push(line);
  }
  while (retained.length > 0 && retained.at(-1) === "") retained.pop();
  if (declined) {
    retained.push("decision: declined");
  } else {
    for (const field of MANAGED_FIELDS) {
      const value = profile[field];
      if (typeof value === "string" && value !== "") retained.push(`${field}: ${JSON.stringify(value)}`);
    }
  }
  const inside = retained.join(parsed.newline);
  return `---${parsed.newline}${inside}${parsed.newline}---${parsed.body}`;
}

async function replaceAtomically(path, text, mode, beforeRename) {
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", mode || 0o644);
    await handle.writeFile(text, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await beforeRename?.(temporary, path);
    await rename(temporary, path);
  } finally {
    await handle?.close().catch(() => {});
    await rm(temporary, { force: true });
  }
}

/**
 * Revision-checked canonical newsroom update. The adjacent lock is held from the final reread
 * through fsynced temp-file replacement, so two sessions starting from one revision cannot both
 * report success.
 */
export async function updateNewsroom(path, {
  expectedRevision,
  changes = {},
  decline = false,
  confirmDecline = false,
  confirmReplaceDecline = false,
} = {}, {
  acquireLock = acquireTargetLock,
  beforeRename,
} = {}) {
  if (typeof expectedRevision !== "string" || !/^sha256:[0-9a-f]{64}$/.test(expectedRevision)) {
    throw new Error("expected newsroom revision is required");
  }
  validateChanges(changes);
  if (decline && confirmDecline !== true) throw new Error("declining newsroom setup requires separate confirmation");
  if (decline && Object.keys(changes).length > 0) throw new Error("a decline cannot also submit newsroom fields");

  await validateTarget(path);
  const lock = await acquireLock(path);
  try {
    const source = await readStable(path);
    const current = publicSnapshot(source);
    if (current.revision !== expectedRevision) {
      const conflict = new Error("NEWSROOM.md changed since this setup page loaded");
      conflict.code = "REVISION_CONFLICT";
      throw conflict;
    }
    if (current.declined && !decline && confirmReplaceDecline !== true) {
      throw new Error("replacing a recorded newsroom decline requires separate confirmation");
    }

    let profile = {};
    if (!decline) {
      profile = applyChanges(current.profile, changes);
      const errors = validateNewsroom(profile);
      if (errors.length > 0) throw new Error(`NEWSROOM.md is invalid: ${errors.join("; ")}`);
    }
    const text = render(source.text, profile, decline);
    if (Buffer.byteLength(text) > MAX_NEWSROOM_BYTES) throw new Error("NEWSROOM.md exceeds the size limit");
    await replaceAtomically(path, text, source.mode, beforeRename);
    return publicSnapshot({ exists: true, text, mode: source.mode });
  } finally {
    await lock.release();
  }
}

export const NEWSROOM_MANAGED_FIELDS = MANAGED_FIELDS;
