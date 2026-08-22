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

/** THIS FORMAT'S OWN FLOOR, measured 2026-08-20 across the seed and `stress-d-asylum-gap` (the one
 *  chart-web beat this stress round produced) at three widths (1600x900, 1280x800, 375x812):
 *    seed:      100%,   94.1%, 46.0%
 *    stress-d:  100%,   100%,  61.5%
 *  of the window. This format's own SVG viewBox IS its frame (render-web.mjs's own header note),
 *  fluid by construction, so 100% at the two wider widths is expected; the narrow reading is lower
 *  than a first guess would pick, because the aspect-ratio row that keeps the axis clear of the
 *  plot grows relatively taller as the frame narrows — a real, honest shape for a fluid frame, not
 *  a defect. `MEASURED_MIN_FRACTION` is the worst of the four readings above (the seed, 375x812);
 *  `MARGIN_FRACTION` is not a fraction that felt right, it is chosen so the floor sits clear of the
 *  narrowest CORRECT reading measured here while still catching a graphic that collapsed to a
 *  fraction of that. */
export const MEASURED_MIN_FRACTION = 0.46;
export const MARGIN_FRACTION = 0.08;
export const FLOOR_FRACTION = MEASURED_MIN_FRACTION - MARGIN_FRACTION;
