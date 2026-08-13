---
size: landscape
type: slope
---

# Beat — Rwanda cut its child mortality rate by three-quarters since 1990

**Size:** landscape (1920 x 1080). The front matter above is the record that counts — `render.mjs`
reads it with `readPinnedSize`, and `Root.tsx` registers one composition per row of the table. The
prose used to be the only record of gate 2c's decision, checked by nothing, while the component
carried its own `const FRAME` and `Root.tsx` repeated the same two numbers.

**Why landscape, and why the other two refuse.** A slope has no twin form — its two ends are fixed
points in time — and no aspect range has ever been MEASURED for it at a tall or square frame, so
`type-at-size.mjs` refuses by default and names the measurement that is missing. That default is
not timidity: a slope's argument IS the angle of its lines, and changing the frame's shape changes
every angle while clipping nothing and colliding with nothing — the one defect the portrait probe
proved no counter in this project can see. The 1080 x 1080 this beat used to draw at was not a
decision, it was a default.

**Proves:** between 1990 and 2023, Rwanda's under-five mortality rate fell from 15.1% to 3.9% — a
drop of three-quarters — even as the country recovered from the 1994 genocide and civil war, one of
six countries compared at exactly two moments.

**Medium / format:** chart / video. **Type:** slope (slopegraph) — two vertical axes (1990, 2023),
one line per country from its 1990 value to its 2023 value, position-encoded (no forced zero — the
value axis is fitted to the readings, per `references/types/slope.md`). Two hues total: one accent
(Rwanda), the rest muted context lines. Category labels sit in the side gutters at both ends,
de-conflicted vertically where lines land close together — the type's own named trap.

## Data

- Source: Our World in Data, `child-mortality` grapher (UN Inter-agency Group for Child Mortality
  Estimation, via Our World in Data), filtered to six countries.
- Fetched:
  `https://ourworldindata.org/grapher/child-mortality.csv?csvType=filtered&country=~NER~RWA~NGA~IND~BRA~CHE`
  — verified effective (6 entities only, not the full ~200-country set).
- `data.csv`: **543 data rows** (544 lines with the header), six countries (Niger, Rwanda, Nigeria,
  India, Brazil, Switzerland) — Switzerland 149 rows from **1876**, India 108 from 1911, Brazil 94
  from 1931, Rwanda 71 from 1954, Nigeria 63 from 1962, Niger 58 from 1967, every one running to
  **2024**. The beat draws only **1990** and **2023** — filter at render time, never re-fetch.
  *(Corrected 2026-08-09: this line said 542 rows and a span of 1751–2023. The file has no trailing
  newline, so `wc -l` reports one fewer line than it holds and the header was subtracted from the
  wrong number; the true span is 1876–2024 and 1751 is not in this file. The counts above are
  parsed records.)*

## Exact values (under-five mortality rate, %) — verified 2026-08-08

| Country | 1990 | 2023 | Change |
| --- | --- | --- | --- |
| Niger | 33.24 | 11.35 | −21.89 pts (−65.8%) |
| Nigeria | 20.76 | 11.68 | −9.08 pts (−43.7%) |
| Rwanda | 15.07 | **3.88** | **−11.19 pts (−74.3%)** |
| India | 12.70 | 2.80 | −9.90 pts (−78.0%) |
| Brazil | 6.28 | 1.44 | −4.84 pts (−77.1%) |
| Switzerland | 0.82 | 0.39 | −0.43 pts (−52.4%) |

Every one of the six fell — no rising line in this set. Rwanda's own fall (three-quarters, from
15.1% to 3.9%) is the claim; this beat does not assert Rwanda's decline was the STEEPEST of the six
(India's and Brazil's percentage falls are close to Rwanda's own, and Niger's absolute point-drop is
larger) — the claim is scoped to what is true of Rwanda alone, against its own two numbers.

## Reference

UN Sustainable Development Goal 3.2 (set 2015): all countries should reduce under-five mortality to
below 25 deaths per 1,000 live births by 2030 — **2.5%**, verified against UNICEF and UN DESA
(`sdgs.un.org/goals/goal3`, `data.unicef.org`). Drawn as a dashed rule spanning both axes, before
either column's lines appear. Rwanda's 2023 figure (3.9%) has not yet reached this target — the
chart does not claim otherwise, only shows the target as the level the argument is measured against.

## The motion problem

At the **2023** end, Niger (11.35%) and Nigeria (11.68%) land 0.33 points apart — close enough on a
0–34% axis fitted to Niger's own 1990 high that their labels would collide if placed at each line's
literal endpoint. `deconflictLabels` spreads them vertically, in the order documented by
`slope.md`'s own trap: "spread apart just enough to stop overlapping," never truncating a name to
make it fit. Lines arrive sorted by their own 1990 value, descending (Niger's crisis was the worst
in 1990, so it draws first) — each line's own left dot, connector and right dot land together as one
cascading event (`countryWindow`, the technique proven by `DumbbellVideo.tsx`'s `rowWindow`).
Rwanda's extra emphasis (bold line, ring on both dots, its own de-conflicted label crossfading to
accent) is a separate event that cannot start until every line has finished drawing.

## Anti-patterns for this case

- At most two hues total (`slope.md`): Rwanda is the one accent; the other five stay a single
  neutral tone throughout, never individually coloured.
- Neither axis forced to zero — position-encoded, fitted to the six countries' own extent.
- Both period captions ("1990", "2023") stated once, at the top of each column, not repeated per
  line.
- Value labels in page ink, never the accent line's own hue (`slope.md`'s named accessibility trap:
  "painting an accent line's end-value label in that same accent hue is exactly the move that has
  previously failed WCAG contrast in this codebase").

## Source line

`Source: UN Inter-agency Group for Child Mortality Estimation, via Our World in Data · 1990 & 2023 data`
