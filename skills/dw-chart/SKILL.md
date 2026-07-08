---
name: dw-chart
description: Use when you need a standard chart (line, bar, column, scatter, pie, dot, range) published as a Datawrapper embed AND an owned static PNG, with best-practice design applied. Keywords chart, datawrapper, embed, line, bar, column, scatter, pie, png, journalism, dataviz.
output_mode: interactive+static
---

# dw-chart — standard charts via Datawrapper, with an owned PNG fallback

## Overview

Turns a validated `ChartSpec` into a published Datawrapper chart (embed) **and** an owned PNG. Datawrapper renders; we apply best-practice via its real config fields. The PNG means the visual survives even if Datawrapper changes — no archive rot.

For video charts use the chart-video skills; for maps use the map skills; for rich custom interactivity use the native D3 chart skill.

## When to use

- A standard chart in an article: trend, magnitude, ranking, correlation, part-to-whole, distribution.
- You want it embeddable now AND archived as a file the newsroom owns.
- **Not** for: animated/video charts, bespoke interaction, or non-chart visuals.

## The one gotcha that will waste your day (read first)

SVG/PDF export is **paid** on Datawrapper (`export/svg` → 401). The owned fallback is **PNG** (`export/png` → 200, free). Don't build the fallback on SVG. The token lives in `/atelier/.env` as `DATAWRAPPER_API_TOKEN`; `bun test` from the skill dir needs it exported (`set -a; source /atelier/.env; set +a`).

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Contract | `src/chart-spec.ts` | `ChartSpec` + validator (Okabe-Ito, WCAG alt) |
| Mapping | `src/spec-to-metadata.ts` | ChartSpec → DW metadata (applies design-conformance) |
| Client | `src/datawrapper.ts` | REST: create/data/patch/publish/export-png |
| Orchestrator | `src/produce.ts` | spec → `{chartId, embed, pngPath, publicUrl}` |

## How it works (the shape)

1. **Validate** the `ChartSpec` (fail loud on bad colour / missing insight / missing alt).
2. **Map** spec → DW `metadata` (`describe.intro`, `aria-description`, `source-*`, `number-format`; `visualize.base-color`, `value-labels`).
3. **Drive** the API: create → setData (CSV) → patch → publish → export PNG.
4. **Return** the embed iframe + the owned PNG path.

Full field mapping + endpoints → `references/api-flow.md`.

## Quick start

1. Build a `ChartSpec` (see `assets/sample-data/sample.spec.json`).
2. `set -a; source /atelier/.env; set +a` (token).
3. `bun -e "import {produceChart} from './src/produce'; ..."` or call `produceChart(spec, 'out.png')`.

## Tuning knobs (each is one value)

| Want | Knob | Where |
| --- | --- | --- |
| Chart type | `spec.type` | ChartSpec |
| Single-series colour | `spec.baseColor` (Okabe-Ito) | ChartSpec |
| Direct labels on/off | `spec.valueLabels` | ChartSpec |
| Number format (value labels + tooltips) | `spec.numberFormat` | ChartSpec |
| Axis tick format (override) | `spec.valueFormat` | ChartSpec |
| **Human series names** | `spec.seriesLabels` (column key → label) | ChartSpec |
| Annotation anchor (data point) | `annotation.x` (+ optional `y`/`column`) | ChartSpec |
| PNG width | `exportPng(id, path, width)` | `datawrapper.ts` |

## Publishable-blocker rules (learned from render tests)

- **Never ship a raw column name as a series label.** Datawrapper's direct label / legend / tooltip is the CSV column header. Give every machine-named column a human name via `spec.seriesLabels` (e.g. `{"median_home_price_usd": "Median home price"}`) — the header is renamed before upload, fixing all three at once.
- **A line-chart text-annotation with no numeric `y` is silently DROPPED.** When you pin an annotation to an `x` only, the mapper derives `y` from the data at that x (against the correct, possibly-renamed series column). Always give annotations a resolvable `x` (and optionally `column`).
- **Single-series line/area: no line-end direct label.** The series direct label (the CSV column name at the line end) wraps and clips the right edge / collides with the last x-tick on a single series — and the title + subtitle already name it. The mapper sets `visualize.labeling:"off"` for a single-series line/area chart (reclaiming the right gutter so nothing can clip). Multi-series keeps `labeling:"right"` (the labels ARE the legend) and DW reserves margin.
- **Annotations are placed in DATA space, never in absolute pixels (responsive-safe).** A Datawrapper embed is `min-width:100%` — it re-renders at every viewport width — but `dx`/`dy` are ABSOLUTE pixels that do NOT scale, so a nudge that clears the curve at one width clips off-canvas / collides with the ticks at every other. The mapper therefore emits **zero `dx`/`dy`**: it anchors each label at its data point (`x`,`y`) and picks the `align` quadrant whose box is clear of the plotted series (`placeAnnotation`), then extends the numeric axis (`custom-range-y`) so a near-extreme label (a peak at the max) has real whitespace above/below it. Both levers are data-space → identical geometry at every width. Horizontal is asymmetric: DW clamps a left overflow back on-canvas but lets a **right** overflow spill off the frame, so the placement never extends a label off the right edge. Any `align`/`dx`/`dy` in the spec is ignored — placement is computed from geometry.
- **Column/grouped value labels are printed on the static PNG (not hover-only), outside the mark in dark ink.** Datawrapper's `column-chart`/`grouped-column-chart`/`multiple-columns` default to `valueLabels.show:"hover"` — so the numbers are **invisible on the static export** (the reader can only read the y-axis). The mapper sets `valueLabels:{enabled, placement:"outside", show:"always"}` → the value prints **above** the column in dark ink on the white canvas (visible on the PNG, always ≥4.5:1). `valueLabels:false` opts out.
- **Horizontal-bar value labels never ship white text inside a coloured bar (WCAG AA).** `d3-bars`/`d3-bars-grouped`/`d3-bars-split` draw the value **inside** the bar with a crude white/black auto-pick that Datawrapper offers **no override for** (no colour field, no outside placement — confirmed by dumping every `d3-bars` metadata key and by the Academy docs). For darker subject hues that auto-pick is WHITE and fails AA (white on `#009E73` = 3.42:1, on `#D55E00` = 3.87:1; only `#0072B2` at 5.19:1 is safe). Because the inside label cannot be made safe, the mapper turns it **off** (`show-value-labels:false`) and shows the numeric **value axis** (`force-grid:true`) instead — the bar keeps its hue, the axis carries the value in black ink (17.8:1). This is the dw-chart form of chart-native's rule "the label carries the value, the mark carries the hue". `produceChart` runs `checkValueLabelContrast` before the first API call and **throws** if any metadata would ship a white label inside a coloured mark below 4.5:1. Stacked bars keep the DW default (their per-segment inside labels are a separate concern). See `src/value-label-safety.ts`.
- **The guardrail validates the RESPONSIVE deliverable, not just the PNG.** `produceChart` loads the published chart headless at **[340, 600, 1200] px** (`checkResponsive` in `src/label-safety.ts`) and THROWS if ANY text rect, at ANY width, extends beyond the content box (clipped), intersects another (overlap), or sits ON the plotted series line (`on-line`). Validating only at the export width is what let labels break on mobile while the guardrail passed — "validated == delivered" must hold across the whole width envelope. If the first-pass headroom is short at some width, produce widens the axis and re-publishes (bounded) before failing. `findLabelViolations` is a pure, deterministic geometry check (unit-tested).

## Axis formatting notes

- The numeric axis honours `visualize.y-grid-format` (numeral.js token), wired from `spec.valueFormat` (falls back to `spec.numberFormat`).
- Currency: `"$0,0a"` → `$440K`.
- **Seconds → h:mm:ss IS supported.** The numeral.js token `"00:00:00"` formats a raw-seconds column as clock time (7170 → `1:59:30`). Use it for durations (marathon/lap times) instead of shipping raw seconds. This is a real capability, not a hack — verified at render.

## Files

- `src/{chart-spec,spec-to-metadata,datawrapper,produce}.ts` — the four layers.
- `src/{contrast,value-label-safety}.ts` — WCAG contrast math + the per-engine, contrast-safe value-label mapper and its produce-time guard.
- `assets/sample-data/` — runnable sample CSV + spec.
- `output-proof/` — the proven published chart (PNG + embed + result).
- `references/api-flow.md` — endpoints + field mapping.
