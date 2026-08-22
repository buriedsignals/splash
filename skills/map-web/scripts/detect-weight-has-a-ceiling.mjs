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
 *  2026-08-20). RE-MEASURED 2026-08-22 over the 10 pages that population now holds:
 *
 *    1 095 318  mapgen-symbol-web/quake-symbol.html
 *    1 115 390  stress-ab-emigration-flows export copy
 *    1 117 748  stress-ab-emigration-flows/where-the-routes-lead.html
 *    1 154 910  stress-f-housing-pressure/housing-pressure-choropleth.html
 *    1 193 192  mapgen-locator-web/locator.html
 *    1 279 070  mapgen-hexgrid-web/hex-grid.html
 *    1 370 772  mapgen-choropleth-web/choropleth.html
 *    1 586 699  map-web/output-proof/population.html
 *    1 810 572  mapgen-dot-web/dot-population.html   (1 809 942 before its country outlines
 *                gained the `data-key` `marksStrandedWithNoChannel` needs to see them, 2026-08-23)
 *    1 998 902  real-owid-life-expectancy/life-expectancy-2023.html   ← MEASURED_MAX_BYTES
 *
 *  an order of magnitude above `chart-web`'s own ceiling, because the baked basemap plate this
 *  format inlines is far heavier than any geometry `chart-web` draws. `MEASURED_MAX_BYTES` is the
 *  heaviest one measured — today's population is what earns the line, not a round number that felt
 *  right, and `ceilingFromPopulation` below is now the thing that says so out loud.
 *
 *  A CEILING SET AT EXACTLY TODAY'S CHAMPION HAS NO MARGIN. Ruled 2026-08-20 after a review found
 *  that the next delivered beat one byte heavier than `MEASURED_MAX_BYTES` would have tripped this
 *  guard, in every one of the five formats that carry it. `MARGIN_BYTES` is not a percentage picked
 *  because it felt right: it is the largest jump this population has ALREADY taken between two
 *  delivered pages sitting next to each other by size — 223 873 bytes, the step from
 *  `output-proof/population.html` to `mapgen-dot-web/dot-population.html`. The overall range is a
 *  narrow 1.82x, but the ten pages do not weigh evenly, and the margin matches the biggest jump
 *  already on disk between two of them rather than a smooth percentage of the max. */
export const MEASURED_MAX_BYTES = 1998902;
export const MARGIN_BYTES = 223873;
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
