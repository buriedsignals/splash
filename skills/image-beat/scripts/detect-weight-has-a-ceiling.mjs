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

/** THIS FORMAT'S OWN CEILING. Measured 2026-08-20: there is NO image beat under `proof/` yet — the
 *  two `image` beats there are `image / scrolly` and belong to the vehicle, the same fact
 *  `test/verify-image.test.ts` already states for `duplicatedPayload`. The one measurement
 *  available is this skill's own seed, rendered from its own sample photographs exactly as
 *  `test/verify-image.test.ts`'s "the seed's own artifact" describes: 38 424 bytes. Set at that
 *  number rather than invented ahead of it — a real beat's own photographs will very likely weigh
 *  more than three placeholder thumbnails, which is a fact for the day a real beat exists to
 *  re-measure, not one this ceiling should guess at now. */
export const CEILING_BYTES = 38424;
