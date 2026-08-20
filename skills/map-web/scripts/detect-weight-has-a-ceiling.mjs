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
 *  2026-08-20). Re-measured after `population.html` and `choropleth.html` were re-rendered to carry
 *  their own accessible table (`same-facts-without-the-picture`, both had shipped with the
 *  capability entirely missing): sizes across all 6 committed pages ranged 1 095 318 -
 *  1 809 942 bytes — an order of magnitude above `chart-web`'s own ceiling, because the baked
 *  basemap plate this format inlines is far heavier than any geometry `chart-web` draws.
 *  `MEASURED_MAX_BYTES` is the heaviest one measured (`mapgen-dot-web/dot-population.html`, still
 *  the champion after the re-render) — today's population is what earns the line, not a round
 *  number that felt right.
 *
 *  A CEILING SET AT EXACTLY TODAY'S CHAMPION HAS NO MARGIN. Ruled 2026-08-20 after a review found
 *  that the next delivered beat one byte heavier than `MEASURED_MAX_BYTES` would have tripped this
 *  guard, in every one of the five formats that carry it. `MARGIN_BYTES` is not a percentage picked
 *  because it felt right: it is the largest jump this population has ALREADY taken between two
 *  delivered pages sitting next to each other by size — RE-MEASURED against the true 6-page
 *  population `discoverMapWebPages()` finds (fix round 2026-08-20, once `mapgen-choropleth-web` and
 *  this skill's own seed stopped being silently left out of every sweep): 224 905 bytes, the step
 *  from `map-web`'s own `output-proof/population.html` (1 585 037 bytes) to
 *  `mapgen-dot-web/dot-population.html` (1 809 942 bytes). This format's overall range is a narrow
 *  1.65x, but its six delivered pages (symbol, locator, hex grid, choropleth, the seed, dot) do not
 *  weigh evenly — the margin matches the biggest jump already on disk between two of them, not a
 *  smooth percentage of the max. */
export const MEASURED_MAX_BYTES = 1809942;
export const MARGIN_BYTES = 224905;
export const CEILING_BYTES = MEASURED_MAX_BYTES + MARGIN_BYTES;
