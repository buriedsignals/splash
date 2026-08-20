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

/** THIS FORMAT'S OWN CEILING, measured 2026-08-20 across all 18 delivered `chart-web` pages on
 *  disk (the same population `test/keyboard-reach.test.ts` and `test/accessible-table.test.ts`
 *  walk, after fix round 1 gave the walker its parent-directory fallback — a same-directory-only
 *  version undercounts to 17, silently missing `web-co2-ranking/dist/co2-ranking.html`): sizes
 *  ranged 29 065 - 121 616 bytes. `MEASURED_MAX_BYTES` is the heaviest one measured
 *  (`weby-small-multiples-co2-per-capita/small-multiples-co2-per-capita.html`) — today's population
 *  is what earns the line, not a round number that felt right.
 *
 *  A CEILING SET AT EXACTLY TODAY'S CHAMPION HAS NO MARGIN. Ruled 2026-08-20 after a review found
 *  that the next delivered beat one byte heavier than `MEASURED_MAX_BYTES` would have tripped this
 *  guard, in every one of the five formats that carry it. `MARGIN_BYTES` is not a percentage picked
 *  because it felt right: it is the largest jump this population has ALREADY taken between two
 *  delivered pages sitting next to each other by size — 33 886 bytes, the step from
 *  `more-heatmap-co2-per-capita-decades/co2-heatmap.html` (55 651 bytes) to
 *  `web-income-life-expectancy/income-life-expectancy.html` (89 537 bytes). A margin that size
 *  absorbs a next beat taking a step at least as big as one this format has already taken, without
 *  swallowing a beat that has genuinely grown far past this population's own scale. */
export const MEASURED_MAX_BYTES = 121616;
export const MARGIN_BYTES = 33886;
export const CEILING_BYTES = MEASURED_MAX_BYTES + MARGIN_BYTES;
