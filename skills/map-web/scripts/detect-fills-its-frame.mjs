/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["graphicFillsItsFrame"];

/** THE FRACTION OF THE READER'S OWN WINDOW the graphic's own box actually covers, against a floor
 *  measured for this format, never invented. `stress-f-housing-pressure`'s choropleth drew in the
 *  left half of a 1440x900 window with the right half empty ground — not a broken box (a plate never
 *  stretches to a shape it was not baked for, geo-discipline.md), but nothing had ever MEASURED how
 *  small "small" already was, at any width, for any format that ships a page.
 *
 *  `ceiling` in `weightAgainstCeiling`'s own words is a per-format PARAMETER here too, never a module
 *  constant this function reads by name: the achievable floor differs by format for a structural
 *  reason — chart-web's own frame IS its viewBox, fluid by construction, and clears 60%+ at every
 *  measured width; a map-web beat is bound by its baked plate's own true aspect against the window's,
 *  so its own caller measures a different thing entirely: the fraction of the axis the box is BOUND
 *  ON, never the area. Measured 2026-08-23 over ten pages at three widths, the area reading spread
 *  15.0-62.8% (4.2x) and the binding reading 51.1-91.5% (1.8x) — the area punished a plate for the
 *  shape of its own camera, and a beat re-baked to the shape its camera actually asks for fell from
 *  worst-in-format to mid-pack without one pixel of its drawing changing. Each copy's own caller
 *  supplies both the reading and the floor its OWN measured population earned.
 *
 *  WHAT NO COPY OF THIS CAN DETECT, measured rather than assumed: the defect this rule was written
 *  for. A box stranded at one edge with all its leftover room on the other side moved from 622.6px
 *  to 16.0px from the left and shifted the area fraction by 0.00 points and the binding fraction by
 *  0.00 points, on two pages at two widths. Both readings are about SIZE; stranding is about
 *  POSITION. The rule earns its place on what it does catch — a box that never grew into the room it
 *  was given — and the catalogue says so rather than claiming the rest. `under` is strictly `<`,
 *  not `<=`, the same reasoning `weightAgainstCeiling` states for `over`: a page sitting exactly on
 *  the floor is the measurement the floor was taken FROM, not yet a violation of it. */
export function graphicFillsItsFrame(fraction, floor) {
  return { fraction, floor, under: fraction < floor };
}

/**
 * THE FRACTION THIS FORMAT FEEDS THE DECISION ABOVE — HOW MUCH OF ITS CONTAINER THE GRAPHIC COVERS,
 * ON THE AXIS IT COVERS LEAST.
 *
 * THE THIRD READING THIS FORMAT HAS HAD, and the two it retires were each right about the thing they
 * fixed. The AREA against the window was withdrawn on 2026-08-23 because a plate keeps its own true
 * aspect at every width, so the area a correctly fitted plate covers is a function of the READER's
 * window shape as much as the producer's camera — it fell when a re-bake made the drawing better.
 * The BINDING-AXIS fraction that replaced it fixed exactly that: it asked how much of the axis the
 * box ran out of room on the box had taken, which is aspect-independent by construction, and over
 * ten pages at three widths it narrowed the spread from 15.0-62.8% to 51.1-91.5%.
 *
 * AND IT WAS A SOUND READING OF THE WRONG QUANTITY. The owner, looking at a real delivered page in a
 * 2990px window: *the map must take all the available width, every time* — then, on the correction
 * that followed, *the height is not an editorial choice either; like the scrolly, it must take all
 * the space available.* Japan's plate is 1000x1089, a correct bake of a portrait camera; the box was
 * bound on height, filled that height, and read 62.9% here — while covering 33.2% of the container's
 * width (520.1px of 1568px at 1600x900, 428.3 of 1248 at 1280x800, 1175.7 of 2958 at 2990x1600).
 * The binding reading answers "how well does this box fit its plate". The reader's question is "how
 * much of the room it was given did the graphic take", and those are different numbers.
 *
 * WHY `min`, NEVER `max` AND NEVER AN AREA. The rule is one rule on both axes, so the honest reading
 * is the worse of the two: a box that fills the width and half the height has taken half the room it
 * was given, and both `max` (100%) and an area (50%) would say something kinder than the truth.
 *
 * AND WHY THERE IS NO FLOOR MEASURED OVER A POPULATION ANY MORE. Both retired readings had to be
 * CALIBRATED — they measured a plate against a window, only one of those shapes was the producer's,
 * and the achievable number was a fact about a population that had to be re-measured whenever the
 * population changed. This reading measures a layout against itself: the box is its container, or it
 * is not. `render-web.mjs` sizes `.mw-viewport` at 100% on both axes and `delivery-frame.mjs` bakes
 * the plate to cover it, so every page in this format reads exactly 1.0 — and the one study set that
 * provably cannot (a camera already spanning a full turn of longitude, see `cannotCover`) is laid
 * out the old way ON PURPOSE and says so, rather than reading 0.57 as if it had merely fallen short.
 *
 * A side nobody measured is refused rather than averaged over — `plateFollowsGround`'s own rule, one
 * level down. A fraction built out of a `NaN` is a reading nobody took, and handing it to the
 * decision above would make it `under: false`, which is the silent direction.
 */
export function containerFraction(box, container) {
  const sides = [
    ["box width", box?.width],
    ["box height", box?.height],
    ["container width", container?.width],
    ["container height", container?.height],
  ];
  for (const [side, value] of sides)
    if (!Number.isFinite(value) || value < 0)
      throw new Error(
        `containerFraction: ${side} is ${value}, so nothing here was measured — a fraction built ` +
          `out of it would be a reading nobody took, and the floor would pass it.`,
      );
  if (!(container.width > 0) || !(container.height > 0))
    throw new Error(
      `containerFraction: a ${container.width}x${container.height} container gives the graphic no room to fill.`,
    );
  return Math.min(box.width / container.width, box.height / container.height);
}

/** THIS FORMAT'S OWN FLOOR, AND IT IS NOT A MEASUREMENT OF A POPULATION — it is the rule itself.
 *  The graphic takes the whole box or it does not.
 *
 *  `SUB_PIXEL` is a rounding allowance and never a margin. A browser reports fractional CSS pixels
 *  for a percentage box inside a bordered container, and across this format's ten delivered pages at
 *  three widths the largest departure from 1.0 measured 0.000000; this is three orders of magnitude
 *  above that and still nowhere near a layout failure, since the smallest shortfall this format can
 *  actually produce is a whole axis (the box the owner reported covered 0.332 of its container).
 *  `under` is strictly `<`, the same reasoning `weightAgainstCeiling` states for `over`. */
export const SUB_PIXEL = 0.001;
export const FLOOR_FRACTION = 1 - SUB_PIXEL;
