# case21 — world fertility rate decline (chart scrolly)

## Brief

Topic: "The world's fertility rate has more than halved since 1960 — and the fall shows no sign of stopping."

A long-form, non-breaking-news explainer that walks the reader through the decline point by point. The editor wants a guided, scroll-paced reveal of the trend. Non-geographic (a single global series over time).

## Data

Source: World Bank / UN Population Division.

| Year | Fertility rate (births per woman) |
|------|-----------------------------------|
| 1960 | 5.0                               |
| 1975 | 4.1                               |
| 1990 | 3.3                               |
| 2005 | 2.6                               |
| 2020 | 2.3                               |
| 2023 | 2.2                               |

## Routing decision

- Gate 5 (geographic): SKIP — no region column; purely temporal global series.
- Gate 0: change-over-time, single series → line chart.
- Gate 1 (static): would pass ordinarily, but Gate 3 fires first (see below).
- Gate 2 (interactive): NOT fired — dataset is small (6 points, 1 series), no personal-data hook.
- Gate 3 (scrolly): FIRES — all four conditions met:
  1. Irreducibly sequential: editor explicitly requests "guided, scroll-paced reveal point by point."
  2. Single chart with 4+ discrete states: 6 data points → 5 progressive reveal steps.
  3. Long-form, non-breaking-news: confirmed in brief.
  4. Resources: assumed available (system routing test).
- Gate 4 (video): NOT fired — motion is not the only encoding; small multiples or a static annotated line would also work; this is not social/vertical distribution.

## Producer

`scrolly` + `nativeType: "line"` — the chart track of the scrolly engine (line curve draws on with scroll, head lands on each captioned point).

## Config path

`docs/splash/workflow-tests/case21/config.json`

## Self-check (validateChartSpec criteria applied manually)

- `title`: states the insight ("more than halved since 1960") — not a column name or year range. PASS.
- `insight`: states the closing takeaway with a concrete figure. PASS.
- `nativeType`: "line" ∈ {line, bar, scatter}. PASS.
- `directLabel`: "fertility_rate" — matches the CSV y-column. PASS.
- `data`: CSV with `year` (temporal) and `fertility_rate` (numeric), 6 rows, no blanks. PASS.
- `source.name` and `source.url`: present. PASS.
- `description`: present (intro card context). PASS.

## Concerns / ambiguities

1. **Gate 3 condition 4 (resources):** the SKILL.md requires "resources exist (design+dev, mobile testing, more production time)" but the input brief makes no mention of this. The gate technically requires confirmation. In practice this is a system routing test so it was assumed YES — but in a real editorial workflow this would need an explicit signal.

2. **Gate 3 condition 2 (4+ discrete state changes):** 6 data points yield 5 scroll steps, which passes the ≥4 threshold. But the SKILL.md says "a single visualization benefits from 4+ discrete state changes (one chart evolving — not several different charts)." With a line chart drawing on, the 6 points become 5 transitions — this is exactly the intended mechanism. Clear pass, but worth noting that sparse data (6 points at 15-year intervals) means each scroll step covers a long gap; a richer dataset would give denser narration.

3. **Gate 1 vs Gate 3 tension:** Gate 1 (static) would also be a legitimate routing for this data. A single annotated line chart with a "from 5.0 to 2.2" annotation carries the insight cleanly. Gate 3 fires ONLY because the editorial brief explicitly names scroll-paced reveal as the intent. If the brief had not stated that, the honest routing would be static → `dw-chart`. The gate-3 trigger here is editorially driven, not inherent to the data shape.

4. **`orientation` field:** the chart-native NativeSpec shape listed in the SKILL.md includes an `orientation` field for bar/column charts. For a line chart this is not meaningful; it was omitted. No warning expected.
