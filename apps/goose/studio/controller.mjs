import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { renderAppHtml } from "../resources/render.mjs";

const BODY_LIMIT = 32 << 10;
const REQUEST_TIMEOUT_MS = 10_000;

function randomCapability() {
  return randomBytes(32).toString("base64url");
}

function exactObject(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== fields.length || fields.some((field) => !keys.includes(field)))
    throw new Error(`${label} has the wrong fields`);
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
  } else {
    headers["content-security-policy"] =
      "default-src 'none'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'";
  }
  return headers;
}

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { ...securityHeaders("application/json"), ...extraHeaders });
  response.end(JSON.stringify(body));
}

function sendText(response, status, body, nonce = "") {
  response.writeHead(status, securityHeaders("text/html; charset=utf-8", nonce));
  response.end(body);
}

function cookie(request, name) {
  const raw = request.headers.cookie ?? "";
  for (const part of raw.split(";")) {
    const at = part.indexOf("=");
    if (at < 0) continue;
    if (part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return "";
}

async function readJson(request) {
  if (
    (request.headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase() !==
    "application/json"
  ) {
    const error = new Error("application/json is required");
    error.status = 415;
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new Error("request body is too large");
    chunks.push(chunk);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validSetupURL(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" &&
      url.hostname === "127.0.0.1" &&
      Boolean(url.port) &&
      url.pathname === "/" &&
      Boolean(url.hash) &&
      !url.search &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function selectionStatus(error, bound) {
  return error?.code === "PREFLIGHT_REQUIRED"
    ? "preflight-required"
    : error?.code === "RECOMMENDATION_CONFLICT"
      ? "recommendation-conflict"
      : error?.code === "REVISION_CONFLICT" || error?.code === "SELECTION_CONFLICT"
        ? "selection-conflict"
        : error?.code === "OPTION_UNAVAILABLE"
          ? "option-unavailable"
          : bound
            ? "selection-unavailable"
            : "story-unbound";
}

export async function startStudioController({
  statusProvider,
  storyBinding,
  selection,
  recommendation,
  setupManager,
  htmlProvider = renderAppHtml,
  host = "127.0.0.1",
  idleMs = 15 * 60_000,
  overallMs = 60 * 60_000,
  onLifecycle = () => {},
} = {}) {
  if (!statusProvider || typeof statusProvider.read !== "function")
    throw new Error("studio requires a status provider");
  if (
    !storyBinding ||
    ["nominate", "pending", "confirm", "current", "context"].some(
      (name) => typeof storyBinding[name] !== "function",
    )
  )
    throw new Error("studio requires story binding");
  if (
    !selection ||
    ["read", "confirm", "reopenFormat", "reopenTreatment"].some(
      (name) => typeof selection[name] !== "function",
    )
  )
    throw new Error("studio requires selection");
  if (!recommendation || ["read", "confirm"].some((name) => typeof recommendation[name] !== "function"))
    throw new Error("studio requires recommendation");
  if (
    !setupManager ||
    ["start", "openLocally", "close"].some((name) => typeof setupManager[name] !== "function")
  )
    throw new Error("studio requires setup");
  if (host !== "127.0.0.1") throw new Error("studio binds only 127.0.0.1");

  const page = await htmlProvider();
  let capability = randomCapability();
  let session = "";
  let active = true;
  let origin = "";
  let expectedHost = "";
  let idleTimer;
  let overallTimer;
  let settleClosed;
  const closed = new Promise((settle) => {
    settleClosed = settle;
  });

  function lifecycle(event) {
    try {
      onLifecycle({ event });
    } catch {
      // Diagnostic only.
    }
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => shutdown("expired"), idleMs);
  }

  function authorized(request) {
    return active && session && cookie(request, "splash_studio") === session;
  }

  async function publicStatus() {
    const status = await statusProvider.read();
    status.story = {
      status: storyBinding.current() ? "bound" : "unbound",
      descriptor: storyBinding.current(),
    };
    return status;
  }

  async function runSelection(action) {
    const status = await statusProvider.read();
    if (status?.runtime?.status !== "ready" || status?.readiness?.ready !== true) {
      const error = new Error("Complete Splash readiness before choosing a visual. Nothing was changed.");
      error.code = "PREFLIGHT_REQUIRED";
      throw error;
    }
    const bindingContext = storyBinding.context();
    if (!bindingContext) {
      const error = new Error("Confirm the exact story in this studio session before choosing a visual.");
      error.code = "STORY_UNBOUND";
      throw error;
    }
    return action(bindingContext);
  }

  async function handler(request, response) {
    try {
      if (request.headers.host !== expectedHost)
        return sendJson(response, 421, { code: "wrong-host", message: "This local studio URL belongs to a different host." });
      const url = new URL(request.url, origin);
      if (request.method === "GET" && url.pathname === "/") {
        const nonce = randomCapability();
        const html = page.replaceAll("<script type=\"module\">", `<script type="module" nonce="${nonce}">`).replaceAll("<style>", `<style nonce="${nonce}">`);
        return sendText(response, 200, html, nonce);
      }
      if (request.method !== "POST")
        return sendJson(response, 405, { code: "method-not-allowed", message: "This studio route does not support that method." }, { allow: "GET, POST" });
      if (request.headers.origin !== origin)
        return sendJson(response, 403, { code: "wrong-origin", message: "The request did not come from this studio page." });

      if (url.pathname === "/session") {
        const body = exactObject(await readJson(request), ["capability"], "session request");
        if (!active || !capability || body.capability !== capability)
          return sendJson(response, 403, { code: "expired-capability", message: "This studio link has expired." });
        capability = "";
        session = randomCapability();
        resetIdle();
        lifecycle("session-opened");
        return sendJson(response, 200, { ok: true }, { "set-cookie": `splash_studio=${session}; HttpOnly; SameSite=Strict; Path=/` });
      }
      if (!authorized(request))
        return sendJson(response, 403, { code: "unauthorized", message: "This protected studio session is not active." });
      resetIdle();

      if (url.pathname === "/api/status") {
        exactObject(await readJson(request), [], "status request");
        return sendJson(response, 200, await publicStatus());
      }
      if (url.pathname === "/api/story/nominate") {
        const body = exactObject(await readJson(request), ["path"], "story nomination");
        const descriptor = await storyBinding.nominate(body.path);
        return sendJson(response, 200, { nominated: true, descriptor });
      }
      if (url.pathname === "/api/story/pending") {
        exactObject(await readJson(request), [], "pending story");
        const pending = storyBinding.pending();
        return sendJson(response, 200, pending ?? { descriptor: null, challenge: null });
      }
      if (url.pathname === "/api/story/confirm") {
        const body = exactObject(await readJson(request), ["challenge"], "story confirmation");
        const descriptor = storyBinding.confirm(body.challenge);
        return sendJson(response, 200, { confirmed: true, descriptor });
      }
      if (url.pathname === "/api/selection/read") {
        exactObject(await readJson(request), [], "selection read");
        return sendJson(response, 200, await runSelection((bindingContext) => selection.read({ bindingContext })));
      }
      if (url.pathname === "/api/selection/confirm") {
        const body = exactObject(await readJson(request), ["optionId", "expected"], "selection confirm");
        return sendJson(response, 200, await runSelection((bindingContext) => selection.confirm({ bindingContext, ...body })));
      }
      if (url.pathname === "/api/selection/reopen-format") {
        const body = exactObject(await readJson(request), ["expected"], "reopen format");
        return sendJson(response, 200, await runSelection((bindingContext) => selection.reopenFormat({ bindingContext, ...body })));
      }
      if (url.pathname === "/api/selection/reopen-treatment") {
        const body = exactObject(await readJson(request), ["expected"], "reopen treatment");
        return sendJson(response, 200, await runSelection((bindingContext) => selection.reopenTreatment({ bindingContext, ...body })));
      }
      if (url.pathname === "/api/recommendation/read") {
        exactObject(await readJson(request), [], "recommendation read");
        return sendJson(response, 200, await runSelection((bindingContext) => recommendation.read({ bindingContext })));
      }
      if (url.pathname === "/api/recommendation/confirm") {
        const body = exactObject(await readJson(request), ["optionId", "expected", "recommendationRevision"], "recommendation confirm");
        return sendJson(response, 200, await runSelection((bindingContext) => recommendation.confirm({ bindingContext, ...body })));
      }
      if (url.pathname === "/api/setup/start") {
        exactObject(await readJson(request), [], "setup start");
        const started = await setupManager.start();
        const setupUrl = validSetupURL(started.setupUrl);
        if (!setupUrl)
          return sendJson(response, 500, { code: "setup-start-failed", message: "The protected setup controller could not start." });
        return sendJson(response, 200, { status: started.status, setupUrl });
      }
      if (url.pathname === "/api/setup/open") {
        exactObject(await readJson(request), [], "setup open");
        return sendJson(response, 200, await setupManager.openLocally());
      }
      if (url.pathname === "/api/close") {
        exactObject(await readJson(request), [], "studio close");
        sendJson(response, 200, { ok: true, state: "closed" });
        queueMicrotask(() => shutdown("closed"));
        return;
      }
      return sendJson(response, 404, { code: "not-found", message: "This studio route does not exist." });
    } catch (error) {
      const status = selectionStatus(error, Boolean(storyBinding.current()));
      const http =
        error?.status === 415
          ? 415
          : error?.code === "PREFLIGHT_REQUIRED" || status === "story-unbound"
            ? 409
            : error?.message?.includes("wrong fields") ||
                error?.message?.includes("must be an object")
              ? 400
              : 422;
      sendJson(response, http, {
        code: error?.code || "studio-error",
        status,
        message: String(error?.message ?? "The studio request was refused.").slice(0, 2048),
        schemaVersion: "splash-selection-error/v1",
      });
    }
  }

  const server = createServer(handler);
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = 1000;

  let stopped = false;
  function shutdown(reason = "closed") {
    if (stopped) return;
    stopped = true;
    active = false;
    capability = "";
    session = "";
    clearTimeout(idleTimer);
    clearTimeout(overallTimer);
    try {
      setupManager.close();
    } catch {
      // Setup child close is best-effort.
    }
    server.close(() => {
      lifecycle(reason);
      settleClosed({ reason });
    });
    server.closeIdleConnections?.();
  }

  await new Promise((settle, reject) => {
    server.once("error", reject);
    server.listen(0, host, settle);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    shutdown("error");
    throw new Error("studio did not receive a loopback port");
  }
  expectedHost = `${host}:${address.port}`;
  origin = `http://${expectedHost}`;
  resetIdle();
  overallTimer = setTimeout(() => shutdown("expired"), overallMs);
  lifecycle("ready");
  return {
    origin,
    url: `${origin}/#${capability}`,
    closed,
    close: shutdown,
  };
}
