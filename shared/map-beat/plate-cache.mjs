// twin/shared/map-beat/plate-cache.mjs
//
// A BAKED PLATE IS REUSABLE ONLY IF IT WAS PAINTED IN THE TINTS BEING ASKED FOR.
//
// THE TRAP, MEASURED. Twelve map beats cached their plate on `existsSync(geometry.json) &&
// existsSync(plate.png)` and nothing else. Nothing compared what the plate was PAINTED with against
// what the run was about to ask for, so the whole of `fix-map-family.md`'s repair — the water
// leaving the beat's own accent for the filed convention — would have shipped over twelve stale
// plates in silence. It was caught by hand that night and the directories were deleted by hand,
// which is not a fix.
//
// It had in fact already shipped once and stayed: `proof/web-flow-map-danube`'s three plates were
// still carrying `#dae2e5` / `#edeadd`, the OLD accent-tinted pair, months after the trunk started
// computing `#cedde1` / `#f4f1e3` for the same direction — the beat re-rendered and its plate never
// did, because nothing asked.
//
// `proof/static-choropleth-europe-lowcarbon/plate-cache.mjs` already solved this properly for ONE
// beat, comparing every one of the six inputs its own bake takes. This is the part every map beat
// needs — the bake records the pair it painted, so the pair can be compared — and it lives in the
// trunk so there is not a thirteenth private copy of it. A beat with more inputs than these two
// still owes its own comparison of them; this closes the one that was open everywhere.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Was the plate in `dir` baked, and baked in these two tints?
 *
 * `false` for a directory with no plate in it, for a plate whose `geometry.json` records no tints at
 * all (an old bake, which cannot be shown to match and therefore does not), and for one painted in
 * any other pair. Hex is compared case-insensitively: `bake.mjs` writes back what it was handed and
 * a caller's `#C5D7DE` is the same paint as `#c5d7de`.
 */
export function plateWasPaintedWith(dir, { water, land }) {
  const geometry = join(dir, "geometry.json");
  if (!existsSync(geometry) || !existsSync(join(dir, "plate.png"))) return false;
  let recorded;
  try {
    recorded = JSON.parse(readFileSync(geometry, "utf8"));
  } catch {
    return false;
  }
  const same = (a, b) => typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
  return same(recorded.water, water) && same(recorded.land, land);
}
