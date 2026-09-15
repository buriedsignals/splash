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

/** THE FLOOR A FRONTIER MUST CLEAR AGAINST THE LAND IT DIVIDES, and the ceiling it may not pass.
 *
 *  A frontier is not a datum: it is the ground telling a reader which country they are looking at.
 *  Below the floor it is not a frontier, it is a smudge; above the ceiling it competes with the
 *  marks, which is `the-basemap-gives-up-its-contrast` read one level down. Both are measured and
 *  reported by `countryGround`, so a beat can put its own marks' contrast beside them and show
 *  that the subject still dominates its context. */
export const BORDER_MIN = 1.7;
export const BORDER_MAX = 3.0;

/**
 * THE COUNTRIES A BEAT DRAWS ITSELF, WHEN ITS OWN MARKS DO NOT CARRY THEM.
 *
 * WHAT WAS TRIED FIRST, AND WHY IT WAS WRONG. A fan of bands and a scatter of circles carry no
 * country at all, so the trunk's sweep left them on a pale blob a reader could not place anything
 * on. The first answer was to stop sweeping — to keep MapTiler's own frontier lines and its own
 * place names and re-ink them. The owner read the result against the choropleth he had just
 * validated and asked the question that settles it: « pourquoi tu ne reprends pas dans l'idée la
 * map qu'on avait dans le choroplèthe ? » A kept-and-re-tinted provider layer reads as a MapTiler
 * basemap with our tints on it. The choropleth reads as OUR map, because it draws its forty
 * countries itself — its own MapLibre layers over MapTiler's Countries tileset, joined by ISO A2 —
 * and the provider's lines and words stay hidden.
 *
 * So these two beats take the same mechanism. The ONLY difference from the choropleth is what a
 * fill MEANS: there, a class; here, neutral ground.
 *
 * AND THE NEUTRAL GROUND IS THE LAND THE BEAT ALREADY MEASURED AGAINST, never a second one derived
 * here. Both beats searched their marks' doses against the land the live style paints — the symbol
 * beat asserts the two are the same colour and refuses when they are not — so a country filled in
 * some other step off the ground would move every contrast on the page without moving the number
 * that records it. This takes that land, CHECKS it is still quieter than `BASEMAP_MAX` against the
 * page, and derives from it the one thing the beat does not already own: the frontier, walked up
 * from the land until it clears `BORDER_MIN` and capped at `BORDER_MAX` so the ground stays context
 * under the marks.
 *
 * IT DOES NOT RE-IMPOSE `SEA_LAND_MIN`. That is the target `plateTints`' own SEARCH aims at while it
 * chooses a pair; a beat that derived its two tints another way — both of these did, and both were
 * baked into plates and measured against months ago — separates sea from land by about 1.09:1, and
 * refusing that here would refuse every direction over a rule this function is not the author of.
 * What the countries need from the sea is not contrast but an EDGE, and they draw their own.
 */
export function countryGround({ ground, land, water, ink }) {
  if (contrast(land, ground) >= BASEMAP_MAX)
    throw new Error(
      `the land ${land} this beat draws its countries in reads ${contrast(land, ground).toFixed(3)}:1 ` +
        `against the page ${ground}, at or past ${BASEMAP_MAX}:1 — the ground would carry more weight ` +
        `than the marks on it`,
    );

  let border = null;
  for (let dose = 0.1; dose <= 1.0001; dose += 0.02) {
    const candidate = mix(land, ink, Math.min(dose, 1));
    if (contrast(candidate, land) < BORDER_MIN) continue;
    if (contrast(candidate, land) > BORDER_MAX) break;
    border = candidate;
    break;
  }
  if (!border)
    throw new Error(
      `no dose of this direction's ink separates a frontier from the land ${land} it divides by ` +
        `${BORDER_MIN}:1 without passing ${BORDER_MAX}:1 — the ground would either show no countries ` +
        `or out-shout the marks on it`,
    );

  return {
    fill: land,
    border,
    /** The choropleth's own frontier weight, unchanged: it is the width the owner validated, and a
     *  second number here would be a second cartography beside a beat meant to match it. */
    width: 0.8,
    measured: {
      fill: land,
      border,
      fillOnWater: contrast(land, water),
      fillOnGround: contrast(land, ground),
      borderOnFill: contrast(border, land),
    },
  };
}
