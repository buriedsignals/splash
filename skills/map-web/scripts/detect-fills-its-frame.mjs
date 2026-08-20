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
 *  and the measured population's worst case is 22.9% (that skill's own seed, 1280x800) — each
 *  copy's own caller supplies the floor its OWN measured population earned. `under` is strictly `<`,
 *  not `<=`, the same reasoning `weightAgainstCeiling` states for `over`: a page sitting exactly on
 *  the floor is the measurement the floor was taken FROM, not yet a violation of it. */
export function graphicFillsItsFrame(fraction, floor) {
  return { fraction, floor, under: fraction < floor };
}

/** THIS FORMAT'S OWN FLOOR, measured 2026-08-20 across the seed and `stress-f-housing-pressure` at
 *  three widths (1600x900, 1280x800, 375x812): `.mw-viewport`'s own box covered
 *    seed:       23.8%, 22.9%, 38.6%
 *    stress-f:   30.3%, 27.8%, 38.6%
 *  of the window. This is a STRUCTURAL floor, not a bug this skill can lay out its way past: a
 *  baked plate keeps its own true aspect ratio at every width (never stretched to a shape it was
 *  not baked for — geo-discipline.md), and a plate whose own geography is close to square, opened
 *  in a wide window, is genuinely smaller than the window by design. `MEASURED_MIN_FRACTION` is the
 *  worst of the six readings above (this skill's own seed, 1280x800); `MARGIN_FRACTION` keeps the
 *  floor from sitting exactly on a correct reading while still catching a plate that collapsed
 *  toward zero — a left-aligned box dumping ALL its leftover room on one side (this rule's own
 *  origin defect) does not change this fraction at all, which is why centring `.mw-viewport`
 *  (this skill's own render-web.mjs) was the fix for how the page READS, and this floor is the
 *  fix for what a future REGRESSION below today's honest minimum looks like. */
export const MEASURED_MIN_FRACTION = 0.229;
export const MARGIN_FRACTION = 0.05;
export const FLOOR_FRACTION = MEASURED_MIN_FRACTION - MARGIN_FRACTION;
