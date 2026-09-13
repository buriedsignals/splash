// twin/shared/map-beat/tints.mjs
//
// THE TWO COLOURS A BASEMAP IS ALLOWED, AND WHY THEY ARE MEASURED RATHER THAN CHOSEN.
//
// A fixed dose cannot work across three grounds. At 0.14 of the filed water hue, `nocturne` rendered
// sea and land at 1.014:1 — the same colour. A dark blue mixed into a navy ground produces no
// separation at all. The original escaped this by accident: its sea took the ACCENT, and nocturne's
// accent is a pale mint, which lightens.
//
// So the rule targets a MEASURED gap and takes the smallest dose that reaches it: the basemap stays
// as quiet as it can while a coastline still reads.

import { mix, contrast } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";

/** Below this, a coastline stops reading as a coastline. Measured on the six converted types. */
export const SEA_LAND_MIN = 1.22;
/** Above this, the basemap has more weight against the page than the marks it carries — which is
 *  what `the-basemap-gives-up-its-contrast` forbids. */
export const BASEMAP_MAX = 1.6;

/** THE FILED WATER CONVENTION, AND WHY IT IS A CONSTANT HERE RATHER THAN AN IMPORT.
 *
 *  It is `palette`'s `water` convention — the blue a reader already holds, the semantic-resonance
 *  study's own opening example — and the authority for it is
 *  `skills/palette/scripts/palette.mjs`'s `SUBJECT_CONVENTIONS`. The trunk cannot IMPORT that:
 *  `shared/` is vendored on its own into a newsroom's root, with no `skills/` beside it, so a climb
 *  out of `shared/` resolves in this checkout and fails in the install — a break that only appears
 *  where nobody is watching. So the value is duplicated across the copy boundary, the way this
 *  repository duplicates every helper that crosses one, and `the-trunk-stands-alone.test.ts` holds
 *  the two in step. */
export const WATER_HUE = "#1F6FB2";

export function plateTints(direction) {
  const { ink } = deriveFurniture(direction.ground);
  const land = mix(direction.ground, ink, 0.045);
  const hue = WATER_HUE;

  for (let dose = 0.06; dose <= 0.7; dose += 0.02) {
    const water = mix(direction.ground, hue, dose);
    if (contrast(water, land) < SEA_LAND_MIN) continue;
    if (contrast(water, direction.ground) >= BASEMAP_MAX) break;
    return { water, land, seaLandContrast: contrast(water, land) };
  }

  throw new Error(
    `no dose of the filed water hue separates sea from land by ${SEA_LAND_MIN}:1 on ground ` +
      `${direction.ground} while staying under ${BASEMAP_MAX}:1 against it — this direction and ` +
      `this hue are too close for a basemap, and the beat must be told rather than shown a flat map`,
  );
}
