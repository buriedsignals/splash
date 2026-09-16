---
size: landscape
type: heatmap
---

# Beat — Iceland has run almost entirely on renewable electricity every year since 2016

**Size:** landscape (1920 x 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape, and why the other two refuse.** A heatmap is a MATRIX — eight countries against
nine years — and both axes are the argument, so it has no twin form: transposing it swaps which
variable reads down the frame, which is a different chart rather than a rotation of this one. No
aspect range has ever been MEASURED for it at a tall or square frame, so `type-at-size.mjs`
refuses by default and names the measurement that is missing. The 1080 x 1080 this beat used to
draw at was not a decision, it was a default.

**Proves:** since 2016, Iceland has generated essentially 100% of its electricity from renewables
in every single year, while the rest of a comparable set of European countries sits well below
that and, for several of them, is still visibly climbing.

**Medium / format:** chart / video. **Type:** heatmap (matrix) — one row per country (8), one
column per year 2016–2024 (9, chronological), cell colour = share of electricity generated from
renewables (%). Rows ordered by their 2024 value, descending, so the block pattern (a solid top,
a rising middle, a paler bottom) reads without needing the numbers.

## Data

- Source: Ember & Energy Institute, via Our World in Data, `share-electricity-renewables` grapher.
- **The trap this indicator hit, distinct from the documented `csvType=filtered` one**: this
  grapher's DEFAULT tab is a Map, and its plain `.csv?csvType=filtered&country=~CHE...` export
  ignores the `country` parameter entirely and always returns exactly one row per reporting
  country (192 countries) at whatever year the map happens to be showing — verified by fetching
  it three different ways (bare, with `csvType=filtered`, with country names instead of ISO
  codes) and getting 192 rows and all 192 country names every time. Forcing the chart's own LINE
  tab with `&tab=chart` fixed it: the `country` filter only applies to the tab that actually
  supports per-country history.
- Fetched (verified effective — 8 entities, 1920–2025, real per-year values):
  `https://ourworldindata.org/grapher/share-electricity-renewables.csv?tab=chart&country=~CHE~NOR~ISL~DEU~FRA~ESP~POL~GBR&csvType=filtered`
- `data.csv`: 377 rows (376 data rows + header), exactly the 8 requested entities — verified by
  counting distinct `Entity` values (8: France, Germany, Iceland, Norway, Poland, Spain,
  Switzerland, United Kingdom) and total row count. 2024 is the latest year every one of the eight
  countries reports in this window (Iceland's most recent row is 2024; the others also report
  2025, but the beat uses the common window 2016–2024 so every cell in the grid is real data, not
  a gap).

## Exact values — verified 2026-08-08 (share of electricity from renewables, %)

Rows below in the chart's own order (sorted by 2024 value, descending):

| Country | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Iceland | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | **100.0** |
| Norway | 98.1 | 98.1 | 98.0 | 97.9 | 98.5 | 99.3 | 98.6 | 98.5 | **98.6** |
| Switzerland | 61.9 | 62.8 | 58.7 | 59.9 | 62.2 | 66.6 | 58.3 | 63.2 | **67.4** |
| Germany | 29.5 | 33.5 | 35.3 | 40.2 | 44.4 | 40.2 | 44.4 | 54.7 | **58.6** |
| Spain | 38.7 | 32.3 | 38.3 | 37.3 | 43.9 | 46.4 | 42.8 | 51.5 | **57.3** |
| United Kingdom | 24.5 | 29.2 | 33.0 | 36.6 | 43.1 | 39.8 | 41.6 | 46.4 | **50.6** |
| Poland | 13.7 | 14.2 | 12.8 | 15.6 | 18.0 | 17.1 | 21.1 | 27.7 | **31.1** |
| France | 17.7 | 16.5 | 19.8 | 20.0 | 23.7 | 22.2 | 24.2 | 26.9 | **27.2** |

Domain used by the ramp: min = 12.76 (Poland, 2018) → max = 100.0 (Iceland, every year). Iceland's
row is literally invariant at 100.0 across all nine columns — the claim "every single year" is
exact, not rounded.

## Colour ramp — mechanical proof it is sequential

`rampAnchors(ground, accent)` (`HeatmapVideo.tsx`) derives two anchors at render time from
`ground = "#FFFFFF"` and `accent = "#1E7B45"` (this beat's hue — the same escalation shape
`deriveFurniture` uses for `muted`, but targeting the type doctrine's 3:1 non-text floor instead
of the 4.5:1 text floor):

- `low` = the palest `ground→accent` mix that still clears 3:1 against the real ground →
  `#5FA17B` (contrast **3.06:1** against `#FFFFFF`).
- `high` = `accent` pushed 60% of the way to black → `#0C311C` (contrast **14.27:1**).

`rampColor(t, low, high)` is a straight per-channel linear interpolation. Every channel of `low`
(95, 161, 123) is ≥ the matching channel of `high` (12, 49, 28), which is what guarantees
luminance decreases monotonically at every intermediate stop, not just the two ends — sRGB
decoding is monotonic increasing in each channel, so a same-direction per-channel interpolation
produces a same-direction luminance. Sampled at 9 stops (t = 0, 0.125, …, 1):

| t | hex | luminance | contrast vs `#FFFFFF` |
| --- | --- | --- | --- |
| 0.000 | `#5fa17b` | 0.2935 | 3.06 |
| 0.125 | `#55936f` | 0.2395 | 3.63 |
| 0.250 | `#4a8563` | 0.1913 | 4.35 |
| 0.375 | `#407757` | 0.1497 | 5.26 |
| 0.500 | `#36694c` | 0.1141 | 6.40 |
| 0.625 | `#2b5b40` | 0.0837 | 7.86 |
| 0.750 | `#214d34` | 0.0588 | 9.65 |
| 0.875 | `#163f28` | 0.0388 | 11.83 |
| 1.000 | `#0c311c` | 0.0236 | 14.27 |

Luminance strictly decreases at every step (never dips back up), and every stop clears the 3:1
non-text floor against the actual ground it is drawn on (`#FFFFFF`) — the dark-canvas trap
generalised: this beat's ground happens to be light, but the same escalation loop would move
`low` toward whatever ground it was given, so the floor holds regardless of theme. Verified
mechanically, not by eye, in `timing.test.ts`'s `rampAnchors + rampColor` suite (monotonic-decrease
assertion across 12 stops, 3:1-floor assertion across the same 12, plus a red-team test proving
the monotonic check itself is failable on a deliberately bad triple).

Per-cell text colour (`textOnCell`) picks whichever pole — pure black or pure white — measures
higher contrast against that SPECIFIC cell's own rendered fill, never a single global ink: black
on the palest cells (e.g. Poland/France early years), white on the darkest (Iceland, Norway,
Switzerland's later years). Only used where a value label sits ON a cell — the grid's final
column, in the conclusion event — never applied as a blanket ink choice.

## The build

Establish the empty grid — title, source, both axes (8 row country labels, 9 column year labels),
cell outlines with no fill — together, since colour carries no meaning yet. Lay down the colour
legend (min 13%, max 100%, labelled) and pause on it: a filled grid is unreadable to someone who
has not yet been told what dark and pale mean, so the legend is this beat's `reference` event, the
same role a baseline level plays in a traced-series beat. Fill cells column by column, 2016 → 2024,
strictly linearly (the x axis is time) — the reader watches Poland and France stay pale while
Norway and Iceland stay solid across nine advancing columns, the pattern accumulating rather than
appearing as a wall of colour. Iceland's row — unbroken from the first column to the last — gets
its own outline once every column has landed, and the beat closes by naming that fact
("Iceland: 100% renewable electricity in every single year of the period") and fading in the
final column's eight numbers, each labelled in the colour its own cell's fill picks.

## Anti-patterns for this case

- Iceland's row is the same value (100) on all nine columns — printing "100" in every one of
  those nine cells would be `anti-patterns.md`'s "repeated years or values" nine times over, the
  same failure the dumbbell's shared left dot named for itself. The row's flat 100 is stated ONCE,
  in the conclusion's callout sentence, not per cell.
- A rainbow or hand-picked multi-hue gradient was not used; the ramp is single-hue
  (pale-green → deep-green), verified sequential by construction, not by eye.
- Rows are ordered by 2024 value (deliberate), not alphabetically — alphabetical order would
  scatter the block pattern the whole point of a heatmap is to make visible.
- Cell separators are a real 4px gap, not a hairline the eye has to hunt for — the grid reads as
  discrete cells, not a smear, per the type doctrine.

## Source line

`Source: Ember & Energy Institute, via Our World in Data · Share of electricity generation from renewables, 2016–2024`
