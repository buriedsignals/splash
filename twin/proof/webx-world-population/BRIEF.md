# Beat — world population passed 8 billion in 2022

**Type:** area. **Medium/genre:** chart / web. **Channel:** article web.

Web sibling of `proof/static-world-population` — same frozen data, a fresh component written for
this genre's two-layout / baked-in-interaction shape. **Note:** the claim below was corrected
2026-08-09 after a render audit caught the first draft's headline reading "passed 8 billion in
2023" — the frozen CSV shows the series first reaches 8 billion in **2022**
(8,021,407,196; 2023 is 8,091,734,933), a full year earlier. `render-web.mjs` now finds this year
from the data (`eightBillionRow`) instead of assuming it equals the series' last row.

## Claim

World population first passed 8 billion in 2022; the latest reading in this data, 2023, stands at
8.09 billion — more than eight times its 1800 level of about 0.98 billion. Population first crossed
1 billion in 1805.

## Data

- Source: HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in
  Data, `population` grapher.
- `data.csv`: copied from the already-verified static sibling's own frozen fetch (World only,
  1800–2023) and re-verified here independently — entity check (every row reads "World") and row
  count (224 readings) asserted in `render-web.mjs` before the component ever sees the data.

## What interaction adds

Population is a stock, not a rate — the fill's area is the claim (`references/types/area.md`).
The static frame's axis is rounded to one decimal billion, and only the 1805 crossing marker and
the 2023 end label carry a printed value. Every one of the other 223 annual readings has no
printed figure — hover, tap or keyboard focus on any point reveals that year's exact population, to
the person, as OWID reports it — the precision the billion-scale axis genuinely cannot show.

## Source line

`Source: HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in
Data · World, 1800–2023, extracted 8 August 2026`
