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
