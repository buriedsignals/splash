// Real key probes plus read-only environment compatibility for copied roots.
// Managed setup and production use Engine's record broker and closed operations.

// Env var name resolution: this project's own short names stay canonical; the original Splash
// engine (a sibling repository, not in this tree) reads these under different names —
// MAPTILER_API_KEY / REMOTION_MAPTILER_KEY / VITE_MAPTILER_KEY for the map key,
// DATAWRAPPER_API_TOKEN for the Datawrapper token (measured in that repository's own scripts, not
// guessed). A newsroom that already has a working `.env` for the engine should not have to keep a
// second copy under different names for this toolchain — the same remedy the main repository used
// for its own ATELIER_*→SPLASH_* rename (`process.env.SPLASH_X ?? process.env.ATELIER_X`, canonical
// first): read the canonical name first, fall back to each alias in order, so the canonical name
// always wins when both happen to be set.
// `MAPTILER_DELIVERY_KEY` is a SECOND MapTiler key, and it is deliberately not an alias of the
// first — ruling R1b (`FEEDBACK-2026-08-10.md`): a map web beat ships live tiles, so the delivered
// HTML carries a key, and the one it carries must be a dedicated origin-restricted key rather than
// the development one. `deliver`'s `substituteKeys` already reads it before `MAPTILER_KEY`.
// Historical aliases remain readable for an explicitly operated copied root, but no Splash setup
// surface writes them.
//
// It has no probe. That is a decision, not an omission: MapTiler enforces an origin restriction
// server-side against the request's own Origin, so a restricted key probed from a shell has no
// origin to present and would answer 403 — a working key reported broken. A capability row that
// lies is worse than no row, so direct legacy runs may read this key but never probe it;
// `substituteKeys` is where its absence shows honestly.
//
// `CMS_KIND` / `CMS_ENDPOINT` / `CMS_TOKEN` remain read-only copied-root compatibility. Splash
// builds CMS insertion packages but has no live CMS operation or truthful token probe, so managed
// setup does not register or collect a CMS token.
const KEY_ALIASES = {
  MAPTILER_KEY: ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"],
  MAPTILER_DELIVERY_KEY: [],
  DATAWRAPPER_TOKEN: ["DATAWRAPPER_API_TOKEN"],
  CLOUDFLARE_API_TOKEN: [],
  CLOUDFLARE_ACCOUNT_ID: [],
  CMS_KIND: [],
  CMS_ENDPOINT: [],
  CMS_TOKEN: [],
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

export async function probeCloudflare(accountId, apiToken, fetchFn) {
  if (!accountId) return { ok: false, status: null, detail: "CLOUDFLARE_ACCOUNT_ID is not set" };
  if (!apiToken) return { ok: false, status: null, detail: "CLOUDFLARE_API_TOKEN is not set" };
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}`;
  return probe(url, { headers: { Authorization: `Bearer ${apiToken}` } }, fetchFn, "Cloudflare");
}
