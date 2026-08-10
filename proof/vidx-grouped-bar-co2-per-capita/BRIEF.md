---
size: landscape
type: grouped-bar
---

# Beat — China's per-person CO2 emissions have nearly tripled since 2000, overtaking the world average

**Size:** landscape (1920 x 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape, and what the other two sizes would cost.** A grouped bar's category axis is
nominal, so `formForSize` answers `transpose` at a square or tall frame — five groups of two
vertical columns become ten rows, which is a redraw this beat does not carry. Both refuse loudly,
naming ladder rung R0, rather than stretching ten columns into 1080 px and clipping nothing. The
1080 x 1080 this beat used to draw at was not a decision, it was a default.

**Proves:** between 2000 and 2023, China's per-person CO2 emissions grew from 2.87 to 8.56 tonnes —
nearly tripling — and now sit almost twice the 2023 world average (4.71 t), among five major
emitters compared at both years.

**Medium / genre:** chart / video. **Type:** grouped bar — one category per country (5), two bars
per category (2000, 2023), value mapped to height from a shared zero baseline, one consistent hue
per series across every group (`references/types/grouped-bar.md`: "a series that swaps position or
colour between groups... breaks silently"). A reference rule (the 2023 world average) is laid down
before any bar grows, so the reader can see which countries sit above or below it once the bars
land.

## Data

- Source: Our World in Data, `co-emissions-per-capita` grapher (Global Carbon Budget 2025, via Our
  World in Data), filtered to Brazil, China, India, Nigeria, the United States, and the World
  aggregate (the reference line's own value).
- Fetched:
  `https://ourworldindata.org/grapher/co-emissions-per-capita.csv?csvType=filtered&country=~USA~CHN~IND~BRA~NGA~OWID_WRL`
  — verified effective (6 entities only, not the full ~200-country set).
- `data.csv`: **1008 data rows** (1009 lines with the header), **1750–2024**, 6 entities — World 230
  rows from 1750, United States 225 from 1800, Brazil 169 from 1856, India 156 from 1858, Nigeria
  110 from 1915, China 118 from 1907, every one of them running to 2024. The beat draws only the
  **2000** and **2023** rows per country, plus the **World** entity's 2023 row for the reference —
  filter at render time, never re-fetch.
  *(Corrected 2026-08-09: this line said 1007 rows, 1750–2023. The file has no trailing newline, so
  `wc -l` reports one fewer line than the file holds and the header was then subtracted from the
  wrong number; the counts above are parsed records, not line counts.)*

## Exact values (tonnes CO2 per capita) — verified 2026-08-08

| Country | 2000 | 2023 | Change |
| --- | --- | --- | --- |
| United States | 21.40 | 14.32 | −33.1% |
| China | 2.87 | 8.56 | **+198.1%** (nearly tripled) |
| Brazil | 1.95 | 2.29 | +17.3% |
| India | 0.93 | 2.13 | +128.3% |
| Nigeria | 0.77 | 0.57 | −25.9% |

World average, 2023: **4.71 t** (the reference level). China's 2023 figure (8.56 t) is 1.82× the
world average; in 2000 China's own figure (2.87 t) was below the world average of that year — the
beat's claim is scoped to the 2023 comparison only, which is the reference this beat draws (never
implying China was already above the world average in 2000, which this data does not show without
fetching the World row for 2000 too — out of scope for this claim).

## The motion problem

Categories arrive in one fixed order — sorted by each country's own 2023 value, descending (United
States, China, Brazil, India, Nigeria) — and within each category, the 2000 bar and 2023 bar rise
together from the shared zero baseline, so the reader watches each country's own change as a single
event rather than two disconnected arrivals. China is the subject: its 2023 bar visibly crosses the
already-drawn reference rule as it grows, which is the whole finding, so China's category does NOT
arrive first or last for spectacle — it arrives second (its natural place in the sort), and its
extra emphasis (a highlight band behind its group, a ring on its 2023 bar, its category label
crossfading to bold accent) is a SEPARATE event landing only once every category has finished
growing, per `motion-grammar.md`'s "the subject arrives as a distinct event."

## Anti-patterns for this case

- One colour per series, reused identically on every group: 2000 = muted/neutral, 2023 = accent —
  never swapped, per `grouped-bar.md`'s central rule. A legend states which is which, in the same
  left-to-right order as the bars.
- Value maps to length from zero, inherited from the single-bar rule — not a value axis that starts
  above zero, which would misstate every bar's true magnitude.
- Value/total labels in page ink, never in either series' own hue.
- The reference rule (world average) draws once, left to right, before any bar grows — a bar chart's
  analogue of the line beat's dashed level, so the reader has a benchmark in view before judging any
  bar's height.

## Source line

`Source: Global Carbon Budget (2025), via Our World in Data · 2000 & 2023 data, per capita`
