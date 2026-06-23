# Chart selection — intent → chart type

> Source: FT Visual Vocabulary (the canon) — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (caveats). Credited.

Pick by **intent first**, then the simplest type that serves it. DW type ids in `code`.

| Intent (FT) | Use | DW type |
|---|---|---|
| Change over time | trend over a continuous period | `d3-lines` (many points) · `column-chart` (few periods, one series) · `d3-area` (totals, use with care) |
| Magnitude | compare sizes | `column-chart` (vertical) · `d3-bars` (long labels / many items). Must start at 0. |
| Ranking | order matters | `d3-bars` sorted · `d3-dot-plot` |
| Correlation | relationship of 2 vars | `d3-scatter-plot` · `d3-scatter-plot` sized = bubble |
| Part-to-whole | components of one whole | `stacked-column-chart` · `d3-pies` (≤5 slices, else bars) |
| Distribution | spread of values | `column-chart` as histogram · `d3-range-plot` |

Caveats (data-to-viz): pie only with few slices and clear differences; area hides component change; never compare angles precisely.

When in doubt → bars/columns on a common baseline (top of the perception hierarchy).
