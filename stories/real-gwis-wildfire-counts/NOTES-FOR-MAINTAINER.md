# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

G1 grounding, two-year comparison on a LONG (panel) table: rowValue() in ground-claim.mjs takes rows.find(r => Number(r[yearField]) === year) — the FIRST row of that year, with no entity filter. On this story's 260-entity x 15-year table that is always Afghanistan. 'Canada recorded fewer wildfires in 2025 than in 2012' comes back supported from events 15 vs 49 (Afghanistan) while Canada actually rose 3,782 -> 5,836; the opposite sentence comes back contradicted. Two different entities produce byte-identical details. The superlative shape already has the panel guard ('X matches 15 rows in the frozen table'); the comparison shape has none.

## Found at storyboard

G1, the recorded-claim escape hatch does not suppress the pattern reading. With recorded {shape: comparison, entity: Canada, ...} the recorded branch correctly refuses ('Canada matches 15 rows'), but the regex comparison ALSO produces its claim, and resolveGrounding's collapse takes supported because one claim is confirmed and none refuted. The documented rule is 'the recorded shape wins'; here the overruled reading still decides the verdict, and it raises it.

## Found at intake

Nothing in the profile can see an AGGREGATE row. This table mixes World, six continents, European Union (27) and Europe (excl. Russia) into the same entity column as 251 countries. entity.distinct 260 vs code.distinct 259 and code.missing 15 are the only signals, and they point at the one aggregate that has no code rather than at the nine that are aggregates. A ranking taken off this file puts World first and Africa second.

## Found at intake

The frozen profile types the period column as an ordinary number and reports year.sum = 7,874,100. isSequenceColumn already recognised it (gaps: []), so the sum is computed for a column the profiler knows is not a measure.

## Found at storyboard

The partial-period guard cannot reach this dataset. COVERAGE_COLUMN_NAME_RE in ground-claim.mjs looks for months_covered / coverage / complete(ness) as a COLUMN. Here the incompleteness is stated in the dataset's own description line, which intake freezes as prose in article.md and never as a column, so 2026 (eight months, 370,394 fires against fourteen full years) is a fact nothing mechanical in this chain could see.

## Found at storyboard

The raw-count denominator downgrade cannot reach this dataset either. findDenominatorColumn looks for a denominator-shaped column in the SAME table; for a country-panel dataset the denominator (area, population) is a different dataset. A raw-count superlative here gets no downgrade, and the silence means nothing.

## Found at storyboard

producer-gate alias miss: datawrapperMatch({medium: chart, format: static, treatment: 'Stacked area'}) returns null while 'Area (and stacked area)' and 'area' both match d3-area. 'Stacked area' is the natural name for this treatment and half of the type sheet's own title; a slot recording it silently skips the custom-or-Datawrapper human gate.

## Found at palette

proposePalette prints 'Measured against #FFFFFF, the ground NEWSROOM.md records' when no newsroom profile is passed — while the same output separately says the NEWSROOM.md it found 'was not read'. NEWSROOM.md records ground #16191B. The surfaceLimit sentence names a file it did not read and attributes the paper default to it.

## Found at palette

A part-to-whole beat needs one ink per part and the palette mechanism tops out at what NEWSROOM.md happens to record (here two accents for six bands). seriesInks derives more, but only as shades of the recorded accents, which is the wrong answer when five of six series are the comparison field for the sixth. This beat derived its own ramp from the ground toward the ink pole, with the 3:1 floor and readApart applied per step; that logic belongs beside seriesInks rather than in a story.

## Found at delivery

A re-render plus a re-approval does not reopen delivery on the first-delivery path. beatsAwaitingDelivery (where.mjs) checks only that export/<beat>/HANDOVER.md exists. Reproduced here: the beat was re-rendered (SVG alt text corrected), a new OUTPUT-REVIEW.json bound the new draft digest, and whereIs answered {phase: done, missing: []} while export/ still held the previous SVG and .delivery-manifest.json still named the previous review id and draft digest. Same shape as the round-four G3 finding, one gate later: the check that would catch it lives behind FEEDBACK.md, which cannot exist when the producer corrects its own beat before anyone has given feedback.
