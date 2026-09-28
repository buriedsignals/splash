import { invokeEngine } from "../../installer/setup/engine-bridge.mjs";

/**
 * Engine's public Splash operation set and the deadline Engine gives each operation's runner.
 * Mirrors `splashOperations` and the timeout constants in the Engine repository's
 * bsig/internal/run/splash.go (lines 30-34 and 48-58 on 2026-09-28). `runtime-smoke` and any
 * other id not in that table are deliberately absent: Engine refuses them, and so does this list.
 */
export const ENGINE_OPERATION_TIMEOUTS_MS = Object.freeze({
  preflight: 45_000,
  "provider-check-maptiler": 45_000,
  "provider-check-datawrapper": 45_000,
  "provider-check-cloudflare": 45_000,
  "story-inspect": 45_000,
  "map-bake": 15 * 60_000,
  "datawrapper-produce": 15 * 60_000,
  "maptiler-delivery": 15 * 60_000,
  "cloudflare-deploy": 30 * 60_000,
});

export const ENGINE_OPERATIONS = Object.freeze(Object.keys(ENGINE_OPERATION_TIMEOUTS_MS).sort());

// Engine's own deadline bounds only the runner child. Verifying assets and reading the credential
// broker (which can wait on a keychain approval) happen before it, so the server waits a margin
// longer and Engine's own timeout error, not a kill from here, is what the agent normally sees.
export const ENGINE_DEADLINE_MARGIN_MS = 60_000;
// Engine's maxSplashRequestBytes (splash.go:31): refused here before a process is spawned.
export const MAX_REQUEST_BYTES = 64 << 10;
// Engine captures at most 4 MiB per stream and the runner's result is a single small JSON line.
export const MAX_OUTPUT_BYTES = 4 << 20;
export const MAX_LINE_BYTES = 1 << 20;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_DETAIL_CHARS = 4_000;
const HEARTBEAT_MS = 20_000;

export function operationDeadlineMs(operation) {
  const engine = ENGINE_OPERATION_TIMEOUTS_MS[operation];
  if (engine === undefined) throw new Error(`unknown Splash operation: ${String(operation).slice(0, 64)}`);
  return engine + ENGINE_DEADLINE_MARGIN_MS;
}

export class EngineOperationError extends Error {
  constructor(message, { code = "engine-error", detail = null } = {}) {
    super(message);
    this.name = "EngineOperationError";
    this.code = code;
    this.detail = detail;
  }
}

/** Values this process holds that must never be relayed, even if Engine failed to redact them. */
function heldSecrets(environment) {
  const values = [];
  for (const [name, value] of Object.entries(environment ?? {})) {
    if (typeof value !== "string" || value.length < 8) continue;
    if (/(?:_API_KEY|_ACCESS_KEY|_KEY|_TOKEN|_SECRET|_PASSWORD|_CREDENTIALS?)$/i.test(name)) values.push(value);
  }
  return values;
}

function scrub(text, secrets, limit) {
  let out = String(text ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
  for (const secret of secrets) out = out.split(secret).join("[redacted]");
  return out.length > limit ? `${out.slice(0, limit)}…` : out;
}

function lastStderrProgress(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const message = events[index]?.message;
    if (events[index]?.event === "progress" && typeof message === "string" && message.startsWith("Splash operation stderr:")) {
      return message.slice("Splash operation stderr:".length).trim();
    }
  }
  return null;
}

/**
 * Runs one sealed Engine operation: `<bsig> --json run splash <operation>` with the request as
 * one JSON line on stdin. The bridge restores HOME and strips credential-shaped variables. Story
 * binding, request validation and credential injection all stay in Engine; this only forwards.
 */
export async function runEngineOperation({
  executable,
  operation,
  request,
  signal = null,
  invoke = invokeEngine,
  environment = process.env,
}) {
  const timeoutMs = operationDeadlineMs(operation);
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new EngineOperationError("The operation request must be a JSON object.", { code: "invalid-request" });
  }
  const body = `${JSON.stringify(request)}\n`;
  if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) {
    throw new EngineOperationError(`The operation request exceeds ${MAX_REQUEST_BYTES} bytes.`, { code: "invalid-request" });
  }
  const secrets = heldSecrets(environment);
  let result;
  try {
    result = await invoke(executable, ["run", "splash", operation], body, {
      timeoutMs,
      signal,
      maxOutputBytes: MAX_OUTPUT_BYTES,
      maxLineBytes: MAX_LINE_BYTES,
      environment,
    });
  } catch (error) {
    if (error?.code === "ENGINE_CANCELLED") {
      throw new EngineOperationError(`The ${operation} operation was cancelled and Engine was stopped.`, { code: "cancelled" });
    }
    if (error?.code === "ENGINE_TIMEOUT") {
      throw new EngineOperationError(`Engine did not finish ${operation} within ${Math.round(timeoutMs / 60_000)} minutes and was stopped.`, { code: "timeout" });
    }
    if (error?.code === "ENGINE_OUTPUT_LIMIT") {
      throw new EngineOperationError(`Engine's output for ${operation} exceeded the bounded limit and was refused.`, { code: "output-limit" });
    }
    throw new EngineOperationError(`Engine could not run ${operation}.`, { code: "engine-unreachable" });
  }
  const event = result.events.at(-1);
  if (result.exitCode === 0 && event?.event === "result") {
    return event.data ?? {};
  }
  const failure = event?.data?.failure;
  const message = event?.event === "error" && typeof event.message === "string"
    ? event.message
    : `Engine ended ${operation} without a result (exit ${result.exitCode}).`;
  const guidance = typeof failure?.guidance === "string" ? failure.guidance : null;
  const stderr = lastStderrProgress(result.events);
  throw new EngineOperationError(scrub(message, secrets, MAX_MESSAGE_CHARS), {
    detail: {
      ...(guidance ? { guidance: scrub(guidance, secrets, MAX_MESSAGE_CHARS) } : {}),
      ...(stderr ? { stderr: scrub(stderr, secrets, MAX_DETAIL_CHARS) } : {}),
      exitCode: result.exitCode,
    },
  });
}

/**
 * The server's operation runner. It remembers every running Engine child so that server shutdown
 * stops them all, as well as the per-call MCP cancellation signal.
 */
export function createOperationRunner({ executable, invoke = invokeEngine, environment = process.env } = {}) {
  const running = new Set();
  let closed = false;
  return Object.freeze({
    async run(operation, request, { signal = null, onHeartbeat = null } = {}) {
      if (closed) throw new EngineOperationError("The Splash server is shutting down.", { code: "cancelled" });
      const controller = new AbortController();
      const forward = () => controller.abort();
      if (signal?.aborted) controller.abort();
      signal?.addEventListener("abort", forward, { once: true });
      running.add(controller);
      const heartbeat = onHeartbeat ? setInterval(() => onHeartbeat(), HEARTBEAT_MS) : null;
      heartbeat?.unref?.();
      try {
        return await runEngineOperation({ executable, operation, request, signal: controller.signal, invoke, environment });
      } finally {
        clearInterval(heartbeat);
        signal?.removeEventListener("abort", forward);
        running.delete(controller);
      }
    },
    get running() {
      return running.size;
    },
    close() {
      closed = true;
      for (const controller of running) controller.abort();
    },
  });
}
