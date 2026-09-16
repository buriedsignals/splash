import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { CREDENTIAL_IDS, ENGINE_SPLASH_CONTRACT_MIN } from "../../apps/goose/contract.mjs";
import { CREDENTIAL_CONTRACT_MESSAGE } from "./engine-bridge.mjs";
import {
  inspectLegacyEnv,
  readLegacyIntegrations,
  removeLegacyAssignments,
} from "./legacy-env.mjs";
import { readNewsroom, updateNewsroom } from "./newsroom-store.mjs";
import { deriveNewsroomProposal } from "./derive-proposal.mjs";
import { createSettingsService } from "./settings-service.mjs";
import { renderAppHtml } from "../../apps/goose/resources/render.mjs";
import { buildPublicStatus } from "../../apps/goose/contract.mjs";
import { validateNewsroom } from "../../skills/splash/scripts/newsroom.mjs";

const BODY_LIMIT = 32 << 10;
const REQUEST_TIMEOUT_MS = 10_000;

function randomCapability() {
  return randomBytes(32).toString("base64url");
}

function exactObject(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} fields do not match the closed contract`);
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

function sendText(response, status, body, nonce = "") {
  const bytes = Buffer.from(body);
  response.writeHead(status, {
    ...securityHeaders("text/html; charset=utf-8", nonce),
    "content-length": String(bytes.byteLength),
  });
  response.end(bytes);
}

function cookie(request, name) {
  const header = request.headers.cookie ?? "";
  for (const part of header.split(";")) {
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
  const timeout = setTimeout(() => request.destroy(new Error("request body timed out")), REQUEST_TIMEOUT_MS);
  try {
    for await (const chunk of request) {
      total += chunk.byteLength;
      if (total > BODY_LIMIT) {
        const error = new Error("request body is too large");
        error.status = 413;
        throw error;
      }
      chunks.push(chunk);
    }
  } finally {
    clearTimeout(timeout);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value;
  } catch {
    const error = new Error("request body must be one JSON object");
    error.status = 400;
    throw error;
  }
}

function safeError(error) {
  if (error?.code === "REVISION_CONFLICT") return { status: 409, code: "conflict", message: "The file changed in another session. Reload before trying again." };
  if (error?.code === "LOCKED") return { status: 409, code: "locked", message: "Another setup session is writing this file. Try again shortly." };
  if (error?.status === 413 || error?.status === 415) return { status: error.status, code: "invalid-request", message: error.message };
  return { status: 400, code: "invalid-request", message: "The request was refused without changing setup state." };
}

function boundedText(value, limit = 2048) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}
function retainedCredentialContract(value) {
  const broker = value?.broker?.status === "available"
    ? Object.freeze({ status: "available" })
    : Object.freeze({
        status: "unavailable",
        reasonCode: boundedText(value?.broker?.reasonCode, 80) || "engine-outdated",
        message: CREDENTIAL_CONTRACT_MESSAGE,
      });
  const keys = Array.isArray(value?.keys)
    ? value.keys.map((row) => Object.freeze({
        ...row,
        metadata: row?.metadata && typeof row.metadata === "object"
          ? Object.freeze({ ...row.metadata })
          : null,
      }))
    : [];
  return Object.freeze({
    contractVersion: Number.isSafeInteger(value?.contractVersion)
      ? value.contractVersion
      : ENGINE_SPLASH_CONTRACT_MIN,
    broker,
    credentialIndependentPathsAvailable: true,
    keys: Object.freeze(keys),
  });
}

function candidateMaxBytes(contract, id) {
  const bound = contract?.keys?.find((row) => row?.id === id)?.metadata?.candidateMaxBytes;
  return Number.isSafeInteger(bound) && bound > 0 ? bound : 0;
}

function hasCompatibleCredentialContract(contract) {
  return contract?.broker?.status === "available"
    && CREDENTIAL_IDS.every((id) => candidateMaxBytes(contract, id) > 0);
}

function sendCredentialInputRefusal(response) {
  return sendJson(response, 410, {
    code: "credential-input-disabled",
    message: "This Splash page reports credential status only. Supply credentials through your installation's configured credential source.",
  });
}



export async function startSetupController({
  engineBridge,
  installation = "engine",
  credentialStatusProvider,
  accountIdFromEnvironment = "",
  newsroomPath,
  legacyEnvPath,
  host = "127.0.0.1",
  idleMs = 15 * 60_000,
  overallMs = 60 * 60_000,
  onLifecycle = () => {},
  deriveProposal = deriveNewsroomProposal,
} = {}) {
  if (installation === "self-managed" && typeof credentialStatusProvider?.read !== "function") throw new Error("self-managed setup requires a credential status provider");
  if (installation !== "self-managed" && (!engineBridge || ["list", "status", "replace", "remove"].some((method) => typeof engineBridge[method] !== "function"))) throw new Error("setup controller requires the complete Engine credential bridge");
  if (host !== "127.0.0.1") throw new Error("setup controller binds only 127.0.0.1");
  if (!Number.isFinite(idleMs) || idleMs < 1000 || idleMs > 60 * 60_000) throw new Error("setup idle timeout is invalid");
  if (!Number.isFinite(overallMs) || overallMs < idleMs || overallMs > 4 * 60 * 60_000) throw new Error("setup overall timeout is invalid");

  const settings = createSettingsService({ newsroomPath, deriveProposal, accountIdFromEnvironment });
  const page = await renderAppHtml({ settingsOnly: true });
  let cookieName = "";
  let capability = randomCapability();
  let session = "";
  let sessionCredentialContract = null;
  let active = true;
  let origin = "";
  let expectedHost = "";
  let idleTimer;
  let overallTimer;
  let inFlightMutations = 0;
  let pendingShutdown = "";
  let settleClosed;
  const closed = new Promise((settle) => { settleClosed = settle; });

  function lifecycle(event) {
    try {
      onLifecycle({ event });
    } catch {
      // The parent control observer is diagnostic only. It cannot alter controller state.
    }
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => shutdown("expired"), idleMs);
  }

  function authorized(request) {
    return active && session && cookie(request, cookieName) === session;
  }

  async function runMutation(operation) {
    inFlightMutations += 1;
    clearTimeout(idleTimer);
    try {
      return await operation();
    } finally {
      inFlightMutations -= 1;
      if (pendingShutdown && inFlightMutations === 0) finishShutdown(pendingShutdown);
      else if (active) resetIdle();
    }
  }

  async function publicStatus() {
    if (installation === "self-managed") {
      const status = await credentialStatusProvider.read();
      return { installation, credentials: status.credentials.map(row => ({ ...row, metadata: row })), broker: status.broker, newsroom: await readNewsroom(newsroomPath), legacy: null };
    }
    const listed = sessionCredentialContract;
    const rows = hasCompatibleCredentialContract(listed)
      ? await Promise.all(listed.keys.map(async (row) => {
          try {
            const status = await engineBridge.status(row.id);
            return status.ok ? status : { ...row, ...status, generation: row.generation ?? 0 };
          } catch {
            return {
              ...row,
              ok: false,
              status: "status-unavailable",
              stored: row.stored === true,
              generation: Number.isSafeInteger(row.generation) ? row.generation : 0,
              validation: null,
            };
          }
        }))
      : listed.keys;
    const newsroom = await readNewsroom(newsroomPath);
    const legacy = legacyEnvPath ? await inspectLegacyEnv(legacyEnvPath) : null;
    return {
      contractVersion: listed.contractVersion,
      credentials: rows,
      broker: listed.broker,
      credentialIndependentPathsAvailable: true,
      newsroom,
      legacy,
    };
  }

  async function handler(request, response) {
    try {
      if (request.headers.host !== expectedHost) return sendJson(response, 421, { code: "wrong-host", message: "This local setup URL belongs to a different host." });
      const url = new URL(request.url, origin);
      if (request.method === "GET" && url.pathname === "/") {
        const nonce = randomCapability();
        const html = page.replaceAll('<script type="module">', `<script type="module" nonce="${nonce}">`).replaceAll("<style>", `<style nonce="${nonce}">`);
        return sendText(response, 200, html, nonce);
      }
      if (request.method !== "POST") return sendJson(response, 405, { code: "method-not-allowed", message: "This setup route does not support that method." }, { allow: "GET, POST" });
      if (request.headers.origin !== origin) return sendJson(response, 403, { code: "wrong-origin", message: "The request did not come from this setup page." });

      if (url.pathname === "/session") {
        const body = exactObject(await readJson(request), ["capability"], "session request");
        if (authorized(request)) return sendJson(response, 200, { ok: true });
        if (!active || !capability || body.capability !== capability) return sendJson(response, 403, { code: "expired-capability", message: "This setup link has expired." });
        capability = "";
        let listed;
        try {
          listed = installation === "self-managed" ? null : await engineBridge.list();
        } catch {
          listed = null;
        }
        sessionCredentialContract = retainedCredentialContract(listed);
        session = randomCapability();
        resetIdle();
        lifecycle("session-opened");
        return sendJson(response, 200, { ok: true }, { "set-cookie": `${cookieName}=${session}; HttpOnly; SameSite=Strict; Path=/` });
      }
      if (!authorized(request)) return sendJson(response, 403, { code: "unauthorized", message: "This protected setup session is not active." });
      resetIdle();

      if (url.pathname.startsWith("/api/settings/")) {
        try {
          const result = await runMutation(() => settings.request(url.pathname, readJson(request)));
          return sendJson(response, 200, result);
        } catch (error) {
          const conflict = error?.code === "REVISION_CONFLICT";
          return sendJson(response, conflict ? 409 : 422, { code: conflict ? "settings-conflict" : "settings-error", message: conflict ? "Settings changed in another session. Reload settings, then apply your changes again." : String(error?.message ?? "Settings could not be saved.").slice(0, 2048) });
        }
      }
      if (url.pathname === "/api/studio-status") {
        exactObject(await readJson(request), [], "status request");
        if (installation === "self-managed") return sendJson(response, 200, await credentialStatusProvider.read());
        const current = await publicStatus();
        const answered = current.newsroom.declined || (current.newsroom.profile && !validateNewsroom(current.newsroom.profile).length);
        const check = { id: "newsroom-profile", status: answered ? "pass" : "missing", detail: "Complete your newsroom’s design profile in Design.", profile: current.newsroom.profile };
        const status = buildPublicStatus({ preflight: { ready: Boolean(answered), checks: [{ id: "dependencies", status: "pass", detail: "Setup is running." }, check], blockers: answered ? [] : [check] }, keyList: { ok: current.broker.status === "available", broker: current.broker, keys: current.credentials }, credentials: current.credentials });
        return sendJson(response, 200, { ...status, installation });
      }
      if (url.pathname === "/api/status") {
        exactObject(await readJson(request), [], "status request");
        return sendJson(response, 200, await publicStatus());
      }
      if (
        url.pathname === "/api/credential/replace"
        || url.pathname === "/api/credential/remove"
        || url.pathname === "/api/legacy/migrate-credential"
      ) {
        await readJson(request);
        return sendCredentialInputRefusal(response);
      }
      if (url.pathname === "/api/newsroom") {
        const body = exactObject(await readJson(request), ["expectedRevision", "changes", "decline", "confirmDecline", "confirmReplaceDecline"], "newsroom update");
        const result = await runMutation(() => updateNewsroom(newsroomPath, body));
        return sendJson(response, 200, result);
      }
      if (url.pathname === "/api/derive") {
        const body = exactObject(await readJson(request), ["url"], "newsroom derivation");
        if (typeof body.url !== "string" || body.url.length > 4096) throw new Error("newsroom derivation URL is invalid");
        const result = await runMutation(() => deriveProposal(body.url));
        return sendJson(response, result.ok ? 200 : 422, result);
      }
      if (url.pathname === "/api/legacy/import-integrations") {
        const body = exactObject(await readJson(request), [
          "expectedEnvRevision", "assignments", "expectedNewsroomRevision", "confirmImport",
          "confirmReplaceDecline", "confirmRemoval",
        ], "legacy integration import");
        if (body.confirmImport !== true || typeof body.confirmRemoval !== "boolean") throw new Error("legacy integration import requires confirmation");
        const result = await runMutation(async () => {
          const changes = await readLegacyIntegrations(legacyEnvPath, {
            expectedRevision: body.expectedEnvRevision,
            assignments: body.assignments,
          });
          const newsroom = await updateNewsroom(newsroomPath, {
            expectedRevision: body.expectedNewsroomRevision,
            changes,
            decline: false,
            confirmDecline: false,
            confirmReplaceDecline: body.confirmReplaceDecline === true,
          });
          if (!body.confirmRemoval) return { ok: true, newsroom, legacyRemoval: { status: "awaiting-confirmation" } };
          try {
            const legacy = await removeLegacyAssignments(legacyEnvPath, {
              expectedRevision: body.expectedEnvRevision,
              assignments: body.assignments.map(({ field, assignmentId }) => ({ field, assignmentId })),
              confirmRemoval: true,
            });
            return { ok: true, newsroom, legacyRemoval: { status: "removed", legacy } };
          } catch (error) {
            return { ok: true, newsroom, legacyRemoval: { status: "retained", outcome: error?.code === "REVISION_CONFLICT" ? "conflict" : "removal-failed" } };
          }
        });
        return sendJson(response, 200, result);
      }
      if (url.pathname === "/api/done" || url.pathname === "/api/close") {
        exactObject(await readJson(request), [], "setup completion");
        if (inFlightMutations > 0) {
          return sendJson(response, 409, { code: "operation-in-flight", message: "A save is still finishing. Wait for its result before closing setup." });
        }
        if (url.pathname === "/api/done") {
          // "Done" claims onboarding is complete: the newsroom identity must be ANSWERED — a
          // complete valid profile or a recorded decline. "Close" stays available for leaving
          // with onboarding incomplete; installation success never depends on either.
          const snapshot = await readNewsroom(newsroomPath);
          const answered = snapshot.declined === true
            || (snapshot.exists === true
              && snapshot.profile
              && validateNewsroom(snapshot.profile).length === 0);
          if (!answered) {
            return sendJson(response, 409, {
              code: "newsroom-required",
              message: "Record the newsroom profile (or an explicit decline) before finishing setup.",
            });
          }
        }
        sendJson(response, 200, { ok: true, state: url.pathname === "/api/done" ? "done" : "closed" });
        queueMicrotask(() => shutdown(url.pathname === "/api/done" ? "done" : "closed"));
        return;
      }
      return sendJson(response, 404, { code: "not-found", message: "This setup route does not exist." });
    } catch (error) {
      const safe = safeError(error);
      sendJson(response, safe.status, { code: safe.code, message: safe.message });
    }
  }

  const server = createServer(handler);
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = 1000;

  let stopped = false;
  function finishShutdown(reason) {
    if (stopped) return;
    stopped = true;
    pendingShutdown = "";
    clearTimeout(idleTimer);
    clearTimeout(overallTimer);
    server.close(() => {
      lifecycle(reason);
      settleClosed({ reason });
    });
    server.closeIdleConnections?.();
  }

  function shutdown(reason = "closed") {
    if (stopped || pendingShutdown) return;
    active = false;
    capability = "";
    session = "";
    sessionCredentialContract = null;
    clearTimeout(idleTimer);
    clearTimeout(overallTimer);
    if (inFlightMutations > 0) {
      pendingShutdown = reason;
      lifecycle("closing-in-flight");
      return;
    }
    finishShutdown(reason);
  }

  await new Promise((settle, reject) => {
    server.once("error", reject);
    server.listen(0, host, settle);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    shutdown("error");
    throw new Error("setup controller did not receive a loopback port");
  }
  cookieName = `splash_setup_${address.port}`;
  expectedHost = `${host}:${address.port}`;
  origin = `http://${expectedHost}`;
  resetIdle();
  overallTimer = setTimeout(() => shutdown("expired"), overallMs);
  lifecycle("ready");
  return {
    origin,
    url: `${origin}/#${capability}`,
    capability,
    closed,
    close: shutdown,
  };
}
