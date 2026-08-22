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
 *  and the measured population's worst case is 15.0% (`stress-f-housing-pressure`, 1280x800 — a
 *  PORTRAIT camera in a landscape window) — each
 *  copy's own caller supplies the floor its OWN measured population earned. `under` is strictly `<`,
 *  not `<=`, the same reasoning `weightAgainstCeiling` states for `over`: a page sitting exactly on
 *  the floor is the measurement the floor was taken FROM, not yet a violation of it. */
export function graphicFillsItsFrame(fraction, floor) {
  return { fraction, floor, under: fraction < floor };
}

/** THIS FORMAT'S OWN FLOOR, measured 2026-08-20 across `stress-g-eight-checkpoints` at three widths
 *  (1600x900, 1280x800, 375x812): `.scrolly-graphic`'s own box — the fixed layer this vehicle's own
 *  scaffold gives every frame, `render-scrolly.mjs`'s "THE GRAPHIC FILLS THE FRAME" — covered 90.7%,
 *  89.6%, 80.7% of the window. This is the CONTAINER this format promises a beat, and it fills it by
 *  construction (`.scrolly-graphic { position: absolute; inset: 0 }` inside a track sized to
 *  everything `.scrolly`'s own grid has left) — the finding this rule closes is at the CONTAINER
 *  level; whether the DRAWING inside that container makes honest use of it is a different question,
 *  closed by this format's own `reveal-fills-the-frame` guard instead. `MEASURED_MIN_FRACTION` is
 *  the worst of the three readings; `MARGIN_FRACTION` keeps the floor from sitting exactly on a
 *  correct reading while still catching a container that stopped filling its track at all. */
export const MEASURED_MIN_FRACTION = 0.807;
export const MARGIN_FRACTION = 0.15;
export const FLOOR_FRACTION = MEASURED_MIN_FRACTION - MARGIN_FRACTION;
