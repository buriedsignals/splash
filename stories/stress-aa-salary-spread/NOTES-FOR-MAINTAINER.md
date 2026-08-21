# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

A prose row ceiling never reaches the machine, so a beeswarm was offered on 234 points.

`chart-beat/references/types/beeswarm.md` refuses "past roughly a hundred and fifty points". The generator
that turns sheets into `storyboard/references/type-survey.md` only catches a stated count when it is phrased
"fewer/more than <number-word> <unit>" (`scripts/type-survey.mjs`, STATED_COUNT_RE), and "Past roughly a
hundred and fifty points" matches neither the verb nor the number word. So the survey row records
`refuses when: —`, `formatCandidates` has no rows limit to throw on, and the candidate menu rendered
Beeswarm for a 240-row table with no warning at all. `recommendVisualChoice` ranked it 3rd of 32.
The refusal was applied by hand in STORYBOARD.md.

## Found at storyboard

Three type-sheet refusals are truncated mid-clause in the generated survey.

`REFUSAL_FLAT_RE` in `scripts/type-survey.mjs` ends its non-greedy body at `(?:\r?\n\s*\r?\n|$)` under the
`/m` flag, so the `$` matches an end of LINE and the match stops at the sheet's first line break. Reproduce
by scanning `references/type-survey.md` for refusal cells with no terminal punctuation: Heatmap ("...and a
bar's length is"), Histogram ("...because the bins are contiguous") and Waterfall ("...a set of
independent"). Every candidate menu that offers one of those three prints the fragment to the journalist as
that sheet's own words.

## Found at storyboard

The grounding check has no shape for a distribution claim, and no reading of the two profile facts a distribution beat is about.

`resolveGrounding` over "Most people here earn far less than the average." returns `unverifiable` with
"0 produced a claim of any kind" — no shape for a central-tendency or spread claim, although the median,
the mean and the share below the mean are all computable from the frozen CSV the function already reads.
Three further readings a distribution takeaway needs, all missing:
1. `profile.rowCount` is never a numeral's home. "the 240 employees" comes back "could not be placed in
   the column this sentence names" although 240 IS `rowCount`, stated in `source/profile.json`.
2. `column.missing` is never a numeral's home either. "six returns were blank" cannot be placed against
   `annual_salary_eur.missing: 6`.
3. A numeral equal to a column's `min` or `max` is only `consistent`. "The highest is 238530" — exactly
   `annual_salary_eur.max` — comes back "within the range ... that places the numeral, it does not confirm
   the claim". `sum` is the one exact-match reading that stays `supported`; `min` and `max` sit on the same
   profile and are not read the same way.
Consequence: no takeaway a distribution beat could honestly carry can ever reach `supported`.

## Found at storyboard

Thousands separators: a journalist's own way of writing a number degrades or invents claims.

Same frozen table, three spellings of one figure:
  "31,420" -> unverifiable, "ambiguous — could be a thousands-grouped number or a decimal comma"
  "31 420" -> TWO claims, 31 and 420, each put to annual_salary_eur and each unplaceable
  "31420"  -> placed, consistent
The comma case is refused rather than tried both ways, although MULTIPLIER_WORDS sets the opposite
precedent one paragraph away: a stated scale word is read BOTH as written and multiplied, and the detail
says which reading placed it. The space case is worse than a refusal — it manufactures two numbers the
sentence never stated. The space is the standard French and SI group separator, and LEXICON_LANGUAGES
declares French.

## Found at storyboard

The only two data-shape requirements that consult a row count read the wrong count, at a floor of five.

`requirementFinding` (`storyboard/scripts/propose.mjs`) scores `raw-observations` and `distribution` as
`numeric && atLeast(5)` against `profile.rowCount`. Two measured consequences:
- A SIX-row table satisfies `distribution` with zero unresolved requirements and gets Histogram offered.
  The histogram sheet's own working default is the range in about ten bins.
- A profile of 240 rows whose measure column records `missing: 235` still reports
  "distribution: 240 profiled row(s) with a measure to read". Five observations, described as 240.
  `column.missing` is on the same profile object the function is already holding.

## Found at production

`framingMeasurement` cannot read a histogram's own marks.

On the 234 salaries it answers usefully — spreadAgainstExtent 0.939, largestAgainstMedian 7.59, which is
the outlier reading this beat was reconsidered from. On the 46 bin COUNTS, which are what the beat actually
draws, it returns `largestAgainstMedian: null`: the median bin count is 0 and the function guards on
`median > 0`. A right-skewed distribution has more empty bins than full ones by construction, so this
reading is undefined for every histogram there will ever be, not just this one. Same guard, same line, as
round five's V1 finding about a series crossing zero (`stories/stress-v-regional-migration`); that report
named the signed case and the guard is unchanged.

## Found at production

A custom beat cannot reach `creditLine`, so the "unattributed" fix does not cover the custom static path.

`creditLine`/`isUnattributedCredit` live in `storyboard/scripts/storyboard.mjs` and are copied byte for byte
into `deliver/scripts/format-handover.mjs` and `dw-beat/scripts/metadata-spec.mjs`. A beat component may not
import across a skill boundary, and nothing is vendored under `shared/`: grepping `shared/`,
`skills/chart-beat/` and `skills/splash/assets/root-template/` for creditLine, isUnattributedCredit or
UNATTRIBUTED returns nothing. So every custom beat retypes "Source: not stated" as a literal in its own
render script — `stories/stress-w-quay-photographs` already does — and the one rule whose whole point is
that the recorded word must never print under a chart is enforced everywhere except where the chart is
drawn.

## Found at production

`frameFillFraction` is not wired to any producing path.

Grepping `skills/chart-beat/` for frameFillFraction reaches its definition in
`scripts/detect-fills-its-frame.mjs` and `test/frame-fills-window.test.ts`, and nothing else — no render
script, no producer, no CLI. It reads a delivered PNG's own pixels, which is exactly the "reads static
output" case `guard-wired-to-run` says is called from the skill's own render script. This beat called it by
hand (0.777 against a 0.3515 floor).

## Found at production

Nothing measures x-tick collisions, and the first render of this beat shipped one.

`tickStep` returns a 20 000 interval for a 10 000-240 000 span, so its first tick sat one bin from the
domain's own floor label and the two centred text runs overlapped into "10,00 20,000" in the delivered PNG.
`assertTypeFloor`, `assertWithinStage`, `assertDeliveredSize`, `inspectSvg` and the annotation-ink walker
all passed that frame. `measureText` and `measureTextBand` are already in `shared/chart-beat`, and the
carbon histogram already de-collides its median LABEL against the bars with them — the same measurement is
never applied to the axis's own row of labels. Fixed inside this beat only.

## Found at production

On a dark ground with a light accent, no rule can cross both. The refusal is right and there is no helper for the answer.

`inkThatReadsOver(["#16191B", "#D4A853"], 3)` throws: black reaches 1.19:1 on the ground, white 2.20:1 on
the accent, "move it onto one of them." Correct, and it is the ordinary case for any newsroom whose ground
is dark and whose accent is legible on it — a median rule on a histogram, a reference line on a bar chart.
The answer this beat wrote by hand is a rule drawn as two segments, each inked against the one background
it has, computed from `marksUnder`. Nothing in `annotation-ink.mjs` offers that; the carbon histogram
avoided the problem by dropping its accent entirely, which is a different beat, not a reusable answer.

## Found at delivery

The closing offer tells the journalist to say a word the recorder refuses.

`formatAnotherFormatOffer` and `formatSubjectOffer` both end "Name one, or say you are done — both are an
answer". `recordFormatAnswer`/`recordSubjectAnswer` accept only "declined" or "taken" and throw
'an answer is "declined" or "taken" — got "done"' on the word their own printed offer asked for.

## Found at preflight

`runPreflight({root})` throws instead of reading the environment.

`splash/SKILL.md` says to run `runPreflight`; its signature is `{root, env, fetchFn}` with no default for
`env`, so a caller who omits it gets "TypeError: undefined is not an object (evaluating 'env[canonical]')"
from `resolveEnvKey` — a stack trace two files away from the call, on the first call of the session.
`fetchFn` defaults; `env` does not.

## Found at delivery

`writeOutputReview` computes draftDigest for the record and demands the caller compute the identical value for every qaRun.

It calls `renderDigest(beatDir)` itself for the record's own `draftDigest`, then `validateOutputReview`
refuses `qaRuns[0].draftDigest` unless the caller passed the same string. `renderDigest` is exported, so it
is recoverable — but nothing in `splash/SKILL.md`'s G3 row, which names `writeOutputReview` as the way to
write this record, says the caller has to call it first.
