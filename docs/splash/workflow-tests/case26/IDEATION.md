# Case 26 — "Is the world becoming more urban?" (bare topic, sans rien)

## Input

- **Topic:** "Is the world becoming more urban?"
- **Article provided:** none
- **Data provided:** none

## Data need

The literal, truthful story this topic implies is a **long-run global trend**: the share of humanity
living in urban areas has grown continuously since at least 1960. The exact dataset needed is:

**World Bank Open Data — Urban population (% of total population)**
- Indicator code: `SP.URB.TOTL.IN.ZS`
- Geography: World aggregate (`WLD` / country code `1W`)
- Period: 1960–2022 (latest available)
- API endpoint: `https://api.worldbank.org/v2/country/WLD/indicator/SP.URB.TOTL.IN.ZS?format=json&date=1960:2023`
- Browser page: `https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=1W`

This is the canonical, freely-available, peer-compiled time series. No other dataset earns the
world-aggregate claim — national census-based estimates compiled by the UN Population Division feed
the World Bank figure.

## Fetch result

**World Bank API returned HTTP 502 (Bad Gateway) — server down at time of execution.**
The data portal page loaded but rendered no inline values (JavaScript-driven table).

**Fallback used:** widely-reported reference anchor points drawn from the same World Bank series,
as cited in UN DESA World Urbanization Prospects 2018 and OWID "Urbanization":

| Year | Urban share (%) | Status |
|------|-----------------|--------|
| 1960 | 33.6 | Widely reported — WB/UN DESA |
| 1970 | 36.6 | Widely reported — WB/UN DESA |
| 1980 | 39.4 | Widely reported — WB/UN DESA |
| 1990 | 43.0 | Widely reported — WB/UN DESA |
| 2000 | 46.7 | Widely reported — WB/UN DESA |
| 2005 | 49.2 | Widely reported — WB/UN DESA |
| 2007 | ~50.0 | UN DESA — "half the world urban" milestone |
| 2010 | 51.7 | Widely reported — WB/UN DESA |
| 2015 | 54.0 | Widely reported — WB/UN DESA |
| 2020 | 56.2 | Widely reported — WB/UN DESA |
| 2022 | ~57.0 | WB 2022 estimate (Our World in Data) |

**These values are labelled as widely-reported reference values, not fetched live.**
Source: World Bank indicator SP.URB.TOTL.IN.ZS, as relayed by UN DESA World Urbanization
Prospects (2018 revision) and Our World in Data "Urbanization" (https://ourworldindata.org/urbanization).

Intermediate decade mid-points (1965, 1975, 1985, 1995) in the config are linearly interpolated
from the decade anchors — they are NOT treated as fetched data. If a live fetch is required,
re-run `curl "https://api.worldbank.org/v2/country/WLD/indicator/SP.URB.TOTL.IN.ZS?format=json&date=1960:2023"` and replace the full `data` CSV in config.json.

## Routing — gate-by-gate

### Gate 5 — chart vs map?

The data is **not geographic** in the story-relevant sense. It is a single world-aggregate
time series. There are no per-country or per-region rows; the insight is temporal, not spatial.
Gate 5 does not fire. → **Chart path.**

### Gate 0 — chart family

Intent: "How has the global urban share changed since 1960?"
FT Visual Vocabulary intent: **Change over time** (continuous period, 62 data points).
→ `d3-lines` (single-series line chart).

### Gate 1 — static (default)

The claim is a single trend that can be fully annotated on one static image. The key turning
point (crossing 50%, c. 2007) is the editorial anchor and is annotated directly.
Cross-channel (web + social + print) distribution likely. No personal-data hook.
→ **Static wins. Gate 1 fires — stop escalation.**

### Gate 2 — interactive?

Not all three conditions met: the dataset is single-series (not large/multi-series), there is
no personal self-location hook ("find my country"), and the piece is not web-only by nature.
→ **No.**

### Gate 3 — scrolly?

The argument is not irreducibly sequential — the single trend does not require 4+ discrete
state changes. → **No.**

### Gate 4 — video?

Motion is not the only encoding. The trend is visible at a glance on a static line. No
social/vertical distribution signal. → **No.**

## Decision

**Producer:** `dw-chart`
**Type:** `d3-lines` (single-series line, year on x-axis)
**Format:** static (Gate 1)
**Colour:** `#009E73` (green — growth/environment fit for urbanisation-as-human-development story)

## Producer config path

`docs/splash/workflow-tests/case26/config.json`

## Concerns / caveats

1. **Fallback data, not live-fetched.** The World Bank API was down (502). The decade anchors
   are well-attested but the intermediate 5-year interpolations in the config are synthetic
   smoothing. Before publication, fetch the real annual series and replace the `data` CSV.
   Command: `curl "https://api.worldbank.org/v2/country/WLD/indicator/SP.URB.TOTL.IN.ZS?format=json&date=1960:2023&per_page=100" | jq '.[]|select(.value != null)|{year:.date,value:.value}'`

2. **No article.** The `suggest-article` skill was not applicable (no article text). This config
   was produced directly via `suggest-chart` from the named dataset and the implied editorial
   intent ("is urbanisation rising globally?"). A journalist should confirm the title/intro
   frames their actual angle before publishing.

3. **2007 milestone annotation.** The "crossed 50%" figure is widely cited but the exact year
   varies slightly by source (UN DESA says 2007; some cite 2008). The annotation text uses
   "c. 2007" to be honest.
