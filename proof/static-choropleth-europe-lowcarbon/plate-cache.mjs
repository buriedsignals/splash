// Whether a baked plate can be reused, decided by comparing every input the bake takes against what
// its own `geometry.json` recorded — not by whether the files merely exist.
//
// THE COUNTRY SHAPES ARE A FILE, not a value cheap to compare: the culled geometry `bake.mjs`
// writes into `geometry.json` is derived (thinned, cropped to the frame) and comparing that would be
// slow and fragile. What is compared instead is a digest of `shapes.geojson`'s own bytes, taken at
// bake time and carried in `geometry.json` for exactly this comparison.
//
// BOUNDS AND STYLE ARE BAKE-SIDE DEFAULTS in this beat — this caller never passes `--bounds` or
// `--style` — so the honest comparison is not against a second copy of them kept here, but against
// `bake.mjs`'s own `BEAT` constant: what the bake would use if asked again today. A change to that
// constant is a change to what every existing plate recorded, and this is what notices.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BEAT, digestOf } from "./bake.mjs";

/** `dir` holds a baked plate (`geometry.json` + `plate.png`). `inputs` is what a render is about to
 *  ask the bake for: the drawn `width`/`height`, the direction's `water`/`land` tints, and the
 *  `countriesPath` this bake culls its shapes from. `bounds` and `style` are not asked for here —
 *  they are read off `BEAT`, the bake's own current defaults.
 *
 *  NOT COMPARED, and why: `--settle` (how long the bake waits for MapLibre to report idle) — this
 *  caller never passes it, and `bake.mjs` does not record it in `geometry.json` at all, so there is
 *  nothing here to compare it against. Recording it would be `bake.mjs`'s change to make, not this
 *  one's to fake. */
export async function plateIsCurrent(dir, { width, height, water, land, countriesPath }) {
  if (!existsSync(join(dir, "geometry.json")) || !existsSync(join(dir, "plate.png"))) return false;
  const was = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
  const shapesDigest = await digestOf(countriesPath);
  return (
    was.frame?.width === width &&
    was.frame?.height === height &&
    was.water === water &&
    was.land === land &&
    JSON.stringify(was.bounds) === JSON.stringify(BEAT.bounds) &&
    was.style === BEAT.style &&
    was.shapesDigest === shapesDigest
  );
}
