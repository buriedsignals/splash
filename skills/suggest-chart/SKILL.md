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

## How it decides

1. Read `knowledge/references/chart-selection.md` → map **intent → DW type** (intent first, simplest type that serves it).
2. Read `knowledge/references/design-conformance.md` → fill the conformance fields.
3. Emit a **ChartSpec** (the exact shape `dw-chart/src/chart-spec.ts` validates):
   `{ type, title (the insight, sentence case), intro?, data (CSV), baseColor (Okabe-Ito, default #0072B2),
   valueLabels?, numberFormat?, source?, altInsight (WCAG: the insight, not the structure) }`.
4. Guardrails: **≤2 colours**; default single series to `#0072B2`; if the data is too complex for a clean
   chart, return `{ "decision": "no-chart", "reason": "..." }` instead of forcing one.

## Self-check

The emitted spec MUST pass `validateChartSpec` (run it via the dw-chart skill). Title and altInsight must
state the **insight**, not the column names.

## Output

A single `ChartSpec` JSON (or a `no-chart` decision). Hand it to `dw-chart`.
