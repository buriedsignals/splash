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

/** FINDING W1 (round-five stress): the honest absence defeating the rule built to see it — two of
 *  this tree's own fixes colliding. Round two taught `isPlaceholder` above that a bracket-wrapped
 *  field is an absence, not an answer. Round four then gave `credit` an honest, UNBRACKETED value
 *  for a journalist who genuinely cannot attribute a picture: `unattributed` is recorded and
 *  `Source: not stated` is printed, on purpose, where a credit goes. Nobody told this detector.
 *
 *  The delivered `stress-w-quay-photographs` beat prints that exact sentence under two of its three
 *  photographs, and this capability answered `{"photos":3,"missingAlt":0,"missingCredit":0}` —
 *  verified by the controller against the delivered SVG. The producing agent's own passes are the
 *  clearest statement of the defect there is: PASS 2, with the two gaps written `[...]`, measured
 *  `missingCredit: 2`; PASS 3, with the same two gaps written as the round-four sentence, measured
 *  `missingCredit: 0`. Between them nothing changed about the beat but the WORDING of the absence.
 *
 *  So the two strings are the same fact and are read as one: `unattributed`, the value a
 *  `STORYBOARD.md` RECORDS, and `Source: not stated`, the line a delivered artefact PRINTS for it.
 *  Both are matched at the head of the value and on a word boundary, exactly the way
 *  `storyboard/scripts/storyboard.mjs`'s own `isUnattributedCredit` matches, so a credit carrying a
 *  trailing effective date still reads as the absence it is and a real credit that merely CONTAINS
 *  the word — "Source: unattributed figures released by the ministry" — does not.
 *
 *  BOTH forms, not just the printed one, because finding Y1 of the same round measured a producer
 *  interpolating the RECORDED scalar straight into a published artefact. A component that never
 *  resolved the sentinel puts the raw token in front of a reader, and that is an absence too.
 *
 *  The two values are `storyboard`'s, not this skill's. They are declared here rather than imported
 *  — no skill in this branch imports another's runtime — and `test/photo-declares.test.ts` imports
 *  the real ones from `storyboard` and drives this decision with them, so the day either value
 *  changes without this file being told, that test is the thing that reddens. */
const RECORDED_ABSENT_CREDITS = ["unattributed", "Source: not stated"];

function recordsAnAbsentSource(value) {
  const text = value.trim();
  return RECORDED_ABSENT_CREDITS.some((form) =>
    new RegExp(`^${form}\\b`, "iu").test(text),
  );
}

/** WHAT COMES BACK, and why a recorded absence is counted twice.
 *
 *  `missingCredit` is every photograph that does not name a source — silent, placeheld, or honestly
 *  recorded as having none. `creditRecordedAbsent` is the SUBSET that says so out loud, and it is
 *  the whole point of the pair: a newsroom that cannot attribute a picture is not stopped and is
 *  not hidden either. A reader of this measurement can tell "nobody was ever asked" from "we asked
 *  and the answer was nobody", which is precisely the distinction the single `missingCredit: 0`
 *  destroyed. */
export function photosDeclareAltAndCredit(html) {
  const tags = [...html.matchAll(/<g\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /\brole="img"/.test(tag));
  let missingAlt = 0;
  let missingCredit = 0;
  let creditRecordedAbsent = 0;
  for (const tag of tags) {
    const alt = /\baria-label="([^"]*)"/.exec(tag)?.[1];
    if (!alt || !alt.trim() || isPlaceholder(alt)) missingAlt++;
    const credit = /\bdata-credit="([^"]*)"/.exec(tag)?.[1];
    if (!credit || !credit.trim() || isPlaceholder(credit)) missingCredit++;
    else if (recordsAnAbsentSource(credit)) {
      missingCredit++;
      creditRecordedAbsent++;
    }
  }
  return { photos: tags.length, missingAlt, missingCredit, creditRecordedAbsent };
}
