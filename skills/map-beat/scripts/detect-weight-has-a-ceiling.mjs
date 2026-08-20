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

/** THIS FORMAT'S OWN CEILING, measured 2026-08-20 across the 7 `render/static.svg` stills this
 *  format has rendered to disk (the same population `test/verify-map.test.ts`'s `mapStills()`
 *  walks): sizes ranged 60 459 - 562 838 bytes. `MEASURED_MAX_BYTES` is the heaviest one measured
 *  (`mapmore-dot-population/render/static.svg`, the beat carrying the most stations of any plated
 *  still on disk) — today's population is what earns the line, not a round number that felt right.
 *
 *  A CEILING SET AT EXACTLY TODAY'S CHAMPION HAS NO MARGIN. Ruled 2026-08-20 after a review found
 *  that the next delivered beat one byte heavier than `MEASURED_MAX_BYTES` would have tripped this
 *  guard, in every one of the five formats that carry it. `MARGIN_BYTES` is not a percentage picked
 *  because it felt right: it is the largest jump this population has ALREADY taken between two
 *  delivered stills sitting next to each other by size — 258 202 bytes, the step from
 *  `map-geneva-locator/render/static.svg` (304 636 bytes) to `mapmore-dot-population/render/
 *  static.svg` (562 838 bytes). A map SVG's weight tracks how many features it draws, and this
 *  format has already produced two beats that far apart, so the margin matches a step this
 *  population has already taken rather than guessing at one. */
export const MEASURED_MAX_BYTES = 562838;
export const MARGIN_BYTES = 258202;
export const CEILING_BYTES = MEASURED_MAX_BYTES + MARGIN_BYTES;
