# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at framing

ground-claim.mjs's `matchesAggregate` uses `Math.max(0.5, |sum| * AGGREGATE_TOLERANCE)`. On a table whose numbers are small fractions the absolute floor of 0.5 swallows everything: `resolveGrounding` reported the takeaway's `0.61` (an AREA, km2) as "equals the sum of column volume_km3 (0.482)" — 0.128 apart — and returned verdict `supported`. One genuine confirmation (the windowed superlative, which reads real rows) also landed, so G1 closed honestly here by accident. A table with only fractional columns and no superlative would close G1 on arithmetic noise. The floor needs a scale, or a unit check, or a refusal to compare a value against a total from a different column than the one the value was placed in.

## Found at framing

groundTakeaway decides `lower than` / `higher than` between two years and does not decide EQUALITY. The article states its own flat spot outright ("Between 2000 and 2005 the recorded area did not change at all") and the frozen table records it exactly; the sentence produced no claim at all and came back in the `unevaluated` half of the coverage line. An `identical to` / `unchanged` / `the same as` shape would be decidable from the same rows the comparison shapes already read.

## Found at framing

proposeCredit's ATTRIBUTION_CUES missed this article's own attributing sentence — "Measurements taken every five years by the Swiss glacier monitoring network show..." — and recommended `unattributed`, whose printed line is "Source: not stated". The article names its source in its first clause. The cue list matches "according to", "data from", "published by" and so on, and does not match the equally common "measurements/figures taken by X show" or "X attributes ... to". A recommendation of `unattributed` on a sourced article is worse than no recommendation: it is a wrong answer with a receipt.

## Found at storyboard

Gate 2 closes without SUBJECTS.md and delivery refuses without it. `checkStoryboard` and `where.mjs`'s `missingForGate2` require neither the file nor the `recordSurveyedSubjects` call that writes it; `readSurveyedSubjects` throws at the closing offer, two phases later, naming movement 10 of the exchange as the place it should have happened. This is the same shape as round four finding 9 (`language` required by delivery and checked by neither gate), one field over, and its own throw says why it matters: the survey has to be recorded where the angles still exist. On this story the call had to be made retroactively at delivery, from the article rather than from the survey.

## Found at production

Five of the thirteen guards `verify-scrolly.mjs` DECLARES in its own `GUARDS` array are never called by its driving run: `compositionFillsTheFrame`, `csvSplitByHand`, `pageLanguageMatchesStory`, `credentialReadsWithoutAlias`, `plateMatchesGeometry`. Each appears exactly once in that file — its definition. They are reachable only from the skill's own test files, which point them at the SKILL's own sources and at a hard-coded population of four proof beats plus stress-g. So a producer who runs the one command the skill tells them to run gets 8 of 13 guards, and `reveal-fills-the-frame` — the guard written for the round-two 15%-of-the-frame beat — measures nothing about the beat being produced. This beat's own first-step ink coverage (3.3% at 1600x900, 10.1% at 375x812, against the 1.2% floor), its `<html lang>` against the recorded language, and its own csv reader had to be measured by hand.

## Found at production

The scrolly SKILL.md contradicts itself about single-visual beats. "How it works" step 1 says: "Count the distinct frameKinds: if there is only one, this is not a scrolly", and "When to use" says "If every step would show the same chart, do not reach for this skill — animate the beat instead." The same file then documents the SCRUB model as "the only model a beat whose steps are STATES OF ONE THING may use", names `proof/mapmore-scrolly-danube` as its worked example, and ships two single-visual chart beats. `verify-scrolly.mjs` reads the model off the markup and holds a single-visual beat to MORE, not less. A producer following step 1 literally would refuse a beat the format supports and the verifier prefers.

## Found at delivery

`FORMS_BY_FORMAT.scrolly["owned-file"].gives` still says "its sticky graphic". The vehicle removed `position: sticky` at its eighth correction and its own SKILL.md now states "There is no `position: sticky` on the graphic". The sentence is journalist-facing.

## Found at delivery

This format has no `useTypeface` and never reads the story's recorded TYPEFACE.md, which its own SKILL.md names as a gap. `writeTypeface` recorded `Helvetica, Arial, sans-serif` / `origin: default` for this story and the render draws that stack because it is hard-coded, not because it read the record. The guard `typeface-is-recorded` asks the beat to name the gap in the hand-over, while `format-handover.mjs`'s `refuseMaintainerText` refuses any hand-over string naming our own files or modules — so the gap can only be named obliquely, as a fact about the face rather than about the reader that never ran.
