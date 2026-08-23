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

## Found at production

**This format's guards walk `proof/` and never `stories/` — the directory the orchestrator itself
creates.** `chart-video/test/verify-video.test.ts`'s `videoComponents()` (line 167) builds its
population from exactly two places:

    const found = [join(SKILL, "assets", "EmissionsVideo.tsx")];
    for (const entry of readdirSync(PROOF, ...))   // PROOF = join(TWIN, "proof")

Measured on this tree: **25 `*Video.tsx` under `proof/`, 5 under `stories/`** (electricity-mix,
regional-migration, forest-loss, rail-punctuality, europe-recycling) — and 6 with this beat. Not
one of the six is walked, so `revealDashInScreenSpace` and `neverArrives` cannot fire on a
journalist's beat. The floors in that test (`files >= 20`, `marks >= 15`) are satisfied by
`proof/` alone, so it will stay green whatever `stories/` contains.

`splash/test/video-first-frame-not-empty.test.ts` has the same shape (`PROOF_ROOT`, line 97) —
and that one guards the POSTER FRAME, which for a social video is the most consequential frame
there is. **25 mp4s under `proof/` are checked; 12 under `stories/` are not.**

Recurring shape 4: a requirement that cannot fire. The population is typed as a path constant, and
the path it names is the one place a journalist's work never lands.

## Found at production

**Two of this format's three wired guards are unreachable from a story beat, because `shared/`
does not carry them.** A story consumes the root through `#shared/*` — that is the settled rule
and `proof/life-expectancy/render.mjs` follows it. `shared/chart-video/` holds exactly three
files: `detect-reveal-order.mjs`, `sizes.mjs`, `timing.ts`.

`bun skills/chart-video/scripts/check-guard-wiring.mjs` says 3 of 15 declared names are wired.
Of those three, a story beat can call ONE:

| guard | wired into | vendored to `shared/` | reachable from a story beat |
| --- | --- | --- | --- |
| `staggerLacksAnOrder` | `render-video.mjs` | yes | **yes** — this beat calls it |
| `graphicFillsItsFrame` | `render-video.mjs` | **no** | no |
| `declarationsWithoutACaller` | `check-guard-wiring.mjs` | n/a | n/a |

So round six's `fills-its-frame` fix — the one whose own SKILL.md paragraph says "a discipline
that cannot observe its own violation is theatre" — is wired into the SEED's renderer and into
nothing a journalist's beat can reach. Neither of `proof/life-expectancy/render.mjs` nor
`proof/migration/render.mjs` calls it either; they are the files a beat author is pointed at.

Cost, measured: this beat's `graphicFillsItsFrame` (76.53% against a 35.15% floor),
`revealDashInScreenSpace` (1 mark, 0 failures) and `neverArrives` (6 ramps, 0 offenders) all had
to be run from a scratch script outside the repository, importing `skills/chart-video/scripts/`
directly — which is exactly the cross-boundary reach the architecture forbids in runtime code. The
numbers are in `APPROVED.md`; the build itself never ran them.

## Found at production

**The video path never reads `TYPEFACE.md`.** `chart-video/scripts/render-video.mjs` imports
`{ deriveFurniture, readPalette }` and nothing else from its own `render-still.mjs` — which
also exports `readTypeface` and `useTypeface`. The seed's `EmissionsVideo.tsx`,
`proof/life-expectancy/LifeExpectancyVideo.tsx` and `proof/migration/MigrationVideo.tsx` each
carry `export const FONT_FAMILY = "Helvetica, Arial, sans-serif"` as their only family.

So the answer the journalist gives at movement 9 has **no effect on a video beat**. `PALETTE.md`
REFUSES when absent, by design — "a beat with no recorded answer refuses to render rather than pick
a colour nobody chose". `TYPEFACE.md` is written by the same exchange, for the same stated reason,
and is then ignored by this format entirely.

It is silent here only because this story's recorded answer happens to equal the literal. Had the
journalist answered option 2 (Courier New, which `proposeTypeface` offers and this machine has),
the video would have rendered in Helvetica and nothing anywhere would have said so.

Also structural rather than accidental: `useTypeface` reassigns a module-level `let` inside the
resvg script, which a browser composition cannot reach. Closing this needs a props channel, which
is six lines. This beat's own `render.mjs` and `MeaslesReturnVideo.tsx` carry those six lines as
a demonstration — `readTypeface` in node, `fontFamily` passed in, used to DRAW and to MEASURE
(measuring in one family and drawing in another silently mis-wraps every string).

## Found at delivery

**`writeOutputReview` derives `planVersion`; `offerForms` refuses without it.** The first
`offerForms` call of this run, with the same argument set that had just written the review, threw:

    error: current planVersion must be a positive integer: it is this beat's own review revision —
    ... `writeOutputReview` derives it from the review already on disk when a caller names none ...

The message explains, at length, that the field is derived when a caller names none — inside the
refusal for not naming it. Two ends of one field, one optional and one required, and the required
end quotes the optional end's rule as its own justification. `approvalAgainstCurrent` is reading
the record that already holds `planVersion: 1`; it could take it from there, or the refusal could
say "pass the `planVersion` from the review on disk". Cost: one failed call and a read of
`output-review.mjs`.

## Found at delivery

**The other-subjects offer tells the journalist something the machine does not do.** Its own text
(`formatSubjectOffer`) reads:

    "Taking one starts a new visual in this story, from the beginning — you frame it, you see it,
     you approve it, and it is delivered on its own, beside the one you already have."

The format offer beside it is careful and correct in the opposite direction: "This receipt records
the request only; it does not schedule production."

Measured: after `recordSubjectAnswer({answer: "taken", subject: "measles-where-2024"})`,
`whereIs` returns `{"phase":"done","missing":[]}`. Nothing was started, nothing is pending, and
the taken request exists only as the string `taken measles-where-2024` in a dotfile no later phase
reads. A journalist who took the offer at its word believes a second beat is under way.

## Found at production

**Nothing compares the DELIVERED mp4's last frame with the still that was approved.** The render
ladder's rung 2a renders the composition's final frame to PNG and the beat is reviewed on it; rung
2b then encodes 240 frames to H.264. The two are different pictures and no check reads them
together.

Measured on this beat, still versus `ffmpeg`-extracted frame 239:

    comparePngBuffers -> same: false, 85 850 / 1 166 400 pixels (7.36%) over tolerance 6
    mean absolute channel difference 1.77/255, max 95, 0.059% of channels off by more than 32

Here it is ordinary codec loss at type edges and the picture is the same one. The point is that
nothing measured that: a CRF change, a scale filter or a pixel-format change would land the same
way, and the artifact the newsroom receives would differ from the artifact that was approved with
nothing in the ladder noticing. `compare-png.mjs` already exists in this skill and decides
exactly this question on decoded pixels.
