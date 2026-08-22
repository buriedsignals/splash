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
 * THE FRACTION THIS FORMAT FEEDS THE DECISION ABOVE — the window's own BINDING AXIS, not its area.
 *
 * THE MEASUREMENT THAT WITHDREW THE AREA (2026-08-23). `stress-f-housing-pressure` had been baked
 * into a 496x496 frame for a camera asking 0.538:1. Re-baked to its camera's own shape, its three
 * area readings FELL — 30.3 / 27.8 / 38.6% to 16.3 / 15.0 / 22.5% — while the drawing got BETTER:
 * measured on the two rendered pages at 1600x900, the box is 660px tall either way, holds the same
 * 36° of latitude either way, and Sweden is drawn at 13.2 against 13.1 pixels per degree. What left
 * the screen was 29° of longitude nobody asked for. A metric that falls when the work improves is
 * measuring something other than what it believes it is measuring.
 *
 * WHY AN AREA COULD NEVER HAVE ANSWERED THIS QUESTION HERE. A baked plate keeps its own true aspect
 * at every width — it is never stretched to a shape it was not baked for (`geo-discipline.md`) — so
 * the AREA a correctly fitted plate covers is a function of two aspects, the plate's and the
 * reader's window's, and only the first is the producer's to choose. There is no layout that makes a
 * 0.538:1 picture cover a 1.78:1 window. The old floor was reading the reader's window shape and
 * charging the producer for it.
 *
 * WHAT A CORRECTLY FITTED PLATE ACTUALLY DOES. It is bound on exactly one axis — the one it runs out
 * of room on first — and free on the other. So the honest question is not "how much of the window is
 * this?" but "how much of the axis it is bound on did it take?", and that is aspect-independent by
 * construction: a correct portrait plate in a landscape window and a correct landscape plate in a
 * portrait window read the same fitted-ness, while a box that simply failed to grow into the room it
 * had is small on BOTH axes and so reads low here. Measured over this format's whole delivered
 * population, the reading's spread narrowed from 15.0–62.8% (area, 4.2x) to 51.1–91.5% (binding
 * axis, 1.8x), and `stress-f-housing-pressure` stopped being the worst page in the format.
 *
 * ONLY THIS FORMAT'S READING CHANGED. `graphicFillsItsFrame` above is untouched and stays
 * byte-identical in all eight copies — the decision was never what was wrong. Its own doc comment
 * still cites map-web's worst case as 15.0%, which is a reading of a fraction this file no longer
 * feeds it; that sentence is one text in eight files, and correcting it here alone would break the
 * parity that keeps them one decision. The other seven formats' fractions and floors are left
 * exactly as they are, deliberately: chart-web's frame IS its viewBox and is fluid by construction,
 * and the four fixed-frame formats read ink out of a delivered PNG rather than a box out of a
 * window. Whether any of them has this same defect is a question for their own populations, not one
 * this file may answer for them.
 *
 * A SIDE NOBODY MEASURED IS REFUSED, NOT AVERAGED OVER — `plateFollowsGround`'s own rule, one level
 * down. A fraction built out of a `NaN` width is a reading nobody took, and handing it to the
 * decision above would make it `under: false`, which is the silent direction.
 */
export function bindingAxisFraction(box, frame) {
  const sides = [
    ["box width", box?.width],
    ["box height", box?.height],
    ["window width", frame?.width],
    ["window height", frame?.height],
  ];
  for (const [side, value] of sides)
    if (!Number.isFinite(value) || value < 0)
      throw new Error(
        `bindingAxisFraction: ${side} is ${value}, so nothing here was measured — a fraction built ` +
          `out of it would be a reading nobody took, and the floor would pass it.`,
      );
  if (!(frame.width > 0) || !(frame.height > 0))
    throw new Error(
      `bindingAxisFraction: a ${frame.width}x${frame.height} window has no axis to bind against.`,
    );
  return Math.max(box.width / frame.width, box.height / frame.height);
}

/** THIS FORMAT'S OWN FLOOR, RE-MEASURED 2026-08-23 as a BINDING-AXIS fraction over the whole
 *  delivered population `discoverMapWebPages()` derives — ten pages, not the two this floor used to
 *  be taken from — at the three widths this format's own test drives (1600x900, 1280x800, 375x812).
 *  Every reading, worst per page first:
 *
 *    stress-f-housing-pressure   51.1%  66.7%  73.4%   ← the format's worst, and it is a CORRECT bake
 *    output-proof/population      60.6%  65.0%  91.5%
 *    mapgen-symbol-web            61.6%  65.9%  73.4%
 *    real-owid-life-expectancy    63.7%  67.7%  91.5%
 *    mapgen-choropleth-web        66.7%  73.4%  91.5%
 *    mapgen-locator-web           67.7%  73.0%  91.5%
 *    mapgen-dot-web               70.8%  78.2%  83.2%
 *    stress-ab-emigration-flows   79.3%  81.6%  91.5%   (renders/ and export/, identical)
 *    mapgen-hexgrid-web           79.2%  79.7%  91.5%
 *
 *  `MEASURED_MIN_FRACTION` is the worst of those thirty readings, and `MARGIN_FRACTION` keeps the
 *  floor off a correct page's own number while still catching a box that collapsed toward zero —
 *  the same two-part shape the area floor had, over a population five times larger.
 *
 *  WHAT THIS FLOOR STILL CANNOT CATCH, AND IT IS THE DEFECT THE RULE WAS WRITTEN FOR. The origin
 *  defect was a left-aligned box dumping ALL its leftover room on one side: `stress-f`'s choropleth
 *  drawn in the left half of a 1440x900 window with the right half plain empty ground. Put back
 *  deliberately in a browser (2026-08-23) on both `stress-f` and this skill's own seed, at 1600x900
 *  and 1280x800 — `.mw-viewport` moved from 622.6px to 16.0px from the left — the AREA fraction moved
 *  0.00 points and the BINDING-AXIS fraction moved 0.00 points. Neither can see it, and neither ever
 *  could: both are readings of the box's SIZE, and alignment is a POSITION. The origin defect is
 *  closed by construction instead — `render-web.mjs` centres `.mw-viewport` — and nothing here
 *  guards its return. That is worth knowing about a rule that catches other things well: this floor
 *  is the guard against a future regression BELOW today's honest minimum, and it has never been the
 *  guard its own name and history suggest. */
export const MEASURED_MIN_FRACTION = 0.51;
export const MARGIN_FRACTION = 0.05;
export const FLOOR_FRACTION = MEASURED_MIN_FRACTION - MARGIN_FRACTION;
