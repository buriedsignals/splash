// A thin, real wrapper around the Datawrapper v3 API — five calls, nothing cached, nothing
// retried silently. Every function takes `fetchFn` last so a test can inject a fake one (the same
// pattern `splash-twin/scripts/keys.mjs` already uses for `probeMapTiler`/`probeDatawrapper`) —
// that is dependency injection for a request/response contract, not a mock of "the real API call":
// the one place this project actually talks to Datawrapper (`produce.mjs`, `verify-range-
// annotation.mjs`) always passes the real global `fetch`.

const API_BASE = "https://api.datawrapper.de/v3";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function assertOk(response, label) {
  if (response.ok) return response;
  const body = await response.text().catch(() => "");
  throw new Error(`${label} failed: ${response.status}${body ? ` — ${body.slice(0, 300)}` : ""}`);
}

export async function createChart({ title, type, language }, token, fetchFn = fetch) {
  const response = await fetchFn(`${API_BASE}/charts`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ title, type, language }),
  });
  await assertOk(response, "create chart");
  return response.json();
}

export async function setChartData(id, csv, token, fetchFn = fetch) {
  const response = await fetchFn(`${API_BASE}/charts/${id}/data`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "text/csv" },
    body: csv,
  });
  await assertOk(response, "set chart data");
}

export async function patchMetadata(id, metadata, token, fetchFn = fetch) {
  const response = await fetchFn(`${API_BASE}/charts/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });
  await assertOk(response, "patch chart metadata");
  return response.json();
}

export async function publishChart(id, token, fetchFn = fetch) {
  const response = await fetchFn(`${API_BASE}/charts/${id}/publish`, {
    method: "POST",
    headers: authHeaders(token),
  });
  await assertOk(response, "publish chart");
  return response.json();
}

export async function exportChartPng(id, token, fetchFn = fetch, { width = 900, height, zoom = 2, plain = false } = {}) {
  const params = new URLSearchParams({ unit: "px", width: String(width), zoom: String(zoom), plain: String(plain) });
  if (height) params.set("height", String(height));
  const response = await fetchFn(`${API_BASE}/charts/${id}/export/png?${params.toString()}`, {
    method: "GET",
    headers: authHeaders(token),
  });
  await assertOk(response, "export chart png");
  return new Uint8Array(await response.arrayBuffer());
}

export async function getChart(id, token, fetchFn = fetch) {
  const response = await fetchFn(`${API_BASE}/charts/${id}`, { headers: authHeaders(token) });
  await assertOk(response, "get chart");
  return response.json();
}
