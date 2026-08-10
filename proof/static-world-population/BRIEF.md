---
size: landscape
type: area
---

# Beat — world population passed 8 billion in 2022

**Type:** area. **Medium/genre:** chart / static. **Channel:** article web, 1920 x 1080.

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

## Size — 2026-08-10

**Pinned: landscape (1920 × 1080)**, in the front matter, read by `readPinnedSize`, verified from
the delivered PNG's own IHDR. It shipped 1800 × 1120 before — a 900 × 560 element rasterised at
`fitTo: width × 2`, a size nobody chose.

**Square and portrait are refused by `type-at-size.mjs` itself.** An area chart's x is a
continuum — time — so it has no twin FORM to transpose into (Horak et al. §2.4.2 names line charts
resisting rotation for the same reason), and no aspect range has been measured for the type. The
runner refuses both by name before a mark is drawn and says what it does ship. Reversing that is one
sweep in `proof/aspect-range-probe/`, not an argument.

**What the bigger frame changed, and it was a real defect:** the 1-billion context marker's word was
`textAnchor="middle"` on the point's own x. 1805 sits four years into a 224-year span, so at 29px —
the landscape scale of a 13px token — the label ran out through the y axis and printed straight
through the "2.0" tick label. Nothing was clipped and nothing threw. The side it hangs off is now
DERIVED from where the point sits against its own plot, so a different crossing year moves it
without anyone retyping an offset.

Everything else scales: eleven bare spacing literals, the line's own weight, and the two dot radii —
a mark's size is a frame quantity like any other, and at their 900px value on a 1920px frame the end
dot would have read as a speck. `Y_TICK_HINT` and `X_TICK_HINT` are COUNTS and deliberately stay
outside the scaling helper; multiplied by 2.2 the y axis would have asked d3 for eleven gridlines.
