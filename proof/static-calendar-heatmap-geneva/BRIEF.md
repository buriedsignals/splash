---
size: landscape
type: calendar-heatmap
---

# Beat — Geneva held 31 days in a row at or above 20 °C in 2024

**Type:** calendar heatmap (day-of-month × month). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

Daily mean temperature in Geneva, every day of 2024 — 366 cells. **From 18 July to 17 August the
daily mean stayed at or above 20 °C for 31 consecutive days**, the year's longest such run. The
warmest month was **August (22.2 °C mean), not July (20.9)**; the hottest day was 30 July at 26.4 °C
and the coldest 12 January at −1.3 °C.

The run, its length, its two dates, the monthly means and the two extremes are all computed in
`render-directions.mjs` from the frozen file, and the headline's run is asserted before the render.

## Why this form

A streak is what a calendar grid shows and a line chart does not: 31 adjacent cells in one block,
read as a shape rather than as a plateau to be measured against an axis. The cost is that no single
cell's value can be read exactly, which is why the key is binned and prints its breaks in °C.

## What the harvest gave it

Five references across five publications — ABC, data.europa.eu, Datawrapper, Observable and ONS.
Three rules are filed: a sequential grid is one hue cluster (tested by clustering, not by eye), a
position the data cannot fill is drawn as missing rather than left as a hole, and the key is binned
and prints its breaks in the data's own units.

The 2024 leap year gives this beat the case ONS's rule is about: **five impossible cells** — 31
February, 31 April, 31 June, 31 September, 31 November — drawn with the same stroke as every other
cell so the grid stays rectangular.

## Source

Open-Meteo historical weather API (ERA5 reanalysis), daily mean and maximum 2 m temperature,
Geneva (46.20 N, 6.14 E), 1 January – 31 December 2024, timezone Europe/Zurich. Fetched and frozen
beside this beat as `data.csv` on 9 September 2026:

```
curl --get https://archive-api.open-meteo.com/v1/archive \
  --data-urlencode latitude=46.2044 --data-urlencode longitude=6.1432 \
  --data-urlencode start_date=2024-01-01 --data-urlencode end_date=2024-12-31 \
  --data-urlencode daily=temperature_2m_mean,temperature_2m_max \
  --data-urlencode timezone=Europe/Zurich
```

The API answers for the nearest grid cell, which it reports as 46.221 N, 6.172 E at 368 m — a
kilometre or two from the point asked for, and that is the reading this beat draws.
