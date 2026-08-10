// Real key probes. A present key is not a working key.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Env var name resolution: this project's own short names stay canonical; the sibling engine
// (splash's own skills/map-native, skills/dw-chart) reads these under different names —
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
// It was missing here, which meant the ONE code path that accepts a key from a journalist threw on
// the exact key the owner's own ruling requires.
//
// It has no probe. That is a decision, not an omission: MapTiler enforces an origin restriction
// server-side against the request's own Origin, so a restricted key probed from a shell has no
// origin to present and would answer 403 — a working key reported broken. A capability row that
// lies is worse than no row, so this key is recordable and never probed, and `substituteKeys` is
// where its absence shows honestly (the placeholder travels through and the live layer never
// boots).
//
// `CMS_KIND` / `CMS_ENDPOINT` / `CMS_TOKEN` are the newsroom's own CMS, and they are a home for an
// answer rather than a capability. `deliver/scripts/cms-insert.mjs` builds the We.Publish and
// Livingdocs mutation SHAPES and sends neither — the `cms-insertion` delivery form writes a file
// describing the mutation, because no instance of either CMS exists anywhere in this project. So
// there was nowhere for a journalist's endpoint or token to go at all, and the first person to wire
// a real CMS would have had to invent a convention on the spot.
//
// They have NO PROBE, for the same reason `MAPTILER_DELIVERY_KEY` has none and stated even more
// plainly: there is no instance to probe. Every other key here is verified against its real service
// before it is written, and a CMS credential cannot meet that standard today — so it is recorded on
// trust, said out loud on the setup page, and given no capability row in `runPreflight`. A
// capability row that lies is worse than no row.
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

/**
 * Write one key into the root `.env`, replacing the line if that name is already there and
 * appending it if not. The ONE code path in this toolchain that accepts a key from a journalist —
 * before this, preflight reported a closed capability accurately and there was nowhere for an
 * answer to go, so `DATAWRAPPER_TOKEN` closed a whole story's delegated path with no moment at
 * which it could have been opened.
 *
 * It returns nothing, logs nothing, and never echoes the value. A key pasted into a chat is
 * already a secret in a transcript, which is outside this seam's reach and should be said to the
 * journalist in the same turn that asks; what this function can guarantee is that it does not make
 * a second copy anywhere a reader would see.
 *
 * `name` is validated against the canonical key set above — an unknown name throws — so nothing
 * pasted can name an arbitrary environment variable, and an alias is refused too: the canonical
 * name is what a later `resolveEnvKey` reads first.
 */
export async function recordKey({ root, name, value }) {
  if (!Object.prototype.hasOwnProperty.call(KEY_ALIASES, name)) {
    throw new Error(
      `${JSON.stringify(name)} is not a key this toolchain reads — expected one of ${Object.keys(KEY_ALIASES).join(", ")}`,
    );
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} was given no value to record`);
  }
  if (/[\r\n]/.test(value)) {
    throw new Error(`${name}'s value contains a line break, which would corrupt the .env file`);
  }

  const path = join(root, ".env");

  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch {
    existing = "";
  }

  const line = `${name}=${value.trim()}`;
  const lines = existing.split(/\r?\n/);
  const index = lines.findIndex((l) => l.trimStart().startsWith(`${name}=`));
  if (index === -1) {
    if (existing !== "" && !existing.endsWith("\n")) lines.push("");
    lines[lines.length - 1] = line;
    lines.push("");
  } else {
    lines[index] = line;
  }
  await writeFile(path, lines.join("\n"));
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
