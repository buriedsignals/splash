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

/** THE DEFAULT WEIGHT OF THE LAND against the page, in ink. A beat that measured another one for
 *  its own marks passes it; nothing else about the pair is a beat's to choose. */
export const LAND_INK_DOSE = 0.045;

/**
 * THE PAIR, AND THE ONE THING A BEAT MAY NOT DECIDE ABOUT IT.
 *
 * `landDose` is a beat's to pass, because how much weight the continent carries is measured against
 * what that beat's own marks sit on — `proof/static-dot-density-europe-stations` measured 0.16
 * against 0.045 and wrote down why: its dots are all on land, and at the lighter dose the sea read
 * as figure and the continent as ground.
 *
 * THE WATER IS NOT. It is the filed water convention, always, and it is the whole reason this
 * function exists rather than three lines in each beat. Twelve beats carried
 * `water: mix(ground, accent, 0.16)` — the sea tinted with the very accent the marks are drawn in,
 * so the ground followed the mark and no accent could ever be picked out of it (0.0° of pigment
 * separation, by construction, in every direction). That is not a dose a beat gets to tune; it is a
 * defect, and it can only stop recurring by there being ONE definition of the pair and no local
 * copy of it. `a-basemap-s-water-is-never-the-beat-s-accent.test.ts` holds the corpus to that.
 */
export function plateTints(direction, { landDose = LAND_INK_DOSE } = {}) {
  const { ink } = deriveFurniture(direction.ground);
  const land = mix(direction.ground, ink, landDose);
  const hue = WATER_HUE;

  for (let dose = 0.06; dose <= 0.7; dose += 0.02) {
    const water = mix(direction.ground, hue, dose);
    if (contrast(water, land) < SEA_LAND_MIN) continue;
    if (contrast(water, direction.ground) >= BASEMAP_MAX) break;
    // THE PIGMENT TRAVELS WITH THE TINT. What a mark may not be drawn in is the hue this ground was
    // PAINTED with, not the hue the diluted pixel ends up at — a 6 % dose of blue in cream is less
    // chromatic than the cream, so the pixel cannot be asked. `land` declares none: it is the
    // direction's own paper walked toward the direction's own ink, and paper carries no convention.
    return { water, land, pigment: hue, seaLandContrast: contrast(water, land) };
  }

  throw new Error(
    `no dose of the filed water hue separates sea from land by ${SEA_LAND_MIN}:1 on ground ` +
      `${direction.ground} while staying under ${BASEMAP_MAX}:1 against it — this direction and ` +
      `this hue are too close for a basemap, and the beat must be told rather than shown a flat map`,
  );
}

/**
 * WHAT A MAP BEAT'S MARKS ARE ACTUALLY DRAWN ON, in the shape `composeDirection` reads.
 *
 * A chart's marks sit on the page. A map's marks sit on a BASEMAP over that page, and a river is
 * drawn on water — so the colour a river may be is decided against the sea, never against the
 * paper. Handing these to the composer is what lets one call resolve a beat's whole colour system:
 * the floors are measured on the tints the style actually paints, and the water's own pigment is
 * what the mark's hue is held apart from.
 *
 * ONLY THE GROUNDS THE MARKS ACTUALLY OCCUPY, AND WHY THAT IS THE WHOLE OF THIS FUNCTION'S JOB.
 * This used to hand back BOTH, always, which asserts that every map mark sits on water. Twelve beats
 * whose fills, hexes, dots and pins are on LAND were refused at render time because the newsroom's
 * house teal `#0B7A75` is 30.0° of hue from the filed water convention — a refusal about a ground
 * the drawing never touches. A guard that refuses what is not there is not a stricter guard; it is a
 * guard a producer learns to switch off.
 *
 * `occupancy` is `{ water, land }` and it is REQUIRED. A caller with nothing to say about where its
 * marks land does not get a default: handing back both manufactures the refusal above, and handing
 * back neither hollows out the rule that caught the blue-on-blue Danube. It gets an error naming
 * `markOccupancy`, which measures it on the plate the beat itself baked.
 */
export function plateGrounds(tints, occupancy) {
  if (!occupancy || typeof occupancy.water !== "boolean" || typeof occupancy.land !== "boolean")
    throw new Error(
      "`plateGrounds` needs to be told which of the basemap's grounds this beat's marks occupy — " +
        "`{ water, land }`, measured by `markOccupancy` on the plate the beat baked. A default here " +
        "would either refuse a mark over a sea it never touches or stop holding a mark apart from " +
        "the sea it is drawn on, and both have shipped.",
    );
  const grounds = [];
  if (occupancy.water)
    grounds.push({ name: "the basemap's water", colour: tints.water, pigment: tints.pigment ?? WATER_HUE });
  // No pigment: the land is the direction's paper walked toward its ink, and carries no hue a
  // reader could mistake a mark for.
  if (occupancy.land) grounds.push({ name: "the basemap's land", colour: tints.land });
  return grounds;
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
