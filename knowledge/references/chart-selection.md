# Chart selection — intent → chart type

> Source: FT Visual Vocabulary (the canon) — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (caveats). Credited.

Pick by **intent first**, then the simplest type that serves it. DW type ids in `code`.

| Intent (FT) | Use | DW type |
|---|---|---|
| Change over time | trend over a continuous period | `d3-lines` (many points; works for ONE or SEVERAL series — data `period, seriesA, seriesB, …`, one column per line) · `column-chart` (few periods, one series) · `d3-area` (totals, use with care) |
| Magnitude | compare sizes | `column-chart` (vertical) · `d3-bars` (long labels / many items). Must start at 0. |
| Ranking | order matters | `d3-bars` sorted · `d3-dot-plot` |
| Correlation | relationship of 2 vars | `d3-scatter-plot` · `d3-scatter-plot` sized = bubble |
| Part-to-whole | components of one whole | `stacked-column-chart` · `d3-pies` (≤5 slices, else bars) |
| Distribution | spread of values | `column-chart` as histogram · `d3-range-plot` |

Caveats (data-to-viz): pie only with few slices and clear differences; area hides component change; never compare angles precisely.

## Multi-series & orientation (avoid the small-multiples trap)

- **Time trend with several series** (e.g. `year, France, Switzerland`): use **`d3-lines`** as-is — one line per value column. Do **NOT** use `multiple-lines` and do **NOT** set `transpose` — those turn a trend into a per-period small-multiples panel where the *series* sit on the x-axis. A spec can be valid (`validateChartSpec` passes) yet still wrong this way; the type/orientation must match the story.
- **`transpose: true` is ONLY for stacked/grouped categorical charts** where the CSV is `xCategory, seriesA, seriesB, …` and you want the x-category (not the series) on the axis (e.g. a stacked `year, Coal, Gas, Renewables`). Never transpose a line/time chart.
- `multiple-lines` / `multiple-columns` / `d3-multiple-*` = deliberate **small multiples** (one panel per series), only when you actually want separate panels — not for a single trend chart.

When in doubt → bars/columns on a common baseline (top of the perception hierarchy).
