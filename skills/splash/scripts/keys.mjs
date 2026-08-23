// Real key probes plus the copied-root compatibility writer. A present key is not a working key.
// Managed setup and production use Engine's record broker and closed operations; they never call
// `recordKey` or treat this environment resolver as the credential authority.

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
// `CMS_KIND` / `CMS_ENDPOINT` / `CMS_TOKEN` are retained for copied-root compatibility only.
// `deliver/scripts/cms-insert.mjs` builds the We.Publish and
// Livingdocs mutation SHAPES and sends neither — the `cms-insertion` delivery form writes a file
// describing the mutation, because no instance of either CMS exists anywhere in this project. So
// there was nowhere for a journalist's endpoint or token to go at all, and the first person to wire
// a real CMS would have had to invent a convention on the spot.
//
// They have NO PROBE, for the same reason `MAPTILER_DELIVERY_KEY` has none and stated even more
// plainly: there is no instance to probe. Every other key here is verified against its real service
// before it is written, and a CMS credential cannot meet that standard today. The managed setup
// therefore registers no CMS token and gives it no capability row in `runPreflight`; only the
// explicitly legacy plaintext configurator can preserve the old name. A capability row that lies is
// worse than no row.
//
// THE TWO LISTS THAT ARE NOT EMPTY ARE DECLARED UNDER THE NAME THE REST OF THE TREE ALREADY USES
// FOR THEM — `<CANONICAL>_ALIASES`, the exact shape `map-beat/scripts/bake-plate.mjs`,
// `dw-beat/scripts/produce.mjs` and some twenty `bake.mjs` files under `proof/` already spell. That
// is not tidying: `credentialReadsWithoutAlias` (the catalogue's `credential-alias-reconciled`)
// reads that string to decide whether a canonical read has a declared fallback, and the trait
// `reads-a-provider-credential` reads it to decide whether this skill reads a credential at all.
// Written only as this object's keys, the alias mechanism was invisible to both — so routing the
// last hand-written read through the resolver would have DELETED this skill's own trait and made
// the rule stop reaching it, which is a cell disappearing rather than a cell being carried.
//
// AND ONLY THE TWO THAT ARE NOT EMPTY. Declaring `CLOUDFLARE_API_TOKEN_ALIASES = []` beside them
// would read as the same thing and be the opposite of it: `credentialReadsWithoutAlias` excuses any
// canonical read whose `<NAME>_ALIASES` string appears ANYWHERE in the skill, so an empty list under
// that name buys a bare `process.env.CLOUDFLARE_API_TOKEN` three files away a pass it has not
// earned. Measured 2026-08-23 — with all eight declared that way the guard reported this skill
// clean while `run-operation.mjs`'s third provider case still read the token bare.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const DATAWRAPPER_TOKEN_ALIASES = ["DATAWRAPPER_API_TOKEN"];
const KEY_ALIASES = { MAPTILER_KEY: MAPTILER_KEY_ALIASES, DATAWRAPPER_TOKEN: DATAWRAPPER_TOKEN_ALIASES };

/** THE NAMES `recordKey` WILL WRITE, which is a different fact from which of them have aliases and
 *  was told through the alias table's own key set until 2026-08-23. Keeping them apart is what lets
 *  the table hold only the two credentials that really have another name: read as an allowlist, a
 *  table with six empty entries says "these six have a declared alias list", which is the one thing
 *  `credentialReadsWithoutAlias` reads to excuse a canonical read.
 *
 *  `env-example.test.ts` holds this list to the names `.env.example` advertises, so it is checked
 *  against something rather than only typed. */
const RECORDABLE_KEYS = [
  "MAPTILER_KEY",
  "MAPTILER_DELIVERY_KEY",
  "DATAWRAPPER_TOKEN",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CMS_KIND",
  "CMS_ENDPOINT",
  "CMS_TOKEN",
];

/** Reads `canonical` from `env`, falling back to each of its aliases above in order. Never the
 *  reverse — an alias is read only when the canonical name is entirely absent, so a root that sets
 *  both never has the alias silently win.
 *
 *  EVERY PROVIDER CREDENTIAL READ IN A SKILL THAT CARRIES THIS GOES THROUGH HERE, and that is the
 *  whole mechanism: a read written by hand against one literal name honours that name and silently
 *  ignores the table, which is precisely the defect `credential-alias-reconciled` was earned by and
 *  the shape found three times in one week — `verify-live-map.mjs`, then the gate that decided
 *  whether that probe ran at all, then a provider case sitting between two that already resolved
 *  through it. Measured on this machine on
 *  2026-08-23: the root `.env` holds `REMOTION_MAPTILER_KEY` and `VITE_MAPTILER_KEY` and neither
 *  `MAPTILER_KEY` nor `MAPTILER_DELIVERY_KEY`, so a hand-written two-name fallback over those two
 *  canonical names read back as "no key at all" against a working, present key.
 *
 *  It returns `""` and never `undefined`, so a caller can test it as a string without deciding
 *  again what an absent credential looks like.
 *
 *  `KEY_ALIASES`, `MAPTILER_KEY_ALIASES` and `DATAWRAPPER_TOKEN_ALIASES` are named here and not
 *  only above on purpose: `guard-copies-parity.test.ts`'s `constantsBehind` follows every
 *  SHOUTING_CASE name inside this span to its own one-line declaration and compares that too, so a
 *  copy of this function whose alias table lost `REMOTION_MAPTILER_KEY` reads as the drift it is
 *  rather than as the same decision. A threshold is part of a decision; so is a lexicon. */
export function resolveEnvKey(env, canonical) {
  if (env[canonical]) return env[canonical];
  for (const alias of KEY_ALIASES[canonical] ?? []) {
    if (env[alias]) return env[alias];
  }
  return "";
}

/**
 * Legacy copied-root helper: write one key into the root `.env`, replacing the line if that name is already there and
 * appending it if not. This is not the managed setup path; Engine's protected Readiness controller
 * accepts new credentials there. Historically this was the one code path that accepted a key —
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
export { RECORDABLE_KEYS };

export async function recordKey({ root, name, value }) {
  if (!RECORDABLE_KEYS.includes(name)) {
    throw new Error(
      `${JSON.stringify(name)} is not a key this toolchain reads — expected one of ${RECORDABLE_KEYS.join(", ")}`,
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

/**
 * FINDING 20 (stress round four): A CAPABILITY IS NEVER REPORTED CLOSED FOR A REASON THAT IS NOT
 * ABOUT THE CAPABILITY.
 *
 * `fetchFn` used to be a required argument with no default, and every caller of `runPreflight` that
 * forgot it got `fetchFn is not a function` thrown INSIDE the try below, caught as a network
 * failure, and printed as the capability's own reason: "MapTiler threw: fetchFn is not a
 * function". A journalist reads that as "MapTiler is down". Measured on the same machine at the
 * same moment, with a real `fetch` passed: map 200, datawrapper 200, hostedEmbed 403 — every
 * capability the toolchain has, reported shut, by an argument the caller forgot.
 *
 * So: the platform's own `fetch` is the default, because there is a correct one and refusing to
 * use it helps nobody; and a caller who hands in something that is not callable is REFUSED by name,
 * before the try, so a mistake in the call can never be dressed up as evidence about a provider.
 */
function resolveFetch(fetchFn) {
  if (fetchFn === undefined || fetchFn === null) {
    if (typeof globalThis.fetch !== "function")
      throw new Error(
        "no fetchFn was passed and this runtime has no global fetch — pass one explicitly; a probe will not report a capability closed over its own missing transport",
      );
    return globalThis.fetch.bind(globalThis);
  }
  if (typeof fetchFn !== "function")
    throw new Error(
      `fetchFn must be a function, got ${typeof fetchFn} — a probe will not report a capability closed for a reason that is not about the capability`,
    );
  return fetchFn;
}

async function probe(url, init, fetchFn, label) {
  const request = resolveFetch(fetchFn);
  try {
    const response = await request(url, init);
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
