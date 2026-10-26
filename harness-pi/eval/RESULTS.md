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
