import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { CREDENTIAL_IDS, ENGINE_SPLASH_CONTRACT_MIN } from "../../apps/goose/contract.mjs";
import { CREDENTIAL_CONTRACT_MESSAGE } from "./engine-bridge.mjs";
import {
  inspectLegacyEnv,
  readLegacyIntegrations,
  removeLegacyAssignments,
} from "./legacy-env.mjs";
import { readNewsroom, updateNewsroom, NEWSROOM_MANAGED_FIELDS } from "./newsroom-store.mjs";
import { createOutboundFetchPolicy } from "./outbound-fetch.mjs";
import { deriveCharter } from "../../skills/newsroom-charter/scripts/derive-charter.mjs";
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

function sendDesktopOwnedCredentialRefusal(response) {
  return sendJson(response, 410, {
    code: "desktop-owned",
    message: "Save Splash credentials in Indicator Labs. This page records newsroom identity only.",
  });
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

function page(nonce) {
  const fieldCopy = {
    name: ["Newsroom name", "The publication name shown on visuals."],
    url: ["Public newsroom URL", "Used only when you ask Splash to measure public brand declarations."],
    brandColor: ["Primary brand colour", "Six-digit hex colour, for example #0057b8."],
    ground: ["Background colour", "Six-digit hex colour used behind newsroom visuals."],
    typefaces: ["Typefaces", "Comma-separated newsroom typefaces, in preferred order."],
    languages: ["Publishing languages", "Comma-separated language codes, most-used first."],
    language: ["Primary language", "Optional primary language code when several are listed."],
    accents: ["Additional accent colours", "Comma-separated six-digit hex colours."],
    credit: ["House credit convention", "Optional standing credit wording."],
    cloudflareAccountId: ["Cloudflare account ID", "Non-secret 32-character account identifier used to validate Pages access."],
    cmsKind: ["CMS kind", "Use livingdocs or we-publish; configure it together with its endpoint."],
    cmsEndpoint: ["CMS endpoint", "Full HTTP or HTTPS API URL without an embedded credential."],
  };
  const fields = NEWSROOM_MANAGED_FIELDS.map((field) => {
    const [label, help] = fieldCopy[field] ?? [field, ""];
    return `<label for="newsroom-${field}"><span>${label}</span><input id="newsroom-${field}" name="${field}" aria-describedby="newsroom-${field}-help" autocomplete="off"><small id="newsroom-${field}-help">${help}</small></label>`;
  }).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Splash setup</title>
<style nonce="${nonce}">
:root{font-family:system-ui,sans-serif;color:#17202a;background:#f7f5ef}*{box-sizing:border-box}body{margin:0}main{width:min(44rem,100%);margin:auto;padding:1rem}h1{font-size:1.65rem;margin:.25rem 0}.lede{max-width:58ch}.tabs{display:flex;gap:.5rem;margin:1.25rem 0}.tabs button,button,a.action{min-width:44px;min-height:44px;border:2px solid #17202a;border-radius:.35rem;padding:.65rem .85rem;background:#fff;color:inherit;font:inherit;font-weight:650}.tabs button[aria-selected=true]{background:#17202a;color:#fff}[hidden]{display:none!important}label{display:block;margin:1rem 0}label span{display:block;font-weight:650;margin-bottom:.3rem}input{width:100%;min-height:44px;padding:.55rem;border:1px solid #59636d;border-radius:.3rem;font:inherit}.credential{border-top:1px solid #c6c4bc;padding:1rem 0}.credential p{margin:.35rem 0}.actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}.status{padding:.65rem;background:#fff;border-left:4px solid #59636d}.error{border-color:#9d1c20;color:#741316}a{color:#064f76}a:focus,button:focus,input:focus{outline:3px solid #d18b00;outline-offset:2px}@media(max-width:320px){main{padding:.65rem}.tabs,.actions{display:block}.tabs button,.actions button{width:100%;margin:.2rem 0}body{overflow-x:hidden}}
</style></head><body><main>
<h1>Splash pre-flight</h1><p class="lede">Record the newsroom details Splash may show in its work. Save MapTiler, Datawrapper, and Cloudflare keys in Indicator Labs; this page only reports whether they are present.</p>
<nav class="tabs" role="tablist" aria-label="Setup sections"><button id="tab-newsroom" role="tab" aria-selected="true" aria-controls="panel-newsroom">Newsroom</button><button id="tab-credentials" role="tab" aria-selected="false" aria-controls="panel-credentials">Key status</button></nav>
<p id="summary" class="status" role="status" aria-live="polite" tabindex="-1">Opening the protected local session…</p>
<section id="panel-newsroom" role="tabpanel" aria-labelledby="tab-newsroom"><p>Enter details manually, or measure declarations on the public newsroom website and confirm the proposal before saving.</p><button type="button" id="derive">Measure the public site</button><div id="proposal" aria-live="polite"></div><form id="newsroom-form">${fields}<div class="actions"><button type="submit">Save newsroom</button><button type="button" id="decline">Record that no house profile will be used</button></div></form></section>
<section id="panel-credentials" role="tabpanel" aria-labelledby="tab-credentials" hidden><div id="credentials"></div><div id="legacy"></div></section>
<div class="actions"><button id="done" type="button">Done</button><button id="close" type="button">Close setup</button></div>
</main><script nonce="${nonce}">
const summary=document.querySelector('#summary');let state=null;
function announce(message,error=false){summary.textContent=message;summary.classList.toggle('error',error);summary.focus()}
async function api(path,options={}){const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});const body=await response.json();if(!response.ok)throw Object.assign(new Error(body.message||'Request refused'),{body});return body}
function activate(name){for(const tab of document.querySelectorAll('[role=tab]')){const selected=tab.id==='tab-'+name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.querySelector('#'+tab.getAttribute('aria-controls')).hidden=!selected}document.querySelector('#tab-'+name).focus()}
const tabs=[...document.querySelectorAll('[role=tab]')];for(const tab of tabs){tab.tabIndex=tab.getAttribute('aria-selected')==='true'?0:-1;tab.addEventListener('click',()=>activate(tab.id.slice(4)));tab.addEventListener('keydown',event=>{let next=-1;if(event.key==='ArrowRight')next=(tabs.indexOf(tab)+1)%tabs.length;if(event.key==='ArrowLeft')next=(tabs.indexOf(tab)-1+tabs.length)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next<0)return;event.preventDefault();activate(tabs[next].id.slice(4))})}
function safeLink(raw){try{const url=new URL(raw);return url.protocol==='https:'?url.href:null}catch{return null}}
function renderCredentials(){const root=document.querySelector('#credentials');root.replaceChildren();const intro=document.createElement('p');intro.textContent='Save MapTiler, Datawrapper, and Cloudflare keys in Indicator Labs. This page only reports whether they are present.';root.append(intro);for(const row of state.credentials){const box=document.createElement('section');box.className='credential';const slug=row.id.toLowerCase().replaceAll('_','-');const title=document.createElement('h2');title.textContent=row.metadata?.name||row.id;box.append(title);const status=document.createElement('p');status.id=slug+'-status';status.textContent=row.stored?'Saved, generation '+row.generation:'Not saved';box.append(status);const purpose=document.createElement('p');purpose.id=slug+'-purpose';purpose.textContent=row.metadata?.purpose||'';box.append(purpose);const href=safeLink(row.metadata?.acquisitionUrl);if(href){const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Get this credential from the provider';box.append(link)}const hint=document.createElement('p');hint.textContent='Save or replace this key in Indicator Labs.';box.append(hint);root.append(box)}}
function renderLegacy(){const root=document.querySelector('#legacy');root.replaceChildren();if(!state.legacy?.exists)return;const title=document.createElement('h2');title.textContent='Existing .env migration';root.append(title);if(!state.legacy.safe){const warning=document.createElement('p');warning.className='status error';warning.textContent='The existing .env needs a manual syntax, ownership, or permissions repair before non-secret settings can be imported.';root.append(warning);return}if(state.legacy.credentials?.length){const note=document.createElement('p');note.textContent='Provider keys still in .env must be saved in Indicator Labs, then removed from .env by hand. This page does not collect secrets.';root.append(note)}if(state.legacy.integrations.length){const integrations=document.createElement('button');integrations.type='button';integrations.textContent='Import non-secret service settings into NEWSROOM.md';integrations.addEventListener('click',async()=>{if(!confirm('Import the listed account and CMS settings into the newsroom profile?'))return;const confirmRemoval=confirm('After the newsroom write succeeds, remove only those exact settings from .env?');try{const result=await api('/api/legacy/import-integrations',{method:'POST',body:JSON.stringify({expectedEnvRevision:state.legacy.revision,assignments:state.legacy.integrations.map(({field,assignmentId})=>({field,assignmentId})),expectedNewsroomRevision:state.newsroom.revision,confirmImport:true,confirmReplaceDecline:state.newsroom.declined,confirmRemoval})});state.newsroom=result.newsroom;announce('Service settings imported. Legacy assignments: '+result.legacyRemoval.status);await refresh()}catch(error){announce(error.body?.message||'Service settings were not imported.',true)}});root.append(integrations)}}
function renderNewsroom(){const profile=state.newsroom.profile||{};for(const input of document.querySelectorAll('#newsroom-form input'))input.value=profile[input.name]||''}
async function refresh(){state=await api('/api/status',{method:'POST',body:'{}'});renderCredentials();renderLegacy();renderNewsroom()}
document.querySelector('#derive').addEventListener('click',async()=>{const url=document.querySelector('#newsroom-url').value;announce('Measuring the public newsroom site…');try{const result=await api('/api/derive',{method:'POST',body:JSON.stringify({url})});const proposal=document.querySelector('#proposal');proposal.replaceChildren();const heading=document.createElement('h2');heading.textContent='Measured proposal';proposal.append(heading);for(const [field,row] of Object.entries(result.fields)){if(!row)continue;const item=document.createElement('p');item.textContent=field+': '+row.value+' — '+row.source+' ('+row.evidence+')';proposal.append(item)}const apply=document.createElement('button');apply.type='button';apply.textContent='Apply this proposal to empty fields';apply.addEventListener('click',()=>{if(!confirm('Apply these measured values to the empty newsroom fields?'))return;for(const [field,row] of Object.entries(result.fields)){const input=document.querySelector('#newsroom-'+field);if(row&&input&&!input.value)input.value=row.value}announce('Proposal applied to the form. Review it, then save newsroom.')});proposal.append(apply);announce('Proposal ready for review. Nothing has been written.')}catch(error){announce(error.body?.message||'The site could not be measured safely; enter branding manually.',true)}});
document.querySelector('#newsroom-form').addEventListener('submit',async event=>{event.preventDefault();const changes=Object.fromEntries([...new FormData(event.currentTarget)].map(([key,value])=>[key,String(value)]));try{state.newsroom=await api('/api/newsroom',{method:'POST',body:JSON.stringify({expectedRevision:state.newsroom.revision,changes,decline:false,confirmDecline:false,confirmReplaceDecline:state.newsroom.declined})});announce('Newsroom details saved.')}catch(error){announce(error.body?.message||'Newsroom details were not saved.',true)}});
document.querySelector('#decline').addEventListener('click',async()=>{if(!confirm('Record that this newsroom will not use a house profile?'))return;try{state.newsroom=await api('/api/newsroom',{method:'POST',body:JSON.stringify({expectedRevision:state.newsroom.revision,changes:{},decline:true,confirmDecline:true,confirmReplaceDecline:false})});announce('The newsroom decision was recorded.')}catch(error){announce(error.body?.message||'The decision was not saved.',true)}});
document.querySelector('#done').addEventListener('click',async()=>{await api('/api/done',{method:'POST',body:'{}'});announce('Setup is complete. You can close this page.')});document.querySelector('#close').addEventListener('click',async()=>{await api('/api/close',{method:'POST',body:'{}'});announce('Setup closed. Completed saves remain stored.')});
(async()=>{const capability=location.hash.slice(1);history.replaceState(null,'',location.pathname);if(!capability)throw new Error('This setup link has expired.');await api('/session',{method:'POST',body:JSON.stringify({capability})});await refresh();announce('Protected local setup is ready.')})().catch(error=>announce(error.message,true));
</script></body></html>`;
}

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
        return sendText(response, 200, page(nonce), nonce);
      }
      if (request.method !== "POST") return sendJson(response, 405, { code: "method-not-allowed", message: "This setup route does not support that method." }, { allow: "GET, POST" });
      if (request.headers.origin !== origin) return sendJson(response, 403, { code: "wrong-origin", message: "The request did not come from this setup page." });

      if (url.pathname === "/session") {
        const body = exactObject(await readJson(request), ["capability"], "session request");
        if (!active || !capability || body.capability !== capability) return sendJson(response, 403, { code: "expired-capability", message: "This setup link has expired." });
        capability = "";
        let listed;
        try {
          listed = await engineBridge.list();
        } catch {
          listed = null;
        }
        sessionCredentialContract = retainedCredentialContract(listed);
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
      if (
        url.pathname === "/api/credential/replace"
        || url.pathname === "/api/credential/remove"
        || url.pathname === "/api/legacy/migrate-credential"
      ) {
        await readJson(request);
        return sendDesktopOwnedCredentialRefusal(response);
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
