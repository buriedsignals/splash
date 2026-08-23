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

## Found at storyboard

D6 — the documented way to record a claim's shape at G1 does not match the function's own argument.
Ran: resolveGrounding(takeaway, profile, { csv, recorded }) with `recorded` built exactly as
references/exchange.md movement 2 prints the fields — { claimShape, claimColumn, claimEntity,
claimVersus, claimDirection } — which is the only shape that document shows.
Came back, on the takeaway itself: '"undefined" is not one of the shapes this question offers
(maximum, minimum, comparison, total, none), so the recorded answer decides nothing and the
parser's own reading stands'.
Expected: the refusal names the VOCABULARY, so it reads as "the journalist's answer was wrong"
when what was wrong was the caller's KEY. resolveRecordedClaim reads { shape, column, entity,
versus, direction }; recordedClaimOf (storyboard.mjs) is the mapper from the front-matter names to
those, and exchange.md never mentions it — it prints the front-matter names and then says "pass it
to the grounding call: resolveGrounding(takeaway, profile, { csv, recorded })".
Cost: one silent wrong answer that looked like a verdict about my sentence. The recorded shape was
switched off and nothing said so, which is the same class as the round-five finding recorded in
storyboard/SKILL.md about checkStoryboard(meta).length === 0 inside the parity test.
Fix shape: either exchange.md names recordedClaimOf, or resolveGrounding accepts the front-matter
names it documents, or resolveRecordedClaim refuses an object carrying claimShape by name.

## Found at storyboard

D7 — proposeCredit recommended a translated quotation as the credit line and did not read the
article's own source block.
Ran: proposeCredit({ newsroom, article }) on the frozen article, which carries an explicit
provenance block — "- Publisher: Statistisches Bundesamt (Destatis), Wiesbaden", "- File: ...",
"- URL: ...", "- Licence: Destatis data, (c) Statistisches Bundesamt (Destatis), 2026, ..." — under
a heading "Where these numbers come from", plus the sentence "The chart in this piece is drawn from
the Federal Statistical Office's own long time series, table 46241-11".
Came back: attributions: exactly ONE sentence, and it was the italic gloss of a quoted German
sentence. recommended: "article-1", whose `prints` is
'Source: - *as Destatis reports, in 2025, according to preliminary results, one in six (16.4%)
people killed in road traffic was travelling by bicycle.*' — 151 characters, an em dash, two
markdown asterisks and a statistic, offered as the line that would print under the graphic.
Why, measured: MARKED_SOURCE_LINE requires the label to OPEN with sources|credits|attribution|
credits|pigi|al-masdar, so "Publisher:", "File:", "URL:" and "Licence:" are all invisible to it;
DATA_CAME_FROM requires "comes from|came from|proviennent de|...", so "is drawn from" is invisible
too. The one thing that matched was ATTRIBUTION_CUES on the gloss, and that path does not strip
markdown emphasis the way markedSourceIn does.
Expected: the article MARKED its source four ways and the proposal read none of them, then
recommended a sentence. SKILL.md's own rule is "a line the article MARKED as its source outranks a
sentence that merely carries a cue"; here the marked lines were unreadable and only the cue was
left, so the rule inverted in practice.
Cost: the escape ("Something else") had to be used and the credit written by hand — which is the
one hand field the exchange says an invented value makes "a false statement about somebody else".

## Found at production

D8 — the artifact-reading annotation guard cannot see a line chart's marks, and eight committed
SVGs draw them that way.
Ran: this beat's first render put its "36 in 2015" callout in the accent colour above the accented
line. Measured by hand from the committed SVG: the accent stroke enters the callout's ink box at
(438, 822), and accent text on accent stroke is 1.00:1 against a 3:1 floor (large text, 29px,
annotation-ink.mjs textContrastFloor).
Then ran: bun test skills/splash/test/annotation-reads-over-what-it-crosses.test.ts
Came back: 5 pass, 0 fail, 9 expect() calls.
Why: that test's own header states limit 1 — "Anything over a <path> or <polygon>. Point-in-polygon
is not implemented; those shapes are read for their existence and skipped as backgrounds. The chart
corpus draws its marks as <rect> and <circle>, so this is a real hole only for a future beat that
does not." And limit 4 — a non-dashed annotation's contrast is discovered by stroke-dasharray, so a
solid mark is unmeasured.
Measured against the corpus TODAY: of 54 committed SVGs outside probe directories, 13 carry an
<image> plate and are skipped whole, and 8 draw a stroked <path> as their data mark —
proof/more-line-swiss-life-expectancy, proof/static-bump-emitter-rank,
proof/static-small-multiples-solar-eu-six, proof/static-world-population,
stories/real-gwis-wildfire-counts (beat and export), stories/stress-j-partial-year-permits, and
this beat. Seven of those eight existed before this run.
Expected: "a future beat" is a present population of 7. Every line, area, bump and small-multiples
beat in this tree is outside the guard's reach, and those are exactly the types whose marks a
callout has to be placed against by hand.
Cost: the collision was found by opening the PNG and then measuring it with a throwaway script in
the beat's own probe/ directory. The guard that exists for this class stayed green throughout.

## Found at production

D9 — renderStill rasterises an accent a reader cannot see, and the 3:1 floor is only enforced at
the file.
Ran: probe/on-a-light-ground.mjs, which draws this beat's own component on #FFFFFF as
static-discipline.md's "Verification" section instructs ("Look at the PNG, on the light ground and
on the dark one").
Came back: a clean PNG. Measured: the newsroom's accent #D4A853 is 8.01:1 on this story's ground
#16191B and 2.20:1 on #FFFFFF — below the 3:1 non-text floor (WCAG 2.2 SC 1.4.11). The rendered
line is visibly washed out and the "36" callout is close to unreadable.
Expected: parsePalette calls assertLegible on every accent it reads out of PALETTE.md, so a colour
pair recorded in that file is refused. renderStill takes `ground` and `accent` as props and asserts
nothing about the pair, so any component that computes a ground — which is exactly what a
destination: print beat has to do, since palette resolves a different surface for paper — bypasses
the only place the floor is checked. 2.20:1 is the same ratio doctrine already records as the
defect on stress-ad-polish-hospital-beds.
Cost: none to this beat, which records destination: screen and ships on the dark ground; recorded
because the next beat that computes its own ground gets no warning at all.

## Found at delivery

D10 — the closing offer offered the journalist the beat they had just been delivered.
Ran: otherSubjectsFor({ storyDir, capabilities }) then formatSubjectOffer(rows), after materialise
had written export/1-pedelec-catches-the-bicycle/.
Came back: five rows, all verdict "offered", the FIRST of which is
"That deaths of pedelec riders have almost caught up with deaths of riders of ordinary bicycles —
214 against 248 in 2025, from 36 against 347 in 2015" — the delivered beat, verbatim, under the
heading "There is more in this article than the visual you just delivered."
Why: isDrawn(id, beats) matches on the beat DIRECTORY NAME —
`beats.some(b => b === id || b.endsWith("-" + id))`. The recorded subject id is
"the-two-bicycle-series-converge"; the beat directory the producer created is
"1-pedelec-catches-the-bicycle". Two names for one claim, so the drawn verdict cannot fire.
Expected: nothing anywhere binds a SUBJECTS.md id to the beat directory a slot becomes. The slot in
STORYBOARD.md carries `id: 1` and no subject id; recordSurveyedSubjects is called at movement 10
and is never told which angle the slot chose; the beat directory is named by the producer, with a
number prefix. references/exchange.md says a subject id is one "that could name a beat directory",
which is advice, not a binding — and the guard depends on the two strings coinciding exactly.
Cost: the last thing this journalist reads is an offer to make the graphic they are holding.

## Found at intake

D11 — freezeSource accepted a table with sixteen blank column names, profiled sixteen columns
called "", and the refusal lives three phases away in a test the journalist never runs.
Ran: freezeSource over the Destatis sheet exported at its full 37x328 grid. The sheet's used range
is 21 named columns; the remaining 16 carry no header and — measured — no value in any of the 327
rows.
Came back from intake: nothing. Three files written, no warning, exit 0.
Came back from the profile: "profiled columns: 37", the last sixteen of which are
{"name": "", ...}. Sixteen indistinguishable columns with the same name, in the record every later
phase reasons from. Every downstream reader that addresses a column BY NAME —
chooseValueColumn, findDenominatorColumn, measureColumns, isShareColumn — is handed sixteen
columns called "".
Came back from the repo suite, 200 lines and four phases later:
  bun test skills/splash/test/a-frozen-source-is-what-its-name-says.test.ts
  (fail) should find no .csv that does not parse as a table with a header and a row
  + "stories/r8-chart-static-german-road-deaths-by-mode/source/data.csv"
That test's rule is `rows[0].some(name => name.trim() === "")`, and it is RIGHT: a blank column name
is not addressable. It was written for a .csv that held a JSON document.
Expected: the check that says a frozen source is not a table belongs in freezeSource, where the
journalist is standing, not in a suite they do not run. intake/SKILL.md's own promise is that this
phase "reads, it parses, it types the columns, it writes" and that the frozen record can never drift
— so a record it accepts and a record the tree refuses cannot be the same file.
NOT FIXED IN THIS STORY, deliberately, and the test is left red rather than papered over. Three
reasons: the round brief says the messy file is the point and must not be cleaned; intake's own
contract is that a frozen source is never modified and a re-freeze requires a fresh story, so
correcting it means deleting the frozen record by hand — working around the one rule intake exists
to enforce; and the defect is upstream of this story's bytes. The fix is one of: freezeSource
refuses a header carrying a blank cell, naming the column index; or profileTable names them
(col_22 ... col_37) and says it did; or both.
Cost: one red assertion in skills/splash/test/a-frozen-source-is-what-its-name-says.test.ts,
reported rather than hidden.
