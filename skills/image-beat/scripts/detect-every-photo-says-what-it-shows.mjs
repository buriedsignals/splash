/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["photosDeclareAltAndCredit"];

/** WHAT `imageBeatLayout` (`../assets/ImageBeatSeed.tsx`) ALREADY REFUSES TO RENDER WITHOUT, READ
 *  BACK OFF THE MARKUP RATHER THAN TRUSTED. A photo missing alt text or a credit never reaches the
 *  page: `imageBeatLayout` throws before drawing it, naming which photo and which field. That is a
 *  write-time refusal — this is the read-time measurement that the refusal actually ran, the same
 *  "a decision nothing calls is a decision that does not run" standard this tree already holds
 *  `duplicatedPayload` to.
 *
 *  A "photo" is one `<g role="img" ...>` group — the same unit the seed's own doc comment names as
 *  what a screen reader (or a document reader opening the delivered `.svg` directly) reaches. Its
 *  alt lives in that group's own `aria-label`; its credit in a sibling `data-credit`, off the SAME
 *  string the visible credit `<text>` draws rather than a second source of truth for it. Both are
 *  read straight off the group's OPENING TAG, never the whole document, so a `data-credit` that
 *  belongs to a different photo entirely could not be matched to this one by accident. */
export function photosDeclareAltAndCredit(html) {
  const tags = [...html.matchAll(/<g\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /\brole="img"/.test(tag));
  let missingAlt = 0;
  let missingCredit = 0;
  for (const tag of tags) {
    const alt = /\baria-label="([^"]*)"/.exec(tag)?.[1];
    if (!alt || !alt.trim()) missingAlt++;
    const credit = /\bdata-credit="([^"]*)"/.exec(tag)?.[1];
    if (!credit || !credit.trim()) missingCredit++;
  }
  return { photos: tags.length, missingAlt, missingCredit };
}
