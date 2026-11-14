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

## Phase 2 — every family, lean seeded measurement (2026-10-27/28)

Gemma 4 12B Q4_K_M on the local llama-server, seeded runs (`eval/seed-matrix.ts --lean --run`, storyboard laid in,
stopped at the craft render, fallback off). For each family, its first type in static plus one more format chosen by
rotation, and the proportional symbol map in static. A run ends at 15 min. Pass = a render that every guard and the
gesture core accept (the KTD11 rule without the human judgment of the plate; plates looked at: beeswarm, calendar
heatmap). Raw lines: `results/2026-10-27-phase2.jsonl`, `results/2026-10-28-phase2-reruns.jsonl`.

**18/27 pass.** Six failures in the first pass were our own defects. Each was fixed, then its run was re-run:

| defect | fix |
|---|---|
| marks written as `{ t: 1988 }`, fixed one entry per refusal (area looped 40 min) | `3446735a1` |
| an area of readings the 12B added up itself | `987eded77` |
| 24 seeds' claim fields failed G1 (invented shapes) | `39083b316` |
| a gantt row with no run inside the axis was refused (never-fail rule) | `b8fd8e92c` |
| video seeds lost their size; a profile beat keyed by columns got "undefined" as its fix | `d2ca6cc4e` |
| the proportional symbol run had no MAPTILER_KEY | environment |

Every other failure was a model error, and in each case the core's refusal was the correct one:
- cartogram static: false threshold note, then highlighted the wrong country;
- connected-scatter static: derived weight miscomputed;
- connected-scatter scrolly: rows in the wrong shape;
- marimekko static: a note figure not drawn;
- small-multiples static: `check` missing;
- small-multiples web: inverted check;
- bullet static: the French takeaway's "Pologne" against the data's "Poland";
- bullet scrolly: wrong series;
- gantt static: no render in 15 min.

Also fixed along the way:
- a Position filter now rings every row it keeps (`80715f726`);
- a `check()` that prints the same decimal twice is asked for a tolerance (`e15c170b3`).

**Decision:** the families that failed every format they were measured in (xy, multiples, paired) go back to their
per-type kits by default (`MEASURED_OFF`). The other 11 families, including length, keep gesture kits as the default
in all four formats.

**Limits:**
- one type per family and one run per cell, so a family's other types are covered by unit tests and hand renders only;
- paired's two failures are model errors against a sound kit, so it is a candidate to re-measure on another type
  (lollipop) before it is turned off for good;
- six geo map video kits are built but were never rendered as mp4;
- left open: the Inde/Chine compare note sits far from its bracket (beeswarm), and the calendar heatmap draws its
  compare connector across the whole grid.

## Phase 2, second pass — after the free harness fixes (2026-10-28)

The same lean matrix plus the proportional symbol map, `SPLASH_GESTURES_ALL=1` so xy, multiples and paired run on
their gesture kits as in the first pass. Fixes in force:
- output cap `1b7ce2115`;
- fold at 20,480 tokens, keeping 4,000, with last-turn narrowing `867073f69`;
- `record_gestures` `2d18ba340` / `18b3bcab8`;
- `check()` in code `4fff9fc89`;
- strict title figures `56ddea02c`.

The pass exposed three defects of the new tool, fixed mid-pass (`c12f2057e`, `38693db00`, `1cc175a8f`):
- a set could not be given as one mark;
- composed names were not known;
- recording re-rendered pages and videos, which cost minutes per call.

The 17 cells those defects distorted were re-run; their last run counts. Raw results:
- `results/2026-10-28-phase2.jsonl`;
- `results/2026-10-28-phase2b-reruns.jsonl`.

| | first pass | second pass |
|---|---|---|
| static | 8/14 | **10/14** — gained bullet, cartogram, small-multiples, gantt; lost calendar heatmap, proportional symbol |
| web, video, scrolly | 10/13 | **5/13** — kept beeswarm video, cartogram video, gantt video, marimekko web; gained small-multiples web |
| total | 18/27 | 15/27 |

The new failures in web, video and scrolly come from the typed tool's extra step: write `beat.mjs`, record the
gestures, render.
- **Area web:** the 12B never recorded its gestures (refused: `missing gestures`).
- **Histogram and sankey scrollys:** looped on one refusal.
- **Parallel-coordinates video:** a syntax error in `beat.mjs`.

**Decision (pre-made, G0):** keep `record_gestures` in static, where it gains, and give web, video and scrolly back their
inline `gestures`. Then re-measure those 13 cells before the thinking-on check.

## G0 — free-fix re-measure closed, thinking checked (2026-10-28)

**Animated formats after `4e87ddee9`.** Typed `record_gestures` is kept for stills only; pages, scrollys and videos write
their gestures inline. Re-measured: **6/13** (`results/2026-10-28-phase2c-animated*.jsonl`).
- **Passed:** beeswarm video, bullet scrolly, cartogram video, likert web, marimekko web, parallel-coordinates video.
- **Failed:** area web (data read), calendar web (note figure of other rows), connected-scatter scrolly (no render in
  time), gantt video (beat.mjs never written), histogram scrolly (code error), sankey scrolly (invented
  "Germany – Nuclear", the failure the typed tool stops in static), small-multiples web (note figure not drawn).

| | first pass | after the free fixes |
|---|---|---|
| static | 8/14 | **10/14** |
| web, video, scrolly | 10/13 | **6/13** |
| total | 18/27 | **16/27** |

Every failure is the 12B's, and the refusal named it. One run per cell, so a cell's result varies between passes:
- gantt video passed in pass 2 and failed in pass 3;
- bullet scrolly failed in pass 2 and passed in pass 3.

**Thinking on** (`SPLASH_THINKING=on`, llama-server `--reasoning-budget 400`): the 7 static cells checked, which all
passed with thinking off, went **0/7** (`results/2026-10-28-g0-thinking-on.jsonl`).
- **Failures:** beat.mjs never written (2), broken JavaScript (likert), wrong data read (bullet, sankey), a highlight
  off the takeaway (cartogram), the analyst's hash text read as data (histogram).
- **Stopped early:** the last 3 cells were stopped once the result was decided.

**Decision (KTD4):** thinking stays **off** for every arm (teacher, student, dataset). To report to Tom (his question 4).

## U11 — held-out set and stock baseline (2026-10-28/29)

Held-out stories (`training/heldout.json`, `d3e1d808c`):
- r8 and real-gwis, as before;
- three that the stock 12B fails, or passes only sometimes:
  - `gx-connected-scatter` (xy) and `gx-small-multiples` (multiples): both failed every format in the lean measurement;
  - `stress-t-europe-recycling` (web choropleth).

Stock 12B, full runs to delivery, shipped defaults (thinking off, gesture fallback on, xy, multiples and paired on
their per-type kits), 45-minute cap, **one run per story**. The two gx stories were re-run once after their sheets
gained the as-of date (`08abfe2a7`); their first runs stalled on `effectiveDate`, a defect in the sheets.

| story | result |
|---|---|
| r8 | ✅ delivered, headline faithful (35 min) |
| real-gwis | ❌ cap at craft (stacked area) |
| gx-connected-scatter | ❌ cap at craft; the last render refused by a guard |
| gx-small-multiples | ⚠️ delivered, **headline not faithful** |
| stress-t (web) | ❌ cap at craft (web choropleth) |

**Baseline: 1/5 faithful completions.** Raw: `results/2026-10-28-u11-baseline.jsonl`.

The plan asks for at least three runs per story. They are moved to U9, where both arms run on one RunPod pod at least
three times each (KTD8), because local full runs took 20–45 minutes apiece (Rémy, time). This single local run
confirms the selection.

## G1a — lean static matrix on the launch runner (2026-11-07, route `llama-server`, local 12B)

Runner aligned with Tom's launch (T1): window 65,536, fold 32,012, watchdog 16/12/6, thinking off. Same 14 static
cells as G0, one run each, 15 min cap, `SPLASH_GESTURE_FALLBACK=0`, gesture defaults as they stand (xy, multiples
and paired on their per-type kits — G0's second pass ran `SPLASH_GESTURES_ALL=1`). Pass = G0's rule: the last
render accepted by every guard and the gesture core, exit 0, no `NaN` in its output. Raw lines:
`results/2026-11-07-g1a-static.jsonl` (first attempt), `results/2026-11-07-g1a-static-r2.jsonl`.

**13/14, against G0's 10/14.** Gained calendar heatmap and proportional symbol (G0's two losses), kept the rest;
lost parallel coordinates (model error: `export const entities = entities;` after 18 writes, the load refusal named
it and the model never repaired it — a Tune candidate in `TUNE.md`).

The first attempt measured one cell and stopped, which produced three fixes:
- area looped 80 turns re-recording one gesture list with a `reference` drawn at `NaN`, and every accepted repeat
  reset the 12-turn bound (`4e885ef75`: a repeat is not progress unless a file was written since);
- a registry `ConnectionRefused` in `bun install` ended the matrix (`7953a9b58`: three attempts, a cell that cannot
  start is recorded and the matrix goes on);
- a `reference` with no value (`a237414d2` refused it; the 12B then resent the same list nine times and never
  rendered the cartogram, so `7cad760ab` reads the value from the note's figure in code, or drops the gesture).

**Limits:** `7cad760ab` landed mid-rerun; only small multiples and the cartogram re-run (650 s, pass, the re-run
counts) started on it, the other twelve ran on `a237414d2`. One run per cell.

## G1 — the lean matrix's web, video and scrolly cells (2026-11-07, route `llama-server`, local 12B)

Same runner and rules as G1a, `--further` (13 cells, one family each, formats by rotation). Raw lines:
`results/2026-11-07-g1-further.jsonl`, `results/2026-11-07-g1-further-fix.jsonl`. Pass = the model's last render
accepted (G0's rule); a cell the driver's repaired render (`SPLASH_GESTURE_REPAIR=1`, the core's own fixes) delivered
is counted apart, as in G0.

**7/13 by the model, 8/13 delivered (cartogram video repaired), against G0's 5/13** (G0 ran `SPLASH_GESTURES_ALL=1`;
xy, multiples and paired ran here on their per-type kits, so the comparison is indicative). Passed: area web, beeswarm
video, bullet scrolly, calendar heatmap web, marimekko web, parallel coordinates video, sankey scrolly.

| Failed cell | Owner | What |
|---|---|---|
| connected scatter scrolly | Harness → fixed | the kit refused the data's shape ("every entity's x fell"); card 3 is now left out instead. Re-run: the refusal is gone, the cell fails on the model's own `check()` repeated 5× (TUNE) |
| small multiples web | Harness → fixed | the kit refused 2 years ("needs at least 3"); two years now draw a slope per panel. Re-run: the refusal is gone, the cell fails on `announce()` lacking the option's label |
| gantt video | Tune (watch) | one generation ran 7,632+ tokens until the 15 min cap; output cap is Tom's 16,384 |
| histogram scrolly | model, cap | 15 renders, varied refusals and runtime errors (`counts["0–4"]` key with an en dash), cap reached before the driver's repair could run |
| diverging stacked bar web | model | ends on the web page verification (labels), not on gestures, so the repair does not apply |
| cartogram video | delivered by repair | the session ended on a refused note ("40,0 %" of a count); the repaired render passed |

**Limits:** one run per cell; the two fixes (`connected-scatter` scrolly and `small-multiples` web kits, never-fail
rule) were verified by re-running the cell — the refusal no longer occurs — not by a unit test: no test renders a
per-type kit. Three cells hit the 15 min cap (Rémy's bound), which also skips the driver's repair.

## G2 — T3 on the 26B-A4B, run locally (2026-11-07, route `llama-server`, `local26` arm)

Rémy chose the local 26B over OpenRouter for T3 (free, the Mac is the target): `ggml-org/gemma-4-26B-A4B-it-GGUF`
Q4_0 + mmproj Q8_0, same `serve/llama-server.sh` (64k, q8_0 KV, reasoning budget 400). Full runs to delivery, gesture
fallback off, **15 min cap** (Rémy's bound; U11's 12B baseline ran with 45 min), one run per story. $0 spent.
Gold gates: delivered, headline faithful, last render exit 0, no code repair, no fallback.

| story | 26B local (15 min) | 12B, U11 (45 min) |
|---|---|---|
| stress-p (Lisboa) static | ✅ gold, 8.6 min | ✅ |
| stress-t recycling, web map | ✅ gold, 10.6 min | ❌ |
| r8 static | ❌ cap at craft: refused "two readings for Pedelecs at 2025", data.json never filtered | ✅ |
| real-gwis static | ❌ cap at craft (stacked area) | ❌ |
| gx-connected-scatter (full sheet) | ❌ cap at craft: filtered to 1 entity, refused (3 to 20) | ❌ |
| gx-small-multiples (full sheet) | ❌ storyboard blocked by a harness defect (below); after the fix, cap at craft: low-carbon share computed as 0 for every panel, same refusal 7× | ⚠️ headline not faithful |

**2/6 gold** against the 12B's 1/5 on the held-out five (2 counting Lisboa). The storyboard takes 6–9 min on every
story and the 15 min cap stops four runs inside craft, so the craft misses are measured on 5–6 min of craft.

Misses by owner:
- **Harness (fixed, `77721b0e6`):** `record_claim` refused a correct `shape: "none"` six times because the
  journalist said "Aucune de ces formes"; ownership of a closed-list value now accepts the shape named in the
  journalist's language. Test fails without the fix. Re-run: the storyboard passes.
- **Operator (mine):** the first held-out pass gave the two gx stories the matrix's short sheets (no claim, intent or
  confirm answers), so the scripted journalist answered "I don't know." until the bounds; re-run on the `.full` sheets.
- **Model / cap:** r8, real-gwis, connected-scatter, small-multiples craft. Each refusal names the field and a value
  that works; whether the 26B repairs them given more than ~5 min is not measured.

### G2 addendum — the four capped stories re-run with a 30 min cap (2026-11-08)

| story | 26B, 30 min |
|---|---|
| real-gwis static | ✅ gold, 14.4 min (render exit 0, no repair, no fallback) |
| gx-connected-scatter (full) | ⚠️ delivered, render exit 0, headline not faithful. Replayed: `beat.mjs` gives the takeaway word for word as the title's first form (the `applyStoryboard` guard holds it), then two shorter forms in French although the storyboard says `language: en`; the plate's ladder took the second form ("headline 2"). With the takeaway as the only form the plate refuses: no rung leaves 84 px of plot with 16 names |
| r8 static | ❌ 30 min cap at craft: the plate still draws other columns' values (357, 347, 331) under the claim on `Getoetete_Pedelecs_ab_2014`; the refusal names the column every time |
| gx-small-multiples (full) | ❌ stopped at framing after 4.5 min: the 26B wrote "I've recorded your takeaway" four times without calling a record tool (the run before got past storyboard, so this is not deterministic) |

**3/6 gold** with 30 min where needed (Lisboa, recycling web map, real-gwis); the 12B's U11 baseline is 1/5 on the
held-out five. The cap explains one of four (real-gwis); the other three are not time.

Misses by owner:
- **Open question (doctrine vs gate):** the plate's ladder may shorten the headline (doctrine, `shared/chart-beat/type-at-size.mjs`), while the gold gate wants the takeaway drawn verbatim. The model's miss is the language of the shorter forms.
- **Model:** r8 (repair ignores a refusal naming the column), small-multiples (prose record claims, see TUNE.md).

## G3 — T4 model ladder, first rung: the 12B on the held-out five (2026-11-08)

Local 12B (`stock` arm, Q4_K_M), route `llama-server`, k=3, 30 min cap (the 26B's re-run bound), fallback off, $0.

| story | 12B, k=3 | 26B, k=1 (G2) |
|---|---|---|
| gx-connected-scatter (full) | ✅✅✅ gold | ⚠️ headline shortened in French |
| gx-small-multiples (full) | ✅ 1/3 (two delivered with the headline not drawn verbatim; one stopped in delivery after 12 turns without a record) | ❌ framing |
| stress-t recycling, web map | ❌❌❌ cap at craft: chart-web verification refused 3–6 failures each time (labels too long) | ✅ gold |
| real-gwis static | ❌❌❌ cap at craft: continent and World rows refused as aggregates, a running total, one beat.mjs never written | ✅ gold |
| r8 static | ❌❌❌ cap at craft: the same refusal as the 26B (draws 357, 347, 331 or 1357, … under the Pedelec column) | ❌ same |

**12B: 4/15 runs gold, 2/5 stories at least once. 26B: 2/5 stories (k=1).** The two models pass different stories:
the 12B the two scatter-family seeds, the 26B the web map and the stacked area. r8 fails on both with the same
refusal, so by K2 it is the harness's to replay first (the refusal is not understood by either size), not Tune's.

Per the plan, smaller rungs (E4B, LFM3) run only if the 12B passes the held-out stories at least as often as the
26B's gold rate: 27 % of runs against 40 %, so not yet. Proposed student for now: the 12B; the 26B's lead is in craft
on web maps and stacked areas, the 12B's in the storyboard of the two seeded stories.

### r8 replayed: the refusal was the harness's (2026-11-08)

Both sizes were refused until the cap for drawing exactly what the storyboard asked: the pedelec column (the claim)
beside bicycles without a motor (the comparison). `assertDrawsClaimColumn` took every value outside the claim column
as foreign. Fixed in fc7581b29: values one other column of data.json holds pass while the claim column is drawn too
(three tests; the acceptance one red before). The kept 12B beat replays clean (24 values).

Re-run on the 12B, k=1: **delivered, render exit 0, 1182 s, 2 refusals** — but `headline=false`: the takeaway (204
characters) is the title's first form, and the plate drew the second, "Pedelec fatalities vs. non-motorized
bicycles". Same case as the 26B's connected scatter, now in English: a plate-shortened headline. It joins the
question for Tom (does a shortened form, in the storyboard's language, count as faithful?). r8 leaves TUNE.md.

### real-gwis replayed: four harness defects, then gold on the 12B (2026-11-08)

Same method as r8: replay each refusal, fix the harness when the refusal is its own, re-run once (12B, k=1, 30 min cap).

| Run | Outcome | What it showed | Fix |
|---|---|---|---|
| 1 | production, capped | the aggregate guard refused the aggregates the takeaway names ("Africa", "World") | `08ca68140` named aggregates pass |
| 1 | — | the running-total guard read blank `code` cells as zeros and named the `code` column | `08ca68140` text columns and blanks skipped |
| 2 | production, capped | a plate of continents alone was refused as "regions mixed among countries" | `664ab8fba` |
| 3 | delivery, REPAIRED | the "World" series summed every row of each year (3,104,880 drawn in 2012, 1,027,500 held) — no guard saw it | `1794d2efd` a series named like a row draws that row |
| 4 | delivery, clean | the model renamed the sum "Rest of World" (every row but Africa, 2,494,770 in 2012) and passed | `c2b9a1336` no composed series or stack exceeds the year's total |
| 5 | **gold** (1472 s, 2 refusals in the beat, both recovered) | stacks the six continents as data.json holds them | — |

Both new guards replayed over the kept beats: 18 pass, 2 refused (the two wrong real-gwis beats), 0 false positive;
the 26B beat passes. Gold here is the gate's gold; looking at the plate still shows three defects no guard owns yet:
2026 is drawn although the standfirst says "2026 excluded as incomplete"; the y axis reads 0–1,250 for values in the
hundreds of thousands (no "thousands" in the unit); one annotation reads "962,619 · 6.8 %" with no words.

#### Looking at the gold plate (2026-11-08)

The gold run above still printed wrong figures. Five defects, all the harness's, fixed in `430f2576e` and `ff8b2bf1f`:
the time kits stripped ",000" from whole ticks as decimals (1,250,000 drawn as 1,250, every format); the note guard
offered the nearest pool figure regardless of meaning (Africa's 60% share of 2015 for "49% decline", where the readings
fell 11.4%) — a percent named as a change now answers only to the compare's own change; a bracket printed
"962,619 · 6.8 %" with no words (now "962,619 in 2022 · 6.8 % of 2012–2026"); a year the limits exclude was drawn
(all 8 kept real-gwis beats drew 2026 under "2026 excluded"; 0 other kept beat refused); the offered fix dropped a
minus ("-48%" offered as "68%", a fall printed as a rise). Re-run (1009 s): delivery, headline faithful, no repair,
axis in full figures; the storyboard now writes "2026 data is incomplete" and draws it; its compare note still carries
the dropped minus ("68% vs 2015 peak"), the defect the last fix closes.

Last re-run (1202 s): delivery, headline faithful, no repair, 2026 left out under "2026 excluded as incomplete" (the
new guard refused it once, the model filtered the rows), the stack is Africa over "World - Africa" as data.json holds
them, axis in full figures, "~65% of world total" true (64.9%). One note still wrong: the guard offered "-43% since
2015" for the model's "-45%", the change read backwards (2015 against 2024); Africa fell 30.2%. Fixed in `f92b4ff3c`: a
signed or change-named percent on a compare answers only to the later reading against the earlier.

### A memory-sampled real-gwis re-run (2026-11-08)

Run for the hand-off's memory table, same setting. **Capped at craft, beat.mjs never written** (1802 s): the
model's first write was aborted after 14 min with no output kept, a second write sent content `"null"`, which
write_file wrote as a 4-character beat.mjs (fixed in `94dd28683`: a write carrying no content is refused with what
to give), and its last turn ran ~9 min into the cap. The non-ending generation is the model's (TUNE.md, now two
runs). So real-gwis on the 12B stands at 2 gold of the last 3 runs, not proved stable; k=3 would say.
Peak memory: llama-server 18.3 GB, harness under 200 MB (HANDOFF.md).

## Osaurus / MLX, first runs (2026-11-08)

Route `osaurus`: Osaurus 0.25.31 (Homebrew cask), `mlx-community/gemma-4-12B-it-OptiQ-4bit` rev `de9e1838…`, port 1337,
arm `osaurus`, `SPLASH_LOCAL_MODEL=gemma-4-12b-it-optiq-4bit`. Tool calls and image input work (smoke-tested).
Three real-gwis runs, 30 min cap, fallback off; none delivered.

| Run | Ended in | What cost the time | Harness fix |
|---|---|---|---|
| 1 | craft, cap | every `-` typed as `_` in run and story folders: five refused reads of `data.json`; a stacked area adding Africa to the world (refused, rightly) | `e27651ac7` path fold |
| 1 | storyboard | asked to record `interaction` three more times after it was set | `69b584034` repeat answered |
| 2 | storyboard, cap | **my own setting**: disk KV cache off ⇒ full prefill each turn (~2 min/turn). Not a model result. | cache back on, capped |
| 3 | storyboard 1,498 s | one turn ran 16,384 hidden reasoning tokens with thinking off (>10 min, 18 chars streamed); then 12 turns with no record | `2c9955ca4` 90 s cut |

Runtime facts measured: Osaurus refuses a request with no `model` (fixed in the journalist classifier); no request
or environment form of a reasoning budget is honoured (7 tried); `osaurus stop` stops the server but leaves the app
process alive (five accumulated, killed by PID). Disk: the block-disk KV cache wrote 21 GB in one run uncapped;
`cache.blockDisk.maxSizeGB: 8` in `~/.osaurus/config/server-runtime.json` held it at ≤8.9 GB, but local Time Machine
snapshots retain what it churns (free disk 57 → 16 GB over the day). Peak memory: Osaurus RSS 11.6 GB, footprint
9.9 GB, system wired 17.4 GB; harness ≤ 350 MB.

### Runs 4–6 on Osaurus (2026-11-08)

| Run | Outcome | What cost the time | Harness fix |
|---|---|---|---|
| 4 | craft, cap | 5 hidden-reasoning cuts (the watchdog worked; one turn had 9,739 chars of thought); the stack again added World and Africa to countries | `b64c302fa` names the total rows on read |
| 5a | void | the Mac slept: a 24 GB `sleepimage` filled the disk, the sampler stopped the run | runs now under `caffeinate -i` |
| 5 | craft, cap | refused for drawing 2026 (limits: "excluded"), then 20 min failing to edit the filter in; each whole read of the 3,900-row data.json cost ~32k tokens, ~200 s of prefill, four times | `f401109c1` drops excluded times; `d550b819c` reads a large table as a digest (~2k tokens) |
| 6 | **delivered**, headline faithful, 1,519 s, 3 refusals | craft 900 s (26 turns, median 39 s) | — |

Turn time, Osaurus vs llama-server, same story: storyboard median 5–8 s vs 3–5 s; a ~32k-token turn 195–256 s vs
207–248 s. Osaurus is not the slower server; the whole-table reads were the cost on both.

Run 6's plate draws 2026 although the limits say "2026 is incomplete" (not "excluded", which `dropExcludedTimes`
reads), so the last year plunges by half. Not gold until that is settled.

### Runs 7–11 on Osaurus, disk cache 2 GB (2026-11-09)

The disk was too full for the 8 GB block cache (Time Machine local snapshots kept every deleted cache file), so
`maxSizeGB` went to 2 for these runs.

| Run | Cap | Outcome | Note |
|---|---|---|---|
| 7 | 30 min | craft, cap | storyboard 859 s; 9 refusals |
| 8 | 30 min | storyboard, cap | 3 hidden-reasoning cuts; limits "2026 data incomplete" missed by the year drop (fixed `046763238`) |
| 9 | 45 min | craft, cap | the stack counted World with the continents; refused twice with the totals, not repaired in time |
| 10 | 45 min | **headline faithful, render made**, cap during delivery | 2026 dropped as the limits ask; the 2015 peak annotation draws two overlapping rules and labels |
| 11 | — | void | the Mac went on battery for 4 s; the run stops on battery since a low-power sleep wrote a 19.7 GB sleepimage and filled the disk |

Craft turn median: 39 s in run 6 (8 GB cache) against 60–72 s in runs 9–10 (2 GB), on contexts of 20–29k tokens.
Likely the smaller cache re-prefilling, not proved: the runs differ in other ways too.

### Runs 12–14 on Osaurus, disk cache back to 8 GB (2026-11-09)

After `1cd385355` (a compare naming one row twice is refused). On AC power, 45 min cap.

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 12 | **delivered**, headline faithful | 1,986 s | 5 | 2026 dropped; the World's 1,148,499 peak is labelled on Africa's mark; a zero "Rest of World 0" series is drawn and labelled |
| 13 | **delivered**, headline faithful | 1,454 s | 2 | 2026 dropped; "Rest of world 0" again; the compare's copy draws as a solid black bar at 2024 |
| 14 | **delivered**, headline faithful | 1,440 s | 5 | 2026 dropped; World's peak labelled on Africa's mark again; same black compare bar |

3/3 delivered (k=3 on Osaurus for the first time). Craft turn median 8–18 s against 60–72 s at 2 GB: the cache size was the cost.
Not gold: three plate defects recur and are harness work — a figure of another series labelled on the subject's mark,
a series that is zero in every year kept in the stack, and the compare copy painted black in a time stack.

### Runs 15–17 on Osaurus, after the three plate fixes (2026-11-09)

After `246cb53a9` (a stack total alone on one layer is refused), `b35b7c8ee` (a layer zero at every time is left out)
and `a1427568a` (the compare copy draws as a dashed outline). On AC power, 8 GB cache, 45 min cap.

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 15 | **delivered**, headline faithful | 981 s | 5 | gold: six continents stacked, Africa's 2015 note reads "689,651 of 1,148,499", no zero layer |
| 16 | craft, not rendered | 2,702 s | 4 | storyboard chose web; beat.mjs never read its points (`points` empty, then `t: null`), every final render refused |
| 17 | **delivered**, headline faithful | 1,152 s | 6 | not gold: "World peak: 1.15 million" on Africa's layer, and "Africa's count down 1%" for 2015→2016, where Africa rose 1.5% |

2/3 delivered, 1/3 gold. Run 17's two false notes passed guards with holes, fixed in `8f8467e9f` (a change word's
direction is read; a stack total written at a scale is matched). Run 16 is a craft miss on the web kit, not triaged yet.
Disk free fell from 31 GB to 16 GB over the three runs; `runs/` holds 1.5 GB of it.

Run 16 triaged: beat.mjs read `col("Entity")` and `col("Year")` where data.json names them `entity` and `year`;
the refusal never said which names exist. Fixed in `16eb2a980` (an empty or timeless reading names data.json's columns).

### Runs 18–20 on Osaurus, after `16eb2a980` (2026-11-09/10)

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 18 | storyboard ran to its 20 min cap; craft cut by the 45 min run cap | 2,703 s | 3 | none |
| 19 | **delivered**, headline faithful | 2,262 s | 8 | gold: Africa's 2015 note "689,651 of 1,148,499", compare "41% lower than peak" (2015→2025, 689,651→406,220: −41.1%) |
| 20 | craft cut by the 45 min run cap, last beat never rendered | 2,702 s | 5 | none |

1/3 delivered, 1/3 gold. Both misses are time, not judgment: two storyboard turns in run 18 (864 s, 868 s) and one
craft turn in run 20 (859 s) streamed nothing until a run of `<|channel>thought` tokens at their end. The
hidden-reasoning cut arms on the first thought token, so it fired thirteen minutes late. Fourteen other empty turns
were cut at 90 s as designed (115–134 s wall). Fixed in the next commit: a turn that sends no word and no tool call
within 300 s of its request is cut and asked again. Osaurus wrote no log that says why it stalled.

### Runs 21–23 on Osaurus, after `a668c30a4` (2026-11-10)

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 21 | **delivered**, headline faithful | 2,193 s | 5 | not gold: "peak: 689,651" on Africa's 2015; compare "down 41.1%" (2015→2025) is right |
| 22 | **delivered**, headline faithful | 1,319 s | 1 | not gold: "Africa's peak" on 2015; "up ~1.5%" (2015→2016) is right, and contradicts the peak on the same plate |
| 23 | **delivered**, headline faithful | 1,597 s | 6 | not gold: "Peak: 689,651" on Africa's 2015 |

3/3 delivered, 0/3 gold. No turn ran past 250 s, so the silent-turn cut never had to fire: whether it would have saved
runs 18 and 20 is not measured. All three plates call Africa's 2015 its peak; the world peaked in 2015 (1,148,499),
Africa in 2016 (699,806). No guard read the word. Fixed in the next commit: "peak" on one reading holds only at its
series' highest, or on a stack where the whole stack peaks and the note states its total. Replayed, all three kept
beats are refused with a value that works ("2015: 689,651", "Africa's 2015").

### Runs 24–26 on Osaurus, after `3ac3d26f5` (2026-11-10)

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 24 | **delivered**, headline faithful | 1,373 s | 6 | not gold: "2015: 689,651" (the peak guard's own fix, taken) is right, but the compare 2016 vs 2015 says "up 1% since peak" |
| 25 | **delivered**, headline faithful | 1,847 s | 6 | gold on the figures: "689,651 of 1,148,499", "up 1.5%"; axis numbers without separators, and two one-event territories (Northern Cyprus, Akrotiri and Dhekelia) drawn as layers |
| 26 | **delivered**, headline faithful | 1,589 s | 4 | gold: "Africa: 689,651", "Down 41% from 2015" (Africa 2025 vs 2015: −41.1%) |

3/3 delivered, 2/3 gold. Over runs 21–26: 6/6 delivered, no stalled turn. Run 24's miss is the peak word again, this
time in a compare's note, which the guard did not read (it held single-reading notes only). Fixed in the next commit:
a compare's peak word is held on its earlier reading; replayed, run 24's beat is refused with "up 1% since 2015".

### Runs 27–29 on Osaurus, after `9f79f0dd5` (2026-11-10, on battery at Rémy's request)

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 27 | **delivered**, headline faithful | 1,358 s | 3 | gold: "2015: 689,651", "30% lower" (Africa 2024 vs 2015: −30.2%) |
| 28 | stopped at the storyboard | 1,541 s | 1 | none |
| 29 | **delivered**, headline faithful | 1,724 s | 6 | gold: "689,651", "fallen by 41.1%" (Africa 2025 vs 2015) |

2/3 gold, and no plate since the peak guards carries a false figure (runs 25–27, 29). Run 28: the storyboard listed
treatments in prose without `show_candidates`; the scripted journalist answered "Area (and stacked area)." ten times,
and the 12B refused it each time on a rule it invented ("Static does not support Area"), never calling
`record_slot`. The session stopped on "no new record in 12 model turns"; the two resumes were cut for hidden
reasoning three times each. Fixed in the next commit: after three silent turns with a slot standing and nothing
chosen, the harness asks for `record_slot chosen` with the journalist's own words and narrows the turn to the record
tools; the tool, not the model, says what is reachable.

Battery: 100% at the start of run 27, 76% and charging at its end (the charger came back during run 27); no sleep image, disk 12–21 GB free.

### Runs 30–32 on Osaurus, after `06f1edb5e` (2026-11-10, on AC power)

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 30 | stopped at the chart beat | 2,703 s | 2 | none |
| 31 | stopped at the chart beat | 2,704 s | 5 | none |
| 32 | **delivered**, headline faithful | 2,439 s | 6 | gold: "down 30% since 2015" (Africa 2024 vs 2015: −30.2%); "nearly half since it peaked in 2015" (World 2025 vs 2015: −45.5%) |

1/3 gold. All three storyboards closed (no repeat of run 28's stall). Runs 30 and 31 both stacked the World row on
the six continents it is the exact sum of (data.json: World = Σ continents at every year); the render refused the
doubled stack, and the 12B put World back after each of two or three refusals until the 45-minute cap. Fixed in the
next commit: a stacked layer that equals the sum of the other layers at every time is the stack's own total and is
left out, and a gesture marked on it moves to the beat's entity at the same time, where the existing guard turns a
total written on one layer into "part of total". Replayed on run 30's beat, the render then asks for
"689,651 of 1,148,499", a refusal the repair loop applies.

### Runs 33–35 on Osaurus, after `00205ed15` (2026-11-10, on AC power)

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 33 | **delivered**, headline faithful | 2,703 s | 4 | gold: "2015: 689,651"; "up 1% since 2015" (Africa 2016 vs 2015: +1.5%, a compare the repair moved off 2026) |
| 34 | **delivered**, headline faithful | 1,222 s | 2 | gold: "689,651 events" on Africa 2015 |
| 35 | **delivered**, headline faithful | 1,198 s | 3 | gold: "down 41%" (Africa 2025 vs 2015: −41.1%) |

**3/3 gold: the target batch.** No plate carries a false figure. Neither new mechanism fired: no storyboard reached
the "nothing chosen" nudge (run 33's first storyboard session stopped on "no new record in 12 model turns" and its
resume closed the gate), and no beat stacked World on the continents. The batch therefore shows the pipeline holds,
not that the two fixes were exercised; both rest on their tests and on the replay of run 30's beat.

Remaining form defects: the peak/total references the model writes ("World peak", "peak: 1.15 million") are dropped by
the repair rather than kept as "part of total"; run 33's compare is true but weak (+1% is not the story). Run 33 spent
2,703 s, at the cap, of which 962 s in the storyboard.

### Segmented runs on Osaurus, after `819c11c71` (2026-11-11, on AC power)

Full runs take 20–45 minutes; the craft and the storyboard were measured apart instead.

**Craft only** — five runs seeded from run 32's storyboard (`--seeds`, `SPLASH_STOP_AFTER_CRAFT=1`), stacked area:

| Run | Time | Plate figures |
|---|---|---|
| c1 | 1,431 s | end labels only (one refusal: points at one time) |
| c2 | 1,330 s | end labels only (one refusal: World row added for 2015 alone, stack doubled) |
| c3 | 723 s | "0.69 of 1.15 million", "Down 30% since 2015" (repaired) |
| c4 | 1,367 s | "689,651 of 1,148,499"; end labels unformatted ("406220.0") |
| c5 | 1,324 s | "689,651 of 1,148,499" (repaired) |

5/5 plates rendered, none with a false figure. Run 30's fix fired through the render's guard ("of 1,148,499" in c4,
c5). c2 escaped it: the 12B pushed one World point, from `data.rows.find`, and `dropStackTotal` required the total at
every time. Fixed in `007332244`: the total is judged at the times the layer is drawn. Two plates (c1, c2) carry no
annotation; c4's end labels print raw floats.

**Storyboard only** — five unseeded runs (`SPLASH_STOP_AFTER_STORYBOARD=1`): 550, 604, 965, 1,454, 1,418 s. The first
three closed the gate (r1 after one "no new record" stop). r4 and r5 hit the 20-minute storyboard cap with the same
cause: the 12B looped on `<|channel>thought` in a talk turn; the harness cut it at 90 s, but Osaurus generated on to
the 16,384-token request cap and the next turn waited behind it (r5: turns of 301 s and 610 s). The "nothing
chosen" nudge never fired. Fixed in `40e4a4ba1`: talk owners (editor, storyboard, designer, deliver) request 2,048
output tokens at most — 879 talk turns wrote 695 at most — so a loop ends server-side in about 70 s.

### Runs 36–38 on Osaurus, after `40e4a4ba1` (2026-11-11, on AC power) — the validation batch

| Run | Outcome | Time | Refusals | Plate |
|---|---|---|---|---|
| 36 | **delivered**, headline faithful | 2,680 s | 2 | gold: "down 30% since 2015", "peak: 0.69 of 1.15 million" |
| 37 | **delivered**, headline faithful | 1,387 s | 5 | gold: "Africa: 689,651", "Africa: 481,688 (down 30%)" (2024 vs 2015: −30.2%) |
| 38 | **delivered**, headline faithful | 1,497 s | 6 | gold: "up 1% since 2015" (weak), "peak: 0.69 of 1.15 million" |

**3/3 gold, second batch in a row.** The talk cap fired once (run 36's storyboard): a `<|channel>thought` loop ended
at 2,048 tokens and the session moved on two minutes later, where runs r4 and r5 had lost ten. Run 36 still spent
1,709 s in craft. Runs 36 and 38 printed end labels as "406220.0": the beat's compact format (406K) collapsed the
values and the legibility fallback added a decimal without grouping. Fixed in the next commit: whole values fall
back to grouped integers ("406,220"), checked on run 38's beat replayed with its delivered repair.

### Held-out batch on Osaurus (2026-11-11, on AC power) — four stories the harness was not tuned on

| Story | Variant | Outcome | Time | Where the time went |
|---|---|---|---|---|
| gx-connected-scatter | full | production, cap | 2,702 s | storyboard 1,246 s: the scripted journalist read the candidate menu as the takeaway question and the survey's "additional subjects" as the subject question |
| gx-small-multiples | full | **delivered**, headline **unfaithful** | 1,443 s | the plate's fit ladder shortened the title before it traded the grid |
| stress-t-europe-recycling | web-map | production, cap | 2,703 s | storyboard: empty turns cut at the 2,048-token length cap, answered "I don't know."; craft: the phone frame overflowed by 95 then 39 px, and the 12B passed only by cutting the journalist's limits |
| r8-german-road-deaths | static | headline faithful, cap during delivery | 2,702 s | craft 1,918 s: five rewrites against "the title states 214, which the drawn line do not contain" while 214 sat in the all-locations row of the pedelec column |

**1/4 delivered, 0/4 gold.** No miss was the model's alone; each traced to the harness and was fixed with a test that
fails without the fix:

- `579a043ec` — the scripted journalist answers the candidate menu with its treatment and declines the survey.
- `52ddf75ee` — a turn that ends with nothing said and no tool called is asked again, and stops after `sameFailure`.
- `f42111151` — the small-multiples ladder keeps the takeaway headline before trading the grid (replayed: full
  takeaway, 16 panels, deltas kept).
- `7a1c17037` — the web choropleth draws the last limits form on a phone (replayed with the full limits plus a short
  form: 211 checks, phone fits), and a phone-overflow refusal names the height and the shorter form instead of "a label
  too long".
- `ab1a3c9c4` — a title figure the drawn marks miss is located in data.json: column, row, and that its cells are
  strings.

Next: re-run the four, one at a time, on AC.

### Held-out batch 2 on Osaurus (2026-11-11, on AC power) — the same four, after the five fixes

| Story | Variant | Outcome | Time | The render, looked at |
|---|---|---|---|---|
| gx-connected-scatter | full | delivered, headline drawn | 1,939 s | **wrong**: the title is France's 11.8-point loss of share; the plate draws bioenergy against other renewables in TWh, labelled with ambiguous initials |
| gx-small-multiples | full | **delivered** | 1,836 s | **gold** |
| stress-t-europe-recycling | web-map | production, cap | 2,702 s | storyboard 1,348 s again (hidden reasoning cut three times); craft stuck on "no shape for Holland, Belgiumm…": rows keyed by country name |
| r8-german-road-deaths | static | delivered | 1,266 s (craft 344 s, was 1,918 s) | data right (36 → 214), but the axis starts in 1980: two thirds of the plate are empty years |

**3/4 delivered, 1/4 gold.** `headline=true` on the scatter only meant the title text was drawn. The three new misses
were traced to the harness and fixed with a test that fails without the fix:

- `d0a7e84ce` — a choropleth row keyed by a country name is refused with the code it takes ("Holland" → "NLD",
  "Belgiumm" → "BEL", closest: belgium), and the four choropleth contracts name `iso3Of(names, here)`.
- `1f6916cdb` — the time axis starts and ends at the years some series reads (r8 replayed: 2014–2025, both series).
- `bae2061a3` — the headline guard took 11.8 as the gap of two of the scatter's 64 marks; with that many marks 97 % of
  figures in range were "derivable". The sum-or-gap rule now counts only where it still excludes most figures (≤ 25 %
  of the drawn range, ≤ 200 marks); a figure no cell of data.json holds is named as computed, with the instruction to
  draw the computed measure. The kept scatter beat is now refused with that message.

Still open: stress-t's storyboard (≈ 1,350 s, hidden-reasoning cuts) and r8's "214 killed" / "36 killed" notes
touching the lines.

### Held-out batch 3 on Osaurus (2026-11-12, on AC power) — after `d0a7e84ce`, `1f6916cdb`, `bae2061a3`

| Story | Variant | Outcome | Time | The render, looked at |
|---|---|---|---|---|
| gx-connected-scatter | full | delivered | 2,094 s | **on topic, not gold**: axes are each country's share of the group's renewables and nuclear (France 61 → 47); the 11.8-point loss is in no mark or note; crowded labels in the lower-left; x axis ticks 0 and 20 only |
| gx-small-multiples | full | delivered | 1,362 s | **gold** (second time) |
| stress-t-europe-recycling | web-map | **delivered** | 1,994 s | right map, right classes; Macedonia (the lowest) marked but not labelled; storyboard still 1,275 s |
| r8-german-road-deaths | static | delivered | 2,113 s | axis 2014–2025 now; the series is named by its raw row label ("Innerhalb und außerhalb von Ortschaften"), the bicycle comparison line is gone, "36 pedelec riders killed" is struck through by the line |

**4/4 delivered, 1/4 gold** (from 1/4 and 3/4 delivered). Every run under the 45-minute cap.

**Fixes after batch 3**, each with a test that fails without it, each replayed on the kept beat and looked at:

- `b4b221bd5`: the headline guard matches a figure at the precision the title writes (11.8 is no longer met by
  Germany's 11.71). The kept scatter beat is refused with the computed-figure message.
- `5bab483a9`: a lone time series takes the beat's `entity` as its name, and its gestures follow. r8 now reads
  "Pedelecs 214", not the filter value of its rows.
- `3811aff9d`: a time still's notes step clear of the drawn lines, not only of each other. r8's
  "36 pedelec riders killed" now sits above the line.
- `0fc3c8c3a`: a map highlight that rings a place beside the subject also names it with its value. stress-t shows
  "Macedonia 18.4 %".

Still open: stress-t's storyboard (≈ 1,300 s). r8's bicycle comparison line: the model drew pedelecs alone, which
is a choice of the beat, not a harness defect.

### Held-out batch 4 on Osaurus (2026-11-12, on AC power, r8 paused mid-run) — after the four fixes above

| Story | Variant | Outcome | Time | The render, looked at |
|---|---|---|---|---|
| gx-connected-scatter | full | capped in chart-beat | 2,704 s | — |
| gx-small-multiples | full | delivered | 2,703 s | **not gold**: 11 of 16 countries, the subject (Denmark) dropped, TWh on one 0–550 scale where the takeaway is a share |
| stress-t-europe-recycling | web-map | delivered | 2,705 s | **gold**: "Macedonia 18.4 %" labelled |
| r8-chart-static-german-road-deaths-by-mode | static | capped | — | the run was frozen at 38 min and resumed past the cap; it does not count |

**2/4 delivered, 1/4 gold.** The same stories flip between batches (small-multiples gold in batches 2 and 3, not
in 4; the scatter delivered in 3, capped in 4): four batches on these four stories now measure the 12B's variance
more than the harness. Per the exit criterion set before the batch, one harness fix, then fresh stories.

- `fddeca0bd`: the small-multiples kits (static, web) refuse panels that leave out entities of data.json without
  `foldNote` or a "drawn of all" standfirst, naming the missing ones and pointing to the measure the takeaway names.
  The kept beat is now refused ("11 of the 16 … missing: Czechia, Denmark, Greece, Ireland, Portugal").

Owner of the rest (Tom's triage): drawing TWh where the takeaway is a share, and chart-beat running past the cap,
are the model's choices — **Tune**, not Harness.

### Fresh batch 1 on Osaurus (2026-11-12, on battery with a 30% guard) — four stories never run before

| Story | Result | Time | Triage |
|---|---|---|---|
| stress-x-tunisian-water | production capped (chart-beat) | 2703 s | **Tune**: the kept `beat.mjs` drops `gestures` from the default export after a `rows` redeclaration; the refusals already name the field and the fix. |
| stress-v-top-emitters | storyboard stopped (14 refusals) | 809 s | **Harness**, fixed in `3f7901620`: `record_subject` blamed a real id when only medium/format were "none"; the scripted journalist answered the survey-subject confirmation with its takeaway rebuttal. |
| stress-ad-polish-hospital-beds | delivered | 1733 s | Near gold: 8 of 16 voivodeships, said in the standfirst; title right. |
| stress-p-transport-ridership | delivered | 2126 s | Near gold: Lisboa accented, bracket "214 of 394 million". The "unattributed" credit is the sheet's own. |

Both delivered renders carry the compare gesture's copy (the compared length laid in the subject's
band, `DirectedGestureColumns.tsx` copies): it reads as a second bar inside the subject's. It is the
grammar working as designed, not a defect — whether it reads well is a design question for Rémy.

### Next rung: Gemma 4 E4B on Osaurus, the same four fresh stories (2026-11-12) — arm `osaurus-e4b` (`737e40658`)

Journalist classifier kept on the 12B so the instrument matches the 12B batch. stress-v's first run was lost to a pause
(killed, not suspended) and re-run from scratch.

| Story | E4B | 12B (fresh batch 1) |
|---|---|---|
| stress-x-tunisian-water | ❌ production capped, 2210 s | ❌ capped |
| stress-v-top-emitters (video) | ⚠️ delivered, 2208 s: the arithmetic is right (12,289 − 11,652 = 637), the fold says "11 / 215", but the unit has no "tonnes" ("12,289 million") | ❌ storyboard (harness, since fixed) |
| stress-ad-polish-hospital-beds | ❌ delivered, 2311 s, **not faithful**: draws absolute beds (Mazowieckie first) under a title that says per resident it is third; the rings on Śląskie and Łódzkie point at shorter bars | ⚠️ near gold |
| stress-p-transport-ridership | ❌ delivered, 1101 s: the two notes are in **French** on an English chart ("214 millions sur les 394 millions au total"), eyebrow in Portuguese | ⚠️ near gold |

**E4B: 3/4 delivered, 0/4 gold. 12B: 2/4 delivered, 2/4 near gold.** The exit criterion set before the batch
counted deliveries, and by it the E4B passes; by the renders it regresses on faithfulness. The 12B stays the student.
Tune candidates the two rungs share: choosing the measure the takeaway names (12B: TWh for a share in batch 4; E4B:
absolute beds for a per-resident rank), and the language of what the model writes on the plate.

### Next rung: Qwen3.5-9B on Osaurus, the same four fresh stories (2026-11-12/13) — arm `osaurus-qwen` (`c6a50097a`)

Tom's shipped main model (`qwen3.5-9b-optiq-4bit`, base, not his tuned r3). The journalist classifier and the editor
stay on the 12B. Run **segmented**, as Rémy asked: storyboard alone first, then craft alone
(`SPLASH_STOP_AFTER_CRAFT=1`), so a defect shows in ten or twenty minutes rather than at the 45-minute cap. Each
defect got a failing test, a mutation check and a commit before the next run.

**Storyboard (Gate 2), compared field by field with each story's sheet:**

| Story | Outcome | Fidelity to the sheet |
|---|---|---|
| stress-x-tunisian-water | DONE (qsb5) | all fields |
| stress-v-top-emitters | DONE (qsb6, after resume) | all fields; the credit "unattributed" came from the scripted journalist saying "Yes" to the desk's proposal (instrument, fixed `f385d8122`) |
| stress-ad-polish-hospital-beds | DONE (qsb6, after resume) | all fields; the subject held the comparison because the classifier misread the subject question (instrument, fixed `64d909796`) |
| stress-p-transport-ridership | DONE (qsb6, again qc2) | all fields |

**4/4 storyboards close, faithful.** The 12B on the same four: one stopped on a harness defect (stress-v, since
fixed). Getting there cost twenty-odd harness fixes, below; the runs that hit them stopped in minutes, not at the cap.

**Craft (chart-beat, static):**

| Story | Outcome | The render, looked at |
|---|---|---|
| stress-x-tunisian-water | stopped by hand (qc1) | not drawable: Arabic plate, and Splash has no Arabic typeface (Known limits). The second refusal was right: Sfax's value, in Eastern Arabic digits, drawn as 89,000,000 |
| stress-p-transport-ridership | rendered on attempt 3 (qc2, 2,286 s, 5 refusals, 109 turns) | **near gold on the numbers**: title "Lisboa alone carries 214 of the 394 million trips… more than twice Porto's 96 million", bars 214/96/31/28/14/11, Lisboa accented, bracket at 394. **Not gold on the language**: notes "214 contra 96" and "de 394", eyebrow "TRANSPORTE · PORTUGAL" in Portuguese on an English plate |

The Portuguese plate is Qwen writing in the data's language. Two of the refusals before attempt 3 were on that, one
string at a time; `3f68ad299` names every foreign string in one refusal (shorter standfirst forms included, never
checked before), and `6855c1ed9` reads notes too short for `languageOf` against a narrow list of non-English function
words. That list was scanned over the 238 beats kept so far: one new refusal (this plate), no false one; the broad
stopword lists would have made 21 ("per cent", "as", "CHE"). The eyebrow "TRANSPORTE" is still not caught (one word,
no function word).

**Harness fixes from this rung** (Tom's triage: each is routing the model could not do, moved into code):

- Storyboard routing: `f5351dbb5`, `8f8e4073b`, `48d83d5fd`, `b49dee6bf`, `ea49a695b`, `61dfc37cb`, `f28cc9f89`,
  `b25a229cf`, `4412a125f`, `b41c91ad3`, `0bcde0f32` (record the journalist's own words when the model rewords them),
  `8bd101fe5`.
- Reads that went nowhere: `6bbc391c8`, `3d2b1123f`, `1afd7b00b` (proof/ held finished beats of the eval stories),
  `39cfe3fa1`, `6c213a8c2` and `5314a09ea` (refuse a second read of an unchanged file or directory, naming the
  question to ask), `1f7e24264` (answer the hunt for the Datawrapper mapping with the producer question).
- Language: `2c728947f` and `7f650402a` — the journalist said "English." eleven times while Qwen proposed `fr` from
  the newsroom list; the nudge now names `record_language en` and leaves every tool on.
- Craft: `46595e9a4` (quote the whole closest passage of a near-miss edit, in any script), `3f68ad299`, `6855c1ed9`.
- Instrument (the scripted journalist, not the harness): `4e12175de` (a hung classification is asked once more),
  `f385d8122`, `64d909796`.

**Tune** (the model's, not routing): Qwen ignores a refusal that names the next step and repeats the call (three
rereads of `article.md` for placement after "do not reread"); it re-asks a question the journalist already answered;
it writes the plate in the data's language. Resume recovers the first two. These are what a procedure tune would
target (Tom's 26 examples, masked loss).

| | Storyboards (4) | Craft rendered | Faithful render |
|---|---|---|---|
| 12B (fresh batch 1, before the fixes) | 3 | 2 delivered | 2 near gold |
| E4B | 4 | 3 delivered | 0 |
| Qwen3.5-9B (after the fixes) | **4, all faithful** | 1 of 1 drawable (x stopped: Arabic) | 1 near gold on numbers, wrong language on 3 strings |

Not like for like: the Qwen arm ran on a harness twenty-odd commits ahead, segmented, with resumes. What it shows:
the storyboard is no longer the wall for a 9B model. What it does not show yet: a delivered Qwen render that passes
every guard on the first try. A re-run of stress-p on `6855c1ed9` is the check.

**Re-run qc3 (2026-11-13, on `6855c1ed9`):** storyboard DONE again (1,081 s), craft **287 s** (vs about 1,200 s in qc2),
1,418 s in all. One render refused, the next passed. The plate is entirely English: eyebrow "Transport · Portugal",
standfirst "Annual trips, in millions. One year only (2025); six city networks…", bracket "214 of 394", note "more
than twice Porto's 96", values 214/96/31/28/14/11, Lisboa accented. **Gold** on what the sheet asks; the credit
"unattributed" is the sheet's own. The compare gesture's copy inside Lisboa's bar is the same design question as in
the 12B batch.

### Stability matrix: bullet and bubble map × four formats, Qwen3.5-9B and the 12B (2026-11-13/14)

Rémy's goal for this rung: static, web, video and scrolly stable for charts **and** maps. One chart type
(`gx-bullet`) and one map type (`gx-proportional-symbol-symbol-bubble-map`), each in the four formats, both students,
seeded, `SPLASH_STOP_AFTER_CRAFT=1`, one cell at a time. Every final render was looked at and its figures checked
against data.json (Poland 13.8 → 31.1, +17.3 pts; the 100 largest plants 43.0 % of the capacity, 65 of them
nuclear; France 97 GW, UK 49, Spain 39, Germany 35, Russia 32, Norway 31; 72 nuclear sites, 69 at 500 MW or more).

| | Bullet static | web | video | scrolly | Map static | Map web | Map video | Map scrolly |
|---|---|---|---|---|---|---|---|---|
| **Qwen3.5-9B** | ✅ | ✅ | ✅ | ✅ | ⚠️ "880 sites nucléaires" (one plant's MW as the group's count) | ⚠️ "un cercle par centrale" under one circle per country | ✅ | ✅ after 3 empty passes |
| **12B** | ✅ | ✅ | ✅ (15-min cap, final render passed) | ✅ | ✅ after `bca6a130a` | ✅ after `e8388c532`, then unstable (below) | ✅ | ✅ |

**15 of 16 cells are stable on a first full pass; the bubble map web is not.** The 12B's web cell, re-run on its own
after each fix, failed a different way each time, every one a false plate that passed every guard of the day:

| Run | What the plate drew | Fix |
|---|---|---|
| matrix | two copies of the beat in beat.mjs | `e8388c532` names the second copy and the lines to delete |
| i13 | 41 of 46 countries, Syria filtered under a name data.json does not write; the review PNG showed the whole world | `14d1b2d2d` (UN official names), `2f1ffe2f1` (re-take the desktop picture after the page re-fits) |
| i14 | every fuel but Nuclear, under a subject that names the nuclear plants: France 34 GW for 97 | `c1184ed3f` refuses symbols that leave out every row of one category |
| i15 | stuck on two refusals that named the problem and no value | `64d4a465a`, `5ee4d261e` (the sentence to add: « Hors carte : Algérie, Irak, Maroc, Syrie, Tunisie. »), `f9a1d41e9` |
| i16 | **figures right** (France 97 GW, 41 drawn + 5 named off the map = 46), standfirst still "Un cercle par centrale" | `34aeecdd7` holds "one circle per X" to what the symbols sum |
| i17 | **figures right, standfirst right** ("Un cercle par pays", 41 drawn + 5 named = 46); after a "Suède 19.9 px under 22 px" refusal its own filter emptied `labelled`: no name on the map, and the prose reads "viennent ensuite ." | `0e1851bde` refuses a plate sentence whose spliced list or value came out empty |
| i18 | no render (45 turns, 2256 s): a first kit pass hit the 15-min cap on a legibility-floor refusal, then three passes stuck on "Unterminated string literal (line 162: `,)" — a stray backtick and comma after the closing "};", a shape the stray-quote refusal did not name | `e61250138` names that line and says to delete it |
| i19 | **renders, figures right** (France 97 GW, UK 49, Spain 39, Germany 35, Russia 32, Norway 31 — data.json; 41 drawn + 5 named off the map = 46; title true: the 89 largest of 8 900 sites, one hundredth, carry 40.8 %). Two passes (15-min cap each); the first final render was refused for 24 places left out unsaid. Alt: "Ces 100 premiers sites couvrent 100 %" — `ranked.slice(0, 100)` over the 41 country circles. Open: the standfirst is cut mid-sentence at every desktop width — the kit's caveat is the limits plus the required Mercator sentence (~330 characters), and `skills/chart-web` clamps it to one line above 1100 px | `f67b46bb1` refuses a top N stated to make up 100 %, in all four bubble-map kits |
**Choropleth static, both students (2026-11-14).** Story: « Sept pays européens dépassent 94 % d'électricité
bas-carbone — six au nord-ouest, et l'Albanie ». Checked against data.json (low-carbon ÷ total generation): Albania 100,
Iceland 100, Sweden 98.8, Norway 98.6, Switzerland 98.1, Finland 95.3, France 94.9 — seven at 94 % or more; next is
Luxembourg at 90.7 and Ukraine has no data. The title is true.

| Student | Run | What the plate drew | Fix |
|---|---|---|---|
| 12B | exit 0, 22 turns, 544 s | kept beat filters the seven ≥ 94 under the note "13 pays à 99 % ou plus"; the final repair offered "7 pays à 99 % ou plus" (99 passed on Sweden's 98.8 rounded, France kept at 94.9). The kept PNG shows only Albania in colour; replaying the kept beat with a true note draws the seven, so that PNG is not reproducible from the kept beat | `868c9866f`: a threshold on a filter must be reached by every kept place and by no other; the repair now gives "7 pays à 94 % ou plus" |
| Qwen3.5-9B | exit 0, 33 turns, 1051 s (three passes on a title-shortening refusal and a 15-min cap) | classes right, but the old guard forced its true "94 %" to "95" (the kept minimum rounded up): the filter keeps six, the legend's top limit reads 95 and the title says seven at 94 | `868c9866f` (same rule: 94 holds, 95 is no longer offered) |
| both | | "Albanie, 100.0 %" — an English decimal on a French plate | `2a051521e`: the plate's own words take a comma-decimal story's decimal mark |

Re-run after both fixes (12B, 2026-11-14): exit 0, 27 turns, 556 s, one pass. **The plate is true**: the top class
(94 % and over) holds exactly the seven of data.json — Iceland, Norway, Sweden, Finland, France, Switzerland, Albania —
the note reads "Albanie, 100,0 %" with the French decimal mark, and the breaks keep the model's own 94.

Qwen re-run (2026-11-14): exit 0, 13 turns, 795 s. Its filter listed six by hand, leaving out France (94.9 %), under
"6 pays à 94 % ou plus"; the threshold rule repaired the NOTE to "95" — true of the six, but the plate greyed France
under a title of seven at 94. `f8f0c9e98`: when every kept place reaches the stated threshold and some left out
do too, the filter is the error — the fix adds them to `marks`, and the count rule then writes "7 pays". Replayed on
the kept beat: two repairs, the seven drawn, France included.

Open: the beat's `check()` is replaced by code's `claimCheck`, which decides maximum/minimum/comparison claims only — a
"seven countries at 94 %" count in the title is held to nothing but the filter's own note.


The same pass carried the guards the web and video kits gained to the static (`.gestures`, the default) and scrolly
bubble-map kits (`20a46e5b6`), kept a point-map note off the plate's circles (`1489cef26`), and made `iso3Of`'s
refusal give the rename that works, once per name (`80a5a5a27`: the 12B had retried "Gerany"/"Belgiumm" eleven
times). Each has a test that fails with the fix removed.

**Triage.** Harness: the five rows above, all routing or guards moved into code. Tune: the 12B drops a category or a
place by hand-written filter lists, and Qwen spends passes before writing a first file — both a procedure tune's
targets. Open: the long craft turns (12B writes of 16k characters in 5–6 min, Qwen thinking past 30k characters) are legitimate work
the watchdogs cannot tell from a runaway.
