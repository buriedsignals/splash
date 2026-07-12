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
| **Per-series colours** | `spec.seriesColors` (series → Okabe-Ito hex) | ChartSpec |
| **Accent ONE bar in a ranking** | `spec.highlight` (a CATEGORY value, e.g. `"Basel"`; `d3-bars`/`column-chart` only) | ChartSpec |
| **Static export aspect** | `spec.channel` (feed→square, social→9:16, web→16:9) — type-aware | ChartSpec |
| Annotation anchor (data point) | `annotation.x` (+ optional `y`/`column`) | ChartSpec |
| PNG size | `exportPng(id, path, width, height)` | `datawrapper.ts` |

## Publishable-blocker rules (learned from render tests)

- **`validateChartSpec` is STRICT on top-level fields — an unknown field is an ERROR, never silently ignored.** A hallucinated `highlightColor` field once shipped a chart UNhighlighted with no signal (QA Wave 8, German-hospital case): the validator skipped what it didn't know, so the intent the field carried died silently and only pixel inspection caught it. Now any field outside the canonical `CHART_SPEC_FIELDS` list (kept compile-time-locked to the `ChartSpec` interface in `src/chart-spec.ts`) fails with the field named, the valid list, and a near-miss suggestion (`highlightColor` → `did you mean "highlight"?`) — the same fail-closed philosophy as `normalizeChannel`. The routing-envelope fields real emitters carry on the same object (`producer`, `format`) are tolerated.
- **`spec.highlight` accents ONE bar of a single-series ranking — `d3-bars` and `column-chart` only.** Those two engines key `visualize.custom-colors` by the CATEGORY value (verified live: metadata round-trip + published render — one amber bar, the rest grey); the highlighted category takes the accent (`baseColor` if set, else the default), every other bar drops to `HIGHLIGHT_MUTED_GREY` (`#c4c4c4`, DW's own default-theme palette grey) via `base-color`. It is a CATEGORY VALUE, never a row index (`sort` re-orders rows, an index would accent the wrong bar), it must name an existing first-column cell (else DW paints nothing — rejected), and it is mutually exclusive with `seriesColors` (both write `custom-colors`). Multi-series bar/column types key `custom-colors` by SERIES name — that's `seriesColors`' job — so they reject `highlight`.
- **Never ship a raw column name as a series label.** Datawrapper's direct label / legend / tooltip is the CSV column header. Give every machine-named column a human name via `spec.seriesLabels` (e.g. `{"median_home_price_usd": "Median home price"}`) — the header is renamed before upload, fixing all three at once.
- **Per-series colours survive `seriesLabels` renaming.** Datawrapper keys `custom-colors` by the series name as it appears in the UPLOADED data, and `resolveData` renames headers via `seriesLabels` before upload. So a `seriesColors` map keyed to the ORIGINAL machine column names (e.g. `{"cpi_energy": "#D55E00"}`) is re-keyed by the mapper to the renamed label (`Energy`) — otherwise DW drops the whole map and the chart ships on its default all-blue ramp (the recurring referendum/recyclage/inflation defect). Key `seriesColors` by EITHER the raw column name OR the display name; both resolve. A genuine ≥3-series chart (read from the DATA shape, not the type) keeps up to 8 distinct Okabe-Ito hues — a declared subject must never fall back to blue.
- **The static PNG is exported at the CADRAGE channel's aspect — but TYPE-AWARE, because DW CROPS row-driven charts (it does not scale them to fit).** `spec.channel` picks the export box (table in `src/export-aspect.ts`): `feed`/`square` → 1080×1080 (1:1), `social`/`vertical`/`story` → 1080×1920 (9:16), `web`/`article` → 1200×675 (16:9, the default). **The delivered PNG is exactly the channel's mediaSize, render-size-verified fail-hard**: DW's PNG export rasterizes at 2× (retina), so `produceChart` requests HALF the channel box (`channelToExportRequestSize`) and the 2× rasterization doubles it back onto the mediaSize; the delivered file's real IHDR dims are then asserted against the channel's mediaSize ±2px (the same floor chart-native/map-native/map-dw enforce — see `skills/map-dw/src/produce.ts`). For **fixed-aspect** types (line/area/column/pie/scatter) DW scales the plot into the box, so the aspect holds. For **row-count-driven HORIZONTAL** types (`ROW_DRIVEN_TYPES`: `d3-bars`/`d3-bars-grouped`/`d3-bars-stacked`/`d3-bars-split`/`d3-bars-bullet`/`d3-dot-plot`/`d3-arrow-plot`/`d3-range-plot`/`tables`) DW does NOT fit the rows into a pinned height — it **CROPS the rows that overflow** (a 45-row `d3-bars` pinned to 675px rendered only ~26 rows, silently dropping 19 bars — data loss in an owned deliverable). So for those types the export pins the channel **WIDTH only** and lets the **height follow the row count**: every row renders on every channel (a "square feed" 45-row bar chart ships tall, not cropped) — the render-size floor asserts the WIDTH leg only there (height is content-driven by design). When the height is natural the responsive guardrail falls back to its default landscape aspect. Absent channel → web/landscape; an UNKNOWN non-empty channel FAILS HARD (`normalizeChannel` is fail-closed — a typo must not silently ship the landscape box). The interactive embed is unaffected (it stays fluid). Set `spec.channel` from the CADRAGE Q3 answer.
- **A line-chart text-annotation with no numeric `y` is silently DROPPED.** When you pin an annotation to an `x` only, the mapper derives `y` from the data at that x (against the correct, possibly-renamed series column). Always give annotations a resolvable `x` (and optionally `column`).
- **A scatter annotation's y comes from the Y column, NOT the first value column.** Every other annotatable type is the category-x / value-y model (column 0 is the categorical x; every remaining column is a y-value). A `d3-scatter-plot` is the exception: its x and y are **two DIFFERENT numeric columns** (x = first value column, y = second; a leading text column is the point label). So the mapper resolves the scatter y-axis domain — and each annotation's derived `y` — from the **Y column alone** (`SCATTER_ANNOTATION_TYPES` + `scatterColumns`/`scatterPointAt` in `src/csv.ts`). Reading the y from "the first value column" (the line/bar default) puts it in the X range (e.g. GDP `40 000`) against a life-expectancy axis of `55–85` → Datawrapper drops it **off-canvas** (the bug that forced callouts into the subtitle). An annotation pinned by **name** (`x:"Japan"`) is also resolved to the row's numeric `(x,y)` so DW can position it — a country name is not a plottable x. A **mechanical tripwire** in `specToMetadata` **throws** if any DERIVED annotation `y` lands outside the y-axis domain (it can only do so by reading the wrong column), so this class of bug can never silently ship again.
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
- `src/furniture-i18n.ts` — i18n furniture gate (fail-hard in `produceChart`, before any API call): a non-English spec's outgoing metadata must carry the localized "Source : X" line in `annotate.notes` and blank `describe.source-name`/`source-url` (mirrored in map-dw).
- `assets/sample-data/` — runnable sample CSV + spec.
- `output-proof/` — the proven published chart (PNG + embed + result).
- `references/api-flow.md` — endpoints + field mapping.
