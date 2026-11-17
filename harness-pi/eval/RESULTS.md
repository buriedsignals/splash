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

**Tile cartogram web, 12B (2026-11-14).** Two passes, 20 turns, 1824 s: the first hit the 15-min cap before writing
beat.mjs, the second rendered. Figures checked against data.json: the mean by country is 65.09 % over the 40 reporting
countries (title 65,1 %, pull-back note 65,1 %), Russia 35.9 %, Ukraine shown as not reported. Open: the title's
second figure, "au kilomètre carré, à 44,9 %", is the seeded takeaway's — data.json has no area column, nothing on the
plate draws or derives it, and no guard asked; a tile cartogram cannot show it, so it is the storyboard's to drop or
the data's to carry. Closed by 26f9fb446: on a map whose values are percentages the headline guard now checks the
title's % figures too (the mean counts as a reading) and offers the title without the clause; replayed on the kept
beats it refuses 44,9 and passes both true choropleth titles. The bubble web kit's standfirst cut (Mercator sentence)
is closed by 77d3efae2: the sentence moves to the reading line, which chart-web folds into the readings disclosure.


The same pass carried the guards the web and video kits gained to the static (`.gestures`, the default) and scrolly
bubble-map kits (`20a46e5b6`), kept a point-map note off the plate's circles (`1489cef26`), and made `iso3Of`'s
refusal give the rename that works, once per name (`80a5a5a27`: the 12B had retried "Gerany"/"Belgiumm" eleven
times). Each has a test that fails with the fix removed.

**Triage.** Harness: the five rows above, all routing or guards moved into code. Tune: the 12B drops a category or a
place by hand-written filter lists, and Qwen spends passes before writing a first file — both a procedure tune's
targets. Open: the long craft turns (12B writes of 16k characters in 5–6 min, Qwen thinking past 30k characters) are legitimate work
the watchdogs cannot tell from a runaway.

**Step 1 — the two maps re-run after the fixes (2026-11-14).** First pass 0/3: the 12B looped on a stray `` `, ``
after the closing `};` (closed by 33777a91a, `trimStrayTail`), a spaced key broke a beat (d86f73513,
`quoteSpacedKeys`), the cartogram's two guards asked for opposite titles (2b33684ab), and the bubble web kit drew one
circle per country under a takeaway about sites, so both students stated site figures from country circles. That
last one is closed by d26fcd535: the web kit draws one circle per row (at most 1000, none under 1 px), `limits(cut)`
must print the threshold, and a circle wholly tiled by smaller ones may be missed by the pointer probe, nine in ten
must be found (906/985 at 1600x800).

| cell | arm | result | turns | wall | checked against data.json |
|---|---|---|---|---|---|
| bubble map web | 12B | rendered, 0 refusals | 7 | 645 s | 88 largest of 8 813 sites carry 41,3 %; cut at 61 MW, 7 828 left out; largest 6 000 MW (Ukraine), France's 5 460 MW |
| bubble map web | Qwen3.5-9B | rendered, 0 refusals | 12 | 624 s | the same figures |
| tile cartogram web | 12B | rendered, 0 refusals | 15 | 425 s | 40 reporting countries, mean 65,1 %; Russia 35,9 %; Ukraine not reported |

3/3. The cartogram counts `headline=false`: its title drops "au kilomètre carré, à 44,9 %", the clause no column of
data.json can carry (see above) — the eval's headline check still wants the whole takeaway. Caveat: the two bubble
beats stay within 14 lines of the worked example, which tells the same story; the cells measure that a student
follows the kit, not that it composes a different site story.

### Step 2: one type per family, static, Qwen3.5-9B then the 12B (2026-11-14/15)

Seeded runs, `SPLASH_STOP_AFTER_CRAFT=1`, one at a time on Osaurus. Every render was looked at and its figures
checked against the run's own `data.json`. Each batch ran the code of its start; the fixes below landed between or
during them.

| Cell (family) | Qwen3.5-9B turns · time · headline | 12B turns · time · headline | 12B render vs data.json |
|---|---|---|---|
| lollipop (length) | 44 · 880 s · yes | 14 · 281 s · yes | clean: China 2.87 → 8.56 (+198 %), USA 21.4 → 14.3 |
| stacked-bar (stack) | 14 · 333 s · no | 24 · 340 s · yes | compare note "+119 TWh contre +119 TWh pour la France" (France +50.1) → `071b748f0` |
| dot-strip (position) | 29 · 623 s · yes | 34 · 904 s · yes | clean figures (Poland 1.6 → 31.1); one turn spent 454 s in a `<\|channel>thought` token loop → `3905d43f9` |
| line (time) | 9 · 229 s · yes | 18 · 284 s · yes | clean (peak 46.2 Mt in 1973, 32.1 Mt in 2024); a refusal offered "1963 de 1963 : 29,1 Mt" → `3df346029` |
| pictogram-isotype (units) | 5 · 117 s · yes | 9 · 182 s · yes | clean: 16 + 6 + 18 = 40 countries |
| pie-and-donut (part) | 13 · 169 s · yes | 15 · 307 s · yes | clean: China 32.9 %, USA 13.3 %, ratio 2.5 |
| heatmap-matrix (cell) | 6 · 141 s · yes | 10 · 351 s · yes | "Islande : 13,5 % d'hydraulique": 13.46 is TWh, the cell is drawn at 70.7 % → `6bcc2dfb1` |
| locator (geo) | 53 · 935 s · no | 10 · 267 s · yes | clean (6 000 MW, the largest); Dnipro's dot sat on the subject's label → `3b87a6529` |

Qwen also ran the bubble map (19 · 252 s · headline no). Fixes from the Qwen pass, in order: `579634157`,
`18a14932a`, `eb59ea145`, `53b89b999`, `421fa0774`, `f25fef26f`, `4fd6c05a5`, `7e6942c2e`, `2a5637e2b`.

Triage of the 12B pass: five Harness fixes (guards and kits, each with a test that fails when the fix is removed),
nothing for Helper. Tune candidates: the 12B re-sent an identical successful `record_gestures` 16 times after a
refusal on the dot-strip; English place names (Kyiv, Bucharest) on a French locator; "NPP" left untranslated.
Still open, minor: a stray "533" label on the stacked bar after its note was dropped.

Reading: on static, both students now produce a figure-true plate in all eight families. The 12B is slower per turn
but needs fewer turns than Qwen on lollipop and locator; Qwen is faster where it gets it first time. The defects
left are not wrong figures but wording (Tune) and placement (minor).

### Step 2b: one representative per family in web, video and scrolly, the 12B then Qwen3.5-9B (2026-11-15)

Seeded runs, `SPLASH_STOP_AFTER_CRAFT=1`, one at a time on Osaurus, 18 cells per student. Every render was looked at
and its figures checked against the run's own `data.json`.

| Family (story) | 12B web · video · scrolly | Qwen web · video · scrolly | Figures vs data.json |
|---|---|---|---|
| likert (diverging stacked) | rendered ×3 | 10 · 37 · 21 turns, rendered ×3 | exact (France nuclear 67.7, fossil 5.1, renewable 27.2) |
| beeswarm | rendered ×3 | 5 · 56 · 9 turns, rendered ×3 | exact (6 countries above 20 t, 0.55 % shown "0,6 %") |
| area | rendered ×3 (web on rerun) | 14 · 35 · 13 turns, rendered ×3 | exact (3 158; 1 575.1; peak 46.2 in 1973; 32.1 in 2024) |
| marimekko | rendered ×3 | 32 · 20 · 16 turns, rendered ×3 | exact (1 637.5 TWh; coal 200.9 = 12.3 %; DE+PL 99.5 %) |
| calendar heatmap | rendered ×3 | 26 · 14 · 35 turns, rendered ×3 | exact (31 days above 20 °C, 18 Jul–17 Aug; August 22.2) |
| tile cartogram | rendered ×3 (web, video on rerun) | 74 · 72 · 96 turns, **none** | 12B exact (65.1 by country; Russia 35.9) |

The cartogram takeaway's second clause ("44,9 % au kilomètre carré") needs each country's area, which `data.json`
does not hold: the 12B dropped the clause, as the headline guard offers (`guards.mjs` `droppedFigureClauses`); Qwen
kept restating 44.9 in video, crashed its own beat on a null mean in web (`sum()` called on the mapped row objects),
and lost the scrolly to gesture refusals.

Fixes from the pass: `be8b16b7f`, `6b806ffe4`, `a823ae0e1`, `1cdc03c5d`, `cc754442d`, `a91fc0be1`, `0d5f0ae99`.

Open, by triage:
- Tune: English country names on French pages (both students); the limits card placed last in a scrolly (12B);
  re-sending an identical call after a refusal (12B); one empty 16 384-token generation (12B, 849 s); Qwen keeps a
  figure the guard asked it to drop; "11 août : 25,5 °C" stated without "the warmest day of August" (Qwen video).
- Harness: a beat that throws while loading is answered with `data.json`'s shape even when the throw is a null in
  the model's own arithmetic — the refusal should name the beat's line instead; the calendar key breaks at 19 while
  the claim's threshold is 20.
- Seed: the cartogram story claims a figure its data cannot produce.

Reading: the 12B renders all six families in all three moving formats with exact figures; Qwen renders five of six,
in fewer seconds per cell where it succeeds, and fails only where it must drop a clause of the journalist's own words.

### Step 3: delivery measured, area story × four formats × both students (2026-11-15)

The journalist's sheets for this leg (`approval`, `delivery: owned-file`, `closing`) were missing from `eval/sheets/`:
a first batch ran ~5 h with every run looping on "I don't know." at the approval gate. Measured instead one cell at a
time, sheets read from `SPLASH_SHEET_DIR` (`4019dd02b`), seeded from the designer leg where a kept run existed and
watched at each gate. Every export was opened and its figures checked against the run's `data.json`.

| Cell | Result | Turns · seconds | Export |
|---|---|---|---|
| 12B static | delivered | 163 s | svg + png + HANDOVER |
| 12B web | delivered | 165 s | html + png + HANDOVER |
| 12B video | delivered | 164 s | mp4 + final frame + frames.svg + props.json |
| 12B scrolly | delivered | 167 s | html + 4 card PNGs |
| Qwen static | delivered (designer leg) | 22 · 432 s | svg + png |
| Qwen web | delivered (designer leg) | 18 · 388 s | html + png |
| Qwen video | delivered (full cell, craft → deliver) | 56 · 846 s | mp4 21.2 s + final frame |
| Qwen scrolly | delivered (full cell), on the second deliver session | 55 · 616 s | html + 4 cards |

Figures, every export: 49.9 % after 1986 over 38 years, 3 158 Mt stock, peak 46.2 in 1973, 32.1 in 2024 — exact.

Fixes from the pass:
- `11dd8d0d7` — a seeded designer or delivery leg had no `BRIEF.md`, so `completionState` refused every approval
  (`currentBriefBinding` needs its `planVersion`/`findingIds`).
- `a269df13b` — a kept run now keeps `export/`.
- `5cc5c2fcf`, `51b39754a` — the handover alt was the first `aria-label` in the render ("Le stock entier", a gesture's
  label); now `<desc>`, then the `role="img"` figure, then the root svg. Replayed on four real renders.
- `86b23e303` — `read_file` on a PNG returned its bytes as text (Qwen's static designer leg: 308 s against the 12B's
  59 s); it now refuses and names `look` with the same path.
- `57988e71b` — Qwen called `offer_forms`, then ended its turn with no word; the journalist was sent "" and the
  session stopped at "no first record in 16 model turns". The forms the tool listed are now what the journalist sees.

Open, by triage:
- Skill (`skills/deliver/scripts/format-handover.mjs:140-155`, not ours to edit): files are described by extension
  only — a video's `frames.svg` is called the vector file "à donner au CMS", `props.json` "livré avec ce visuel",
  and each scrolly card PNG "une copie matricielle"; the cards are listed 2, 3, 1, 4.
- Tune: the video alt is the title, not the alt sentence the static carries (the video render has no `<desc>`).
- Harness, fixed after the pass (`0df72df32`): Qwen guessed paths in every designer and delivery leg —
  `beats/beat-1/` for `beats/1/`, and `skills/…/references/` under the story folder.

Reading: delivery completes in all four formats for both students once the journalist's answers exist; the
remaining defects are in the handover text the skill writes, not in either model's choices.

### Step 4b: the cartogram re-judged on Qwen3.5-9B after the seed decision (2026-11-15)

Rémy kept only the 65,1 % in the takeaway (the 44,9 % "au kilomètre carré" clause could not be computed from the data).
Four static runs of `gx-cartogram-area-distortion-and-tile-cartogram` on `osaurus-qwen`; each failure was read at its
first gate and fixed before the next run.

| Run | Outcome | Cause | Fix |
|---|---|---|---|
| 1 | refused | the title's 65,1 is the marks' mean; the guard accepted only a mark or a pair | `02ec1174e` the marks' mean is a figure the plate carries |
| 2 | same failure 3x | the recorded `gestures.json` said "Russie, 12 %"; Qwen edited beat.mjs, which the kit no longer reads | `3ac35ffca` a gesture refusal on a recorded staging names `record_gestures` |
| 3 | no new record in 12 turns, then refused | `render_beat("beats/1/beat.mjs")` refused (7 turns lost); its measure left `other_renewables` out (mean 65,01) and the refusal said to compute a measure it was already computing | `c3c77998f` a file path names its beat; `3d38112bf` a near-miss mean names the average and the columns |
| 4 | **crafted**, 7 turns, 162 s | — | — |

Run 4 checked against data.json: 40 tiles drawn and Ukraine as no-data, Russia 35,9 % (noted 36 %), mean 65,09 %
(title 65,1 %), legend breaks 40/60/75/94. One editorial weakness is left to tuning: the pull-back note gives the same mean twice
("moyenne par pays : 65,1 % ; moyenne par tuile : 65,1 %").

## H1: place names in the story's language (2026-11-15)

Owner: `skills/analyst` (865252336). On a story whose `language` is not English, `build-data.mjs` gives
the column of names a sibling `<name>_<lang>` derived from the ISO alpha-3 column (`Intl.DisplayNames`),
keeps the source's name for any code that is no country, and records the column in DATA-NOTES.md.
Tests: `skills/analyst/test/place-names.test.ts` (3; the two French ones fail with the call removed).

Measured on one cell, cartogram static, Qwen3.5-9B (run 1794759842107, 9 turns, 322 s, 0 refusals):
the analyst wrote `entity_fr`, the beat read it and its RUS note says « Russie ». The plate draws
ISO codes on the tiles (the kit's choice) and no English name. The pull-back tautology from run 4
(« moyenne par pays : 65,1 % ; moyenne par tuile : 65,1 % ») did not recur: the note is now
« Moyenne par pays : 65,1 % ».

**Three more cells, one at a time (Qwen3.5-9B, thinking off).** Beeswarm static (run 1794761561698, 13 turns,
196 s): the six countries over 20 t drawn « Arabie saoudite », « Trinité-et-Tobago », « Bahreïn », « Koweït »,
« Brunei », « Qatar »; 6 countries and 0,55 % of people recomputed from data.json (printed 0,6 %). Area web (run
1794761776846, 26 turns, 927 s, stopped by the 15-min cap): `Entity_fr` read, eyebrow « Climat · Suisse », no
English name on the page (the one "Switzerland" in the HTML is a comment in the kit's runtime); 1 575,1 of 3 158 Mt
after 1986 (49,9 %) and the 1973 peak of 46,2 Mt recomputed.

**One regression caught and narrowed (86c693c2e).** A first widening (ca79a090e) also translated a column of country
names with no code. On the locator, 12B (run 1794761306248), the model then wrote
`places: cities.map((c) => ({ name: c.name, label: c.country_fr }))` and printed « Ukraine » for Kyiv, Kharkiv and
Odessa. Reverted to code-keyed only; a test holds it. The cities left in English (Kyiv, Bucharest) are **Tune** (T7):
the locator contract already takes `places: { name, label }` and the model never fills `label`; exonyms are editorial.

**Two follow-ups found by the same cells.** Bun's region table names CN « Chine continentale » in French; the press
writes « Chine » (0054c4a20, a per-language table of press names ahead of Intl, test fails without it). The area web
page printed the bracket's chip "= 1 575,1" beside the resting option « Le stock entier », which reads as "the whole
stock = 1 575,1"; Qwen spent its last ten minutes on that line. The chip now reads « 1 575,1 · 49,9 % »
(`gesture-time-web.mjs`, test fails without it).

## Thinking on Qwen3.5-9B (2026-11-15)

Tom's order is thinking before training. On the 12B it was measured on 2026-10-28 (7/7 → 0/7 with thinking on;
KTD4 keeps it off). Qwen had not been measured. Two static cells, one at a time, `SPLASH_THINKING=on`, compared with
the same cells run with thinking off the same day:

| Cell | Thinking off | Thinking on |
|---|---|---|
| beeswarm static | 13 turns, 196 s; the six countries over 20 t named and tinted | 4 turns, 103 s; `record_gestures` names six countries typed by hand (China, India, the United States, Russia, Saudi Arabia, Canada) where the beat's own `above` held the six over 20 t — five of them sit under the line the title draws |
| cartogram static | 7 turns, 162 s (run 4) | 10 turns, 388 s; title right (65,1 %), but `entity_fr` ignored for a hand-written name table, the alt says « 63,5 % en moyenne » (Ukraine's empty tile counted as 0 over 41) and the standfirst « 41 pays dont la production est rapportée » (40 are) |

The thinking itself was short (103, 79 and 663 characters in the beeswarm turns): it did not plan, it skipped the
reading the beat already did. **Verdict: thinking stays off on both students** (KTD4 holds). Two of two cells
lost a fact they kept with it off; the time saved on one was spent on the other. Triage: Tune (hand-typed lists
over the beat's own computation, same class as the 12B's filter lists); the alt's mean is a guard gap (alt is not
held to the headline figures), noted as H3.

## Local gold from kept runs (2026-11-15)

No model call. `eval/harvest.ts` reads the kept runs since 2026-11-14 and keeps a craft leg when its last render
passed, the takeaway is drawn, no repair or fallback carried it, and thinking was off (78698b54a: the thinking
measurement's beeswarm, 1794762737021, typed the wrong six countries and had passed every other gate). Held-out
stories are excluded. Each candidate is then re-rendered under today's kits and guards (MapTiler key sourced):

| | Runs |
|---|---|
| craft legs since 2026-11-14 | 91 |
| harvest candidates | 67 |
| re-rendered OK, all four formats | 54 (static + web 32, video + scrolly 23, less the thinking run) |
| refused by a newer guard | 13 (Nuclear rows left out, "100 % of the whole", Syria cropped but drawn, a threshold note at 99 % with a place at 94,9 %, a scrolly baked for another stage size…) |

Two harness fixes came out of the re-render. H3 (d3d06f8ef) holds the geo-area alt to the title's figure check;
its first version refused "7 atteignent 94 % ou plus" on three choropleths, a count of places, not a measure
(7aab21f2d lets the alt count marks). The build step dropped 27 of 77 rows for an empty assistant turn: each was a
stall or token loop the harness cut and answered with a notice. `build_from_pi.py` now drops the cut turn and its
notice, keeping the recovered run (e61969800). Result: 71 sessions, 75 rows under a 32k cap (p50 ≈ 11k tokens by
the 3-chars estimate), 12B and Qwen about even, all four formats.

Hand-typed mark lists (T8) were scanned in `beat.mjs` and `gestures.json`: three literal lists, one the thinking
run (now excluded), two checked against data.json (the six over 20 t in the beeswarm, a year sequence in the area).

**Local training does not fit.** mlx-lm 0.32.2 has `gemma4` and `qwen3_5`. A LoRA smoke on Qwen3.5-9B 4-bit
(batch 1, grad checkpointing) crossed the 8 GB-free floor before its first step at 16k tokens and 8 layers (peak
footprint 10,4 GB while loading), and again at 8k tokens and 4 layers (guard stopped it at 7,3 GB free). With
the apps already open the machine leaves about 10 GB to the job; the 12B is larger. Gold examples can be made
locally; training them needs either memory freed for the run or a rented GPU.

Re-measured with the guard on macOS's own pressure level instead of free pages (the first guard did not count
the file cache macOS gives back). Apps left open, Qwen3.5-9B 4-bit, 8 layers, 8k tokens: loading and the initial
validation pass every time (val loss 2,992, 17 s); the first training step never completes. A guard at "warn"
stops at once, a guard on swap growth stops at +1,3 GB, and with only "critical" as the guard the step ran 654 s
before pressure turned critical (swap +0,9 GB). Training on this machine needs the apps closed, or a rented GPU.

Same smoke, apps still open, per model (mlx-lm 0.32.2, 4-bit, 8 LoRA layers, batch 1, grad checkpointing):

| Model | 1k tokens | 4k tokens | 8k tokens |
|---|---|---|---|
| Qwen3.5-9B | critical in 35 s, no step | — | critical, no step (563–654 s) |
| Gemma 4 12B | 3 steps in 39 s, pressure normal, ~140 tok/s | 3 steps in 150 s, pressure warn, ~120 tok/s | critical in 66 s, no step |

Qwen fails even at 1k, so its block is mlx-lm's training path for Qwen3.5, not memory headroom. Gemma trains, but
only up to about 4k tokens, and the gold rows are longer: median 9,264 tokens (max 49,835), with the system prompt,
tool schemas and first user turn alone at 3,250 (max 5,748). A 4k cap keeps almost nothing past the first answer,
so local training as-is would not teach the multi-turn behaviours T1/T3/T8 target.

### 2026-11-15 — T8 and T1 moved from Tune to Harness

Re-triaged by asking whether code can take the decision away from the model.

- **T8 (hand-typed set).** The thinking beeswarm drew a reference line at 20 t and highlighted six countries typed
  by hand, five of them under the line. `validateGestures` now reads a highlight or filter of several rows beside a
  reference line as one side of it: a set the size of a side (above, at or above, below, at or below) that is not
  that side is refused on `gestures[i].marks`, with the side's rows as the value that works. Test
  `test/gesture-set-threshold.test.ts` (4 cases, from the kept run's figures); mutation (guard disabled) → 2 fail.
  Limit: a hand list of another size still passes; the semantic check is size-anchored to avoid refusing a
  deliberate sub-set.
- **T1 (identical call).** Since the step-1 refusal, repeats fell to 1.7 % of calls, mostly an identical
  record_gestures right after a render, which re-rendered an unchanged still. The tool now returns the previous
  render with "identical to your previous call … not rendered again"; any beat.mjs write (refresh) clears it.
  Test `test/gesture-record-repeat.test.ts` (3 cases); mutations (short-circuit off → 2 fail; reset off → 1 fail).

### 2026-11-15 — triage T2–T7: what code can take

Question per item: can code remove the decision from the model? Measured on kept runs since 2026-11-01.

- **T2 (claimed record).** 12B: 65 claim nudges, half recovered; Qwen: 1. Forcing the call was tested on Osaurus:
  `tool_choice: "required"` and a named function are enforced by validation (HTTP 422 "The model completed without
  the required tool call"), not by constrained decoding. Stays Tune.
- **T3 (stall before the first beat.mjs).** 21 of 341 craft sessions were cut before a first write; 18 of those had
  streamed no word and no tool call (17 cut by the hidden-reasoning or silence limits, 1 at the 16 384-token cap),
  2 stock 12B runs were cut mid-`write_file`, and 11 sessions recovered. The premise "a long write that does not end" does not hold. Pre-seeding beat.mjs from the example was
  dropped: about 5 sessions in 341 would move, and every gold row teaches a first `write_file`. Stays Tune.
- **T6 (undrawn name).** 92 "is not a drawn row" refusals in 18 runs; 1 is a containment typo, 91 name another row
  ("2026 · Africa" vs "2016 · Africa", "2015 · World" vs "2015 · Africa"). No automatic repair is safe. Watch.
- **T7 (locator labels) → Harness.** `craft/_shared/place-labels.mjs` refuses a bare place on a non-English page when
  Natural Earth 10m populated places (5.1.2, public domain; 2 932 places whose name differs in fr/de/es/it/pt/nl/pl/sv,
  `craft/_shared/place-names.json`, built by `scripts/place-names.ts`) prints it otherwise, matched by data.json's
  coordinates (±0.25°) and spelling. The refusal gives both values that work (`label: "Kiev"` or `label: "Kyiv"`).
  Wired in the four gesture locator kits. Test `test/place-labels.test.ts` (8 cases); mutation (refusal off) → 3 fail.
  Replayed on the Qwen locator beat (`gx-locator-seeded-osaurus-qwen-1794693722817`) with bare places: refused on
  "Kyiv" → "Kiev"; with the example's labels kept: passes this guard.
- **T4 residue (tautological pull-back note).** A guard on a note repeating the title's figure was dropped: a
  reference line's note states the mean the title cites by design. Stays Tune.
- **H3** row in TUNE.md was stale: closed by d3d06f8ef.

## 2026-11-16 — live re-measure of T1/T7/T8

Seeded static cells, thinking off, one model at a time.

| Cell | Model | Run | Turns | Outcome |
|---|---|---|---|---|
| beeswarm | 12B | before d0e8f2882 | — | "Kuwait" refused by record_gestures; the reread then said "edit beat.mjs", 3 rereads, stop "same failure 3x". |
| beeswarm | 12B | after d0e8f2882 | 7 | T8 fired: Allemagne, Canada, Norvège, Turkménistan refused; computed set taken; French render. |
| locator | 12B | before 48261b7a2 | 10 | Render exit 0, but `label: c.name` bypassed T7: page printed "Bucharest". |
| locator | Qwen | before 48261b7a2 | 25 | Same `label: c.name` bypass. |
| beeswarm | Qwen | before 2f168824d | 7 | Set computed (T8 not needed), but drew `col("entity")`: "Saudi Arabia", "Kuwait" on a French page. |
| locator | 12B | gx-locator-seeded-osaurus-1794786931537 | 15 | T7 refused "Kyiv", then "Rostov"; final labels Kiev, Bucarest, Rostov-sur-le-Don. Exit 0. |
| locator | Qwen | gx-locator-seeded-osaurus-qwen-1794787218362 | 9 | Wrote `places: []` first: T7 not exercised. Exit 0. |
| beeswarm | Qwen | gx-beeswarm-seeded-osaurus-qwen-1794787363682 | 16 | Page-language guard refused 138 English names → `col("entity_fr")`; then T8 refused Chine/États-Unis/Russie/Australie beside the 20 t line → computed six. Exit 0, French. |

Fixes:
- **d0e8f2882** — a reread after a record_gestures refusal points back at record_gestures with the refusal, not at beat.mjs.
- **48261b7a2** — T7: a label equal (folded) to the source spelling is refused like a bare name; the refusal no longer offers the source spelling as a value.
- **2f168824d** — new: a drawn name read from column X when data.json carries `X_<lang>` with a different value, on a non-English page, is refused with `col("X_<lang>")` as the value that works. Lives in assertNoAggregates (all gesture families). Mutation: guard call removed → 2 fail.

Open: T1 not exercised in any of the 8 cells. T7 refuses one place per render (12B needed two rounds); could list all at once.

### T7 in one refusal (3f72c94e6), re-measured

| Cell | Model | Run | Turns | Outcome |
|---|---|---|---|---|
| locator | 12B | gx-locator-seeded-osaurus-1794825030802 | 9 (was 15) | One refusal named Kyiv, Bucharest and Rostov; one edit fixed all three. Exit 0, 217 s (was 284 s). |

## 2026-11-16 — teacher runs on the local 26B-A4B (T7/T8 cells)

Route llama-server, 26B-A4B Q4_0 + mmproj Q8_0, seeded, craft only, fallback off, 30 min cap, $0.

| Cell | Run | Turns | Outcome |
|---|---|---|---|
| locator | gx-locator-seeded-local26-1794825282159 | 7, 62 s | Wrote a FRENCH table without Rostov; T7 named it once; one edit; exit 0. |
| beeswarm | gx-beeswarm-seeded-local26-1794825350813 | 31, 657 s | Page-language guard refused `col("entity")`; then edit_file was sent write_file's `{ content }` twelve times, Pi's schema error never named write_file, the beat stayed unchanged under the same refusal; stop "same failure 3x"; recovered with write_file; exit 0. |
| beeswarm | gx-beeswarm-seeded-local26-1794826333766 (after ee9eca9f5) | 13, 116 s | Read `col("entity_fr")` first time; two note refusals (gap 38,2 → 38,0) taken; exit 0. Did not call edit_file, so ee9eca9f5 is not exercised live here. |

Fix **ee9eca9f5** — edit_file accepts `content` in its schema only to refuse it: "edit_file takes old_text and new_text,
not content: nothing was written. To replace the whole file, call write_file …". Tested through Pi's own
`validateToolArguments`; mutation (branch off) → 1 fail.

Harvest since 2026-11-16: 7 gold candidates (local26 3, 12B 2, Qwen 2), all static, 2 stories. The first 26B beeswarm
passes the craft gates but its session holds the twelve-call loop: not a gold row to train on as is.

## 2026-11-16 — moving formats (web, video, scrolly) on beeswarm and locator

Seeded, craft only, fallback off, osaurus, $0. Kits: beeswarm on gesture kits, locator on per-type kits (POINT_MAPS).

### Qwen3.5-9B, first pass

| Cell | Turns | Time | Exit | Notes |
|---|---|---|---|---|
| beeswarm web | 12 | 149 s | 0 | |
| beeswarm video | 30 | 379 s | 0 | edit_file loop on curly quotes (fixed 22e2bc781); a width disagreement Bun 206.29 px vs Chrome 210.98 px (`shared/chart-video/embedded-faces.ts:230`, out of scope) |
| beeswarm scrolly | 12 | 196 s | 0 | |
| locator web | 73 | 1790 s | 0 | own FRENCH_PLACE table; 5 vantage + 4 site-frame refusals; "La région" shows nearly all of Europe |
| locator video | 14 | 449 s | 0 | the film printed Bucharest / Kyiv: T7 guarded only the gesture kits (fixed 4e77e17ca) |
| locator scrolly | 98 | 1922 s | 1 | live guard "canvas undrawn" on every card — a kit defect, below |

Fixes:
- **22e2bc781** — `edit_file` / `edit_beat` match old_text with curly and straight quotes folded.
- **4e77e17ca** — T7 (`sourceSpelling`) in the per-type web and video locator kits (`printed: "name"` for the web kit, whose places print their name).
- **3256805b1** — locator scrolly drive: `scrolly-live` hands the reader its warm map once the warm is done
  (`handle.map = warmMap`); the drive confirmed its MapTiler label filter once, as a flag, on the FIRST map, so the
  reader got the style's 43 default country labels, in English, with white halos — counted as undrawn on a white
  ground. The confirmation now belongs to one map. The worked example failed the same guard on the seed's white
  ground; Qwen's beat re-rendered with the fixed drive: live guard 0 failures.
- **1efcb516e** — video locator: the kit's subject reading runs before the beat's own check; a point equal to the
  positions of data.json's lon/lat columns is named ("read Number(r[LON]), not Number(LON)"). Qwen's re-run wrote
  `lon: Number(LON)`, its check said "it stands in null" three times and the first session stopped.

### Qwen re-run after the fixes

| Cell | Run | Turns | Time | Exit | Notes |
|---|---|---|---|---|---|
| locator video | gx-locator-video-seeded-osaurus-qwen-1794833603575 | 69 | 1324 s | 0 | first session stopped on the column-index read (now 1efcb516e); second: T7 named Kiev, Bucarest, Rostov-sur-le-Don in one refusal, one edit, passed |
| locator scrolly | gx-locator-scrolly-seeded-osaurus-qwen-1794834929798 | 26 (was 98) | 459 s (was 1922) | 0 (was 1) | live guard green; five refusals, each taken (title form, river shape, empty card, empty note) |

Open, not harness-pi's to fix:
- The committed proof page `proof/scrolly-locator-zaporizhzhia` carries the same drive (identical copy): its reader
  gets MapTiler's default labels after the warm. The skill-side copy should be checked too (skills/ off-limits here).
- Width agreement Bun vs Chrome in `shared/chart-video/embedded-faces.ts`.
- Locator web: vantage refusals cost Qwen ~30 turns; "La région" frames nearly all of Europe.

### 12B (Gemma 12B, mv12, after the Qwen fixes)

| Cell | Run | Turns | Time | Exit | Notes |
|---|---|---|---|---|---|
| beeswarm web | gx-beeswarm-web-seeded-osaurus-1794835397961 | 28 | 392 s | 0 (repair loop) | gesture refusals taken; then 16 no-op edits after a verify refusal that said "fix the words" for a motion failure (now a9c3054e0) |
| beeswarm video | gx-beeswarm-video-seeded-osaurus-1794835791923 | 22 | 431 s | 0 (repair loop) | Remotion width agreement: "20 t : 6 pays" 206.29 px in Bun, 210.98 px in Chrome (2.3 % > 2 %), three times; same family as Qwen's |
| beeswarm scrolly | gx-beeswarm-scrolly-seeded-osaurus-1794836225101 | 11 | 484 s | 0 | clean |
| locator web | gx-locator-web-seeded-osaurus-1794836711472 | 32 | 1671 s | 1 | T7 refused "Rostov" correctly; the model's fix never landed: 10 of 11 edits had four leading spaces before `const FRENCH_PLACE` (now fad649df4); 15-min cap |
| locator video | gx-locator-video-seeded-osaurus-1794838384419 | 12 | 501 s | 0 | one T7 refusal naming five places, taken |
| locator scrolly | gx-locator-scrolly-seeded-osaurus-1794838887331 | 18 | 1399 s | 0 (second session) | first session: card 2 claimed a fact the file does not hold (refused, Tune), and title form 3 printed "Zaporizhzhia, NaN MW" (`biggest.mw` on objects carrying `value`), refused as "drops the takeaway's claim" without naming the NaN |

Fixes:
- **a9c3054e0** — web verify: when every failure is about motion (idle frames differ, rest does not restore), verify
  once more; a persistent motion failure now names the gesture, not the words. Measured residuals across kept runs:
  true reds ≥ 220 ‰ of pixels, flakes 0.07–2.1 ‰ — no clean threshold, so a second look rather than a wider one.
- **fad649df4** — `edit_file` / `edit_beat`: an old_text that only adds indentation before its first line, and that
  the file holds exactly once without it, is applied (new_text loses the same prefix).
- **f0f8ab29b** — `applyStoryboard` refuses any printed string (top-level fields, their forms, gesture
  note/card/label) that holds the word NaN or undefined, naming the field and index and the usual cause.

12B summary: 6 cells, 5 pass (two only after the repair loop), locator web failed on edits that never landed (fixed).

## 2026-11-16 — coverage before tuning: the harness's own difficulties, then the chart-type choice

Rémy (2026-11-16): cover the moving formats for every remaining family on both students before tuning, and read
each miss for what could be redesigned, not as pass/fail. Also: study whether choosing the chart type belongs in
code or in a narrow small model.

### Error classes across the kept moving-format runs, and the four redesigns they led to

Read across the kept web/video/scrolly sessions (scratchpad `errclass.py`), the largest repeated costs were not
craft at all but the student fighting the harness:

- **497005e45** — a reread was refused even after compaction had dropped the first read, so the model could no
  longer see the file it was told it had already read. Now refused only while that first read is still in context.
- **cda960ded** — the read tools' description named folders the session cannot read; Qwen tried them. The
  description now names only the session's own roots.
- **9e0ffed4b** — 48 of 227 old_text misses were edits the model had already applied (it retried the same edit
  after a refusal elsewhere). An edit whose new_text is already in the file, as whole lines, now answers as done.
- **13b68b083** — 33 repeat looks across 25 cells at a render whose bytes had not changed (Qwen histogram scrolly
  passed on its first render, then spent 12 turns looking again). A second look at an unchanged render, while the
  first is still in context, answers in text: judge from that look, stop if it reads right.

Each with a test that fails without the fix (mutation-checked). Remaining classes, to be read the same way:
true old_text misses (12B 66, Qwen 113), title/copy and gesture refusals, Qwen reads of paths that do not exist
(doubled story path).

### Qwen3.5-9B, mvq3 (histogram, gantt, sankey; after the four fixes)

| Cell | Run | Turns | Time | Exit |
|---|---|---|---|---|
| histogram web | gx-histogram-web-seeded-osaurus-qwen-1794841343251 | 26 | 258 s | 0 |
| histogram video | gx-histogram-video-seeded-osaurus-qwen-1794842084526 | 14 | 327 s | 0 |
| histogram scrolly | gx-histogram-scrolly-seeded-osaurus-qwen-1794842413307 | 18 | 502 s | 0 (12 of the turns were repeat looks: now 13b68b083) |
| gantt web | gx-gantt-web-seeded-osaurus-qwen-1794842917581 | 9 | 150 s | 0 |
| gantt video | gx-gantt-video-seeded-osaurus-qwen-1794843069604 | 4 | 139 s | 0 |
| gantt scrolly | gx-gantt-scrolly-seeded-osaurus-qwen-1794843210952 | 7 | 143 s | 0 |
| sankey web | gx-sankey-web-seeded-osaurus-qwen-1794843355913 | 14 | 177 s | 0 (one read of a non-existent beat.mjs, one reread refused) |

### Chart-type choice: code or a narrow model?

Today `show_candidates` takes two free candidates from the student; code canonicalises them, refuses
near-duplicates and checks `drawable`. In non-seeded storyboards the students' proposals were often generic or
near-duplicates (12B 31 ok / 9 refused calls, Qwen 22 / 1). The question is which part of the choice a small model
should make at all.

Probe (`eval/choice/`, both students on Osaurus, 39 gx seeds × 3 repetitions = 117 answers each). Gold = the type
the seed was written for — a harsh target, since a story usually admits more than one right type; 10 seed types
(radar, pictogram, beeswarm, marimekko, gantt, contour, population pyramid, cartogram, parallel coordinates,
streamgraph) are never in the top 2 of any table, by design of the sheet.

**Flat** (`flat-probe.ts`): free pick from the 40 catalogue names, or one intent from the 20 of `chart-choice.md`.

| | Qwen | 12B |
|---|---|---|
| free: gold in the two named types | 29 | 35 |
| one of 20 intents, story only | 15 | 26 |
| one of 20 intents, plus the seed author's intent line | 46 | 37 |

Both collapse onto attractor intents (Qwen: "compare composition" 34–40 times of 117; 12B: "before and after",
"composition", "rank"). The 9-column energy dataset alone pulls Qwen to composition, whatever the takeaway says.
A 20-way choice is too wide for either student; data shape cannot decide either — five datasets carry the 39
stories, so the takeaway is the only signal.

**Hierarchical** (`hier-probe.ts`): the coarse family comes from the journalist (simulated as the family of the
gold type's best intent; 7 families: compare categories, change over time, distribution, relationship,
part-to-whole, sequence or flow, location). The student then picks one intent among that family's 2–5, and —
measured on its own — one type among that intent's table rows given their use-when / not-when text.

| | Qwen | 12B | Code alone |
|---|---|---|---|
| intent inside the family (2–5 options) | **82** | **90** | 18/39 seeds = 54 of 117 (first option) |
| type: gold first | 50 | 63 | 57 (table rank 1) |
| type: gold in the two proposed | 83 | 91 | 87 (table ranks 1–2) |

Reading:
- The intent step is where a narrow model earns its place: 70–77 % against 46 % for code's default, and against
  13–39 % for the same model facing all 20 intents. Misses sit almost all in "compare categories" (5 options:
  rank vs several series vs gap vs deviation vs survey balance) and in location (locate vs regions vs field).
  Survey balance and deviation from a reference are partly detectable in the data and the comparison field — a
  later code narrowing.
- The type step adds nothing reliable over the sheet's own ranking (12B +4, Qwen −4 on the top two, out of 117).
  Code keeps it: deterministic, free, and the "why" is the table's use-when text, not prose the student invents.

Proposed design (Tom's "code > model for routing; the 2B makes the narrow decision"):
1. Journalist answers the coarse family (today's 4-way question widened to the 7 families, or code proposes
   location / time from the data's columns and the journalist confirms).
2. One narrow model decision: the intent inside that family, closed list, JSON `{pick}`. The student can make it
   now (12B 77 %); it is also the cleanest Tune row in the pipeline (story → intent number) and the natural slot
   for a 2B decision model later.
3. Code: drawable filter on the data profile, table ranking, two distinct candidates, use-when as the reason.
4. The journalist chooses between the two — the editorial decision stays theirs.

Not yet built: it changes `show_candidates` and the storyboard question; to be done after the coverage batches.

## 2026-11-17 — moving-format coverage on Qwen3.5-9B, family by family (mvq4–mvq47)

One cell at a time (seeded, `SPLASH_STOP_AFTER_CRAFT=1`, so `completed=false` is expected), each watched render by
render; a cell is stopped at the second repeated refusal, its story copied, the fault fixed test-first on the
decomposed element (mutation-checked), and the cell re-run. A cell passes on `headline=true, refusals=0` AND on
looking at the output (web: desktop page; video: an ffmpeg tile of the mp4, never the still alone; scrolly: the cards).

| Family / type | Web | Video | Scrolly |
|---|---|---|---|
| sankey | pass (mvq3, 14 t) | pass (mvq4, 13 t) | pass (mvq4, 27 t) |
| small-multiples | pass (mvq13, 23 t; mvq4–12 stopped or failed) | pass (mvq15, 8 t) | pass (mvq16, 21 t) |
| connected-scatter | pass (mvq19, 20 t) | pass (mvq20, 35 t) | pass (mvq22, 52 t) |
| lollipop (length) | pass (mvq25, 29 t) | pass (mvq26, 23 t) | pass (mvq28, 17 t) |
| stacked-bar (stack) | pass (mvq29, 40 t) | pass (mvq30, 4 t) | pass (mvq31, 7 t) |
| dot-strip (position) | pass (mvq35, 11 t; mvq32–34 stopped) | pass (mvq36, 28 t) | pass (mvq37, 15 t) |
| line (time-series) | pass (mvq38, 14 t) | pass (mvq39, 15 t; kit fix after looking) | pass (mvq40, 12 t) |
| pictogram-isotype (units) | pass (mvq41, 4 t) | pass (mvq43, 13 t; mvq42 stopped on a repeated refusal, 2 fixes) | pass (mvq44, 7 t; kit fix after looking) |
| pie-and-donut (part) | pass (mvq45, 8 t) | pass (mvq46, 13 t) | pass (mvq47, 17 t) |
| heatmap-matrix (cell) | pass (mvq48, 14 t) | pass (mvq49, 13 t) | pass (mvq50, 17 t) |
| calendar-heatmap (cell) | pass (mvq51, 25 t) | pass (mvq52, 17 t) | pass (mvq54, 27 t) |

Reading:
- Every cell ends passing once the harness answers the failure it showed; none needed a model change. Turns fall
  sharply on the formats run after a family's web fixes (stacked-bar video/scrolly 4 and 7 turns).
- The one refusal every non-English cell still pays is the first render reading `entity` where the page prints
  `entity_fr`: 77 kit examples read `col("entity")`/`at("entity")`, each localizing its own way (some carry a typed
  FRENCH table). Not rewritten mechanically; costs one turn, self-corrected every time. Open (names-from-data).
- Polishing after the first passing render is the main turn sink (mvq36: the model reconciled the strip's printed
  +29,5 with a title's "30 points" for ~10 turns). Answered by printing what the kit draws on its own (f009b9f37,
  36d10bbac); mvq37, the first cell with it in scrolly, took 15 turns against 28 for the video.
- A passing cell can still carry a kit defect only the picture shows: mvq39 (line video, refusals=0) set the peak's
  note on the plateau beside it, its halo erasing the line. Fixed in the kit (f107996a0), re-rendered from the kept
  beat. Open: a level note wider than the free space beside the line still crosses it once (wrap to two lines).
- Two refusals that named no cause, both on mvq42 (pictogram video): a filter on `YEAR = 2023` where data.json
  holds only 2024 emptied `units` ("must be a non-empty array" twice), then blocks counted with inverted bounds
  noted "0 pays seulement" ("drop the note" three times: no figure is ever within half of 0). Each refusal now names
  the cause and a value (e94c01ee8, d29cf491c); mvq43 passed. mvq44 (scrolly, refusals=0) clipped "6 sur 40" at the
  stage's edge: the label column was measured while the label was still empty (368f0e6b2). Open, kit: the video
  prints the count twice ("6 6 pays seulement") and a stray spine tick shows one frame before the bracket.
- pie-and-donut: all three cells spent their first render on a shorter title form copied from the kit's own example,
  which the shorter-form guard refuses (fixed in the four examples, ce19df276; the cells ran before it). Seen, open:
  the web donut leaves India (3rd of 9) unlabelled at 1920x940 while smaller parts are named — its arc sits at six
  o'clock and the label below the ring needs a 1656px plot; the scrolly's 375px header kept title form 1 while a
  shorter form was available (one turn; mobile, after desktop validation).
- heatmap-matrix web (mvq48): two refusals ".chart-gesture-N changes nothing" on a filter written without a note —
  the control revealed an empty sentence, and the model could only answer by trading the filter for a reveal. The
  control now reveals its own pieces, and a matrix filter's carry the kept cells' span (18e356790). The page itself is
  clean: seven rows, three paths (hydro, nuclear, mixed) readable at a glance. Video and scrolly passed with no
  refusal; open, kit: the scrolly's prose card covers the compare's second cell (France · nuclear) on cards 2-4.
- calendar-heatmap web (mvq51): the first render was refused for the example's short title form, which drops the
  year (1c64a2ae0); the second passed and is the page kept. The model then kept polishing, rewrote the run's loop
  wrongly (17 days), and the trace-note guard answered with a broken value: matched by value alone, its 17 passed
  (the run ends on a 17th) and the length went into the start date, "du 31 août". Figures are now read by role
  (a92328e5d). Open, kit: the key's top class reads "≥ 19" against the takeaway's 20.
- calendar-heatmap scrolly (mvq53 stopped, mvq54 pass): mvq53 was refused twice for a title that "did not match
  the takeaway" — it did, but typed with the "ﬁ" ligature; mvq54 then lost one letter ("afilée"). The literal-title
  repair now compares NFKC-normalised text with straight quotes (dfae5f629) and forgives a slip of two characters
  when every figure matches (84c5b420b); a title one figure off is still refused.
- locator web (mvq55 stopped): the model walked its three radii between 130/320/800 and 470/1150/2900 for the
  whole cell, refused in turn for "site frames no peer" and "voisinage and europe frame the same window" — neither
  named a value. Both are now refused before the bake with rising radii computed from the peers' own distances
  (f8be30787); on mvq55's own beat it offers 500 · 650 · 1300, which pass both checks.
- locator web (mvq56 stopped): the model took those radii and was refused, after the bake, for a 1.77x step —
  vantage.ts asks each frame to be twice the last, and the offer ignored it. On this data no ladder of four removes
  fits under the file's 3766 km. The offer now holds the 2x step, is checked before the bake, and when nothing
  fits says what to change: settlements off, then one non-default remove dropped (4b0966903).
- locator web (mvq57 stopped): the radii passed; a place-name refusal (data.json's "Bucharest") carried a
  row-access hint that was false — the beat had mapped rows to objects by index, then filtered them as objects
  under the same name — and the model rewrote its working access into a broken one (others read as {}). The hint
  now searches only the callback a .rows method was handed and the body of a loop over .rows (fa0760107).
- locator web (mvq58 PASS, 20 turns, 924 s): took the place names, then the ladder the refusal offered (site
  dropped, settlements off, region 500 · voisinage 1200 · europe null) and rendered. Looking at it: with
  JavaScript on, every remove shows the widest view. skills/map-web/assets/live-locator.ts (line 691) caps the
  zoom where the two closest marks stand 18 px apart; here they already do at the widest fit, so the ceiling is
  the widest zoom and fitBounds cannot reach region (+5.0 zoom needed) or voisinage (+2.4). The scale bar then
  states the region's 20 km over a continent. The earlier locator web cell (1794827803674) shows the same.
  Out of this harness's reach (skills/): the ceiling should be at least the narrowest remove's fitted zoom.
- choropleth web (mvq59 PASS, 6 turns, 140 s): one title refusal (a short form dropped 94), then rendered; seven
  of forty above 94 %, Albania called out. Looking at it: the ramp's foot (< 40 %) and "non rapporté" are two
  near-identical greys, so Russia and Belarus read as either.
- proportional-symbol web (mvq60 PASS, 14 turns, 1063 s): rendered; 985 of 8 813 sites drawn, area-true legend. The
  largest site is labelled by its country ("Ukraine 6 000 MW"), not its name.
- dot-density web (mvq61 stopped, mvq62 PASS, 12 turns, 144 s): two kit defects, neither the model's. The title-form
  guard read the takeaway's "8 900" as 8 and 900 (47a36412b reads a spaced thousands group as one number). Then
  verify-web refused the page five times "on motion" for a filter that was right: 8 900 dots drawn as one circle each,
  in every state, never finished painting between two frames (phone idle frames 515-816 px apart; "rest" off by
  216 k px). 249e4b726 draws one path per group and style; mvq61's story replayed outside the model passed twice,
  201/0. Left: the filter note prints a stray "· 1 · 72 – 72"; the height-bound map leaves wide margins at 1600.
- contour-isoline web (mvq63 stopped): no beat could pass. The takeaway says 132 km median, 682 km deepest; the
  per-type web kit measured the claim on its own 7 km raster (132.50 → "133", 681.41), every other contour kit on the
  6 km LAEA grid (131.73, 681.81). The model looped between its check() refusing 132 and the title guard refusing a
  computed title. 3eabde01a measures the claim on the 6 km grid (a byte-for-byte copy of the static kit's field.mjs)
  and keeps drawing on 7 km; mvq63's story replayed outside the model renders with the title's 132/682.
- contour-isoline web (mvq64 PASS, 11 turns, 776 s, 0 refusals): title 132/682 as the takeaway says, labelled
  isolines, step control. Looking at it: height-bound at 1920, so wide empty basemap either side (as dot-density);
  "CÔTE" in capitals in the subtitle (model).
- locator web, the zoom ceiling (mvq58's page): 43216d60e (skills/map-web, at Rémy's go) raises the ceiling to the
  narrowest remove's fitted zoom when the closest-pair separation alone sits lower. mvq58's beat re-rendered and driven
  in Chrome: leash 3.771..5.486 (was 3.771..3.771), and Europe, voisinage and région now each show their own frame.
  Left, model-side: the région bar says 20 km, a few pixels on a 1 000 km frame.
- flow-map web (mvq65 stopped): the per-type web kit (first measurement) required a population column for its
  per-inhabitant measure; the seed's table is entity, code, month, people. Three refusals on "no column population",
  none naming a value that works. b1d2ad580: `population: null` gives a two-measure page (count, per 1 000 km²), and a
  beat naming a missing column is told that value. mvq65's beat, adapted, replayed outside the model: rendered, lead
  passes from Germany to Malta, 7 bands under the floor at per area. Seen: the frozen frame centres on a wide Atlantic.
- flow-map web (mvq66 PASS, 40 turns, 1013 s, 0 refusals counted): population: null taken on the first turn. The
  model's own check() read c.leaders as the top two by count (they are each measure's leader) and refused itself 3x
  before reading c.ranked. Looking at it: two-measure control, bands right; the map is height-bound at 1920, so the
  Atlantic and Kazakhstan fill the sides; the subtitle repeats "une bande par pays d'accueil" (model: standfirst + limits).
- hex-grid web (mvq67 PASS, 15 turns, 201 s, 0 refusals counted): one title-form refusal (short form dropped 36,1 and
  1 000), fixed next turn. Looking at it: Czechia accented with its value, comparison toggle, honest origin hex. The
  five-class ramp is hard to tell apart in its middle (5-12, 12-18, 18-25 sit close in lightness).
- cartogram web (mvq68 PASS, 9 turns, 204 s, 0 refusals): rendered on the first try. Looking at it: equal tiles, Russia
  outlined with "36 %", Ukraine as "not reported", Russia / Norway toggle. Same close mid-ramp classes as the hex grid.
  With mvq67 the eight maps now pass in web on Qwen3.5-9B.
- choropleth video (mvq69 PASS, 24 turns, 507 s, 0 refusals counted): short title form without 94, then
  `${format(v)} %` with a format that already ends in " %" gave "100 % %"; the hole check read the second % as a hole
  and offered "100 % 100 %". 4861f4eba names a unit written twice and offers it once. Looking at the mp4 (4 frames):
  title card, reveal, filter on the 7 countries at 94 % or more, Albania named; the whole map closes. No class legend in
  any frame, while the reading line says the breaks are printed under the map: a reader cannot read a class.
  38116e453: the gesture kit had dropped the per-type kit's key; the area maps' video now prints one swatch per class
  under the unit line (labels as on the web page, the missing label last), each arriving with its class. Replayed
  outside the model on mvq69's beat and on the tile cartogram's example: the key reads in the mp4's own frames.

- mvq70 proportional-symbol video (Qwen3.5-9B): PASS, 9 turns, 308 s, 0 refusals. Title card, the hundred circles
  climbing to « 100 sites : 43,0 % » against « 8 800 autres : 57,0 % », key 4 000 / 400 MW. The end frame credited
  « © MapTiler © OpenStreetMap » only: the longer forms found no corner of open sea, and the last form, copied from
  the kit's own example, named the basemap alone. 0f028cb32 refuses that form in the four point-map video kits (field +
  « WRI · © MapTiler © OpenStreetMap ») and drops it from the bubble and contour examples; replayed on the bench, the
  WRI form fits the same corner. Left as is: the map is wide-bound, so the Atlantic fills the left third.
- mvq71 dot-density video (Qwen3.5-9B): PASS, 19 turns, 499 s. The 72 reactors ringed in teal over the 8 872
  plants, but nothing said what a ring was (the gesture kit's key carried only the unit line, where the per-type kit
  named the subject), and the filter's note was the takeaway again under the title. b2996829c names each ringed group
  in the key (« ○ nucléaire »); a new guard refuses a note whose words, figures aside, are the takeaway's, and repairs
  it away; a one-row compare's refusal now gives real rows (« marks: ["Nuclear", "Hydro"], or of: "whole" ») instead
  of a shape. Replayed on the bench: the guard refuses the beat as written, and without the note the subject frame
  reads by its key alone.
- mvq72 contour video (Qwen3.5-9B): PASS, 22 turns, 663 s, one title refusal recovered (form 2 dropped 132 and
  682). Title card, then the sweep: « 50 % à moins de 132 km » with the cumulative curve and the bands filling, to
  « 100 % à moins de 682 km » and the deepest point ringed; check() holds both figures against the field. Kit residue
  (backlog, not model): the « hors mesure » swatch is the land's own grey, so it reads as nothing; isoline labels
  inside the filling band are grey on green mid-sweep; the credit lands just above the readout in the left panel.
- mvq73 flow-map video (Qwen3.5-9B): PASS, 17 turns, 844 s, 0 refusals. Title card, the bands drawn out of Ukraine,
  the count climbing to 4 504 080, the others stepping back while « Allemagne + Pologne » counts up to 49,1. The
  readout printed « Pologne: 49,1% »: the kit's example carried the no-break spaces, the model dropped them, and
  applyStoryboard normalised a beat's fields but never what its functions return. Now a French plate gets the
  no-break space before : ; ! ? % where none was written, and count/share/host/figure's words pass through the same
  apostrophe, decimal and spacing rules; replayed on the bench, « Allemagne + Pologne : 49,1 % ». Kit residue
  (backlog): a destination label can sit on another flow's line (Tchéquie, then Autriche once the wider readout moved
  the map); an unlabelled thin flow leaves Romania southward.
- mvq74 hex video (Qwen3.5-9B): PASS, 28 turns, 932 s. Title card, the grid revealed by class with the top class
  (CZE, SVK) arriving last, « La Tchéquie : 36,1 pour 1 000 habitants », then Germany ringed beside it, « Une
  différence de 2,4 fois ». The guards did their work in the loop: a short title form without the figures, a
  « double » for a 2.44 ratio (refused, rewritten 2,4), a pull-back note restating the subject's figure. No new
  defect; the grid sits small in the frame (the map-frame backlog item).
- mvq75-77 cartogram video (Qwen3.5-9B): PASS at mvq77, 21 turns, 562 s. Two guard defects stopped the first runs.
  mvq75: the storyboard kept one clause of the article's sentence and the model titled with both; the refusal called
  the literal title "computed" (the model was already through it when I stopped the cell, too early). The plate now
  prints the takeaway when the title is the takeaway with a clause run on after « ; : — , ». mvq76: the takeaway's verb
  « est » named the row coded EST, so a name on Russia (the storyboard's own subject) was refused as not serving a
  takeaway "about Estonia", twice; a 2-3 letter code is now read only in capitals. The render: « Moyenne par pays :
  65,1 % », Russia ringed « Russie, 35,9 % », the whole grid. Kit defect (backlog, first of the geo frame items): the
  tile grid is drawn ~580 px wide at 1920, its tiles ~52 px, so the type floor binds and the codes spill onto their
  neighbours (« NOBSWEFIN »), and Russia's value sits across its tile's edge.
- Model-side residue (Tune, not Harness): mvq36's title names the ceiling's +2 that the three-gesture video never
  shows; "l'Chine" elision (mvq28).

Harness fixes, in order (each with a test that fails without it):

- e509a12e7 fix(craft): a syntax error names its column, and a number followed by a method names the parentheses that fix it
- 9ca983bf1 fix(craft): a sankey gesture on a zero flow is told it has no ribbon and offered a ribbon from the same source
- 4d296534f fix(craft): the web small-multiples kit draws up to 24 panels, so a takeaway about all sixteen is not refused both ways
- 9e26dff4a fix(craft): name the line, key column and missing entries when a hand-written lookup table finds no entry
- 7e8c9ce25 fix(craft): name an empty array read at its ends, and the beat.mjs line of any runtime TypeError
- fe700eb99 fix(craft): count a panel drawn under the entity's localized name or code as drawn
- dc74af2ab feat(craft): members() and a row-function y take the name and measure decisions out of the beat
- 2b21598e6 fix(harness): three stalls of Qwen3.5-9B on gx-small-multiples web, answered by code
- dd81bb637 fix(craft): refuse a fraction of one printed as a percentage
- eaa3d022f fix(craft): quote the web small-multiples example's article keys
- 32b38fff7 fix(craft): name the splitting column and m.where when two rows give one year
- f4a02f2da fix(craft): say an undefined bare name that is also a received key is a helper to define
- 3ae81475d fix(craft): build the video small-multiples example on members() and series()
- a02b9e49b fix(craft): build the scrolly small-multiples example on members() and series()
- 045d3441e fix(web): name only the verify failures beat.mjs can answer when a known false red sits beside them
- 8af70d667 fix(connected-scatter): write limits as a list of forms in the web and scrolly examples
- 000945147 fix(guards): name a check() test of a number the takeaway never states, and say to delete it
- 1b8987b7e fix(connected-scatter web): set the y title above the plot, over its graduations, not in a corner the data may fill
- 73e7b0f80 fix(harness-pi): connected-scatter examples read names from data.json, not a typed table
- 423baa650 fix(harness-pi): scrolly connected-scatter counts the subject's two moves as drawn title figures
- 4f70bc8f6 fix(harness-pi): a shorter title form may drop the period the takeaway frames its claim with
- 9612136e9 fix(harness-pi): a printed name that is a row's country code is refused when data.json holds its name
- f60c98ced fix(web): refuse a list where the page prints one text, instead of gluing its items with a comma
- ad91e43aa fix(scrolly-lollipop): read names from data.json by column index, keep only articles typed; short title forms keep the takeaway's numbers
- a21b15da8 feat(render): hint that a data.json row is a list when a failed beat reads it by a column name
- 103b8f1a2 fix(guards): open the first limits form with the journalist's words instead of refusing it
- f8f568ef6 fix(render): name a ${…} written in plain quotes when a render fails
- 6a82c949f fix(gestures): drop code written into a note and give each hole its mark's figure
- 59913ae46 fix(stack): accept a segment stated as a percent of another part of its bar
- 43f047b3b fix(position): draw and name the compared row on a paired dot strip
- f009b9f37 feat(position): say what a paired dot strip prints on its own
- be05439bd fix(position): refuse paired rows read from one data.json row, at the rows
- 36e40f46c fix(gestures): a null mark names no row
- 36d10bbac fix(position): print the dot strip's own change labels in video and scrolly too
- f107996a0 fix(time-video): step a note clear of the drawn line, trying both sides at each distance
- e94c01ee8 fix(craft): an empty list refusal names the beat's filter on a value data.json does not hold
- d29cf491c fix(craft): a note's 0 where the named mark holds a count hands back that count
- 368f0e6b2 fix(craft): the units scrolly reserves its label column at the widest text a label will show
- ce19df276 fix(craft): the pie-and-donut examples' short title form keeps the takeaway's numbers
- 18e356790 fix(craft): give a cell-grid web control without a note the reading it answers with
- 1c64a2ae0 fix(craft): the calendar-heatmap examples' short title form keeps the takeaway's year
- a92328e5d fix(craft): read a calendar trace note's figures by role — a day before a month, the length otherwise
- dfae5f629 fix(craft): fold ligatures before holding a title to the takeaway
- 84c5b420b fix(craft): take a title one slip off the takeaway when every figure is intact
- f8be30787 fix(locator-web): refuse a peerless or repeated window with radii that work
- 4b0966903 fix(locator-web): offer a ladder that steps out twice as wide, and say what to drop when none fits
- fa0760107 fix(harness): read a row's column-name access only where the name holds a raw row
- mvq78 choropleth scrolly (Qwen3.5-9B): PASS, 17 turns, 641 s, refusals=0. The title's short form dropped 94 and
  was refused once; the model put 94 back on the next render. Four cards: the seven ≥ 94 % countries, Albania ringed
  « Albanie 100 % », a ×3 zoom on the Balkans, then the whole scale. Kit defect (backlog): the ring's label sits over
  the Albanian shape and its halo is too thin to separate it from the dark class.
- mvq79–81 proportional-symbol scrolly (Qwen3.5-9B): PASS at mvq81, 16 turns, 445 s, refusals=0. mvq79 and mvq80 were
  refused for a stage mismatch ("the wide stage measured … and its cards were baked for …") that the worked example
  hit too: a kit defect, not the model's. The key's swatch boxes were sized for every card shape in
  `plan.fallback`, so the bake's blank 1 × 1 draft shapes widened them (draft stage 46 px shorter), and on the
  written page the tall shape, hidden on a wide stage, widened them until the key wrapped (stage 22 px shorter).
  Fixed in `symbol-drive.mjs`: the key counts only baked shapes the stage shows (6f96eb5cc, b79cb8534; tests fail
  without each). Other map scrolly drives read card shapes only to place an absolute ring, so no layout effect.
  Both cells' first render was refused by the model's own check, a cut note claiming "over half the power"
  (23.1 %, 41.2 % in the data); it rewrote the note from the figure each time.
- mvq82–84 dot-density scrolly (Qwen3.5-9B): PASS at mvq84, 31 turns, 345 s, refusals=0. Cards read: filter on the
  72 nuclear sites (the rest washed, rings on each), the "un tiers de la puissance" card, then the pull-back to every
  station. Three stalls, each fixed in code rather than in the prompt:
  mvq82, a card's figure no gesture draws was refused with an empty value, so the model moved 34,4 % from card to
  card; the refusal now offers the card without that sentence (4a5579fdb). mvq83, a shorter title form without
  8 900 was refused render after render; the guard now drops the forms that lose the claim and logs a NOTE
  (0587fb78c). The title then shrinks instead of shortening, so check it again when the mobile layout is designed.
  mvq83 also hit a highlight after a filter on the same fuel: the family's state changed (a ring), the flat state the
  scaffold interpolates did not, and the scaffold's "card 3 changes nothing" had no value, so the model re-read
  beat.mjs in a loop. The scheduler now compares flat states and refuses with the gesture to drop (592376bab); in
  mvq84 the model dropped it on the first refusal. Backlog: `name` on a whole fuel group shows no label of its own.
