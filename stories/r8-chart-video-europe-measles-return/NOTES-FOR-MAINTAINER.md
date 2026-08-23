# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

**A wrong number came back `supported`, and it closed G1.** The article's own headline sentence
was put to G1 verbatim:

    resolveGrounding("127350 measles cases were reported in the European Region for 2024.", profile, {csv})
    -> verdict "supported", scalar "supported"
    detail: '127350: equals the sum of column "September" (126380)'

127350 does not equal 126380. It is 970 away, and the word printed is "equals". The cause is
`AGGREGATE_TOLERANCE = 0.01` in `ground-claim.mjs:482`, applied through
`matchesAggregate` (line 518) as `Math.max(roundingWindow, |sum| * 0.01)`. Measured by
bisection against this frozen table: every value from 126380 to **127643** returns `supported`
against a column summing to 126380, and 127644 returns `unverifiable`. The window is +/-1263.

The round-five fix directly above it made the rounding window read the numeral's own precision
("34" -> 0.5, "0.61" -> 0.005). `Math.max` then discards that answer whenever 1% of the column
is wider, which is every column summing over ~50. Seven of the frozen stories are said in that
comment to sum under 50; the other twenty-odd are all in the range where the precision-aware
window can never win. "127350" is written to the unit, so its own admitted rounding is 0.5, and
it was allowed 1263 - 2526 times its own precision.

This is the worst-shaped verdict in the set: a journalist quoting their own publisher's headline
figure would be told the frozen data confirms it, and it does not contain it anywhere.
Cost: the whole grounding movement had to be re-run by hand against the CSV to find out that the
"supported" was false.

## Found at storyboard

**The grounding check cannot read a cross-tab table, and on this one it is inverted.** The frozen
file is WHO's own published workbook: one row per country per year, twelve month columns across
(`Region, ISO3, Country, Year, January..December`). Every honest claim about it is a claim about
a number you reach by summing twelve columns across N rows.

Measured, same table, same call:

    "...fell to 150 in 2021 and were back above 100000 by 2024"  -> unverifiable  (all 5 numerals unplaced)
    "127350 cases were reported ... for 2024"                     -> supported    (and false)

Every refusal carried the same sentence: *"this profile carries 12 measures (January ... December)
and the claim names none of them."* 150 and 104442 are both exactly the values this table holds
for the years their own clause names, and both came back unplaced.

The manual escape hatch does not reach it either. `claimShape`/`claimColumn` exist precisely
for a sentence the regex lexicon cannot parse, and `claimColumn` names a **column**. A cross-tab
has no column for its own subject, so there is nothing truthful to write there. The gap is not the
lexicon; it is that both the automatic and the manual path assume the measure is a column.

Cost: G1 closes on `unverifiable` for the true takeaway and would have closed on `supported`
for the false one. That is not a silent check — it is a check pointing the wrong way.

## Found at intake

**`statedIncompleteness` attributed a claim to a period the article never made a claim about.**
The frozen prose says: *"A total of 38 deaths have been reported, based on preliminary data
received as of 6 March 2025."* The profiler recorded:

    { period: 2025, column: "Year", word: "preliminary",
      sentence: "A total of 38 deaths have been reported, based on preliminary data received as of 6 March 2025." }

That sentence says the DEATH TOLL is preliminary as of a date in 2025. It says nothing about the
year 2025 as a period of the table, and the article contains no 2025 case data at all. An
"as of <date>" stamp is being read as a claim about the period the date names. Any article with a
retrieval date or a press-release date in it will produce the same false attribution the moment
that year is also a period in the table — which it usually is, because the date is recent and the
table is current.

The second recorded claim is the correct one, and it was correct because the frozen prose happens
to say "the table's 2025 rows". So the mechanism works when the sentence names the period and
mis-fires when a date merely appears in it.

## Found at intake

**`panel.coverage` counts rows, calls the panel balanced, and the table is 33% empty.**
The profile says:

    balanced: true, entities: 194 in every one of 15 periods,
    "the fullest period here carries 194 entities and the thinnest carries 194"

Every country does have a row in every year. Almost none of them has a value in every month:
the same profile records `missing` of 889-1121 per month column, i.e. 11 651 blank cells out of
34 920. For the European Region in December 2024, 51 of 53 countries are blank.

A journalist reading `balanced: true` and "194 in every period" concludes the coverage is
complete. The two facts are in the same JSON object and contradict each other, and only one of
them is phrased as a narrative sentence. `gapsAreNotCoverage` exists for the adjacent case (a
full range is not full coverage); the same warning is owed here, where full ROW coverage is not
full OBSERVATION coverage.

Cost: the 2024 undercount had to be measured by hand before the takeaway could be written safely.
It is what decided the direction of the beat's caveat.
