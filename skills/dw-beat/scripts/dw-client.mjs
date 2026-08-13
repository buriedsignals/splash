// A thin, real wrapper around the Datawrapper v3 API — one function per operation, nothing cached,
// nothing retried silently. Every function takes `fetchFn` last so a test can inject a fake one (the same
// pattern `splash/scripts/keys.mjs` already uses for `probeMapTiler`/`probeDatawrapper`) —
// that is dependency injection for a request/response contract, not a mock of "the real API call":
// the one place this project actually talks to Datawrapper (`produce.mjs`, `verify-range-
// annotation.mjs`) always passes the real global `fetch`.

const API_BASE = "https://api.datawrapper.de/v3";
export const DEFAULT_DATAWRAPPER_TIMEOUT_MS = 15_000;
const CHART_ID = /^[A-Za-z0-9_-]+$/;

export function chartIdForPath(value) {
  if (typeof value !== "string" || !CHART_ID.test(value)) {
    throw new Error("Datawrapper chart ID must be one provider ID segment");
  }
  return encodeURIComponent(value);
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function timeoutMs(value) {
  const resolved = value ?? DEFAULT_DATAWRAPPER_TIMEOUT_MS;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new Error("Datawrapper request timeout must be greater than zero");
  }
  return resolved;
}

async function withDeadline(promise, { controller, milliseconds, label }) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label} timed out after ${milliseconds}ms`));
    }, milliseconds);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function request(url, init, fetchFn, label, requestedTimeout) {
  const milliseconds = timeoutMs(requestedTimeout);
  const controller = new AbortController();
  const response = await withDeadline(
    Promise.resolve().then(() => fetchFn(url, { ...init, signal: controller.signal })),
    { controller, milliseconds, label: `${label} request` },
  );
  return { response, controller, milliseconds, label };
}

async function readBody(call, method) {
  return withDeadline(
    Promise.resolve().then(() => call.response[method]()),
    {
      controller: call.controller,
      milliseconds: call.milliseconds,
      label: `${call.label} response body`,
    },
  );
}

async function assertOk(call) {
  const { response, label } = call;
  if (response.ok) return response;
  const body = await readBody(call, "text").catch(() => "");
  throw new Error(`${label} failed: ${response.status}${body ? ` — ${body.slice(0, 300)}` : ""}`);
}

export async function createChart({ title, type, language }, token, fetchFn = fetch, options = {}) {
  const call = await request(`${API_BASE}/charts`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ title, type, language }),
  }, fetchFn, "create chart", options.timeoutMs);
  await assertOk(call);
  return readBody(call, "json");
}

export async function setChartData(id, csv, token, fetchFn = fetch, options = {}) {
  const call = await request(`${API_BASE}/charts/${chartIdForPath(id)}/data`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "text/csv" },
    body: csv,
  }, fetchFn, "set chart data", options.timeoutMs);
  await assertOk(call);
}

export async function patchMetadata(id, metadata, token, fetchFn = fetch, options = {}) {
  return patchChart(id, { metadata }, token, fetchFn, options);
}

export async function patchChart(id, patch, token, fetchFn = fetch, options = {}) {
  const call = await request(`${API_BASE}/charts/${chartIdForPath(id)}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }, fetchFn, "patch chart", options.timeoutMs);
  await assertOk(call);
  return readBody(call, "json");
}

export async function publishChart(id, token, fetchFn = fetch, options = {}) {
  const call = await request(`${API_BASE}/charts/${chartIdForPath(id)}/publish`, {
    method: "POST",
    headers: authHeaders(token),
  }, fetchFn, "publish chart", options.timeoutMs);
  await assertOk(call);
  return readBody(call, "json");
}

export async function exportChartPng(id, token, fetchFn = fetch, { width = 900, height, zoom = 2, plain = false, timeoutMs: requestedTimeout } = {}) {
  const params = new URLSearchParams({ unit: "px", width: String(width), zoom: String(zoom), plain: String(plain) });
  if (height) params.set("height", String(height));
  const call = await request(`${API_BASE}/charts/${chartIdForPath(id)}/export/png?${params.toString()}`, {
    method: "GET",
    headers: authHeaders(token),
  }, fetchFn, "export chart png", requestedTimeout);
  await assertOk(call);
  return new Uint8Array(await readBody(call, "arrayBuffer"));
}

export async function getChart(id, token, fetchFn = fetch, options = {}) {
  const call = await request(
    `${API_BASE}/charts/${chartIdForPath(id)}`,
    { headers: authHeaders(token) },
    fetchFn,
    "get chart",
    options.timeoutMs,
  );
  await assertOk(call);
  return readBody(call, "json");
}
