/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["weightAgainstCeiling"];

/** THE NUMBER `checkWeight` (`image-beat/scripts/render-still.mjs`) NEVER MEASURED: not the raw
 *  bytes about to be embedded, but what the DELIVERED FILE itself weighs once every asset is
 *  already inside it. `checkWeight` sums pre-base64 photograph bytes against one 20 MB limit
 *  shared by every beat this format will ever produce; a format that inlines a baked plate, a
 *  photograph or a font into a self-contained HTML or SVG file has never had its own delivered
 *  weight measured against anything at all.
 *
 *  `ceiling` is a PARAMETER here, not a module constant the way `WEIGHT_LIMIT_BYTES` is: the number
 *  differs by format — a chart-web page and a mixed-media scrolly do not carry the same weight —
 *  so this shared function stays generic and each copy's own caller supplies a ceiling measured
 *  against ITS OWN format's delivered files, never a number this function would have to guess at.
 *  `over` is strictly `>`, not `>=`: a file sitting exactly on today's heaviest is the measurement
 *  the ceiling was taken FROM, not yet a violation of it. */
export function weightAgainstCeiling(bytes, ceiling) {
  return { bytes, ceiling, over: bytes > ceiling };
}

/** THIS FORMAT'S OWN CEILING, measured across every delivered page `scripts/discover-pages.mjs`'s
 *  `discoverMapWebPages()` finds — DISCOVERED rather than a hardcoded list of 4 `mapgen-*-web`
 *  directories, which for a while silently left `mapgen-choropleth-web` and this skill's own
 *  `output-proof/population.html` out of every sweep that used to copy that list (fix round
 *  2026-08-20). RE-MEASURED 2026-08-23 over the 12 pages that population now holds — the two new
 *  ones are `r8-map-web-japan-bear-casualties`'s render and its export copy — and after every plate
 *  in the format was re-baked to the shape of the box it is drawn in (`delivery-frame.mjs`):
 *
 *    1 008 662  mapgen-symbol-web/quake-symbol.html
 *    1 016 570  r8-map-web-japan-bear-casualties/renders   (and its byte-identical export copy)
 *    1 051 265  map-web/output-proof/population.html
 *    1 069 824  stress-ab-emigration-flows/where-the-routes-lead.html   (and its export copy)
 *    1 153 504  stress-f-housing-pressure/housing-pressure-choropleth.html
 *    1 274 640  mapgen-locator-web/locator.html
 *    1 283 891  mapgen-hexgrid-web/hex-grid.html
 *    1 426 390  mapgen-choropleth-web/choropleth.html
 *    1 704 495  mapgen-dot-web/dot-population.html
 *    2 004 428  real-owid-life-expectancy/life-expectancy-2023.html   ← MEASURED_MAX_BYTES
 *
 *  an order of magnitude above `chart-web`'s own ceiling, because the baked basemap plate this
 *  format inlines is far heavier than any geometry `chart-web` draws. `MEASURED_MAX_BYTES` is the
 *  heaviest one measured — today's population is what earns the line, not a round number that felt
 *  right, and `ceilingFromPopulation` below is now the thing that says so out loud.
 *
 *  THE RE-BAKE WAS NOT THE WEIGHT EVENT IT LOOKED LIKE. A plate that carries ocean around its study
 *  set has more pixels of basemap and fewer of coastline, and flat water compresses: six of the ten
 *  pages got LIGHTER (symbol 1 095 318 → 1 008 454, output-proof 1 586 699 → 1 051 099, dot
 *  1 814 762 → 1 703 413), and the heaviest page moved 1 998 902 → 2 004 428, five and a half
 *  kilobytes, because its camera is the whole world and its plate did not change shape at all.
 *
 *  A CEILING SET AT EXACTLY TODAY'S CHAMPION HAS NO MARGIN. Ruled 2026-08-20 after a review found
 *  that the next delivered beat one byte heavier than `MEASURED_MAX_BYTES` would have tripped this
 *  guard, in every one of the five formats that carry it. `MARGIN_BYTES` is not a percentage picked
 *  because it felt right: it is the largest jump this population has ALREADY taken between two
 *  delivered pages sitting next to each other by size — 299 933 bytes, the step from
 *  `mapgen-dot-web/dot-population.html` to `real-owid-life-expectancy` (it was 228 063 and the step
 *  from `output-proof` to `dot-population`; that pair moved closer together and this one apart). */
export const MEASURED_MAX_BYTES = 2004428;
export const MARGIN_BYTES = 299933;
export const CEILING_BYTES = MEASURED_MAX_BYTES + MARGIN_BYTES;

/** THE TWO NUMBERS ABOVE, DERIVED FROM THE POPULATION THEY DESCRIBE — because until 2026-08-22
 *  nothing checked that they still described it, and they did not.
 *
 *  `MEASURED_MAX_BYTES` stood at 1 809 942 (`mapgen-dot-web/dot-population.html`) while
 *  `stories/real-owid-life-expectancy`'s 241-region world choropleth had been sitting in the same
 *  discovered population at 2 015 174 bytes — 205 232 bytes HEAVIER than the maximum the docstring
 *  above said the ceiling was measured from. The ceiling still held, because the margin happened to
 *  be wider than the drift; the sentence justifying it had stopped being true. A constant that
 *  DESCRIBES a population and is not derived from it is this codebase's second-commonest defect
 *  shape, and it had reached the one guard whose whole authority is "today's population is what
 *  earns the line".
 *
 *  WHY THIS IS NOT SIMPLY CALLED AT IMPORT TIME, which was the obvious first move: a ceiling
 *  computed from the files it judges can never be exceeded by them. It would be a requirement that
 *  cannot fire — worse than a missing one — and this format has already been bitten by a guard
 *  floored at a number its own population met by construction. So the constants stay TYPED, where a
 *  reader of this file sees them and a bump is a decision somebody made, and
 *  `test/weight-ceiling.test.ts` derives these same two numbers from `discoverMapWebPages()` and
 *  asserts equality in BOTH directions. A re-render, a new beat or a lighter plate turns that red
 *  and forces a deliberate re-record — the same two-way shape the camera census and the frame
 *  ratchet use.
 *
 *  The margin is the largest step this population has ALREADY taken between two pages sitting next
 *  to each other by size — ADJACENT, not max-minus-min, because the question it answers is "how big
 *  a jump is ordinary here", and the whole spread is not a jump anybody made. */
export function ceilingFromPopulation(sizes) {
  if (!Array.isArray(sizes) || sizes.length < 2)
    throw new Error(
      `a ceiling needs at least two delivered files to measure a step between, got ${Array.isArray(sizes) ? sizes.length : typeof sizes}`,
    );
  const sorted = [...sizes].sort((a, b) => a - b);
  let margin = 0;
  for (let i = 1; i < sorted.length; i++)
    margin = Math.max(margin, sorted[i] - sorted[i - 1]);
  const measuredMax = sorted[sorted.length - 1];
  return { measuredMax, margin, ceiling: measuredMax + margin };
}
