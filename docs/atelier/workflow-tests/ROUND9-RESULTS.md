# Workflow test — round 9 (full type × format matrix, real articles)

Five real, live articles run through the real ② routing, each targeting a different
producer/format cell, then produced + render-verified. Goal: prove the system produces
different visual TYPES under different FORMATS (video / interactive / scrolly / filtered map)
from real articles.

## Cases + deliverables (every one routed correctly)

| # | Real article | Cell | Produced |
|---|--------------|------|----------|
| 32 | [Highest-grossing 2024 films](https://en.wikipedia.org/wiki/List_of_highest-grossing_films_of_2024) | **chart → VIDEO** (chart-native ranked bars, Gate 4B social) | landscape/square/portrait mp4 ✓ clean |
| 33 | [Unemployment rate by country](https://en.wikipedia.org/wiki/List_of_countries_by_unemployment_rate) | **chart → INTERACTIVE** (chart-native bar, Gate 2 hover-at-scale) | static+interactive ✓ (finding F-A) |
| 34 | [Global temperature record](https://en.wikipedia.org/wiki/Instrumental_temperature_record) | **chart → SCROLLY** (chart-scrolly line, Gate 3) | scrolly.html ✓ clean |
| 35 | [Nuclear power in France](https://en.wikipedia.org/wiki/Nuclear_power_in_France) | **map → INTERACTIVE + FILTER** (map-native locator + category, Gate 2) | ✓ frames clean all widths (findings F-B, F-C) |
| 36 | [EU enlargement](https://en.wikipedia.org/wiki/Enlargement_of_the_European_Union) | **map → VIDEO** (map-native choropleth story, temporal diffusion, Gate 4) | story mp4 ×3 ✓ clean |

Combined with rounds 2–8 (static charts, all 7 map types, map-scrolly, chart-scrolly, dw-chart,
map-dw), **every producer × format cell now has a real-article render.** The matrix holds.

## Findings (real defects the real articles surfaced)

- **F-A — chart-native: a 2-line insight title + subtitle overlaps the plot / first bar.** Case 33's
  long headline ("South Africa leads with 33% unemployment — most rich economies stay below 7%")
  wraps to two lines; the unit subtitle then sits on the first bar. The header height is reserved for
  a 1-line title. Insight titles are often long, so this is common. HIGH priority.
- **F-B — locator category filter does not hide CLUSTERED markers.** Case 35: toggling "operational"
  off hides the un-clustered markers but the operational **cluster badges (2, 4, …) remain** —
  MapLibre clustering aggregates at the source, and the filter (applied to un-clustered glyphs) does
  not update cluster counts. The filtered state is misrepresented. Real filters defect.
- **F-C — `validateLocatorConfig` / `validateSymbolConfig` do not validate `basemap` against the
  registry.** Case 35 emitted `basemap:"france"` (unregistered — only world + us-states ship); it
  passed validation and would fail at render (choropleth's validator DOES check the registry; the
  point-map validators do not). Plus the pre-existing regional-basemap coverage gap (no france/uk).

## Minor
- chart-scrolly line and choropleth video do not apply a config `color`/`palette` (case 34 rendered
  blue not vermilion; case 36 blue not purples) — fall back to defaults.
- chart-scrolly `directLabel` renders the raw column name (`anomaly_c`) as the series label.

## Verdict
The full matrix produces from real articles — the system is usable across types and formats. Round 9's
value is the three real defects (F-A title overlap, F-B locator cluster filter, F-C point-map basemap
validation), each to be fixed at the system layer with a guardrail.
