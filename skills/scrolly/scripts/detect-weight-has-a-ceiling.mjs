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

/** THIS FORMAT'S OWN CEILING, measured 2026-08-20 across all 8 delivered `scrolly` pages on disk
 *  (the same population `same-facts-without-the-picture`'s own `scrolly` exception in
 *  `doctrine/references/guard-catalogue.json` measured): sizes ranged 76 859 - 2 581 397 bytes —
 *  the heaviest of any format here, since a mixed-media beat can inline an image track, a drawn
 *  track and a baked map plate in one file. `MEASURED_MAX_BYTES` is the heaviest one measured
 *  (`scrolly-mixed-grinnell-ice/render/three-media-one-glacier.html`) — today's population is what
 *  earns the line, not a round number that felt right.
 *
 *  A CEILING SET AT EXACTLY TODAY'S CHAMPION HAS NO MARGIN. Ruled 2026-08-20 after a review found
 *  that the next delivered beat one byte heavier than `MEASURED_MAX_BYTES` would have tripped this
 *  guard, in every one of the five formats that carry it. `MARGIN_BYTES` is not a percentage picked
 *  because it felt right: it is the largest jump this population has ALREADY taken between two
 *  delivered pages sitting next to each other by size — 1 019 874 bytes, the step from
 *  `scrolly-chart-eu-carbon/render/eu-carbon-four-charts.html` (89 834 bytes, a single chart track)
 *  to `mapmore-scrolly-danube/render/danube-scrolly.html` (1 109 708 bytes, the first mixed
 *  map-and-chart page). This format's own 33x range is not a smooth gradient: it is driven by how
 *  many media tracks one beat assembles, and the margin matches the size of that one jump — adding
 *  one more track class — rather than a smooth percentage of the max. */
export const MEASURED_MAX_BYTES = 2581397;
export const MARGIN_BYTES = 1019874;
export const CEILING_BYTES = MEASURED_MAX_BYTES + MARGIN_BYTES;
