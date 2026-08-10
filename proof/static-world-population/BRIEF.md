# Beat — world population passed 8 billion in 2022

**Type:** area. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560.

## Claim

World population passed 8 billion in 2022 (8.02 billion) and reached 8.09 billion by 2023, the
series' final year — more than eight times its 1800 level of about 0.98 billion.

## Subject and accent

One series, one accent (`#0B7A75`) — population is exactly the "stock, accumulated" case
`references/types/area.md` names as the right use of a fill (a level, not a rate), so the value
axis includes zero, unlike the fitted-scale line convention `ChartSeed.tsx` teaches. A muted
context marker (not the accent) notes the year the series first crossed 1 billion, read off the
data itself rather than asserted from memory.

## Source

HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in Data ·
`population.csv`, filtered to World, 1800-2023 — the exact three-source citation pulled from the
indicator's own metadata JSON rather than a remembered "OWID population" credit.

## What went wrong, caught by looking

Nothing wrong in the render itself; the catch here was upstream, in research — my first pass
recalled "population crossed 1 billion around 1804" from general knowledge. The data itself puts
the crossing at 1805, which is what the beat states.

## What went wrong, caught later (2026-08-09 audit)

The headline itself had the same class of defect: `render.mjs` typed "passed 8 billion in 2023" by
hand, conflating the series' FINAL year (2023) with the year the threshold was actually crossed
(2022 — `data.csv` shows 2022 already at 8,021,407,196). Fixed the same way the 1-billion marker
was already doing it right: `data.find((d) => d.population >= 8e9)` derives the crossing year from
the frozen series, and the title/alt text now state that derived year instead of a typed one.
