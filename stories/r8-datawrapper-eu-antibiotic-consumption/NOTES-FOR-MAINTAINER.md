# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at production

A YEAR COLUMN BECOMES A DATE AXIS AND NOTHING IN THE SPEC CAN SAY OTHERWISE.
Ran: bun run skills/dw-beat/scripts/produce.mjs ... static landscape --story-output, on a
ChartSpec whose data rows are {year: 2013..2024, ddd: <number>}.
Came back: chart Ob0NA rendered with a QUARTERLY x axis — 45 tick labels (Jan/Apr/Jul/Oct for
eleven years plus Jan 24) for twelve annual observations. Datawrapper auto-detected the column
as dates and interpolated between the points, so the 2019-2020 fall reads as a collapse inside
one quarter and the 2020-21 plateau reads as twelve months of flat measurement. The numbers are
right; the time resolution the drawing states is not the data's.
Expected: twelve ticks, one per observation.
Measured cause, live on the same chart: PATCH metadata.data["column-format"] = {year: {type:
"text"}} -> the axis redrew as 2013 2014 ... 2024, exactly twelve labels. One field.
That field is UNREACHABLE from a beat. validateChartSpec's ALLOWED set is twelve names and
carries nothing about a column; buildChartPayload writes metadata.describe, metadata.visualize
and metadata.publish and never touches metadata.data at all. So a Datawrapper line chart of an
annual series — the most ordinary chart this delegated producer exists for — cannot declare that
it is annual, and nothing in the chain reads the axis back to notice.
Cost: the beat ships with an axis that misstates its own time resolution, or it does not ship.

## Found at production

THE PAIRED LABEL OF A RANGE ANNOTATION IS POSITIONED WITH A NUMBER, SO ON A DATE
AXIS IT RENDERS NOWHERE — which is exactly the defect dw-beat/SKILL.md's own headline gotcha
says buildRangeAnnotation exists to prevent ("a rule with nothing paired to it renders as a line
with no caption").
Ran: the first production run, with rangeAnnotations: [{value: 15.9, label: "2030 target — 15.9"}].
Came back: GET /v3/charts/Ob0NA showed range-0-label stored correctly, text and all, at
position {x: 2024, y: 15.9}. The exported PNG carried the dashed rule and NO label. The second
text annotation, at {x: 2020.5}, was also absent.
Expected: a rule with its caption, which is the whole promise of that function.
Measured cause, live on the same chart, one field changed and nothing else: position.x from the
number 2024 to the string "2024-01-01" -> the label appeared. Same for 2020.5 -> "2020-07-01".
buildRangeAnnotation derives the label's x from domain(data, xKey), which is Number(row[xKey]).
That is only a position on a numeric axis. Every Datawrapper line chart of a time series has a
date axis.
Cost: the beat now sends its own duplicate text annotation with an ISO x, so the published chart
carries THREE text annotations, one of which (range-0-label, x: 2024) renders nowhere and is
dead weight in a newsroom's own chart metadata. Nothing observes that it did not draw: the two
guards that read the export back measure the surface's luminance and the accent's pixel count,
and a missing label costs neither.

## Found at production

THE FITTED Y RANGE PUTS A REFERENCE RULE PERMANENTLY AT THE FLOOR, AND THE
COMMENT ABOVE IT CLAIMS THE OPPOSITE.
computeYRange (metadata-spec.mjs) says it widens the range "so a reference rule always lands
inside the plot rather than at its floor or off it entirely". It adds the annotation's value to
the value list, then pads by 8% of the resulting SPAN. When the rule is the minimum — which is
what a target below the series always is — the rule lands exactly pad x span above the bottom,
every time, whatever the data.
Measured: GET /v3/charts/Ob0NA returns custom-range-y ["15.436","22.163999999999998"] against a
rule at 15.9. That is (15.9-15.436)/6.728 = 6.9% of the plot height above the axis. On the
1080px landscape export the rule sits ~66px off the bottom edge, under the lowest gridline
label, while the chart's own title builds its whole claim on it ("4.4 above the 2030 target of
15.9"). The most load-bearing element of the sentence is the least visible element of the
drawing.
Same run, second consequence: that 6.7-unit range on a 1080px plate makes Datawrapper tick every
0.2 — 33 gridlines for twelve points.
Measured cause: PATCH visualize["custom-range-y"] = ["12","23"] on the same chart -> 23
gridlines instead of 33, ticking every 0.5, and the rule lifts to about a third of the way up
with visible space beneath it.
Unreachable from a beat: custom-range-y is computed by computeYRange and there is no ChartSpec
field for an axis range, a tick count or a grid. A beat can only move it by inventing a second
range annotation below the real one, which would be a lie drawn to fix a layout.
Also cosmetic and shipped: the range is sent as "22.163999999999998" — .map(String) over a float
— into a published newsroom chart's own metadata.

## Found at production

THE SHARED SIZES TABLE HANDS THE DELEGATED PRODUCER A SHAPE DATAWRAPPER LAYS
OUT BADLY, AND THE SKILL ALREADY KNOWS WHY IT CANNOT COMPENSATE.
sizes.mjs is carried byte-for-byte from the bespoke craft skills: landscape is 1920x1080 at
zoom 1. dw-beat/SKILL.md notes that this copy alone carries no typeScale, "and that absence is
the point: Datawrapper lays out its type server-side, so there is no local number for a scale to
multiply". True, and the consequence is unaddressed: at 1080px of plot height Datawrapper's own
tick algorithm produces 33 y gridlines and 45 x tick labels for a twelve-point series, and the
direct series label wraps against the right frame (four lines at "DDD per 1 000 inhabitants per
day", two at "EU average" after the label was shortened by hand).
Expected: a size table shared with producers that scale their own type should either not be
shared with a producer that cannot, or should carry the fact that it cannot.
Cost: every knob that would fix it — label-space, y-grid, custom-range-y — is outside the twelve
fields a ChartSpec may carry.

## Found at intake

THE PROFILER REPORTS missing: 0 ON A TABLE WHOSE MISSING VALUES ARE ALL PRESENT.
Ran: freezeSource on Eurostat sdg_03_70, downloaded today and converted from TSV to CSV by
delimiter only.
Came back: profile.json types all twelve year columns as text — correctly, and it SAYS WHY
("looked numeric but \":\" is not, so the column stays text") — and reports "missing": 0 for
every one of them.
Measured: the frozen table holds 32 cells whose value is Eurostat's own not-available sentinel
":" (5 in 2013, 5 in 2014, 5 in 2015, 4 in 2016, 3 in 2017, 3 in 2018, 1 in 2019, 1 in 2020,
1 in 2021, 1 in 2022, 2 in 2023, 1 in 2024). Germany reported nothing at all before 2023.
Control: replacing each ":" with an empty cell and re-profiling the identical table gives
"2024": {"type":"number","missing":1,...}. So the profiler counts missing when it is written as
emptiness and not when it is written as the sentinel the publisher actually uses.
Expected: either a missing count that includes the sentinel, or a stated refusal to count.
Cost: a journalist reading missing: 0 on the 2013 column believes all thirty rows reported that
year; five did not. This is the false-confirmation shape, one level below the type refusal that
the same function gets right.

## Found at storyboard

A SPACE-GROUPED THOUSANDS NUMERAL BECOMES TWO CLAIMS.
Ran: resolveGrounding on the confirmed takeaway "EU antibiotic consumption reached 20.3 DDD per
1 000 inhabitants per day in 2024, 4.4 above the 2030 target of 15.9."
Came back: seven claims, two of which are "1" and "000".
Expected: one numeral, 1000 — the space group is how Eurostat, ECDC and the EEA all print this
unit, and it is the SI convention.
settleGroupedNumeral settles a COMMA-grouped numeral against the frozen table and is documented
at length; nothing reads a space or a non-breaking space the same way. The two fragments came
back unverifiable here, so nothing was decided wrongly — but on a table holding a 1 somewhere,
"1" would have been placed and the detail a journalist reads would have named a claim their
sentence never made.

## Found at storyboard

G1 CLOSES WITH "unverifiable" ON A TAKEAWAY WHOSE CENTRAL NUMBER IS A CELL OF
THE FROZEN TABLE.
Ran: resolveGrounding(takeaway, profile, {csv}) on the frozen Eurostat table.
Came back: grounding unverifiable, every numeral answered "profile has no numeric column with a
range to check against". 20.3 is the EU27_2020 row's own 2024 value, in the file, and 19.9 and
16.4 are in it too.
Cause is upstream and honest on its own terms: intake refuses to type a column carrying ":" or
a break-in-series flag, so no column is numeric, so the grounding check has nothing to read.
Each mechanism is right and together they disarm the gate: a real publisher's real file makes
G1 structurally unable to decide anything, and "unverifiable" is a CLOSING value.
Recording the claim shape (claimShape: comparison, claimColumn: "2024") improves it in the one
way that matters — the refusal becomes named ('column "2024" is typed "text" ... so no maximum,
minimum, comparison or total can be read off it') instead of generic — which is the right
behaviour and is worth keeping. What is missing is anything that tells the journalist the gate
closed on a table it could not read at all.
Second, smaller: the takeaway names its column as "in 2024" and the profile has a column called
exactly "2024". In the control run over the same table with the flags stripped, the check still
answered "this profile carries 12 measures and the claim names none of them". A wide table whose
columns ARE periods is a shape the column-naming rule cannot resolve.

## Found at storyboard

proposeCredit READ AN ARTICLE THAT NAMES THREE PUBLISHERS AND RECOMMENDED
"unattributed".
Ran: proposeCredit({newsroom, article}) on the frozen source/article.md.
Came back: attributions: [], recommended: "none", with the reasoning "The article names no
source — nothing in it attributes these figures to anyone", and prints: "Source: not stated".
The article names Eurostat and the dataset code sdg_03_70 under its own "## Data" heading, names
the ECDC report and its publication date, and quotes the European Environment Agency by name.
Cause: attributionsIn matches a cue list ("according to", "data from", "published by", ...), a
"<noun> comes from" shape, or a colon-labelled source line — and it explicitly drops any
sentence starting with "#". A "## Data" or "## Sources" heading followed by the citation, which
is the ordinary shape of a data story, matches none of the three.
Expected: either a match, or a recommendation that does not assert as fact that the article
attributes nothing.
Cost: the escape hatch ("Something else — name the source and it is recorded exactly as you
write it") was there and was used, so nothing shipped wrong. A run that accepted the
recommendation would have published a Eurostat/ECDC series under "Source: not stated".

## Found at storyboard

surveyGap NAMES A FUNCTION THAT DOES NOT EXIST IN THE SKILL THAT REFUSES.
Ran: surveyGap(storyDir) with no SUBJECTS.md.
Came back: "call recordSurveyedSubjects({ storyDir, subjects }) there".
grep over the tree: recordSurveyedSubjects is exported from skills/deliver/scripts/
other-subjects.mjs. It appears nowhere in storyboard/SKILL.md, nowhere in storyboard/scripts/,
and importing it from storyboard would be the cross-skill runtime import this branch forbids.
A model running the STORYBOARD phase from storyboard/SKILL.md alone cannot find the function its
own gate tells it to call. It is discoverable only from splash/SKILL.md's phase table.
Cost: one grep. But this is the same "a required record that no documented path produces" shape
splash/SKILL.md already records for OUTPUT-REVIEW.json, recurring on the file six formats have
already reported.

## Found at production

G3 HAS A FILE FOR "YES" AND NO FILE FOR "NO", SO A REFUSED RENDER AND AN UNSHOWN
ONE ARE THE SAME STATE ON DISK.
Ran: whereIs on this story after two production cycles, with the journalist having seen the
render and declined it.
Came back: {"phase":"production","missing":["beat 1-eu-antibiotic-consumption: rendered but not
approved — gate 3 closes into beats/.../APPROVED.md, written after the journalist has been shown
this render and has said yes"]}.
That sentence is what a story gets before anybody has looked at anything. There is no
APPROVED.md, and there is nothing else either: grep over where.mjs finds APPROVED.md and no
counterpart for a refusal, and no record of the three-cycle stall the orchestrator's own turn
budget prescribes ("hand back to the journalist with the gaps named"). So "nobody has been
asked", "the journalist is still deciding" and "the journalist looked at it and said no, for
these three reasons" are one indistinguishable state, and the reasons live in a conversation and
die with it.
This is the same shape this tree already fixed one gate later: materialise writes .another-format
and .other-subjects as "pending" precisely so that "nobody was ever asked" is a fact on disk.
G3 has no equivalent.
Cost here: the reasons this beat was declined are written into this file because there is
nowhere else for them to go.

## Found at production

WHY THIS BEAT WAS DECLINED AT G3, since there is no record for it.
The numbers are right, the caveat is on the chart's own face, the credit is right, and the export
came back on the newsroom's dark ground as asked. Three things a desk would send back, and all
three are unreachable from a ChartSpec — see the three notes above for the live measurements:
  1. an annual series drawn on a quarterly axis, 45 tick labels for 12 observations, fixable
     only through metadata.data["column-format"];
  2. 33 y gridlines, one every 0.2, and
  3. the 2030 target rule pinned 6.9% off the bottom edge while the title's whole claim rests on
     it — both fixable only through visualize["custom-range-y"].
Two production cycles were spent. The second fixed everything a beat CAN fix: the annotation
positions (ISO dates, so the labels render at all), the series label (four wrapped lines to two),
and a second accent for the target rule so it is not the same colour as the series. Nothing
remains that a third cycle could reach, so this is the stall rather than a fourth attempt.

## Found at production

THE LIVE TESTS NOW WRITE TO A REAL NEWSROOM ACCOUNT AND CLEAN UP NOTHING, AND
UNTIL TODAY THAT COST WAS INVISIBLE BECAUSE THEY ALL SKIPPED.
Ran: bun test skills/dw-beat/test — 210 pass, 0 fail, 28s.
Came back, on the account: three new charts, all PUBLISHED — "Emissions fell", "dw-beat client
test", "range-annotation probe" — created within thirteen seconds of each other and removed by
nothing. GET /v3/charts reports total: 1139 on this account. Two earlier triples with the same
three titles sit at 08:26 and 08:27 today, and matching triples sit at 2026-08-08.
Expected: a live contract test either tears down what it created, or says in the suite's output
that it did not.
The credential alias fix that made these tests stop skipping is right, and it converted a silent
skip into an unbounded, unreverted write to a real provider account on every full-suite run. The
suite is run at the end of every round.
Cost: I deleted the three my own run created (Jsofm, amOib, TokJp — DELETE /v3/charts/{id}, 204
each). The rest of the accumulation is older than this run.

## Found at production

A LIVE TEST WHOSE ONE ASSERTION IS A SENTENCE ADDRESSED TO A HUMAN, ABOUT A FILE
IT THEN DELETES.
skills/dw-beat/test/verify-range-annotation.test.ts is the live pin for the range-annotation
shape. It asserts result.sentShape, that roundTrippedRangeAnnotations is defined, and that the
PNG is larger than zero bytes — then prints "Wrote <path> — open it and confirm the rule actually
drew at y=5 between 2000 and 2010." The thing the test exists to establish, that the rule DREW,
is delegated to a human in a console.log.
Measured: the try block's last statement is that console.log; the finally block immediately runs
rm(outDir, {recursive: true, force: true}). The file the reader is told to open is deleted before
the test returns. I watched that line print during my run and the temp directory was already gone.
So: the assertions pass on a PNG of any content whatever, and the escape hatch is destroyed by
the test's own cleanup. This is the shape the branch's own constraints call out — a test that
stays green when the mechanism is broken — and my beat is the evidence that it does: my first
production run drew a rule whose label rendered NOWHERE, through this same code path, and every
test in this file was green.
