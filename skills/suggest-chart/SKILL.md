---
name: suggest-chart
description: Use to decide which chart (if any) serves an article's intent and emit a ChartSpec for dw-chart. Reads the data profile + the editorial intent, grounded on the KB references. Keywords suggest, choose chart, intent, dataviz, orchestration.
---

# suggest-chart — decide the chart, emit a ChartSpec

## Overview

The minimal ② for the Datawrapper slice. Given a **data profile** (columns, types, cardinality) and an
**editorial intent**, it picks the chart type that serves the intent and emits a `ChartSpec` that `dw-chart`
produces. It never invents data; if no chart serves the story, it says so.

## Inputs

- Data (CSV or a profile of it) + a one-line **intent** ("show the unemployment trend 2018-2023").

## Runtime procedure

② is the host agent. Execute these steps in order — do not skip the self-check.

1. **Profile** the data: list columns, infer each type (numeric / categorical / temporal), cardinality,
   and the row count. This fixes the data shape (single-series, multi-series, or two-value).
2. **Choose** the type via `knowledge/references/chart-selection.md`: map intent → family → the *simplest*
   type that serves it. When in doubt, bars/columns on a common baseline.
3. **Fill** the `ChartSpec`, applying `knowledge/references/design-conformance.md` and the guardrails below:
   `title` = the insight (sentence case, never a label or a year range); `sort:"desc"` for a ranking;
   `seriesColors` (Okabe-Ito, one per series) when multi-series; `transpose:true` ONLY for a
   stacked/grouped **categorical** chart where the x-category must be the axis — **never for a line/time
   trend** (a multi-series time trend is `d3-lines` with several value columns and NO transpose); one
   `annotation` for the key outlier or turning point; `numberFormat` to strip noise; `altInsight` = the insight (WCAG).
4. **Self-check**: the spec MUST pass `validateChartSpec` (via dw-chart). Read the returned `warnings` and
   fix them — do not ignore them. A `title looks like a label` warning means rewrite the title as the insight.
5. **Produce**: call `produceChart(spec, pngPath)` → an embed + an owned PNG fallback.
6. **Or `no-chart`**: if no visual serves the data and intent (data too thin, or the intent is not a
   visualisation question), emit `{ "decision": "no-chart", "reason": "..." }` instead of forcing a chart.

## How it decides

1. Read `knowledge/references/chart-selection.md` → map **intent → DW type** (intent first, simplest type that serves it).
2. Read `knowledge/references/design-conformance.md` → fill the conformance fields.
3. Emit a **ChartSpec** (the exact shape `dw-chart/src/chart-spec.ts` validates):
   `{ type, title (the insight, sentence case), intro?, data (CSV), baseColor (Okabe-Ito, default #0072B2),
   valueLabels?, numberFormat?, source?, altInsight (WCAG: the insight, not the structure) }`.
4. Guardrails: **≤2 colours**; default single series to `#0072B2`; if the data is too complex for a clean
   chart, return `{ "decision": "no-chart", "reason": "..." }` instead of forcing one.

## Guardrails (the code enforces these — propose within them)

- **Type:** pick from the 22 supported types (single-series, multi-series, or two-value per the data shape).
- **Sort:** for ranking intents (bars/columns where order matters), set `"sort": "desc"` — the producer sorts the CSV.
- **Colours:** single-series → at most 2 Okabe-Ito colours (default `#0072B2`); multi-series → one Okabe-Ito colour per series in `seriesColors`, at most 8.
- **Pie/donut:** at most 5 slices — if more, group into "Other" or choose bars.
- **Annotations:** add a `text-annotation` for the key outlier or turning point ("annotations explain WHY").
- **Title:** state the insight, not a label or a year range (the validator warns otherwise).
- **Multi-series orientation:** `transpose:true` is ONLY for stacked/grouped **categorical** charts (e.g. stacked `year, Coal, Gas, Renewables`) where the x-category, not the series, belongs on the axis. **Never transpose a line/time chart** — a multi-series time trend (`year, France, Switzerland`) is `d3-lines` with one line per column and NO transpose. `multiple-lines`/`multiple-columns` = deliberate small multiples (one panel per series), not a single trend.

## Self-check

The emitted spec MUST pass `validateChartSpec` (run it via the dw-chart skill). Title and altInsight must
state the **insight**, not the column names.

## Output

A single `ChartSpec` JSON (or a `no-chart` decision). Hand it to `dw-chart`.
