import { chmod, lstat, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join } from "node:path";
import { CREDENTIAL_IDS, ENGINE_SPLASH_CONTRACT_MIN } from "../../apps/goose/contract.mjs";

const MAX_OUTPUT_BYTES = 1 << 20;
const MAX_CANDIDATE_BYTES = 16 << 10;
const CREDENTIAL_ID_SET = new Set(CREDENTIAL_IDS);
const CREDENTIAL_POLICIES = new Map([
  ["MAPTILER_KEY", ["provider-request-required", "validate-before-atomic-replacement"]],
  ["MAPTILER_DELIVERY_KEY", ["saved-unverified-origin-attestation", "attest-before-atomic-replacement"]],
  ["DATAWRAPPER_TOKEN", ["authenticated-account-request", "validate-before-atomic-replacement"]],
  ["CLOUDFLARE_API_TOKEN", ["token-and-account-verified-pages-scope-attested", "validate-before-atomic-replacement"]],
]);
const BROKER_REASON_CODES = new Set([
  "engine-missing",
  "engine-outdated",
  "secure-store-unavailable",
  "topology-unsupported",
  "engine-unreachable",
]);
const VALIDATION_STATUSES = new Set(["verified", "partially-verified", "unverified"]);
const VALIDATION_DIMENSION_STATUSES = new Set(["verified", "attested", "unverified"]);
const FAILURE_MESSAGES = new Map([
  ["invalid", "provider rejected the candidate"],
  ["provider-unavailable", "Credential validation is temporarily unavailable."],
  ["rate-limited", "Credential validation is temporarily rate-limited."],
  ["insufficient-evidence", "Credential validation did not provide sufficient evidence."],
  ["validation-failed", "The credential candidate could not be accepted."],
]);
export const CREDENTIAL_CONTRACT_MESSAGE = "Update or repair Engine before changing Splash credentials.";

function safeEnvironment(source = process.env) {
  const exact = new Set([
    "BASH_ENV", "ENV", "NODE_OPTIONS", "NODE_PATH", "BUN_OPTIONS", "BUN_INSTALL_CACHE_DIR",
    "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH",
  ]);
  const env = {};
  for (const [name, value] of Object.entries(source)) {
    const upper = name.toUpperCase();
    if (value == null || exact.has(upper) || upper.startsWith("BUN_INSPECT")) continue;
    if (CREDENTIAL_ID_SET.has(upper) || /(?:_API_KEY|_ACCESS_KEY|_KEY|_TOKEN|_SECRET|_PASSWORD|_CREDENTIALS?)$/i.test(upper)) continue;
    env[name] = value;
  }
  return env;
}

async function readBounded(stream, child, label) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > MAX_OUTPUT_BYTES) {
      child.kill();
      throw new Error(`${label} exceeded the bounded control-channel limit`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseEvents(stdout) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error("Engine returned malformed control output");
    }
    if (!event || typeof event !== "object" || Array.isArray(event) || !["progress", "result", "error"].includes(event.event)) {
      throw new Error("Engine returned an unsupported control event");
    }
    events.push(event);
  }
  if (events.length === 0) throw new Error("Engine returned no terminal control event");
  return events;
}
function executableIdentity(canonical, info) {
  return Object.freeze({
    canonical,
    device: String(info.dev),
    inode: String(info.ino),
  });
}

function isSameExecutableIdentity(actual, expected) {
  return actual.canonical === expected.canonical
    && actual.device === expected.device
    && actual.inode === expected.inode;
}

async function runEngineProcess(programPath, args, input, timeoutMs = 90_000) {
  const child = Bun.spawn([programPath, "--json", ...args], {
    env: safeEnvironment(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  child.stdin.write(input);
  child.stdin.end();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      readBounded(child.stdout, child, "Engine stdout"),
      readBounded(child.stderr, child, "Engine stderr"),
      child.exited,
    ]);
    if (timedOut) throw new Error("Engine credential operation timed out");
    return { events: parseEvents(stdout), stderr, exitCode };
  } finally {
    clearTimeout(timer);
  }
}

export async function invokeEngine(
  executable,
  args,
  stdin = "",
  { timeoutMs = 90_000, expectedExecutableIdentity = null } = {},
) {
  if (!isAbsolute(executable)) throw new Error("Engine executable must be absolute");
  const canonical = await realpath(executable);
  const info = await lstat(canonical);
  if (!info.isFile() || info.isSymbolicLink() || (process.platform !== "win32" && (info.mode & 0o111) === 0)) {
    throw new Error("Engine executable is not a real executable file");
  }
  const identity = executableIdentity(canonical, info);
  if (expectedExecutableIdentity && !isSameExecutableIdentity(identity, expectedExecutableIdentity)) {
    throw new Error("Engine executable changed after the credential contract handshake");
  }
  return { ...await runEngineProcess(canonical, args, stdin, timeoutMs), executableIdentity: identity };
}

const MAX_EXECUTABLE_BYTES = 128 << 20;

/**
 * Real-execution seam for a protected session. The first call resolves and digests the configured
 * Engine executable and freezes those exact bytes into a private 0700-directory snapshot; every
 * later call re-verifies that the original still matches the handshake identity AND digest (any
 * drift, including an in-place same-inode rewrite, refuses before anything is spawned or
 * transmitted), then launches only the frozen snapshot bytes. This closes both substitution paths
 * left open by path/device/inode comparison alone: content replacement and the check-to-spawn
 * window on the original pathname.
 */
function createSessionLauncher(executable) {
  let identity = null;
  let snapshot = null;

  async function ensureSnapshot() {
    const canonical = await realpath(executable);
    const info = await lstat(canonical);
    if (!info.isFile() || info.isSymbolicLink() || (process.platform !== "win32" && (info.mode & 0o111) === 0)) {
      throw new Error("Engine executable is not a real executable file");
    }
    const contents = await readFile(canonical);
    if (contents.byteLength > MAX_EXECUTABLE_BYTES) throw new Error("Engine executable exceeds the protected-session snapshot bound");
    const observed = {
      canonical,
      device: String(info.dev),
      inode: String(info.ino),
      digest: createHash("sha256").update(contents).digest("hex"),
    };
    if (identity === null) {
      identity = Object.freeze(observed);
    } else if (
      identity.canonical !== observed.canonical
      || identity.device !== observed.device
      || identity.inode !== observed.inode
      || identity.digest !== observed.digest
    ) {
      throw new Error("Engine executable changed after the credential contract handshake");
    }
    if (snapshot === null) {
      const dir = await mkdtemp(join(tmpdir(), "splash-engine-session-"));
      await chmod(dir, 0o700);
      const path = join(dir, basename(canonical));
      await writeFile(path, contents, { mode: 0o500 });
      const snapshotInfo = await lstat(path);
      snapshot = Object.freeze({
        dir,
        path,
        device: String(snapshotInfo.dev),
        inode: String(snapshotInfo.inode),
        size: snapshotInfo.size,
      });
      process.once("exit", () => {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          // A best-effort temp cleanup must never mask the operation result.
        }
      });
    } else {
      // Tamper evidence on the private snapshot itself before every launch.
      const snapshotInfo = await lstat(snapshot.path);
      if (
        String(snapshotInfo.dev) !== snapshot.device
        || String(snapshotInfo.inode) !== snapshot.inode
        || snapshotInfo.size !== snapshot.size
      ) {
        throw new Error("the Engine executable snapshot changed during the protected session");
      }
    }
    return snapshot.path;
  }

  return {
    get identity() {
      return identity === null ? null : Object.freeze({
        canonical: identity.canonical,
        device: identity.device,
        inode: identity.inode,
      });
    },
    async run(args, input, timeoutMs = 90_000) {
      const snapshotPath = await ensureSnapshot();
      return { ...await runEngineProcess(snapshotPath, args, input, timeoutMs), executableIdentity: this.identity };
    },
  };
}

function requireCredentialId(id) {
  if (!CREDENTIAL_ID_SET.has(id)) throw new Error("unsupported Splash credential id");
}

function exactContext(id, context) {
  if (!context || typeof context !== "object" || Array.isArray(context)) throw new Error("validation context must be an object");
  const expected = id === "CLOUDFLARE_API_TOKEN"
    ? ["cloudflareAccountId", "pagesScopeAttested"]
    : id === "MAPTILER_DELIVERY_KEY"
      ? ["originRestrictionsAttested"]
      : [];
  const actual = Object.keys(context).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected.sort())) throw new Error("validation context does not match the credential contract");
  if (id === "CLOUDFLARE_API_TOKEN") {
    if (!/^[0-9a-f]{32}$/i.test(context.cloudflareAccountId ?? "") || context.pagesScopeAttested !== true) {
      throw new Error("Cloudflare validation requires its account id and Pages scope attestation");
    }
  }
  if (id === "MAPTILER_DELIVERY_KEY" && context.originRestrictionsAttested !== true) {
    throw new Error("MapTiler delivery validation requires origin-restriction attestation");
  }
  return context;
}

function containsCandidate(value, candidate) {
  if (typeof value === "string") return value.includes(candidate) || value.includes(encodeURIComponent(candidate));
  if (Array.isArray(value)) return value.some((item) => containsCandidate(item, candidate));
  if (value && typeof value === "object") return Object.values(value).some((item) => containsCandidate(item, candidate));
  return false;
}

function terminal(result, candidate = "") {
  if (candidate && (containsCandidate(result.stderr, candidate) || containsCandidate(result.events, candidate))) {
    throw new Error("Engine violated the credential redaction boundary");
  }
  return result.events.at(-1);
}

function publicValidation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !VALIDATION_STATUSES.has(value.status)) return null;
  const dimensions = Array.isArray(value.dimensions)
    ? value.dimensions.slice(0, 16).flatMap((row) => {
        if (!row
          || typeof row !== "object"
          || Array.isArray(row)
          || !/^[a-z][a-z0-9-]{0,63}$/.test(row.id ?? "")
          || !VALIDATION_DIMENSION_STATUSES.has(row.status)) return [];
        return [Object.freeze({ id: row.id, status: row.status, reason: null })];
      })
    : [];
  const validatedAt = typeof value.validatedAt === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value.validatedAt)
    && Number.isFinite(Date.parse(value.validatedAt))
    ? value.validatedAt
    : null;
  const cloudflareAccountId = /^[0-9a-f]{32}$/i.test(value.evidence?.cloudflareAccountId ?? "")
    ? value.evidence.cloudflareAccountId.toLowerCase()
    : null;
  return Object.freeze({
    status: value.status,
    validatedAt,
    dimensions: Object.freeze(dimensions),
    evidence: cloudflareAccountId ? Object.freeze({ cloudflareAccountId }) : null,
  });
}

function normalizedStatus(data, id, metadata = null) {
  if (!data
    || typeof data !== "object"
    || Array.isArray(data)
    || data.id !== id
    || typeof data.stored !== "boolean"
    || !Number.isSafeInteger(data.generation)
    || publicBroker(data.broker)?.status !== "available"
    || data.credentialIndependentPathsAvailable !== true) return null;
  return Object.freeze({
    id,
    status: data.status,
    stored: data.stored,
    generation: data.generation,
    metadata: metadata ?? publicMetadata(data.metadata),
    validation: publicValidation(data.validation),
    broker: Object.freeze({ status: "available" }),
    credentialIndependentPathsAvailable: true,
  });
}

function normalizedOperationStatus(data, id, operation, expectedGeneration, contractRequired, metadata) {
  // A validated session makes the canonical contract version mandatory on every operation
  // envelope: the real Engine always sends it, so absence is a malformed or downgraded response,
  // never a supported legacy shape.
  if (contractRequired
    && (!Number.isSafeInteger(data?.contractVersion) || data.contractVersion < ENGINE_SPLASH_CONTRACT_MIN)) return null;
  const status = normalizedStatus(data, id, metadata);
  if (!status) return null;
  const coherent = operation === "status"
    ? (status.status === "stored" && status.stored && status.generation >= 1)
      || (status.status === "not-stored" && !status.stored && status.generation === 0)
    : operation === "replace"
      ? status.status === "stored" && status.stored && status.generation > expectedGeneration
      : status.status === "removed" && !status.stored && status.generation > expectedGeneration;
  return coherent ? status : null;
}

function publicMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  let acquisitionUrl = null;
  try {
    const parsed = new URL(value.acquisitionUrl);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) acquisitionUrl = parsed.href;
  } catch {
    // A malformed provider link is omitted rather than relayed into the setup page.
  }
  return {
    name: typeof value.name === "string" ? value.name.slice(0, 160) : null,
    purpose: typeof value.purpose === "string" ? value.purpose.slice(0, 1024) : null,
    acquisitionUrl,
    candidateMaxBytes: Number.isSafeInteger(value.candidateMaxBytes) ? value.candidateMaxBytes : null,
  };
}
function unavailableContract(reasonCode) {
  return Object.freeze({
    ok: false,
    contractVersion: ENGINE_SPLASH_CONTRACT_MIN,
    broker: Object.freeze({
      status: "unavailable",
      reasonCode,
      message: CREDENTIAL_CONTRACT_MESSAGE,
    }),
    credentialIndependentPathsAvailable: true,
    keys: Object.freeze([]),
  });
}

function publicBroker(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.status === "available") return Object.freeze({ status: "available" });
  if (value.status !== "unavailable" || !BROKER_REASON_CODES.has(value.reasonCode)) return null;
  return Object.freeze({
    status: "unavailable",
    reasonCode: value.reasonCode,
    message: CREDENTIAL_CONTRACT_MESSAGE,
  });
}

function isCompatibleCredentialRow(row, id) {
  const metadata = row?.metadata;
  const policy = CREDENTIAL_POLICIES.get(id);
  return row
    && typeof row === "object"
    && !Array.isArray(row)
    && metadata
    && typeof metadata === "object"
    && !Array.isArray(metadata)
    && row.id === id
    && metadata.id === id
    && row.storageKind === "record"
    && metadata.storageKind === "record"
    && row.validatable === true
    && metadata.validatorAvailable === true
    && Number.isSafeInteger(metadata.contractVersion)
    && metadata.contractVersion >= ENGINE_SPLASH_CONTRACT_MIN
    && metadata.validatorPolicy === policy[0]
    && metadata.replacementBehavior === policy[1]
    && Number.isSafeInteger(metadata.candidateMaxBytes)
    && metadata.candidateMaxBytes > 0
    && metadata.candidateMaxBytes <= MAX_CANDIDATE_BYTES;
}

function normalizedListContract(data) {
  if (!data
    || typeof data !== "object"
    || Array.isArray(data)
    || !Number.isSafeInteger(data.contractVersion)
    || data.contractVersion < ENGINE_SPLASH_CONTRACT_MIN
    || data.credentialIndependentPathsAvailable !== true
    || !Array.isArray(data.keys)) return null;
  const broker = publicBroker(data.broker);
  if (!broker) return null;
  const keys = [];
  for (const id of CREDENTIAL_IDS) {
    const matches = data.keys.filter((row) => row?.id === id);
    if (matches.length !== 1 || !isCompatibleCredentialRow(matches[0], id)) return null;
    const row = matches[0];
    keys.push(Object.freeze({
      id,
      stored: typeof row.stored === "boolean" ? row.stored : null,
      generation: Number.isSafeInteger(row.generation) ? row.generation : null,
      validation: null,
      metadata: Object.freeze(publicMetadata(row.metadata)),
    }));
  }
  return Object.freeze({
    ok: broker.status === "available",
    contractVersion: data.contractVersion,
    broker,
    credentialIndependentPathsAvailable: true,
    keys: Object.freeze(keys),
  });
}

function normalizedFailure(event, id) {
  const data = event?.data;
  const allowed = new Set(["rejected", "conflict", "lock-timeout", "lock-failed"]);
  if (data && typeof data === "object" && allowed.has(data.status)) {
    const outcome = FAILURE_MESSAGES.has(data.outcome) ? data.outcome : data.status;
    return Object.freeze({
      ok: false,
      id,
      status: data.status,
      outcome,
      reason: FAILURE_MESSAGES.get(outcome) ?? null,
      expectedGeneration: Number.isSafeInteger(data.expectedGeneration) ? data.expectedGeneration : null,
      observedGeneration: Number.isSafeInteger(data.observedGeneration) ? data.observedGeneration : null,
      previousRecord: data.previousRecord === "unchanged" ? "unchanged" : null,
      written: false,
    });
  }
  const broker = publicBroker(data?.broker);
  if (broker?.status === "unavailable") {
    return Object.freeze({
      ok: false,
      id,
      status: "broker-unavailable",
      outcome: broker.reasonCode,
      reason: broker.message,
      written: false,
      credentialIndependentPathsAvailable: data.credentialIndependentPathsAvailable === true,
    });
  }
  return Object.freeze({ ok: false, id, status: "engine-error", outcome: "engine-error", reason: null, written: false });
}

export function createEngineBridge({ executable, invoke = invokeEngine } = {}) {
  if (!isAbsolute(executable ?? "")) throw new Error("Engine bridge requires an absolute executable");
  let boundExecutableIdentity = null;
  let validatedContract = null;
  const launcher = invoke === invokeEngine ? createSessionLauncher(executable) : null;

  async function call(args, input = "", candidate = "") {
    const result = launcher
      ? await launcher.run(args, input)
      : await invoke(executable, args, input, {
          expectedExecutableIdentity: boundExecutableIdentity,
        });
    const event = terminal(result, candidate);
    return { result, event };
  }

  function retainedMetadata(id) {
    return validatedContract?.keys.find((row) => row.id === id)?.metadata ?? null;
  }

  return Object.freeze({
    async list() {
      let result;
      let event;
      try {
        ({ result, event } = await call(["keys", "list"]));
      } catch {
        validatedContract = null;
        return unavailableContract("engine-unreachable");
      }
      if (result.exitCode !== 0 || event.event !== "result") {
        validatedContract = null;
        return unavailableContract("engine-unreachable");
      }
      const contract = normalizedListContract(event.data);
      if (!contract) {
        validatedContract = null;
        return unavailableContract("engine-outdated");
      }
      if (contract.ok) {
        validatedContract = contract;
        boundExecutableIdentity = result.executableIdentity ?? null;
      } else {
        validatedContract = null;
        boundExecutableIdentity = null;
      }
      return contract;
    },

    async status(id) {
      requireCredentialId(id);
      let result;
      let event;
      try {
        ({ result, event } = await call(["keys", "status", id]));
      } catch {
        return normalizedFailure(null, id);
      }
      if (result.exitCode !== 0 || event.event !== "result") return normalizedFailure(event, id);
      const status = normalizedOperationStatus(
        event.data,
        id,
        "status",
        0,
        validatedContract !== null,
        retainedMetadata(id),
      );
      return status ? Object.freeze({ ok: true, ...status }) : normalizedFailure(null, id);
    },

    async replace(id, { candidate, expectedGeneration, validationContext = {} } = {}) {
      requireCredentialId(id);
      if (typeof candidate !== "string" || candidate.length === 0 || Buffer.byteLength(candidate) > MAX_CANDIDATE_BYTES || /[\u0000\r\n]/.test(candidate)) {
        throw new Error("credential candidate is empty or exceeds the local input contract");
      }
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0) throw new Error("expected credential generation is required");
      const context = exactContext(id, validationContext);
      const input = `${JSON.stringify({ candidate, validationContext: context, expectedGeneration })}\n`;
      const { result, event } = await call(["keys", "replace", id], input, candidate);
      if (result.exitCode !== 0 || event.event !== "result") return normalizedFailure(event, id);
      const status = normalizedOperationStatus(
        event.data,
        id,
        "replace",
        expectedGeneration,
        validatedContract !== null,
        retainedMetadata(id),
      );
      return status ? Object.freeze({ ok: true, ...status }) : normalizedFailure(null, id);
    },

    async remove(id, { expectedGeneration } = {}) {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 1) throw new Error("stored credential generation is required");
      const { result, event } = await call(
        ["keys", "remove", id],
        `${JSON.stringify({ expectedGeneration })}\n`,
      );
      if (result.exitCode !== 0 || event.event !== "result") return normalizedFailure(event, id);
      const status = normalizedOperationStatus(
        event.data,
        id,
        "remove",
        expectedGeneration,
        validatedContract !== null,
        retainedMetadata(id),
      );
      return status ? Object.freeze({ ok: true, ...status }) : normalizedFailure(null, id);
    },
  });
}
