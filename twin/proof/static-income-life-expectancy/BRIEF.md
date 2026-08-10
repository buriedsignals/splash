---
size: landscape
type: scatter
---

# Beat — beyond $30,000, income buys far less extra life expectancy

**Type:** scatter. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560.

## Claim

Across 165 countries in 2021, life expectancy rises steeply with income up to roughly $10,000-
30,000 per person, then the slope flattens: from $30,000 to $140,000 a person, life expectancy
still varies, but across a much narrower band (roughly 71 to 85 years — corrected 2026-08-09, a
render audit caught the brief and the render both saying "76 to 85": the band's own low end,
Seychelles at 71.2 years, sits well below 76).

## Subject and accent

No named subject — the claim is about the shape of the whole cloud, so every point reads in the
same muted, semi-transparent neutral. `accent` is reserved but unused (no country is singled out),
per `references/types/scatter.md`'s own rule that a scatter's argument is the shape, not any one
member's name, unless a specific point earns a label.

## Source

World Bank via Gapminder, UN World Population Prospects (2024), via Our World in Data ·
`life-expectancy-vs-gdp-per-capita.csv`, filtered to rows with both measures present and a 3-letter
ISO code (drops continents/income-group aggregates), year 2021.

## What went wrong, caught by looking

2022's Central African Republic reading is 18.8 years — down from 40.3 in 2021, back up to 57.4 in
2023 — a data artefact, not a real one-year collapse (no other country in 2022 reads below 35). The
first pass toward this beat would have plotted 2022 uncritically; switched to 2021, where the
minimum across all 165 countries is a plausible 40.3, and the render script now throws if any
future refresh reintroduces a reading under 35.

## Size — 2026-08-11

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize`, verified from the
delivered PNG's own IHDR. It shipped 1800 x 1120 before.

**Square and portrait are refused by `type-at-size.mjs` itself**, and this one is a NAMED refusal
rather than an unmeasured one: rotating a scatter violates conventions of reading direction (Horak
et al. §2.4.2), so it has no twin form; and what a phone frame runs out of budget on for a
165-point cloud is DENSITY, not aspect. Neither has been measured, so nothing is drawn.

**Two things the bigger frame changed, both real:**
- The dot radii (3.5 / 4.5) were bare numbers. A mark's size is a frame quantity like any other —
  left at their 900px value on a 1920px frame the cloud would have thinned to specks. They scale.
- The named-point nudges (`dx`, `dy`) arrive from the runner in the 900-wide frame this beat was
  tuned at. Read raw on a 1920px frame, a 26px leader would have parked every named country's word
  on top of its own dot. They are read at the row's own scale. (This beat currently names no points,
  so the fix is dormant until it does — recorded rather than left as a trap.)
- `Y_TICK_HINT` is a COUNT, and the first pass of this migration scaled it with everything else:
  five gridlines became eleven. It is deliberately outside the scaling helper now, with the reason
  written beside it.
