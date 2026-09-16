---
size: landscape
type: gantt
format: static
medium: chart
grounding: supported
---

# Beat — Six countries have never left the world's top ten emitters since 1990

**Type:** gantt (positioned spans on a shared date axis). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

Between 1990 and 2024, **sixteen countries** held a place in the world's ten largest CO₂ emitters at
least once. **Six of them held it every single year** — China, the United States, India, Russia,
Japan, Germany — and the other ten arrived, left, or both. Two rows are interrupted rather than
continuous: Italy left for a year in 1991 and returned, South Korea left for two years in 1998–99.
Kuwait appears for a single year, 1991.

Every span is computed in `render-directions.mjs` from the frozen `data.csv` — the same ranking the
bump beat next door draws, read as tenure rather than as position — and the counts in the headline
and the standfirst are asserted before the render.

## Why a gantt rather than the bump chart beside it

`proof/static-bump-emitter-rank` draws the same membership as RANK over time: it answers "who was
above whom". It cannot answer "how long", because a reader tracing one line has to count years by
eye, and the lines that stop are the hardest to read of all. A gantt drops the rank entirely and
draws the tenure. The two are the same data answering different questions, which is why both exist
and neither is a redraw of the other.

## What the harvest gave it

Seven references and an unusually clean split: three are **not** positioned-span gantts at all
(duration bars on a zero-anchored axis), which the records say plainly, and two are — Threestory's
sitting justices and USAFacts' seats. Two rules two publications agree on are filed: both dates in
the row label, and an open span notated as open. This plate takes BOTH answers to the second one,
because they cost nothing together: every open span ends flush at the axis's present edge, and its
label carries a trailing dash.

## Source

Global Carbon Budget (2025), via Our World in Data · annual CO₂ emissions by country, fossil fuels
and industry, frozen beside this beat as `data.csv` (a copy of the file
`proof/static-bump-emitter-rank` uses, per this corpus's "duplicate, do not link" ruling).
