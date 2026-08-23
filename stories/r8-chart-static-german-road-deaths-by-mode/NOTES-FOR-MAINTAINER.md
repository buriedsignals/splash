# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at intake

D1/D2/D3 — panel description contradicts its own column stats on a file with trailing blank rows.
Ran: freezeSource over the Destatis workbook sheet csv-46241-11 exported verbatim (327 data rows =
141 real + 186 all-blank trailing rows, 37 columns of which 16 are always empty).
Came back: panel.periods: 48, coverage.byPeriod holds 47 entries (1979..2025), Jahr.distinct: 47.
The blank rows are counted as a 48th period whose key is the empty string.
Came back: panel.balanced: false beside panel.rowsPerPeriod: {min: 3, max: 3}. Those two adjacent
fields contradict each other and nothing else in the profile carries the evidence for "false".
Came back: panel.decidedBy: 'every ("Ortschaft", "Jahr") pair is unique across all 327 rows, and
"Ortschaft" holds no blank' — while the SAME profile's Ortschaft column reports missing: 186.
Expected: blank rows excluded from the period count, or a period named "" reported as such; a
balanced verdict consistent with rowsPerPeriod; and a decidedBy sentence that cannot assert
"holds no blank" about a column the profiler itself counted 186 blanks in.
Cost: had to verify the panel by hand before trusting any later phase's reading of it.

## Found at intake

D4 — the obvious aggregate is invisible and the column total is exactly double.
Ran: freezeSource over a three-entity panel whose entity column Ortschaft holds
"Innerhalb von Ortschaften", "Außerhalb von Ortschaften" and "Innerhalb und außerhalb von
Ortschaften" — the third being the sum of the first two.
Measured by hand: the identity total == inside + outside holds in 47 of 47 years, exactly.
Came back: aggregates.byArithmetic: [], aggregates.byStructure: [], structure.answered: false
("no column of this table holds one stable code per entity with a shape most of them share"),
arithmetic.ran: false ("the structural test set no row of this table apart, so there was no
candidate to put to the arithmetic").
Consequence, measured: Getoetete_Insgesamt.sum is 673274. The real 47-year total is 336637.
The published sum is exactly 2x, and SKILL.md says that sum exists for the grounding check to
place a part-to-whole total against.
Expected: on a panel of THREE entities over 47 periods the arithmetic is trivially affordable, and
"the structure proposed nothing" should not be able to stop it. A structure gate that only opens on
a code column cannot fire on any table that has no code column, which is the shape of a requirement
that cannot fire.
Cost: the story's whole part-to-whole reading had to be computed outside the toolchain.

## Found at intake

D5 — a publisher's not-applicable marker turns every column the story is about into text.
Ran: freezeSource over Destatis table 46241-11, where a cell that does not apply to a year is
written as a hyphen (the column Getoetete_Pedelecs_ab_2014 is "-" for 1979..2013, and
Getoetete_Fahrraeder_bis_2013 is "-" for 2014..2025 — one measure, two columns, split at a
definition change the file states in the column NAMES).
Came back: Getoetete_Pedelecs_ab_2014, Getoetete_Fahrraeder_ohne_Elektroantrieb_ab_2014,
Getoetete_Fahrraeder_bis_2013 and Getoetete_Elektrokleinstfahrzeuge all typed "text" with
reason 'looked numeric but "-" is not, so the column stays text', and min/max/sum all null.
Expected: the refusal is honest, but it is total — the profile then carries no range and no total
for the four columns this story is entirely about, and every downstream reader that offers "measure
columns" cannot see them. There is no way for the profile to say "numeric in 12 of 47 rows, with 35
cells carrying the publisher's not-applicable marker".
Cost: the beat's data had to be prepared by a build script that reads source/data.csv directly,
because nothing downstream could name the pedelec column as a measure.
