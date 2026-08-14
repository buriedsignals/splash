import { lstat, realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";

const MAX_OUTPUT_BYTES = 1 << 20;
const MAX_CANDIDATE_BYTES = 16 << 10;
const CREDENTIAL_IDS = new Set([
  "MAPTILER_KEY",
  "MAPTILER_DELIVERY_KEY",
  "DATAWRAPPER_TOKEN",
  "CLOUDFLARE_API_TOKEN",
]);

function safeEnvironment(source = process.env) {
  const exact = new Set([
    "BASH_ENV", "ENV", "NODE_OPTIONS", "NODE_PATH", "BUN_OPTIONS", "BUN_INSTALL_CACHE_DIR",
    "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH",
  ]);
  const env = {};
  for (const [name, value] of Object.entries(source)) {
    const upper = name.toUpperCase();
    if (value == null || exact.has(upper) || upper.startsWith("BUN_INSPECT")) continue;
    if (CREDENTIAL_IDS.has(upper) || /(?:_API_KEY|_ACCESS_KEY|_KEY|_TOKEN|_SECRET|_PASSWORD|_CREDENTIALS?)$/i.test(upper)) continue;
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

export async function invokeEngine(executable, args, stdin = "", { timeoutMs = 90_000 } = {}) {
  if (!isAbsolute(executable)) throw new Error("Engine executable must be absolute");
  const canonical = await realpath(executable);
  const info = await lstat(canonical);
  if (!info.isFile() || info.isSymbolicLink() || (process.platform !== "win32" && (info.mode & 0o111) === 0)) {
    throw new Error("Engine executable is not a real executable file");
  }
  const child = Bun.spawn([canonical, "--json", ...args], {
    env: safeEnvironment(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  child.stdin.write(stdin);
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

function requireCredentialId(id) {
  if (!CREDENTIAL_IDS.has(id)) throw new Error("unsupported Splash credential id");
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

function normalizedStatus(data, id) {
  if (!data || typeof data !== "object" || data.id !== id || typeof data.stored !== "boolean" || !Number.isSafeInteger(data.generation)) {
    throw new Error("Engine returned an invalid credential status");
  }
  return {
    id,
    status: data.status,
    stored: data.stored,
    generation: data.generation,
    metadata: publicMetadata(data.metadata),
    validation: data.validation ?? null,
    broker: data.broker ?? null,
    credentialIndependentPathsAvailable: data.credentialIndependentPathsAvailable === true,
  };
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

function normalizedFailure(event, id) {
  const data = event?.data;
  const allowed = new Set(["rejected", "conflict", "lock-timeout", "lock-failed"]);
  if (data && typeof data === "object" && allowed.has(data.status)) {
    return {
      ok: false,
      id,
      status: data.status,
      outcome: typeof data.outcome === "string" ? data.outcome : data.status,
      reason: typeof data.reason === "string" ? data.reason : null,
      expectedGeneration: Number.isSafeInteger(data.expectedGeneration) ? data.expectedGeneration : null,
      observedGeneration: Number.isSafeInteger(data.observedGeneration) ? data.observedGeneration : null,
      previousRecord: data.previousRecord === "unchanged" ? "unchanged" : null,
      written: false,
    };
  }
  if (data?.broker?.status === "unavailable") {
    return {
      ok: false,
      id,
      status: "broker-unavailable",
      outcome: data.broker.reasonCode ?? "broker-unavailable",
      reason: data.broker.message ?? null,
      written: false,
      credentialIndependentPathsAvailable: data.credentialIndependentPathsAvailable === true,
    };
  }
  return { ok: false, id, status: "engine-error", outcome: "engine-error", reason: null, written: false };
}

export function createEngineBridge({ executable, invoke = invokeEngine } = {}) {
  if (!isAbsolute(executable ?? "")) throw new Error("Engine bridge requires an absolute executable");

  async function call(args, input = "", candidate = "") {
    const result = await invoke(executable, args, input);
    const event = terminal(result, candidate);
    return { result, event };
  }

  return Object.freeze({
    async list() {
      const { result, event } = await call(["keys", "list"]);
      if (result.exitCode !== 0 || event.event !== "result" || !Array.isArray(event.data?.keys)) {
        return { ok: false, status: "engine-error", keys: [] };
      }
      return {
        ok: true,
        broker: event.data.broker ?? null,
        credentialIndependentPathsAvailable: event.data.credentialIndependentPathsAvailable === true,
        keys: event.data.keys.filter((row) => CREDENTIAL_IDS.has(row?.id)).map((row) => ({
          id: row.id,
          stored: row.stored,
          generation: row.generation ?? null,
          validation: row.validation ?? null,
          metadata: publicMetadata(row.metadata),
        })),
      };
    },

    async status(id) {
      requireCredentialId(id);
      const { result, event } = await call(["keys", "status", id]);
      if (result.exitCode !== 0 || event.event !== "result") return normalizedFailure(event, id);
      return { ok: true, ...normalizedStatus(event.data, id) };
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
      return { ok: true, ...normalizedStatus(event.data, id) };
    },

    async remove(id, { expectedGeneration } = {}) {
      requireCredentialId(id);
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 1) throw new Error("stored credential generation is required");
      const { result, event } = await call(
        ["keys", "remove", id],
        `${JSON.stringify({ expectedGeneration })}\n`,
      );
      if (result.exitCode !== 0 || event.event !== "result") return normalizedFailure(event, id);
      return { ok: true, ...normalizedStatus(event.data, id) };
    },
  });
}
