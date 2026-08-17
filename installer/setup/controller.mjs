import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import {
  inspectLegacyEnv,
  readLegacyCandidate,
  readLegacyIntegrations,
  removeLegacyAssignments,
} from "./legacy-env.mjs";
import { readNewsroom, updateNewsroom } from "./newsroom-store.mjs";
import { isDeclinedProfile, validateNewsroom } from "../../skills/splash/scripts/newsroom.mjs";
import { createOutboundFetchPolicy } from "./outbound-fetch.mjs";
import { deriveCharter } from "../../skills/newsroom-charter/scripts/derive-charter.mjs";
import { renderSetupPage } from "./setup-page.mjs";

const BODY_LIMIT = 32 << 10;
const REQUEST_TIMEOUT_MS = 10_000;
const CREDENTIAL_IDS = new Set([
  "MAPTILER_KEY",
  "DATAWRAPPER_TOKEN",
  "CLOUDFLARE_API_TOKEN",
]);

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

async function deriveNewsroomProposal(url) {
  const policy = createOutboundFetchPolicy();
  let pageRequest = true;
  const fetchFn = async (target, options = {}) => {
    const kind = pageRequest ? "page" : "stylesheet";
    pageRequest = false;
    return policy.fetch(target, { kind, signal: options.signal });
  };
  try {
    const result = await deriveCharter({ url, fetchFn, timeoutMs: 12_000, maxStylesheets: 4 });
    if (!result.ok) {
      const privateAddress = /private|local|reserved|disallowed port/i.test(result.error ?? "");
      return {
        ok: false,
        code: privateAddress ? "manual-entry-required" : "derivation-failed",
        message: privateAddress
          ? "Private and intranet newsroom sites use manual branding entry in this release."
          : "The public newsroom site could not be read safely.",
        askInstead: result.askInstead?.slice(0, 6).map((value) => boundedText(value)) ?? [],
      };
    }
    const fields = {};
    for (const field of ["name", "languages", "brandColor", "accents", "ground", "typefaces"]) {
      const value = result.fields?.[field];
      fields[field] = value ? {
        value: boundedText(value.value, 4096),
        source: boundedText(value.source),
        evidence: boundedText(value.evidence, 4096),
      } : null;
    }
    return {
      ok: true,
      url: boundedText(result.url, 4096),
      fields,
      unresolved: result.unresolved?.filter((field) => Object.hasOwn(fields, field)) ?? [],
      nothingFurther: result.nothingFurther?.filter((field) => Object.hasOwn(fields, field)) ?? [],
      legibility: result.legibility ?? null,
      stylesheetsRead: result.stylesheetsRead?.slice(0, 4).map((value) => boundedText(value, 4096)) ?? [],
      bytesRead: policy.bytesRead,
    };
  } catch (error) {
    const privateAddress = /private|local|reserved|disallowed port/i.test(error?.message ?? "");
    return {
      ok: false,
      code: privateAddress ? "manual-entry-required" : "derivation-failed",
      message: privateAddress
        ? "Private and intranet newsroom sites use manual branding entry in this release."
        : "The public newsroom site could not be read safely.",
      askInstead: ["Enter the newsroom name, colours, languages, and typefaces manually."],
    };
  }
}

const page = renderSetupPage;

export async function startSetupController({
  engineBridge,
  newsroomPath,
  legacyEnvPath,
  host = "127.0.0.1",
  idleMs = 15 * 60_000,
  overallMs = 60 * 60_000,
  onLifecycle = () => {},
  deriveProposal = deriveNewsroomProposal,
} = {}) {
  if (!engineBridge || ["list", "status", "replace", "remove"].some((method) => typeof engineBridge[method] !== "function")) throw new Error("setup controller requires the complete Engine credential bridge");
  if (host !== "127.0.0.1") throw new Error("setup controller binds only 127.0.0.1");
  if (!Number.isFinite(idleMs) || idleMs < 1000 || idleMs > 60 * 60_000) throw new Error("setup idle timeout is invalid");
  if (!Number.isFinite(overallMs) || overallMs < idleMs || overallMs > 4 * 60 * 60_000) throw new Error("setup overall timeout is invalid");

  let capability = randomCapability();
  let session = "";
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
    return active && session && cookie(request, "splash_setup") === session;
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
    const listed = await engineBridge.list();
    const rows = listed.ok
      ? await Promise.all(listed.keys.map(async (row) => {
          const status = await engineBridge.status(row.id);
          return status.ok ? status : { ...row, ...status, generation: row.generation ?? 0 };
        }))
      : [];
    const newsroom = await readNewsroom(newsroomPath);
    const legacy = legacyEnvPath ? await inspectLegacyEnv(legacyEnvPath) : null;
    return { credentials: rows, broker: listed.broker ?? null, newsroom, legacy };
  }

  async function completionBlockers() {
    const status = await publicStatus();
    const blockers = [];
    if (status.broker?.status === "unavailable") {
      blockers.push("secure credential storage is unavailable");
    }
    if (!status.newsroom?.exists || !status.newsroom.profile) {
      blockers.push("newsroom branding has not been saved");
    } else if (isDeclinedProfile(status.newsroom.profile)) {
      blockers.push("newsroom branding has not been completed");
    } else {
      blockers.push(...validateNewsroom(status.newsroom.profile));
    }
    return blockers;
  }

  async function handler(request, response) {
    try {
      if (request.headers.host !== expectedHost) return sendJson(response, 421, { code: "wrong-host", message: "This local setup URL belongs to a different host." });
      const url = new URL(request.url, origin);
      if (request.method === "GET" && url.pathname === "/") {
        const nonce = randomCapability();
        return sendText(response, 200, page(nonce), nonce);
      }
      if (request.method !== "POST") return sendJson(response, 405, { code: "method-not-allowed", message: "This setup route does not support that method." }, { allow: "GET, POST" });
      if (request.headers.origin !== origin) return sendJson(response, 403, { code: "wrong-origin", message: "The request did not come from this setup page." });

      if (url.pathname === "/session") {
        const body = exactObject(await readJson(request), ["capability"], "session request");
        if (!active || !capability || body.capability !== capability) return sendJson(response, 403, { code: "expired-capability", message: "This setup link has expired." });
        capability = "";
        session = randomCapability();
        resetIdle();
        lifecycle("session-opened");
        return sendJson(response, 200, { ok: true }, { "set-cookie": `splash_setup=${session}; HttpOnly; SameSite=Strict; Path=/` });
      }
      if (!authorized(request)) return sendJson(response, 403, { code: "unauthorized", message: "This protected setup session is not active." });
      resetIdle();

      if (url.pathname === "/api/status") {
        exactObject(await readJson(request), [], "status request");
        return sendJson(response, 200, await publicStatus());
      }
      if (url.pathname === "/api/submit") {
        const body = exactObject(await readJson(request), ["credentials", "newsroom"], "setup submission");
        if (!Array.isArray(body.credentials) || body.credentials.length > CREDENTIAL_IDS.size) {
          throw new Error("setup credentials do not match the closed contract");
        }
        const seen = new Set();
        const credentials = body.credentials.map((value) => {
          const row = exactObject(value, ["id", "candidate", "expectedGeneration", "validationContext"], "setup credential");
          if (!CREDENTIAL_IDS.has(row.id) || seen.has(row.id)) throw new Error("setup credential id is unsupported or duplicated");
          seen.add(row.id);
          return row;
        });
        const newsroom = exactObject(body.newsroom, ["expectedRevision", "changes", "confirmReplaceDecline"], "setup newsroom");
        const result = await runMutation(async () => {
          let savedNewsroom;
          try {
            savedNewsroom = await updateNewsroom(newsroomPath, {
              expectedRevision: newsroom.expectedRevision,
              changes: newsroom.changes,
              decline: false,
              confirmDecline: false,
              confirmReplaceDecline: newsroom.confirmReplaceDecline === true,
            });
          } catch (error) {
            const safe = safeError(error);
            return { ok: false, credentials: [], newsroom: { ok: false, code: safe.code, message: safe.message } };
          }
          const savedCredentials = [];
          for (const row of credentials) {
            try {
              const saved = await engineBridge.replace(row.id, {
                candidate: row.candidate,
                expectedGeneration: row.expectedGeneration,
                validationContext: row.validationContext,
              });
              savedCredentials.push({ ...saved, name: row.id });
            } catch {
              savedCredentials.push({ ok: false, id: row.id, name: row.id, status: "invalid", reason: "The credential or its validation details were rejected.", written: false });
            }
          }
          return {
            ok: savedCredentials.every((row) => row.ok),
            credentials: savedCredentials,
            newsroom: { ok: true, ...savedNewsroom },
          };
        });
        return sendJson(response, 200, result);
      }
      if (url.pathname === "/api/credential/replace") {
        const body = exactObject(await readJson(request), ["id", "candidate", "expectedGeneration", "validationContext"], "credential replacement");
        if (!CREDENTIAL_IDS.has(body.id)) throw new Error("unsupported credential id");
        const result = await runMutation(() => engineBridge.replace(body.id, {
          candidate: body.candidate,
          expectedGeneration: body.expectedGeneration,
          validationContext: body.validationContext,
        }));
        return sendJson(response, result.ok ? 200 : result.status === "conflict" ? 409 : 422, result);
      }
      if (url.pathname === "/api/credential/remove") {
        const body = exactObject(await readJson(request), ["id", "expectedGeneration"], "credential removal");
        if (!CREDENTIAL_IDS.has(body.id)) throw new Error("unsupported credential id");
        const result = await runMutation(() => engineBridge.remove(body.id, { expectedGeneration: body.expectedGeneration }));
        return sendJson(response, result.ok ? 200 : result.status === "conflict" ? 409 : 422, result);
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
      if (url.pathname === "/api/legacy/migrate-credential") {
        const body = exactObject(await readJson(request), [
          "credentialId", "expectedEnvRevision", "assignmentId", "expectedGeneration",
          "validationContext", "confirmRemoval",
        ], "legacy credential migration");
        if (!CREDENTIAL_IDS.has(body.credentialId) || typeof body.confirmRemoval !== "boolean") throw new Error("legacy credential migration is invalid");
        const result = await runMutation(async () => {
          const legacy = await readLegacyCandidate(legacyEnvPath, {
            credentialId: body.credentialId,
            expectedRevision: body.expectedEnvRevision,
            assignmentId: body.assignmentId,
          });
          const stored = await engineBridge.replace(body.credentialId, {
            candidate: legacy.candidate,
            expectedGeneration: body.expectedGeneration,
            validationContext: body.validationContext,
          });
          if (!stored.ok) return { ok: false, credential: stored, legacyRemoval: { status: "retained" } };
          if (!body.confirmRemoval) return { ok: true, credential: stored, legacyRemoval: { status: "awaiting-confirmation" } };
          try {
            const legacyStatus = await removeLegacyAssignments(legacyEnvPath, {
              expectedRevision: body.expectedEnvRevision,
              assignments: [{ credentialId: body.credentialId, assignmentId: body.assignmentId }],
              confirmRemoval: true,
            });
            return { ok: true, credential: stored, legacyRemoval: { status: "removed", legacy: legacyStatus } };
          } catch (error) {
            return { ok: true, credential: stored, legacyRemoval: { status: "retained", outcome: error?.code === "REVISION_CONFLICT" ? "conflict" : "removal-failed" } };
          }
        });
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
          const blockers = await completionBlockers();
          if (blockers.length > 0) {
            return sendJson(response, 409, {
              code: "setup-incomplete",
              message: `Setup is incomplete: ${blockers.join("; ")}. Save the required fields before continuing.`,
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
