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

/** THIS FORMAT'S OWN CEILING is NOT taken from its own seed render. Ruled 2026-08-20 after a review
 *  found that the number here used to be 38 682 bytes — the byte length of this skill's own seed
 *  SVG, rendered from three PLACEHOLDER THUMBNAILS in `assets/sample-data`, re-measured once already
 *  when `data-credit` was added (38 424 -> 38 682) but never checked against real work. There is no
 *  image beat under `proof/` yet to measure instead — the two `image` beats there are `image /
 *  scrolly` and belong to the vehicle, the same fact `test/verify-image.test.ts` states for
 *  `duplicatedPayload` — so a ceiling here cannot be "the heaviest one measured" the way the other
 *  four formats' can. Left at the seed's own number, it stood for placeholder thumbnails as if they
 *  were a real beat's own photographs, which this skill's own `references/image-discipline.md`
 *  already admits they are not.
 *
 *  Taken instead from this skill's own EXISTING weight discipline: `checkWeight`
 *  (`scripts/render-still.mjs`) already refuses a beat about to embed more than
 *  `RAW_PHOTOGRAPH_LIMIT_BYTES` (20 MB, `WEIGHT_LIMIT_BYTES` there) of RAW, pre-base64 photograph
 *  bytes — the one number this format's own weight discipline states about real photographs rather
 *  than placeholders. `references/image-discipline.md`, "Weight", states the other half: base64
 *  itself costs roughly a third more bytes than the file it encodes. `CEILING_BYTES` applies that
 *  same documented ratio to `checkWeight`'s own limit, so a beat sitting right at the largest set of
 *  photographs `checkWeight` will still let through does not also trip this guard on the way out. */
export const RAW_PHOTOGRAPH_LIMIT_BYTES = 20 * 1024 * 1024;
export const BASE64_INFLATION = 4 / 3;
export const CEILING_BYTES = Math.ceil(RAW_PHOTOGRAPH_LIMIT_BYTES * BASE64_INFLATION);
