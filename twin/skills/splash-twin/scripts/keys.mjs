// Real key probes. A present key is not a working key.

const MAPTILER_PROBE = (key) =>
  `https://api.maptiler.com/maps/dataviz/style.json?key=${encodeURIComponent(key)}`;
const DATAWRAPPER_PROBE = "https://api.datawrapper.de/v3/me";

async function probe(url, init, fetchFn, label) {
  try {
    const response = await fetchFn(url, init);
    return response.ok
      ? { ok: true, status: response.status, detail: `${label} answered ${response.status}` }
      : { ok: false, status: response.status, detail: `${label} answered ${response.status}` };
  } catch (error) {
    return { ok: false, status: null, detail: `${label} threw: ${error.message}` };
  }
}

export async function probeMapTiler(key, fetchFn) {
  if (!key) return { ok: false, status: null, detail: "MAPTILER_KEY is not set" };
  return probe(MAPTILER_PROBE(key), {}, fetchFn, "MapTiler");
}

export async function probeDatawrapper(token, fetchFn) {
  if (!token) return { ok: false, status: null, detail: "DATAWRAPPER_TOKEN is not set" };
  return probe(DATAWRAPPER_PROBE, { headers: { Authorization: `Bearer ${token}` } }, fetchFn, "Datawrapper");
}
