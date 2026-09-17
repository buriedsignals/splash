---
size: landscape
type: calendar-heatmap
format: static
medium: chart
grounding: supported
derived: v1
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

## The choreography

Three stations, and the plate honestly has no fourth: there is no direct label anywhere on the
grid. A run is a SHAPE here, and the eye finds it before it reads anything — the dark block that
fills the right of July and the left of August. The heavy outline is the only accent on the plate
and it does one job, saying which cells the headline counted, across the row break. The key is
read after, not before, and only because no single cell can be read exactly; the two dates live in
the standfirst, not on the outline.

**The eye enters at** `the dark block`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the year grid` | `the run outline` |
| reference | `the binned key` | `the run outline` |
| subject | `the run outline` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the dark block",
  "stations": [
    {
      "station": "establish",
      "carries": "the year grid",
      "subordinateTo": "the run outline"
    },
    {
      "station": "reference",
      "carries": "the binned key",
      "subordinateTo": "the run outline"
    },
    {
      "station": "subject",
      "carries": "the run outline",
      "subordinateTo": null
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **The 31-day run is counted** — the longest streak at or above 20 °C is searched in the frozen daily series, and the headline's 31 is asserted before the render.
- **Every day of 2024 is present** — the days are checked present and in order and the cell count is asserted, because a calendar with a hole silently shortens a run.
- **Run, dates, means and extremes computed** — 18 July, 17 August, the monthly means behind "August not July", and the two day extremes are all computed from the same file.
- **The six bins are fixed once** — the classes are fixed once from the frozen series and the key prints their breaks in °C; the no-value swatch is named beside them.
- **The whole year is on one plate** — 365 readings and the run they contain are in the one frame, which is the only reason the run can be read as a block at all.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-31-day-run-is-counted",
    "every-day-of-2024-is-present",
    "run-dates-means-and-extremes-computed",
    "the-six-bins-are-fixed-once",
    "the-whole-year-is-on-one"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-31-day-run-is-counted",
    "every-day-is-present-and-in": "every-day-of-2024-is-present",
    "the-run-its-length-its-two": "run-dates-means-and-extremes-computed",
    "the-bins-are-fixed-once-from": "the-six-bins-are-fixed-once",
    "asserted-in-the-one-frame": "the-whole-year-is-on-one"
  }
}
```
