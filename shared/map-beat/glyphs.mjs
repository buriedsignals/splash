// shared/map-beat/glyphs.mjs
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
import { join } from "node:path";
import { resolveEnvKey } from "../../skills/splash/scripts/keys.mjs";

/** The ranges a European beat needs: the Latin block, and the block that carries the typographic
 *  apostrophe (U+2019). A range that is not served makes the character vanish from the word with no
 *  error — "Mer d'Azov" printed as "Mer dAzov" for a full render cycle. */
export const DEFAULT_RANGES = ["0-255", "8192-8447"];

export async function bakeGlyphs({ faces, outDir, ranges = DEFAULT_RANGES }) {
  const { generateGlyphPbfFiles } = await import("maplibre-font-maker-node");
  const parsedRanges = ranges.map((range) => {
    const [start, end] = range.split("-").map(Number);
    return { start, end };
  });
  const written = [];
  for (const face of faces) {
    const bytes = await Bun.file(face.file).bytes();
    const files = await generateGlyphPbfFiles({
      fontstack: face.stack,
      fonts: [{ name: face.stack, bytes }],
      ranges: parsedRanges,
    });
    for (const file of files) {
      const path = join(outDir, file.filename);
      await Bun.write(path, file.bytes);
      written.push(path);
    }
  }
  return written;
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function assertNotFallback(candidate, fallback, name) {
  if (digest(candidate) === digest(fallback))
    throw new Error(
      `"${name}" was substituted: its glyphs are byte-identical to the fallback face. The map would ` +
        `render in a typeface nobody chose, and neither MapTiler nor MapLibre would report it`,
    );
}

function mapTilerKey() {
  const key = resolveEnvKey(process.env, "MAPTILER_KEY");
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
