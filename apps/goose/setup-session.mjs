import { lstat, realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";

const MAX_CONTROL_BYTES = 64 << 10;
const START_TIMEOUT_MS = 15_000;
const EVENTS = new Set(["ready", "session-opened", "done", "closed", "error"]);

async function realFile(path, label) {
  if (!isAbsolute(path ?? "")) throw new Error(`${label} must be absolute`);
  const canonical = await realpath(path);
  const info = await lstat(canonical);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${label} must be a real file`);
  return canonical;
}

function safeChildEnvironment(source = process.env) {
  const blocked = new Set(["BASH_ENV", "ENV", "NODE_OPTIONS", "NODE_PATH", "BUN_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH"]);
  const env = {};
  for (const [name, value] of Object.entries(source)) {
    const upper = name.toUpperCase();
    if (value == null || blocked.has(upper) || upper.startsWith("BUN_INSPECT")) continue;
    if (/(?:_API_KEY|_ACCESS_KEY|_KEY|_TOKEN|_SECRET|_PASSWORD|_CREDENTIALS?)$/i.test(upper)) continue;
    env[name] = value;
  }
  return env;
}

function validateSetupURL(raw) {
  const url = new URL(raw);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.pathname !== "/" || url.search || !url.hash || url.username || url.password) {
    throw new Error("setup child returned an invalid local capability URL");
  }
  return url.href;
}

function validateEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !EVENTS.has(value.event)) throw new Error("setup child returned an invalid control event");
  const allowed = value.event === "ready" ? ["event", "url"]
    : value.event === "closed" ? ["event", "reason"]
      : value.event === "error" ? ["event", "code"] : ["event"];
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(allowed.sort())) throw new Error("setup child returned an invalid control event shape");
  return value;
}

async function drainBounded(stream, child) {
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += chunk.byteLength;
    if (bytes > MAX_CONTROL_BYTES) child.kill();
  }
}

export function createSetupSessionManager({
  bunExecutable = process.execPath,
  controllerPath,
  bsigPath,
  newsroomPath,
  legacyEnvPath,
  spawn = Bun.spawn,
  which = Bun.which,
  platform = process.platform,
  env = process.env,
} = {}) {
  let active = null;

  async function start() {
    if (active?.url) return { status: "already-open", setupUrl: active.url };
    const [bun, controller, bsig] = await Promise.all([
      realFile(bunExecutable, "Bun executable"),
      realFile(controllerPath, "setup controller child"),
      realFile(bsigPath, "Engine executable"),
    ]);
    const child = spawn([
      bun, "--no-install", "--no-env-file", controller,
      "--bsig", bsig,
      "--newsroom-path", newsroomPath,
      "--legacy-env-path", legacyEnvPath,
    ], {
      env: safeChildEnvironment(env),
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    const current = { child, url: "", events: [] };
    active = current;
    void drainBounded(child.stderr, child);

    let settleReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => { settleReady = resolve; rejectReady = reject; });
    const timer = setTimeout(() => {
      child.kill();
      rejectReady(new Error("setup controller did not become ready"));
    }, START_TIMEOUT_MS);
    void (async () => {
      let bytes = 0;
      let buffer = "";
      try {
        for await (const chunk of child.stdout) {
          bytes += chunk.byteLength;
          if (bytes > MAX_CONTROL_BYTES) throw new Error("setup child exceeded its control-channel bound");
          buffer += Buffer.from(chunk).toString("utf8");
          while (buffer.includes("\n")) {
            const at = buffer.indexOf("\n");
            const line = buffer.slice(0, at);
            buffer = buffer.slice(at + 1);
            if (!line) continue;
            const event = validateEvent(JSON.parse(line));
            if (event.event === "ready") {
              current.url = validateSetupURL(event.url);
              settleReady(current.url);
            } else {
              current.events.push(event.event === "closed" ? { event: "closed", reason: String(event.reason ?? "").slice(0, 80) } : { event: event.event });
            }
          }
        }
        if (!current.url) rejectReady(new Error("setup controller exited before readiness"));
      } catch {
        child.kill();
        rejectReady(new Error("setup controller control channel failed closed"));
      } finally {
        if (active === current) active = null;
      }
    })();
    try {
      const setupUrl = await ready;
      return { status: "ready", setupUrl };
    } finally {
      clearTimeout(timer);
    }
  }

  async function openLocally() {
    if (!active?.url) return { ok: false, status: "session-expired" };
    const discovered = platform === "darwin" ? which("open") : platform === "win32" ? which("rundll32.exe") : which("xdg-open");
    if (!discovered) return { ok: false, status: "opener-unavailable" };
    let opener;
    try {
      opener = await realFile(discovered, "platform URL opener");
    } catch {
      return { ok: false, status: "opener-unavailable" };
    }
    const args = platform === "win32"
      ? [opener, "url.dll,FileProtocolHandler", active.url]
      : [opener, active.url];
    try {
      const opened = spawn(args, { stdin: "ignore", stdout: "ignore", stderr: "ignore", env: safeChildEnvironment(env) });
      const code = await opened.exited;
      return code === 0 ? { ok: true, status: "opened" } : { ok: false, status: "opener-failed" };
    } catch {
      return { ok: false, status: "opener-failed" };
    }
  }

  function close() {
    if (!active) return;
    try {
      active.child.stdin.write(`${JSON.stringify({ command: "close" })}\n`);
      active.child.stdin.end();
    } catch {
      active.child.kill();
    }
  }

  return Object.freeze({ start, openLocally, close, status: () => active ? { active: true, events: [...active.events] } : { active: false, events: [] } });
}
