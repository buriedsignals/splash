import { createHash, randomUUID } from "node:crypto";
import { lstat, open, readFile, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { acquireTargetLock } from "./target-lock.mjs";

const MAX_ENV_BYTES = 128 << 10;
const MAX_VALUE_BYTES = 16 << 10;

export const LEGACY_CREDENTIAL_NAMES = Object.freeze({
  MAPTILER_KEY: ["MAPTILER_KEY", "MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"],
  MAPTILER_DELIVERY_KEY: ["MAPTILER_DELIVERY_KEY"],
  DATAWRAPPER_TOKEN: ["DATAWRAPPER_TOKEN", "DATAWRAPPER_API_TOKEN"],
  CLOUDFLARE_API_TOKEN: ["CLOUDFLARE_API_TOKEN"],
});

export const LEGACY_INTEGRATION_NAMES = Object.freeze({
  cloudflareAccountId: "CLOUDFLARE_ACCOUNT_ID",
  cmsKind: "CMS_KIND",
  cmsEndpoint: "CMS_ENDPOINT",
});

const NAME_TO_CREDENTIAL = new Map(
  Object.entries(LEGACY_CREDENTIAL_NAMES).flatMap(([id, names]) => names.map((name) => [name, id])),
);
const NAME_TO_INTEGRATION = new Map(
  Object.entries(LEGACY_INTEGRATION_NAMES).map(([field, name]) => [name, field]),
);

function revision(text) {
  return `sha256:${createHash("sha256").update("legacy-env\0").update(text).digest("hex")}`;
}

function assignmentIdentity(index, raw) {
  return `sha256:${createHash("sha256").update(String(index)).update("\0").update(raw).digest("hex")}`;
}

async function validatePath(path) {
  if (!isAbsolute(path) || resolve(path) !== path || basename(path) !== ".env") {
    throw new Error("legacy environment path must be a clean absolute .env path");
  }
  const parent = dirname(path);
  const canonical = await realpath(parent);
  const parentInfo = await lstat(canonical);
  if (canonical !== parent || !parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
    throw new Error("legacy environment parent must be a real directory without symlinks");
  }
}

function safeOwnership(info) {
  if (!info.isFile() || info.isSymbolicLink()) return "legacy .env is not a real file";
  if (info.size > MAX_ENV_BYTES) return `legacy .env exceeds ${MAX_ENV_BYTES} bytes`;
  if (typeof process.getuid === "function" && info.uid !== process.getuid()) return "legacy .env is owned by another user";
  if (process.platform !== "win32" && (info.mode & 0o077) !== 0) return "legacy .env permissions must be 0600 before migration";
  return null;
}

function splitLines(text) {
  return text.match(/[^\n]*(?:\n|$)/g)?.filter((line) => line !== "") ?? [];
}

function parseValue(raw) {
  const value = raw.trim();
  if (Buffer.byteLength(value) > MAX_VALUE_BYTES) throw new Error("assignment value exceeds the size limit");
  if (value.startsWith('"') && value.endsWith('"')) {
    let decoded;
    try {
      decoded = JSON.parse(value);
    } catch {
      throw new Error("double-quoted value is malformed");
    }
    if (typeof decoded !== "string" || /[\r\n\u0000]/.test(decoded)) throw new Error("quoted value is not a single-line string");
    return decoded;
  }
  if (value.startsWith("'") && value.endsWith("'") && !value.slice(1, -1).includes("'")) {
    return value.slice(1, -1);
  }
  if (!/^[^\s#'"`$\\]*$/.test(value)) {
    throw new Error("value uses unsupported whitespace, comment, quote, escape, or expansion syntax");
  }
  return value;
}

function parse(text) {
  const lines = splitLines(text);
  const assignments = [];
  const issues = [];
  lines.forEach((withEnding, index) => {
    const raw = withEnding.replace(/\r?\n$/, "");
    if (/^\s*(?:#.*)?$/.test(raw)) return;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(raw);
    if (!match) {
      issues.push({ code: "unsupported-syntax", line: index + 1 });
      return;
    }
    let value;
    try {
      value = parseValue(match[2]);
    } catch {
      issues.push({ code: "unsupported-value", line: index + 1 });
      return;
    }
    assignments.push({
      index,
      line: index + 1,
      raw,
      name: match[1],
      value,
      assignmentId: assignmentIdentity(index, raw),
    });
  });

  const credentialGroups = new Map();
  const integrationGroups = new Map();
  for (const assignment of assignments) {
    const credentialId = NAME_TO_CREDENTIAL.get(assignment.name);
    if (credentialId) {
      const group = credentialGroups.get(credentialId) ?? [];
      group.push(assignment);
      credentialGroups.set(credentialId, group);
    }
    const field = NAME_TO_INTEGRATION.get(assignment.name);
    if (field) {
      const group = integrationGroups.get(field) ?? [];
      group.push(assignment);
      integrationGroups.set(field, group);
    }
  }
  for (const [id, group] of credentialGroups) {
    if (group.length > 1) issues.push({ code: "ambiguous-credential", credentialId: id });
    else if (!group[0].value) issues.push({ code: "empty-credential", credentialId: id });
  }
  for (const [field, group] of integrationGroups) {
    if (group.length > 1) issues.push({ code: "ambiguous-integration", field });
  }
  return { lines, assignments, credentialGroups, integrationGroups, issues };
}

async function load(path) {
  await validatePath(path);
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, text: "", mode: 0o600, parsed: parse("") };
    throw error;
  }
  const ownershipIssue = safeOwnership(info);
  if (ownershipIssue) {
    const error = new Error(ownershipIssue);
    error.code = "UNSAFE_LEGACY_ENV";
    throw error;
  }
  const text = await readFile(path, "utf8");
  const after = await lstat(path);
  if (info.dev !== after.dev || info.ino !== after.ino || info.size !== after.size || info.mtimeMs !== after.mtimeMs || after.isSymbolicLink()) {
    throw new Error("legacy .env changed while it was being read");
  }
  return { exists: true, text, mode: info.mode & 0o777, parsed: parse(text) };
}

function assertSafe(source) {
  if (source.parsed.issues.length > 0) {
    const error = new Error("legacy .env contains ambiguous or unsupported assignments");
    error.code = "UNSAFE_LEGACY_ENV";
    error.issues = source.parsed.issues;
    throw error;
  }
}

function metadata(source) {
  return {
    exists: source.exists,
    revision: revision(source.text),
    safe: source.parsed.issues.length === 0,
    issues: source.parsed.issues,
    credentials: [...source.parsed.credentialGroups.entries()].map(([id, group]) => ({
      id,
      sourceName: group.length === 1 ? group[0].name : null,
      assignmentId: group.length === 1 ? group[0].assignmentId : null,
      line: group.length === 1 ? group[0].line : null,
    })),
    integrations: [...source.parsed.integrationGroups.entries()].map(([field, group]) => ({
      field,
      sourceName: group.length === 1 ? group[0].name : null,
      assignmentId: group.length === 1 ? group[0].assignmentId : null,
      line: group.length === 1 ? group[0].line : null,
    })),
  };
}

export async function inspectLegacyEnv(path) {
  try {
    return metadata(await load(path));
  } catch (error) {
    if (error?.code !== "UNSAFE_LEGACY_ENV") throw error;
    return { exists: true, revision: null, safe: false, issues: [{ code: "unsafe-file", reason: error.message }], credentials: [], integrations: [] };
  }
}

function exactAssignment(source, kind, id, expectedRevision, assignmentId) {
  if (revision(source.text) !== expectedRevision) {
    const error = new Error("legacy .env changed since it was inspected");
    error.code = "REVISION_CONFLICT";
    throw error;
  }
  assertSafe(source);
  const groups = kind === "credential" ? source.parsed.credentialGroups : source.parsed.integrationGroups;
  const group = groups.get(id) ?? [];
  if (group.length !== 1 || group[0].assignmentId !== assignmentId) {
    throw new Error("legacy assignment identity no longer matches the inspected file");
  }
  return group[0];
}

export async function readLegacyCandidate(path, { credentialId, expectedRevision, assignmentId } = {}) {
  if (!Object.hasOwn(LEGACY_CREDENTIAL_NAMES, credentialId)) throw new Error("unsupported legacy credential id");
  const source = await load(path);
  const assignment = exactAssignment(source, "credential", credentialId, expectedRevision, assignmentId);
  return { credentialId, candidate: assignment.value, sourceName: assignment.name, assignmentId };
}

export async function readLegacyIntegrations(path, { expectedRevision, assignments = [] } = {}) {
  const source = await load(path);
  const values = {};
  for (const requested of assignments) {
    if (!Object.hasOwn(LEGACY_INTEGRATION_NAMES, requested.field)) throw new Error("unsupported legacy integration field");
    const assignment = exactAssignment(source, "integration", requested.field, expectedRevision, requested.assignmentId);
    values[requested.field] = assignment.value;
  }
  return values;
}

async function replaceAtomically(path, text, mode, beforeRename) {
  const temporary = join(dirname(path), `..env.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", mode || 0o600);
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

export async function removeLegacyAssignments(path, {
  expectedRevision,
  assignments = [],
  confirmRemoval = false,
} = {}, {
  acquireLock = acquireTargetLock,
  beforeRename,
} = {}) {
  if (!Array.isArray(assignments) || assignments.length === 0) throw new Error("at least one inspected legacy assignment is required");
  if (confirmRemoval !== true) throw new Error("legacy assignment removal requires separate confirmation");
  await validatePath(path);
  const lock = await acquireLock(path);
  try {
    const source = await load(path);
    const indexes = new Set();
    for (const requested of assignments) {
      if (!requested || typeof requested !== "object" || Boolean(requested.credentialId) === Boolean(requested.field)) {
        throw new Error("each legacy removal must identify exactly one credential or integration field");
      }
      const kind = requested.credentialId ? "credential" : "integration";
      const id = requested.credentialId ?? requested.field;
      if (kind === "credential" && !Object.hasOwn(LEGACY_CREDENTIAL_NAMES, id)) throw new Error("unsupported legacy credential id");
      if (kind === "integration" && !Object.hasOwn(LEGACY_INTEGRATION_NAMES, id)) throw new Error("unsupported legacy integration field");
      const assignment = exactAssignment(source, kind, id, expectedRevision, requested.assignmentId);
      indexes.add(assignment.index);
    }
    const text = source.parsed.lines.filter((_, index) => !indexes.has(index)).join("");
    await replaceAtomically(path, text, source.mode, beforeRename);
    return inspectLegacyEnv(path);
  } finally {
    await lock.release();
  }
}
