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
 *  belongs to a different photo entirely could not be matched to this one by accident.
 *
 *  FINDING 8 (round-two stress): the write-time refusal above only ever sees an EMPTY string —
 *  `stories/stress-h-site-photographs` shipped past it by naming the gap in words instead
 *  (`"[alt text not supplied by the newsroom]"`), which is not empty and reached this detector
 *  clean, on a beat that plainly does not have what this capability claims. A field wrapped
 *  whole in `[...]` is never real prose a journalist wrote — every alt and credit in this
 *  format's own sample data is a sentence, none bracket-wrapped — so `isPlaceholder` reads it as
 *  the same absence an empty string is, on the DELIVERED artefact, which is what this detector
 *  was always supposed to measure. */
function isPlaceholder(value) {
  return /^\[.*\]$/.test(value.trim());
}

export function photosDeclareAltAndCredit(html) {
  const tags = [...html.matchAll(/<g\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /\brole="img"/.test(tag));
  let missingAlt = 0;
  let missingCredit = 0;
  for (const tag of tags) {
    const alt = /\baria-label="([^"]*)"/.exec(tag)?.[1];
    if (!alt || !alt.trim() || isPlaceholder(alt)) missingAlt++;
    const credit = /\bdata-credit="([^"]*)"/.exec(tag)?.[1];
    if (!credit || !credit.trim() || isPlaceholder(credit)) missingCredit++;
  }
  return { photos: tags.length, missingAlt, missingCredit };
}
