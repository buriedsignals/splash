# Evaluation results — stock Gemma 4 12B on the Splash Pi harness

Measured on the target machine (Apple M2 Max, 32 GB; llama.cpp, Gemma 4 12B Q4_K_M + mmproj, one 96k slot),
scripted journalist (`harness-pi/eval/sheets/`), production CLI (`harness-pi/eval/run-eval.ts`), scored from
disk (`harness-pi/eval/score.ts`). Raw lines: `harness-pi/eval/results/*.jsonl` (gitignored); kept sessions and
renders: `~/.splash-harness/kept-runs/`.

`completed` = every export delivered with its hand-over and both closing offers answered. `headline` = the
delivered render opens with the journalist's takeaway word for word (read from the SVG).

## Consistency batch — 2026-10-25, harness at `263840b15`…`0c3545160`

| Story | Held out | Completed | Headline | Gate refusals | Wall clock | Storyboard | Craft |
|---|---|---|---|---|---|---|---|
| r8-chart-static-german-road-deaths-by-mode | yes | ✅ | ✅ | 5 | 20.5 min | 7.4 min | 9.1 min |
| stress-q-safety-incidents | no | ✅ | ✅ | 4 | 12.6 min | 7.6 min | 2.3 min |
| stress-ad-polish-hospital-beds | no | ✅ | ✅ | 11 | 16.6 min | 6.8 min | 6.7 min |
| stress-p-transport-ridership | no | ✅ | ✅ | 4 | 12.1 min | 6.6 min | 2.6 min |

4/4 completed, 62 minutes for the batch (15.5 min per story on average).

## Second pass — 2026-10-25 21:29–22:29, harness up to `c31672262`

| Story | Completed | Headline | Gate refusals | Wall clock | Storyboard | Craft |
|---|---|---|---|---|---|---|
| r8-chart-static-german-road-deaths-by-mode (held out) | ✅ | ✅ | 2 | 17.1 min | 8.0 min | 4.9 min |
| stress-q-safety-incidents | ✅ | ✅ | 8 | 12.4 min | 7.7 min | 1.9 min |
| stress-ad-polish-hospital-beds | ✅ | ✅ | 3 | 14.7 min | 5.7 min | 5.8 min |
| stress-p-transport-ridership | ✅ | ✅ | 6 | 15.5 min | 10.1 min | 1.8 min |

4/4 again, 60 minutes. **Across both passes: 8/8 completed with the takeaway as headline.**

Renders looked at: r8 drew a true line (the journalist asked for Line; the earlier substitution is fixed),
36 → 214 with the 2015 level marked. The Polish ranking was right but every bar read "0,004"; the bar kit now
refuses sub-0.1 values and labels that collapse distinct values (`cc624c98d`). Re-measured on a ninth run
(completed, headline faithful, 3 refusals): beds per 1,000 residents, labels 4,05 / 4,02 / 3,88 …, Mazowieckie
third and accented — though the base "per 1,000" is not printed. (Its wall clock is not comparable: the Mac
went into low-battery sleep for 2.5 h mid-run.)

## What the renders show (first pass) (looked at, not inferred)

- **r8 (held out):** the all-areas pedelec series from the table, 36 (2015) → 214 (2025), takeaway as title,
  the journalist's limits as standfirst, dated Destatis credit. The 12B chose an area treatment after telling
  the journalist Line was not available (false; fixed since in `7692e0dd6`), and the area kit's cumulative-share
  annotation ("2016–2025 · 95 %") is honest but not the journalist's claim.
- **safety incidents:** incidents per 100,000 residents, Sul 233 accented above Centro 205 — proves the claim.
- **Polish beds:** beds per resident ranked, Mazowieckie third and accented behind Śląskie and Łódzkie — proves
  the claim; values printed per resident (0.0039) rather than per 10,000 (contract fixed in `0c3545160`).
- **Portuguese transport:** Lisboa 214 accented, bracket "The other five together: 180 million" — proves the claim.

## Known limits

- **Arabic:** Splash's typeface ladders (`shared/design-base/resolve-families.mjs`) hold no Arabic-capable family,
  so `stress-x-tunisian-water` cannot render a static chart with any model. Splash limit, not fixed here.
- **Measure-level fidelity** (drawing a computed rate rather than a raw column) is guarded only when the headline
  carries figures or the claim names a column; otherwise it rests on the contracts and the craft prompt.
- **Scripted journalist** approves every render; `headline` and the looked-at renders above are the quality check.
- **Variance:** one run per story in this batch. Earlier runs of the same stories on earlier harness revisions
  stalled or drew wrong series; the fixes are in `git log`.

## Release rule (R20)

`releaseDecision` (score.ts) compares completions with a faithful headline, then gate refusals; a tie ships stock.
No tuned model exists yet: teacher gold generation (`eval/teacher.ts`) and training (`training/pod/`) are
spend-gated and have not run.

## First map — 2026-10-26, harness `7037e62df`…`52299a98d`

| Story | Format | Completed | Headline | Gate refusals | Wall clock | Storyboard | Craft |
|---|---|---|---|---|---|---|---|
| stress-t-europe-recycling (Choropleth) | static | ✅ | ❌ (shorter form) | 7 | 17.2 min | 8.5 min | 4.8 min |

- First attempt failed in craft: the 12B wrote beat.mjs's content, then degenerated on the `path` argument after it
  (`{"path":{"path":…` to the token cap). The craft step's write tools now take no path (`7037e62df`).
- Render looked at: the eleven reporting countries in classes, Germany darkest, Macedonia ringed and named, the
  misspelt "Belgiumm" and "Holland" joined through `rename` by the 12B after the join refused them. Defects found
  and fixed in the kit since: no class key (the key treatments apply from 20 cells, a grid threshold;
  `52299a98d`) and the MapTiler/OSM attribution replaced by the journalist's credit (`applyStoryboard`'s
  `basemap`).
- Headline: the plate prints the 12B's shorter form ("Germany has the highest rate (67.8%) vs Macedonia (18.4%).").
  The 171-character takeaway does not fit four lines of the headline register even at the widest panel, and the
  map kit's ladder shortens the headline rather than shrink the map — measured by re-rendering the 12B's beat
  with a short standfirst form added. Faithful to the figures, not word for word.
- Still open: countries absent from the data are drawn as plain land while the key's "no data" swatch is grey.

## First web run — 2026-10-26, harness up to `1c32c8e1d`

| Story | Format | Completed | Headline | Gate refusals | Wall clock | Storyboard | Craft |
|---|---|---|---|---|---|---|---|
| stress-p-transport-ridership (Bar and column) | web | ✅ | ✅ | 14 | 23.1 min | 17.3 min | 2.0 min |

- Fourth attempt. The three before it stopped on harness defects, each fixed: the web bar kit refused a
  leader nothing below it reaches (`09bbd7863`); the 12B passed "interactive web" as the format code, then
  switched the slot to a map nobody asked for (`9a49ea093`); the medium refusal did not say to ask
  (`1c32c8e1d`). A size recorded before the format was known is now dropped for web/scrolly slots
  (`008aac256`, after this run).
- Page looked at: the takeaway as headline word for word, the journalist's limits as standfirst, Lisboa
  accented, the stack control offering all six cities; verify-web passed on the delivered page.
- Storyboard dominates the wall clock (17 of 23 minutes) — the format and size gates of a web slot.

## Web choropleth — 2026-10-26, four attempts, not completed

| Story | Format | Completed | Attempts | 12B time | Furthest reached |
|---|---|---|---|---|---|
| stress-t-europe-recycling (Choropleth) | web (live MapTiler map) | ❌ | 4 | ~2 h 40 | craft: classing and join refusals |

The storyboard closed every time (6–14 min). The craft never produced a page. Each attempt surfaced a harness
refusal the 12B could not act on, fixed in turn: numbers read as country names (`3d5ec97be`), a missing field or no
default export (`40bb92202`, `ef5f07c22`), `iso3Of` read by name (`6fa288512`), an empty class and the extremes
given as class limits (`ed140a44c`, `379cc152d`). On the fourth attempt every refusal named what to change, and the
12B still cycled between known errors (a variable declared twice, the misspelt "Belgiumm" handled after the call
that refuses it, named exports), editing a 4 KB `beat.mjs` in small pieces.

Reading: the web choropleth's contract — four classing rules each with words and a note function, the join, the
missing-value sentence — is past what the stock 12B holds across edits; the static choropleth (one rule, no
control) completed. This is the case the tuned model is for: the teacher's gold `beat.mjs` for this kit is the
training example the stock model lacks.

## First video run — 2026-10-26

| Story | Format | Completed | Headline | Gate refusals | Wall clock | Storyboard | Craft |
|---|---|---|---|---|---|---|---|
| stress-v-top-emitters (Bar and column) | video | ✅ | ✅ | 6 | 19.6 min | 7.3 min | 8.6 min |

- A story shaped like the bar video's choreography (China against the next five together, OWID 2024): the video
  kits keep their worked example's gesture, which fits data of that shape only.
- The 12B's own `check()` first summed regional aggregates (102.6 Gt for "the next five"), refused itself, and
  fixed the selection in the next attempt.
- Frames looked at, extracted from the mp4: the takeaway word for word on the title card; the next five stacked
  under China; the final ranking with the bracket "11,652,210,000 t" against China's "12,289,037,000 t", credit
  dated. Defect: values printed to the tonne where the worked example reads "12,3 Gt" — the legibility guard now
  refuses labels of 8 digits or more and asks for millions or billions (after this run).

## Gesture composition probe (U10) — 2026-10-26, harness `366418348`

The 12B was given each story's takeaway, the journalist's subject and comparison answers, the rows the bar plate
draws and the draft static contract (`craft/static/bar-and-column.gestures/CONTRACT.md`), and asked for the
`gestures` field only; the gesture core validated, refusals went back in the same conversation (3 attempts,
20 min). No rendering. Script: `harness-pi/eval/probe-gestures.ts`; raw lines `eval/results/probe-gestures-*.jsonl`.

| Story (runs as in the 9/9 baseline) | Accepted | First try | Attempts | Time | Refusal chain | Takeaway staged |
|---|---|---|---|---|---|---|
| stress-p (Lisboa) #1 | ✅ | ✅ | 1 | 54 s | — | share (Lisboa of the whole) ✅, ratio to Porto ✅ |
| stress-p (Lisboa) #2 | ✅ | — | 2 | 62 s | `gestures[0].mark` | share ❌ (bracket on all six: the 394 total, not 214 of 394), ratio ✅ |
| stress-q #1 | ✅ | — | 2 | 72 s | `gestures[2].note` | Sul against Centro ✅ |
| stress-q #2 | ✅ | — | 3 | 139 s | `gestures[0].mark` → `gestures[4].note` | Sul against Centro ✅ |
| stress-ad #1 | ✅ | ✅ | 1 | 52 s | — | Mazowieckie against Śląskie and Łódzkie ✅ |
| stress-ad #2 | ✅ | — | 2 | 108 s | `gestures[0].mark` | ✅ |
| stress-ad #3 | ✅ | ✅ | 1 | 50 s | — | ✅ |
| stress-v (China) | ✅ | ✅ | 1 | 48 s | — | China against the next five together ✅ |

**Stop condition: not fired.** The 12B composed an admissible list for Lisboa within budget in both runs, and every
refusal it met was fixed in the next attempt. Staging differs between runs and stories (Lisboa #1 highlight →
bracket → compare; stress-q #2 filter → reorder → highlight → compare → annotate → pull back; China filter →
highlight → bracket → compare).

What the probe showed the core does not yet check:
- **Superlatives.** stress-q #1 annotated Centro "Highest rate (205)": the figure is Centro's, the claim is false
  (Sul is highest at 233; Centro has the highest raw count). The core checks a note's numbers, not words like
  "highest", "lowest", "third". Added after the probe (see the commit following this one).
- **Note language.** The Polish story's notes came in English. The contract must state the story's language; the
  kit (U4) carries it as the static kits do.
- Lisboa #2 shows a share half can be dropped while still passing: the core accepts any claim-touching list; it does
  not require every half of the takeaway. Judged at U11/U9 on the render (KTD11), not refused here.

## Gesture kits, static and video end-to-end gate (U11) — 2026-10-27

Gesture kits only: `SPLASH_GESTURES_STATIC=1`, fallback off (`SPLASH_GESTURE_FALLBACK=0`), repair on (Rémy: the gesture
kit must never fail; a repaired run would be reported apart — none was needed).

| Story | Format | Completed | Headline | Refusals | Wall clock | Craft | Gestures the 12B composed | Repairs |
|---|---|---|---|---|---|---|---|---|
| stress-p (Lisboa) | static | ✅ | ✅ | 3 | 12.4 min | 1.6 min | highlight Lisboa → bracket Lisboa of the whole "214 of 394 million" → compare Lisboa/Porto "more than twice Porto's 96 million" | 0 |
| stress-p (Lisboa) | video | ✅ | ✅ | 1 | 17.1 min | 2.7 min | highlight Lisboa → compare Lisboa/Porto → bracket Lisboa of the whole | 0 |
| stress-v (China) | video | ✅ | ✅ | 4 | 27.8 min | 15.0 min | highlight China → compare China against the next five "China (12289.0) vs. next five (11652.2)" → pull back | 0 |

**Gate: passed.** Every run delivered with the takeaway as headline through the gesture kit; Lisboa reached `done` in
video for the first time (the per-type bar video refuses it at every `drawCount`). Judged on the renders (KTD11):
- Lisboa static and video draw both halves of the takeaway, the share of the whole and the Porto ratio; the 12B
  ordered them differently in the two formats.
- China's comparison is right, but the 12B's rows kept OWID aggregates: "Africa (GCP)" is drawn among the countries,
  between Russia and Japan, and the remainder reads "7 / 222". A defect of data selection, not of a gesture. Fixed
  after the run: `assertNoAggregates` (guards.mjs) refuses a drawn row whose three-letter code column is not a
  country code; both gesture kits call it. To re-run in U9.
- Fixed during the gate: the core read a note's figure glued to its unit ("12.289037Gt") as "12" and refused it
  with a broken fix (first China attempt stopped and restarted on `719828cf0`).

## Gesture kits, full measurement (U9) — 2026-10-27/28

All four gesture kits on the local 12B (port 8091), fallback off (`SPLASH_GESTURE_FALLBACK=0`), static gesture kit on
(`SPLASH_GESTURES_STATIC=1`), one run at a time. Every render below was looked at: scrolly cards, the web page at rest
and its controls, frames taken from the mp4 for video. KTD11: `done`, headline faithful, every drawn gesture states the
takeaway's entity or one of its figures, and (as applied here) nothing drawn is false or misleading.

U9 ran in two parts. The **working pass** stopped at each defect a run showed, fixed it with a test that fails when the
fix is removed, and re-ran (17 runs, 14 commits `6fdb27744`…`83f980f64`). The **clean pass** then ran the measured set
once on the frozen kit `83f980f64`, with no change in between.

### Clean pass on `83f980f64` (the measurement)

| Story | Format | Completed | Headline | KTD11 (looked at) | Wall | Craft | Gestures the 12B composed | Repairs |
|---|---|---|---|---|---|---|---|---|
| China | scrolly | ✅ | ✅ | ✅ bracket over the five (11,652M), China 12,289M accented; the compare is China against the United States only | 21.8 min | 10.1 min | highlight → bracket the five → compare → pull-back | **5** (counted apart) |
| Lisboa | static | ✅ | ✅ | ⚠️ true, but the plate prints "more than twice Porto's `${96}` million" | 14.1 min | 1.4 min | highlight → bracket of whole "214 of 394 million" → compare Porto | 0 |
| Lisboa | static | ✅ | ✅ | ✅ | 11.5 min | 1.4 min | highlight → bracket of whole "214 of 394" → compare Porto "more than twice Porto's 96 million" | 0 |
| stress-q | static | ✅ | ✅ | ❌ a reference rule at 412 (Centro's raw count) across the per-100,000 axis | 16.7 min | 5.8 min | highlight → annotate "233 per 100,000" → compare Centro → reference 412 → filter → pull-back | 0 |
| stress-q | static | ✅ | ✅ | ✅ "raw count (412)" as a note on Centro | 12.2 min | 2.8 min | highlight → name "233 per 100,000" → compare Centro → annotate Centro | 0 |
| stress-ad | static | ✅ | ✅ | ✅ "o 13,25 punktu mniej niż Łódzkie" (the true gap) | 21.5 min | 9.0 min | highlight → compare Łódzkie | 0 |
| stress-ad | static | ❌ craft | — | — | 23.2 min | 13.1 min | (the 12B's text crashed the renderer, then its `format()` collapsed the labels, six attempts) | — |
| stress-ad | static | ✅ | ✅ | ⚠️ true, but "Suma: 3023" is a sum of per-100,000 rates | 14.0 min | 4.2 min | highlight → name "3. miejsce" → compare Śląskie → bracket of whole → filter top 3 → pull-back | 0 |

**Static bar runs: 6/7 completed, 3/7 pass KTD11 strictly, 5/7 counting the two ⚠️.**

### The baseline, re-judged under the same rule (per-type kit, 2026-10-25)

| Run | Verdict | Looked at |
|---|---|---|
| stress-q 17:58 | ✅ | Sul 233 accented |
| stress-ad 18:28 | ❌ | draws raw beds: Mazowieckie first, where the takeaway says third per resident |
| stress-p 18:43 | ✅ | bracket "The other five together: 180 million" |
| stress-q 21:46 | ✅ | Sul 233 accented |
| stress-ad 21:59 | ❌ | every label "0,004" |
| stress-p 22:13 | ✅ | bracket "Total trips of the next five: 180" |
| stress-ad 22:29 | ✅ | per 1,000, Mazowieckie third accented ("per 1,000" not printed) |

**5/7 under KTD11** (the "9/9" counted completion and headline only). The baseline draws one or two gestures per plate;
the gesture kit draws three to six, and every defect it showed came from one of those extra gestures.

### Working pass (stopped and fixed as it went)

| Story | Format | Kit | Outcome | What the render or log showed |
|---|---|---|---|---|
| Lisboa | web | `dbc0cb7d0` | ✅ (superseded) | `beat.mjs` typed its rows after three crashes on `data.json` |
| Lisboa | web | `6fdb27744` | ✅ ✅ | controls 214/394 and 214/96 |
| Lisboa | scrolly | `6fdb27744` | ✅ ❌ | no highlight → every bar grey; pull-back card said nothing of the takeaway |
| Lisboa | scrolly | `df3ed5129` | ✅ ✅ | Lisboa accented on every card |
| China | scrolly | — | ❌ storyboard | twelve turns of talk, `record_slot` never called |
| China | video | `d1eb9dfff` | ✅ ✅ | no aggregate drawn (the U11 defect); others drawn in a light accent (fixed) |
| Lisboa | static ×2 | `d1eb9dfff` | ✅ ✅ ×2 | |
| stress-q | static | old | stopped | a true note (412, another column) refused, and the fix offered was false |
| stress-q | static | `f6730bef7` | ❌ craft | read `stories/stress_q_…` six times over |
| stress-ad | static | `f6730bef7` | ✅ ❌ | "13% fewer" drawn; the gap is 3.3 % |
| stress-ad | static | `17a7a4e39` | ✅ ⚠️ | two copies and three notes on one row |
| stress-ad | static | — | ❌ storyboard | the journalist's off-menu choice looped ten turns |
| China | scrolly | `df3ed5129` | ❌ craft | five names in one string → a chain of false fixes |
| stress-q | static | `da67f9756` | ✅ ✅ | "28 more", "raw count: 412" |
| stress-ad | static | `da67f9756` | ✅ ✅ | two accents (the regions ahead), subject grey |
| China | scrolly | → `210e2b07d` | ✅ ❌ | shipped "12,289.037 more than the 11,652.21" |
| China | "scrolly" | `210e2b07d` | ✅ ❌ | moved to web on a "Yes."; repair delivered "12,289,037,000 … is more than the 12,289,037,000 … of the next five" |

### Fixes, each with a test that fails when it is removed

| Commit | Defect | Fix |
|---|---|---|
| `6fdb27744` | typed rows after `data.json` load errors | load error answered with `data.json`'s shape; typed rows refused |
| `d1eb9dfff` | subject grey without a highlight; empty pull-back card | subject accented when no highlight (4 formats); a figureless card carries the takeaway |
| `52e59e8d2` | storyboard silent, no slot | 3 silent turns with no slot → ask for `record_slot` field by field |
| `f42f1838f` | video's other rows in a light accent; Kosovo as an aggregate | neutral rows; `OWID_KOS` accepted |
| `f6730bef7` | a true figure from another column refused, false fix offered | `rowFacts`; a value printed once |
| `17a7a4e39` | story folder misspelt | `_` for `-` resolves; refusal names the folder |
| `585274378` | "13% fewer" passed as a share | a compare's percent is its gap |
| `df3ed5129` | crowded row | one note, one copy per row on a still plate |
| `da67f9756` | off-menu choice looped | harness records the journalist's catalogue type |
| `4b042f5af` | rows in one string; "(12B)" loop | listed rows read as rows; magnitude suffixes |
| `3bef31b03` | fixes swapping one false figure for another | fixes offer only what the gesture draws; far → note dropped |
| `210e2b07d` | "60% more" for 151 % more; bracket on one row under a card naming five | direction from the note's word; bracket rows from its words |
| `444b1c607` | "12,289.037 more than the 11,652.21"; grouped decimals misread | a figure stated as a gap is the gap; grouped decimals read |
| `83f980f64` | journalist moved off scrolly; repair printed China's total as the five's | the journalist's format kept; true figures of other rows never swapped in |
| `9205a3490` | (after the clean pass, not measured) `${96}` printed; a list in `mark`; a rule at another column's figure; a number crashing the still renderer | words coerced and `${x}` unwrapped; `mark: [..]` read as marks; such a rule refused |

### Success Criteria

- **Lisboa in all four formats through the gesture kit — met.** static (clean pass, U11), video (U11), web, scrolly:
  `done`, headline faithful, the share (214 of 394) and the Porto ratio drawn.
- **China in video and scrolly — met, scrolly only with repair.** Video without repair (no aggregate drawn). Scrolly
  reached `done` once in the clean pass, after five repairs, with true text; its four earlier scrolly runs failed
  (storyboard, craft, a false card, a move to web).
- **The 7 static bar runs re-pass under KTD11 — not met.** 3/7 strictly (5/7 with the two ⚠️), against 5/7 for the
  re-judged baseline. The static default stays the per-type kit.
- **Two stories of one type get different staging — met.** Lisboa: share bracket and Porto compare. stress-q: a name,
  a compare, the raw count from a second column. stress-ad: the third place named, the regions ahead filtered. China:
  the next five bracketed, then compared.

### Open, for Rémy

1. **A bracket "of the whole" over rates** prints a sum of rates ("Suma: 3023") or a share of it; seen three times.
   Refuse it when the measure is a rate? The kit cannot tell a rate from a count without the unit.
2. **One accent:** two highlights left the subject grey (stress-ad). Keep the subject always accented?
3. **Words are checked through their numbers only.** A true figure under a false label passes; rank words are
   checked in English only.
4. **Repair delivers, but rarely and riskily.** Two repaired deliveries: the first (old kit) printed a false note, the
   second (clean pass) was true. Repair stays on; its fixes no longer invent a figure, but the evidence is one run.
5. **Label collapse is still a refusal** ("format() prints … as only … labels"): under the never-fail rule the kit
   should choose the decimals itself.
6. **The storyboard** cost three of the 17 working runs (silent slot, menu loop, a move off scrollytelling); fixed, not re-measured
   across many runs.

## Static re-measure after the review decisions — 2026-10-28

Rémy's decisions applied (`37e14c039`): the subject always accented, a bracket or count over a rate refused,
rank words in the stories' languages, decimals chosen by the kit. Measured with **seeded runs** (`--seeds`, the
storyboard of an earlier run laid in, `bb7ade813`) and **stopped at the craft render** (`SPLASH_STOP_AFTER_CRAFT=1`,
`af7f72971`): a run is 2–13 min instead of 12–24.

**First seeded pass** (`37e14c039`; delivery still on): Lisboa ✅ ✅, stress-q ⚠️ ✅, stress-ad ⚠️ (repaired) / seed
artefact (no `SUBJECTS.md`) / ❌ (the 12B rounded the rates to whole numbers: eight bars of 4). Each gesture-kit miss was a
kit defect, fixed: a plate's own note printed the raw value ("204.97512437810946"), an empty note counted as a note,
rows rounded until they tie were drawn, a note was read at ten times the drawn value (`02b954653`, `69b348265`).

**Second seeded pass** (`69b348265`…`a2ecb57c5`, stopped at the render):

| Story | Craft | KTD11 (looked at) | Gestures |
|---|---|---|---|
| Lisboa | 13.2 min | ✅ | highlight → bracket of whole "214 of 394 million" → compare Porto |
| Lisboa | 1.8 min | ✅ | the same three |
| stress-q | 4.0 min | ✅ | highlight Sul → compare Centro "233 vs Centro's 205" → annotate Centro "Highest raw count (412)" |
| stress-q | 2.6 min | ✅ | the same three |
| stress-ad | 8.0 min | ✅ | highlight → compare Śląskie "Śląskie wyprzedza Mazowieckie (405 vs 388)" → annotate Łódzkie "402" |
| stress-ad | 8.6 min | ⚠️ repaired (true; the note lost its unit) | highlight → compare Śląskie "o 1,62" |
| stress-ad | 38.3 min | ✅ | highlight → annotate "Najwięcej łóżek w liczbie bezwzględnej" → compare Śląskie |

**6/7 pass KTD11 without repair, 7/7 true**, against **5/7** for the per-type baseline re-judged under the same rule.
Fixed after the pass (`b1afbc011`): a unit base after "na"/"per" ("na 10 tys.") was read as a figure; a check()
refusal now says an inverted condition may be the cause (the 38-minute run lost three attempts to one).
