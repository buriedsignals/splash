import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

const BODY_LIMIT = 16 << 10;
const REQUEST_TIMEOUT_MS = 10_000;
const MODES = new Set(["storyboard", "a-la-carte"]);
const HTML_NONCE = "__SPLASH_NONCE__";
const HTML_CSS = "/*__SPLASH_BROWSER_CSS__*/";
const HTML_APP = "/*__SPLASH_BROWSER_APP__*/";

function randomCapability() {
  return randomBytes(32).toString("base64url");
}

function exactObject(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...fields].sort())) {
    throw new Error(`${label} fields do not match the closed contract`);
  }
  return value;
}

function securityHeaders(contentType, nonce = "") {
  const headers = {
    "cache-control": "no-store, max-age=0",
    "content-type": contentType,
    "cross-origin-opener-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
  if (contentType.startsWith("text/html")) {
    headers["content-security-policy"] = [
      "default-src 'none'",
      `script-src 'nonce-${nonce}'`,
      `style-src 'nonce-${nonce}'`,
      "connect-src 'self'",
      "img-src 'self' data:",
      "form-action 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join("; ");
  }
  return headers;
}

function sendJson(response, status, body, extraHeaders = {}) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  response.writeHead(status, {
    ...securityHeaders("application/json; charset=utf-8"),
    "content-length": String(bytes.byteLength),
    ...extraHeaders,
  });
  response.end(bytes);
}

function sendHtml(response, body, nonce) {
  const bytes = Buffer.from(body);
  response.writeHead(200, {
    ...securityHeaders("text/html; charset=utf-8", nonce),
    "content-length": String(bytes.byteLength),
  });
  response.end(bytes);
}

function cookie(request, name) {
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

async function readJson(request) {
  if ((request.headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    const error = new Error("application/json is required");
    error.status = 415;
    throw error;
  }
  const declared = Number(request.headers["content-length"] ?? "0");
  if (Number.isFinite(declared) && declared > BODY_LIMIT) {
    const error = new Error("request body is too large");
    error.status = 413;
    throw error;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.byteLength;
    if (total > BODY_LIMIT) {
      const error = new Error("request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("request body must be one JSON object");
  return value;
}

function publicError(error) {
  if (error?.code === "PREFLIGHT_REQUIRED") return { status: 409, message: "Complete Splash preflight before choosing a treatment." };
  if (error?.code === "RECOMMENDATION_CONFLICT" || error?.code === "REVISION_CONFLICT" || error?.code === "SELECTION_CONFLICT") {
    return { status: 409, message: "The story or recommendation changed. Return to Goose and reopen this interface." };
  }
  if (error?.code === "OPTION_UNAVAILABLE") return { status: 409, message: "That treatment is no longer reachable. Reopen this interface." };
  if (error?.code === "WRONG_TREATMENT_GATE") return { status: 409, message: "This story is not waiting for a visual treatment. Return to Goose and resume from disk." };
  if (error?.status === 413 || error?.status === 415) return { status: error.status, message: error.message };
  return { status: 400, message: "Splash refused the request without changing the story." };
}

function assertTreatmentModel(model, mode) {
  const selectionModel = mode === "storyboard" ? model?.selection : model;
  if (selectionModel?.gate?.id !== "G2-treatment" || selectionModel?.gate?.awaiting !== "treatment") {
    const error = new Error("the bound story is not at the treatment gate");
    error.code = "WRONG_TREATMENT_GATE";
    throw error;
  }
  return model;
}

export async function renderBrowserInterfaceHtml() {
  const root = join(import.meta.dirname, "resources");
  const [template, css, build] = await Promise.all([
    readFile(join(root, "browser-interface.html"), "utf8"),
    readFile(join(root, "browser-interface.css"), "utf8"),
    Bun.build({
      entrypoints: [join(root, "browser-interface.mjs")],
      format: "iife",
      minify: true,
      target: "browser",
    }),
  ]);
  if (!build.success || build.outputs.length !== 1) throw new Error("could not bundle the Splash browser interface");
  if (![HTML_NONCE, HTML_CSS, HTML_APP].every((marker) => template.includes(marker))) throw new Error("Splash browser template markers are missing");
  const bundled = await build.outputs[0].text();
  return template
    .replace(HTML_CSS, () => css)
    .replace(HTML_APP, () => bundled);
}

export async function startBrowserInterface({
  mode,
  storyBinding,
  selection,
  recommendation,
  html = renderBrowserInterfaceHtml,
  host = "127.0.0.1",
  idleMs = 4 * 60_000,
  overallMs = 4 * 60_000,
} = {}) {
  if (!MODES.has(mode)) throw new Error("Splash browser interface mode is invalid");
  if (host !== "127.0.0.1") throw new Error("Splash browser interface binds only 127.0.0.1");
  if (!storyBinding || ["pending", "confirm", "context"].some((name) => typeof storyBinding[name] !== "function")) throw new Error("Splash browser interface requires a story binding");
  if (!selection || ["read", "confirm"].some((name) => typeof selection[name] !== "function")) throw new Error("Splash browser interface requires selection services");
  if (!recommendation || ["read", "confirm"].some((name) => typeof recommendation[name] !== "function")) throw new Error("Splash browser interface requires recommendation services");

  const template = await html();
  let capability = randomCapability();
  let session = "";
  let active = true;
  let confirmed = false;
  let terminalState = "idle";
  let queuedTermination = null;
  let origin = "";
  let expectedHost = "";
  let idleTimer;
  let overallTimer;
  let resolveClosed;
  const closed = new Promise((resolve) => { resolveClosed = resolve; });

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => shutdown("expired"), idleMs);
  }

  function authorized(request) {
    return active && session && cookie(request, "splash_interface") === session;
  }

  async function handler(request, response) {
    try {
      if (request.headers.host !== expectedHost) return sendJson(response, 421, { message: "This local Splash URL belongs to a different host." });
      const url = new URL(request.url, origin);
      if (request.method === "GET" && url.pathname === "/") {
        const nonce = randomCapability();
        return sendHtml(response, template.replaceAll(HTML_NONCE, nonce), nonce);
      }
      if (request.method !== "POST") return sendJson(response, 405, { message: "This route accepts POST only." }, { allow: "GET, POST" });
      if (request.headers.origin !== origin) return sendJson(response, 403, { message: "The request did not come from this Splash page." });

      if (url.pathname === "/session") {
        const body = exactObject(await readJson(request), ["capability"], "session request");
        if (!active || !capability || body.capability !== capability) return sendJson(response, 403, { message: "This Splash interface link has expired." });
        capability = "";
        session = randomCapability();
        resetIdle();
        return sendJson(response, 200, { ok: true, mode }, { "set-cookie": `splash_interface=${session}; HttpOnly; SameSite=Strict; Path=/` });
      }
      if (!authorized(request)) return sendJson(response, 403, { message: "This protected Splash session is not active." });
      resetIdle();

      if (url.pathname === "/api/pending") {
        exactObject(await readJson(request), [], "pending request");
        const pending = storyBinding.pending();
        if (!pending) throw new Error("story confirmation expired");
        return sendJson(response, 200, pending);
      }
      if (url.pathname === "/api/story/confirm") {
        const body = exactObject(await readJson(request), ["challenge"], "story confirmation");
        const descriptor = storyBinding.confirm(body.challenge);
        confirmed = true;
        return sendJson(response, 200, { confirmed: true, descriptor });
      }
      if (!confirmed || !storyBinding.context()) return sendJson(response, 409, { message: "Confirm the exact story before choosing a treatment." });
      if (url.pathname === "/api/model") {
        exactObject(await readJson(request), [], "model request");
        const bindingContext = storyBinding.context();
        const model = assertTreatmentModel(mode === "storyboard"
          ? await recommendation.read({ bindingContext })
          : await selection.read({ bindingContext }), mode);
        return sendJson(response, 200, model);
      }
      if (url.pathname === "/api/confirm") {
        if (terminalState !== "idle") {
          return sendJson(response, 409, { message: "A treatment confirmation is already in progress." });
        }
        const body = await readJson(request);
        const bindingContext = storyBinding.context();
        terminalState = "confirming";
        try {
          assertTreatmentModel(mode === "storyboard"
            ? await recommendation.read({ bindingContext })
            : await selection.read({ bindingContext }), mode);
          const result = mode === "storyboard"
            ? await recommendation.confirm({
                ...exactObject(body, ["optionId", "expected", "recommendationRevision"], "Storyboard confirmation"),
                bindingContext,
              })
            : await selection.confirm({
                ...exactObject(body, ["optionId", "expected"], "À-la-carte confirmation"),
                bindingContext,
              });
          const completion = {
            mode,
            optionId: body.optionId,
            phase: result.selection?.phase ?? result.phase ?? null,
          };
          terminalState = "confirmed";
          queuedTermination = null;
          sendJson(response, 200, { ok: true, ...completion });
          queueMicrotask(() => finishShutdown("confirmed", completion));
          return;
        } catch (error) {
          terminalState = "idle";
          const deferred = queuedTermination;
          queuedTermination = null;
          const safe = publicError(error);
          sendJson(response, safe.status, { message: safe.message });
          if (deferred) queueMicrotask(() => shutdown(deferred.reason, deferred.result));
          return;
        }
      }
      if (url.pathname === "/api/close") {
        exactObject(await readJson(request), [], "close request");
        sendJson(response, 200, { ok: true });
        queueMicrotask(() => shutdown("closed"));
        return;
      }
      return sendJson(response, 404, { message: "This Splash route does not exist." });
    } catch (error) {
      const safe = publicError(error);
      sendJson(response, safe.status, { message: safe.message });
    }
  }

  const server = createServer(handler);
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Splash browser interface did not receive a loopback port");
  expectedHost = `${host}:${address.port}`;
  origin = `http://${expectedHost}`;
  resetIdle();
  overallTimer = setTimeout(() => shutdown("expired"), overallMs);

  function finishShutdown(reason = "closed", result = null) {
    if (terminalState === "stopped") return;
    terminalState = "stopped";
    active = false;
    capability = "";
    session = "";
    clearTimeout(idleTimer);
    clearTimeout(overallTimer);
    server.close(() => resolveClosed({ reason, result }));
    server.closeIdleConnections?.();
  }

  function shutdown(reason = "closed", result = null) {
    if (terminalState === "stopped" || terminalState === "confirmed") return;
    if (terminalState === "confirming") {
      queuedTermination ??= { reason, result };
      return;
    }
    finishShutdown(reason, result);
  }

  return { url: `${origin}/#${capability}`, origin, closed, close: shutdown };
}

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

export function createBrowserInterfaceManager({
  storyBinding,
  selection,
  recommendation,
  platform = process.platform,
  which = Bun.which,
  spawn = Bun.spawn,
  env = process.env,
  start = startBrowserInterface,
} = {}) {
  let active = null;

  async function openUrl(url) {
    const discovered = platform === "darwin" ? which("open") : platform === "win32" ? which("rundll32.exe") : which("xdg-open");
    if (!discovered) throw new Error("platform URL opener is unavailable");
    const opener = await realFile(discovered, "platform URL opener");
    const args = platform === "win32" ? [opener, "url.dll,FileProtocolHandler", url] : [opener, url];
    const child = spawn(args, { stdin: "ignore", stdout: "ignore", stderr: "ignore", env: safeChildEnvironment(env) });
    if ((await child.exited) !== 0) throw new Error("platform URL opener failed");
  }

  return Object.freeze({
    async open({ mode, path }) {
      if (active) {
        const error = new Error("Another Splash browser interaction is already active");
        error.code = "INTERACTION_ACTIVE";
        throw error;
      }
      const reservation = { controller: null };
      active = reservation;
      try {
        const descriptor = await storyBinding.nominate(path);
        const controller = await start({ mode, storyBinding, selection, recommendation });
        reservation.controller = controller;
        await openUrl(controller.url);
        const completion = await controller.closed;
        if (completion.reason !== "confirmed" || !completion.result) {
          throw new Error(`Splash browser interaction ended without confirmation (${completion.reason})`);
        }
        return { ok: true, status: "confirmed", ...completion.result, descriptor };
      } catch (error) {
        reservation.controller?.close("opener-failed");
        throw error;
      } finally {
        if (active === reservation) active = null;
      }
    },
    close() {
      active?.controller?.close("closed");
    },
  });
}
