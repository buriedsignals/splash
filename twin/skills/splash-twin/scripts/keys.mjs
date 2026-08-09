// Real key probes. A present key is not a working key.

// Env var name resolution: this project's own short names stay canonical; the sibling engine
// (splash's own skills/map-native, skills/dw-chart) reads these under different names —
// MAPTILER_API_KEY / REMOTION_MAPTILER_KEY / VITE_MAPTILER_KEY for the map key,
// DATAWRAPPER_API_TOKEN for the Datawrapper token (measured in that repository's own scripts, not
// guessed). A newsroom that already has a working `.env` for the engine should not have to keep a
// second copy under different names for this toolchain — the same remedy the main repository used
// for its own ATELIER_*→SPLASH_* rename (`process.env.SPLASH_X ?? process.env.ATELIER_X`, canonical
// first): read the canonical name first, fall back to each alias in order, so the canonical name
// always wins when both happen to be set.
const KEY_ALIASES = {
  MAPTILER_KEY: ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"],
  DATAWRAPPER_TOKEN: ["DATAWRAPPER_API_TOKEN"],
};

// Reads `canonical` from `env`, falling back to each of its aliases above in order. Never the
// reverse — an alias is read only when the canonical name is entirely absent, so a root that sets
// both never has the alias silently win.
export function resolveEnvKey(env, canonical) {
  if (env[canonical]) return env[canonical];
  for (const alias of KEY_ALIASES[canonical] ?? []) {
    if (env[alias]) return env[alias];
  }
  return "";
}

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
