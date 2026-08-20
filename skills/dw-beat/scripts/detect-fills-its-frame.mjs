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

/** THIS FORMAT'S OWN FLOOR. `iframePage` (`scripts/produce.mjs`) writes
 *  `html,body,iframe{width:100%;height:100%;margin:0;border:0}` — the delivered page IS the iframe,
 *  at every width, by three CSS declarations rather than a measured layout that could drift. There
 *  is no smaller reading to measure: `MEASURED_MIN_FRACTION` is 1 (100%) because nothing here can
 *  make it anything else without deleting one of those three rules, which `credentialReadsWithoutAlias`'s
 *  own sibling rule in this file's neighbourhood would not catch but a walking test on the delivered
 *  markup does. `MARGIN_FRACTION` still applies, the same shape as every other copy: a floor sitting
 *  exactly on today's only possible reading has no room for the ordinary jitter a browser's own box
 *  model rounds by. */
export const MEASURED_MIN_FRACTION = 1;
export const MARGIN_FRACTION = 0.05;
export const FLOOR_FRACTION = MEASURED_MIN_FRACTION - MARGIN_FRACTION;
