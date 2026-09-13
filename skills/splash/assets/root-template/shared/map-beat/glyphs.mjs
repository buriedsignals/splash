// twin/shared/map-beat/glyphs.mjs
//
// MAPLIBRE DOES NOT DRAW WITH A SYSTEM FONT. It reads signed distance fields served by the style,
// 256 characters at a time. MapTiler Cloud serves eighteen families and answers 200 with Noto Sans
// for every other name — `Futura Medium`, `Avenir Next`, `Georgia`, and `Zzz Fictive Regular` all
// return the same 83 352-byte file. A map that asks for Futura gets Noto Sans and nothing says so.
//
// So a beat that needs a filed family serves its own glyphs, and this module REFUSES a face whose
// bytes are the fallback's. `useTypeface` in the trunk already states the rule: a silent stack has
// not chosen.

import { createHash } from "node:crypto";

/** The ranges a European beat needs: the Latin block, and the block that carries the typographic
 *  apostrophe (U+2019). A range that is not served makes the character vanish from the word with no
 *  error — "Mer d'Azov" printed as "Mer dAzov" for a full render cycle. */
export const DEFAULT_RANGES = ["0-255", "8192-8447"];

/**
 * SDF BAKING HAS NO ENGINE IN THIS TREE, AND THAT IS A MEASURED STATE RATHER THAN AN OMISSION.
 *
 * This function is kept, and kept refusing, because the day a beat needs a family MapTiler does not
 * serve it is the path that has to exist — and the reason it does not work today is worth having
 * written down where the caller stands rather than rediscovered from a hanging process.
 *
 * WHAT WAS MEASURED (ruling C12, `.superpowers/sdd/2026-09-12-sp1-map-plan-contract/progress.md`):
 *
 *   · `maplibre-font-maker-node@0.5.0` — the only published wrapper, `@maplibre/font-maker` being a
 *     404 on the registry — loads its emscripten runtime through `node:vm`. Under BUN, `var`
 *     hoisting inside a vm script erases the sandbox's `Module` before the preamble reads it, so
 *     `wasmBinary` and `onAbort` are both lost and the process HANGS instead of throwing. 0.5.0 was
 *     and is the latest version. It also declares no licence, which a repository that ships to a
 *     newsroom should not carry silently. It has been removed from `package.json`.
 *   · Even under node it would not have helped the pilot: the faces the design base resolved to at
 *     the time were TrueType COLLECTIONS (`Avenir Next.ttc`, `Futura.ttc`) and every layer of the
 *     chain rejects `ttcf`.
 *   · AND THE NEED DISSOLVED. 17 of the 18 families MapTiler serves are Google Fonts, and the
 *     design base's ladders now head with three of them (Merriweather, Open Sans, Montserrat). A
 *     map label and the panel label beside it come from the identical file, with no SDF baking at
 *     all. That is why nothing calls this.
 *
 * @throws always — see above. `assertNotFallback` below is the guard that stays live.
 */
export async function bakeGlyphs() {
  throw new Error(
    "bakeGlyphs has no engine: `maplibre-font-maker-node@0.5.0` is removed from this repository " +
      "(it loads its WASM through node:vm, which Bun's var hoisting breaks — the process hangs " +
      "rather than failing — and it declares no licence), and no other SDF encoder is installed. " +
      "This path is only reached by a family OUTSIDE the seventeen Google families MapTiler serves; " +
      "for those seventeen the map and the panel share the same fetched .ttf and need no baking. " +
      "To reopen it, read ruling C12 in " +
      ".superpowers/sdd/2026-09-12-sp1-map-plan-contract/progress.md, then choose an encoder that " +
      "runs under Bun and carries a licence.",
  );
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function assertNotFallback(candidate, fallback, name) {
  if (digest(candidate) === digest(fallback))
    throw new Error(
      `"${name}" was substituted: its glyphs are byte-identical to the fallback face. The map would ` +
        `render in a typeface nobody chose, and neither MapTiler nor MapLibre would report it`,
    );
}

/** THE TRUNK DOES NOT REACH INTO `skills/`. `shared/` is vendored on its own into a newsroom's root
 *  (`skills/splash/assets/root-template/shared/`), where no `skills/` directory sits beside it — so
 *  an import climbing out of `shared/` resolves here and fails there, which is the worst shape a
 *  defect can take. The three aliases below are `splash/scripts/keys.mjs`'s own list for this key,
 *  duplicated the way this repository duplicates a helper across a copy boundary, and held to it by
 *  `the-trunk-stands-alone.test.ts` rather than by anybody remembering. Canonical name first,
 *  always: a root that sets both must never have the alias win. */
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

export function mapTilerKeyIn(env) {
  for (const name of ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES]) if (env[name]) return env[name];
  return "";
}

function mapTilerKey() {
  const key = mapTilerKeyIn(process.env);
  if (!key) throw new Error("no MAPTILER_KEY in the environment — the glyph probe needs a real key");
  return key;
}

/** Fetch one range of one font stack from MapTiler Cloud, as raw SDF bytes. MapTiler answers 200
 *  for a family it does not have and serves Noto Sans instead — the reason `assertNotFallback`
 *  exists. */
export async function maptilerGlyphs(stack, range, key = mapTilerKey()) {
  const url = `https://api.maptiler.com/fonts/${encodeURIComponent(stack)}/${range}.pbf?key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MapTiler refused ${stack} ${range}: ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Probe which families the style host really serves, by comparing each face's bytes to the
 *  fallback's. Used by the live test; never in a render path. */
export async function servedFaces(candidates = CANDIDATE_FAMILIES) {
  const fallback = await maptilerGlyphs("Noto Sans Regular", "0-255");
  const real = [];
  for (const family of candidates) {
    const bytes = await maptilerGlyphs(`${family} Regular`, "0-255");
    if (digest(bytes) !== digest(fallback)) real.push(family);
  }
  return real;
}

const CANDIDATE_FAMILIES = [
  "Metropolis", "Open Sans", "Roboto", "Inter", "Lato", "Montserrat", "Nunito", "Rubik",
  "Source Sans Pro", "PT Sans", "Ubuntu", "Merriweather", "PT Serif", "Libre Baskerville",
  "Noto Serif", "Roboto Slab", "Roboto Mono", "Source Code Pro",
  "Futura", "Avenir Next", "Superclarendon", "Georgia", "Playfair Display", "Lora",
];
