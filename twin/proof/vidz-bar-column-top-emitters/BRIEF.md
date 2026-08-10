---
size: landscape
type: column
---

# Beat — China emits more CO₂ than the next five biggest emitters combined

**Size:** landscape (1920 × 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize` and selects the composition of that name. The beat used to state
1080 × 1080 in prose while `Root.tsx` and the component each carried the two literals separately,
so the size gate 2c chose reached nothing.

**Proves:** in 2024 China's territorial CO₂ emissions from fossil fuels and industry, 12.29 billion
tonnes, exceed the combined emissions of the five countries directly behind it in the world ranking
— the United States, India, Russia, Japan and Indonesia, 11.65 billion tonnes together. Five is the
largest number for which that holds: adding the sixth (Iran) takes the group past China.

**Medium / genre:** chart / video. **Type:** bar and column — one value per category, encoded as the
length of a rectangle from a shared zero baseline, categories sorted by value descending because the
story is a ranking. Drawn as vertical **columns** rather than horizontal bars, which is the half of
this type the corpus had not yet drawn in any genre and which keeps the beat visually distinct from
its row-based neighbours (`vidy-lollipop-…`, `video-population-growth-dumbbell`).

**This beat exists to close a measured gap.** Before it, the video genre shipped fourteen chart types
and the web genre fifteen; bar-and-column was the one type the web genre had (`web-co2-ranking`) and
the video genre did not.

## Data

- Source: Global Carbon Budget (2025) – with major processing by Our World in Data, indicator
  `annual-co2-emissions-per-country`. Citation string taken from the indicator's own metadata
  (`…/annual-co2-emissions-per-country.metadata.json`, `columns[…].citationShort`), not written from
  memory.
- Fetched: `https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?csvType=full`,
  then reduced to the single year the beat draws with
  `awk -F, 'NR==1 || $3==2024' co2-full.csv > data.csv`. The year filter is the only edit; **every
  entity is kept**, which is what makes the ranking claim auditable from the frozen file alone.
- `data.csv`: 247 data rows, one per entity, `Year` 2024 throughout. Rows with an empty `Code` are
  OWID-assembled regions and rows whose `Code` begins `OWID_` are OWID-defined entities (`OWID_WRL`
  is the world); `render.mjs` drops both by that test rather than by a hand-written country list,
  because a hand-written list is the "typed instead of computed" failure in a different coat.
- Unit: OWID publishes tonnes. `render.mjs` divides by 1e9; the axis says so.
- What the figure covers, and does not: fossil fuels and industry. **Land-use change emissions are
  not included** — that is the indicator's own subtitle, and it is in the rendered source line,
  because a CO₂ ranking that silently omits land use is a different ranking.

## Exact values — computed from `data.csv`, 2024, billion tonnes CO₂

| Rank | Country | Emissions |
| --- | --- | --- |
| 1 | **China** | **12.2890** |
| 2 | United States | 4.9041 |
| 3 | India | 3.1935 |
| 4 | Russia | 1.7805 |
| 5 | Japan | 0.9619 |
| 6 | Indonesia | 0.8122 |
| 7 | Iran | 0.7926 |
| 8 | Saudi Arabia | 0.6921 |
| 9 | South Korea | 0.5837 |
| 10 | Germany | 0.5723 |

Ranks 2–6 sum to **11.6522** < 12.2890 ✓. Ranks 2–7 sum to **12.4448** > 12.2890 ✗ — so the
headline's "five" is the maximal true count, and `render.mjs` throws if a future data refresh makes
either half of that false. The word "five" itself is indexed out of a number-word table by the
computed count; it is not typed into the title.

## The motion problem

The finding is not a property of any single column. It is arithmetic across five of them, and
nothing in a ranking's own build says it — a reader can watch ten columns arrive and still not know
that the second through sixth, added together, come to less than the first.

So the beat separates the two jobs. `reveal` builds the ranking and says only what a ranking says:
who is bigger, in what order. `conclusion` then introduces the sum as a mark of its own — a bracket
under the five columns being summed, a dashed leader rising from it, and a rule travelling left
across the plot at the summed height. The comparison is **seen**: China's column stands above the
rule. Nothing on screen asserts it in words.

The zero baseline is its own event (`reference`) before any column exists to be measured against it,
and it is left for 18 frames to be read.

## Anti-patterns for this case

- **The baseline is zero and there is no code path that moves it.** `columnGeometry` takes no
  parameter that could fit the scale to the readings. The type sheet calls a truncated bar baseline
  "a false statement about the data dressed up as a stylistic choice", and names the exact way it
  gets broken in practice: the line chart's honest-scale discipline bleeding across by habit.
- **One accent column, and it is the one the headline is about.** It happens also to be the tallest,
  which the sheet warns against as a *reason* — so the reason is written down here: the beat's claim
  is about China, and if the claim were about Germany the accent would be on Germany.
- **Every value label sits outside its column, in page ink, never on the fill.** The type's own
  accessibility trap is a label painted on a mid-luminance fill under a naive luminance rule; a
  label that never touches a fill cannot fail that way.
- **The category font size is measured, not fixed.** `fitCategorySize` finds the largest size at
  which every single word of every country name fits inside one column band. The sheet's named
  failure is a constant tuned against whatever sample names were on hand.
- **A value label never names a length that has not landed.** The number printed above a growing
  column is the height it is drawn at, `gt × growth`, not the value it is heading for. The first
  render printed the final value throughout: at frame 100 of the mp4, India's column stood at 2.15
  with "3.19" above it. Invisible in the final-frame still; found by extracting the frame.

## Verification

Rendered still first (`--still-only`), then the mp4; frames 0, 20, 60, 100, 150, 183, 200, 225, 250
and 299 extracted from `column-ranking.mp4` with ffmpeg and looked at. Two defects were fixed as a
result, both invisible in the still: the growing label above, and a blank frame 0 (see below).

**Frame 0 was blank white** — `establish` starts at frame 0, so everything gated on its progress is
at zero opacity there, and frame 0 is the poster frame a platform shows before anyone presses play.
Fixed here by putting the title and source on screen from the first frame at full opacity and
leaving only the axis furniture to fade in. **Measured: every other video beat in this corpus has
the same blank frame 0** — checked on `lollipop.mp4`, `line.mp4` and `waterfall.mp4`, all three
returning zero non-white pixels at frame 0. Those are not this beat's to re-render.

## Source line

`Source: Global Carbon Budget (2025) – with major processing by Our World in Data · fossil fuels and industry only; land-use change is not included`

## Alt text

Computed by `render.mjs` and written to `ALT.txt` beside the render, so it cannot drift from the
data the way a hand-typed alt text does.
