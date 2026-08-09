# Beat — world population passed 8 billion in 2023

**Type:** area. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560.

## Claim

World population reached 8.09 billion in 2023, more than eight times its 1800 level of about 0.98
billion.

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
