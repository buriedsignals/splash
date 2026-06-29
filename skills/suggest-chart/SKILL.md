---
name: suggest-chart
description: Use to decide which visual ELEMENT (chart or map) + FORMAT + producer serves an article's intent, and emit the right spec. Routes to dw-chart (static chart, default), chart-native (motion/interactivity), or map-dw (static choropleth map). Reads the data profile + the editorial intent, grounded on the KB references. Keywords suggest, choose chart, map, choropleth, geographic, map-dw, format selection, intent, dataviz, orchestration, producer, datawrapper, chart-native, video, interactive.
---

# suggest-chart — decide the visual element, format, and producer

## Overview

The visual-element suggester. Given a **data profile** (columns, types, cardinality) and an **editorial
intent**, it decides the right visual element (chart or map), format (static / interactive / scrolly / video),
and producer, then emits the matching spec. It never invents data; if no visual serves the story, it says so.

Producers: **dw-chart** (static Datawrapper chart — default), **chart-native** (motion or rich interactivity),
**map-dw** (static choropleth map via Datawrapper).

## Inputs

- Data (CSV or a profile of it) + a one-line **intent** ("show the unemployment trend 2018-2023").

## Runtime procedure

② is the host agent. Execute these steps in order — do not skip the self-check.

1. **Profile** the data: list columns, infer each type (numeric / categorical / temporal), cardinality,
   and the row count. This fixes the data shape (single-series, multi-series, or two-value).

2. **Detect geographic structure**: check whether any column holds region identifiers — country names,
   ISO-A2/A3 codes, or a recognised admin code (NUTS, FIPS, …). If found, record the region column and the
   candidate basemap family (world-countries, eu-nuts2, us-states, …). Also note whether the numeric column
   is a **normalised rate** (per-capita, %, index) or an absolute count — this matters for Gate 5.

3. **Gate 5 — geographic only** (skip if no geographic structure was detected):
   Read `<repo-root>/knowledge/references/formats/format-selection.md` (Gate 5).
   Emit a **map** ONLY when ALL three conditions hold:
   - the **spatial pattern is the story** (the geographic distribution is the finding, not a ranking);
   - the value is a **normalised rate** (per-capita, %, index — not raw absolute counts);
   - the **regions are legible** in number and label (not 200+ micro-regions) OR a **self-location motive**
     applies (the reader needs to find their own region).
   If ANY condition fails → emit a **sorted bar chart** (`d3-bars`, `sort:"desc"`) — the honest default for
   "which region is highest". State WHY (cite Gate 5) in the decision output.

4. **Format (Gates 1–4):** read `<repo-root>/knowledge/references/formats/format-selection.md` (Gates 1–4).
   Static is the default (most readers do not interact). Escalate to interactive / scrolly / video ONLY on
   the named conditions. **Slice 1 produces the static path**: for maps that is `map-dw`; for charts that
   is `dw-chart` (or `chart-native` for motion/interactivity — see Producer section).
   If the format judgment recommends a richer format (native map, scrolly), record that recommendation in
   the decision output as a follow-up for later slices — slice 1 still produces the static path.

5. **Choose chart family** (chart path only): use the shared KB
   `<repo-root>/knowledge/references/chart-selection.md` — map intent → family → the *simplest* type that
   serves it. When in doubt, bars/columns on a common baseline.

6. **Fill the spec** (chart or map — see sections below) applying
   `<repo-root>/knowledge/references/design-conformance.md`.

7. **Self-check**: the spec MUST pass the relevant validator (`validateChartSpec` for charts,
   `validateMapSpec` for maps — run it). Read all returned `warnings` and fix them — do not ignore them.

8. **Produce**: call the producer for the chosen path (see Producer section).

9. **Or `no-chart`**: if no visual serves the data and intent (data too thin, or the intent is not a
   visualisation question), emit `{ "decision": "no-chart", "reason": "..." }` instead of forcing a visual.

## How it decides

1. Read the shared KB `<repo-root>/knowledge/references/chart-selection.md` (at the atelier repo root, not under this skill) → map **intent → DW type** (intent first, simplest type that serves it).
2. Read `<repo-root>/knowledge/references/design-conformance.md` (shared KB, repo root) → fill the conformance fields.
3. Emit a **ChartSpec** (the exact shape `dw-chart/src/chart-spec.ts` validates):
   `{ type, title (the insight, sentence case), intro?, data (CSV), baseColor (Okabe-Ito, default #0072B2),
   valueLabels?, numberFormat?, source?, altInsight (WCAG: the insight, not the structure) }`.
4. Guardrails: **≤2 colours**; default single series to `#0072B2`; if the data is too complex for a clean
   chart, return `{ "decision": "no-chart", "reason": "..." }` instead of forcing one.

## Producer — dw-chart (default) vs chart-native vs map-dw

Before emitting the spec, decide the **producer**. The producer set is `{dw-chart, chart-native, map-dw}`.

### dw-chart (static chart — default)

The default for all chart paths. Emit the `ChartSpec` as above → hand to `dw-chart`.

### chart-native (motion / rich interactivity)

Choose `chart-native` ONLY when the intent explicitly wants **motion** (a video / animated reveal —
landscape/square/portrait mp4) OR **rich interactivity** (keyboard focus, per-point tooltips beyond DW's
hover). A plain static chart stays `dw-chart`.

Emit a `NativeSpec` instead:
`{ producer: "chart-native", nativeType, title, source{name,url}, unit, data (CSV), sort?, orientation?,
directLabel?, highlight? }`. The mapped native families are **bar/column, line, scatter, pie**
(`spec-to-config.ts`); for any other type the native producer exits with `FALLBACK_TO_DW` and you route
to `dw-chart` instead. Produce with
`bun skills/chart-native/scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> [all|static]`
→ static PNG + interactive HTML + 3 mp4s. `nativeType` uses the chart-native keys (`bar`, `line`,
`scatter`, `pie`); `highlight` is the category to accent; `directLabel` is the line's series label.

### map-dw (static choropleth map)

Used when Gate 5 routes to a map (see Runtime procedure). Emits a **`MapSpec`** with `producer: "map-dw"`
as the discriminator (the eval gate uses this field to identify the path).

#### Emitted MapSpec fields (exact — validated by `validateMapSpec` in `map-dw/src/map-spec.ts`)

```json
{
  "producer": "map-dw",
  "mapType": "choropleth",
  "basemap": "<DW basemap id — e.g. world-2019>",
  "mapKeyAttr": "<the join key on that basemap — e.g. ISO_A3>",
  "regionKey": "<data column holding region codes/names>",
  "valueColumn": "<data column holding the normalised rate>",
  "data": "<CSV text>",
  "title": "<the insight — sentence case, never a column label>",
  "intro": "<description of the map for context>",
  "altInsight": "<the insight — WCAG alt, same wording as title>",
  "source": { "name": "<honest source>", "url": "<optional>" }
}
```

Field notes:
- `mapType` MUST be `"choropleth"` — required by the validator.
- `basemap` + `mapKeyAttr`: pick the DW basemap whose key matches the region identifiers. Slice 1 supports
  the common case — **countries by ISO-A3 or name → the world basemap** (e.g. `"world-2019"`, key
  `mapKeyAttr: "ISO_A3"`). Use the basemap-key discovery `map-dw` documents (`GET /v3/basemaps/{id}` →
  `meta.keys`) to confirm the correct `mapKeyAttr` for the chosen basemap.
- `regionKey`: the data column holding the region codes (ISO-A2/A3, country name, …).
- `valueColumn` (NOT `valueField`): the numeric column with the normalised rate per Gate 5.
- `title`: the spatial finding as a sentence ("Nordic countries generate most of their electricity from
  renewables") — NOT a label or column name.
- `intro`: the description / context for the map.
- `altInsight`: WCAG accessible alternative — the same insight as `title`.
- `source`: the honest source the article names (prose-provenance rule). Never fabricated.
- `colorScale` (optional): an array of `{color: hex, position: 0..1}` stops, ascending. If omitted,
  `map-dw` applies the default Okabe-Ito blue sequential scale.
- `numberFormat` (optional): format string to strip noise from the value labels.

**Basemap fallback rule:** if no known DW basemap matches the region identifiers in the data → do NOT
force a map. Fall back to a **sorted bar chart** (`d3-bars`, `sort:"desc"`) and state why in the decision
output (cite the basemap-fallback rule).

**Produce:** route the `MapSpec` to `map-dw`'s producer via the `MapSpec → spec-to-map-metadata →
produceMap` seam. The Datawrapper token comes from `/atelier/.env` (`DATAWRAPPER_API_TOKEN`) — it is
**never logged**.

## Guardrails (the code enforces these — propose within them)

- **Type:** pick from the 22 supported types (single-series, multi-series, or two-value per the data shape).
- **Sort:** for ranking intents (bars/columns where order matters), set `"sort": "desc"` — the producer sorts the CSV.
- **Colours:** single-series → at most 2 Okabe-Ito colours (default `#0072B2`); multi-series → one Okabe-Ito colour per series in `seriesColors`, at most 8.
- **Pie/donut:** at most 5 slices — if more, group into "Other" or choose bars.
- **Annotations:** add a `text-annotation` for the key outlier or turning point ("annotations explain WHY").
- **Title:** state the insight, not a label or a year range (the validator warns otherwise).
- **Multi-series orientation:** `transpose:true` is ONLY for stacked/grouped **categorical** charts (e.g. stacked `year, Coal, Gas, Renewables`) where the x-category, not the series, belongs on the axis. **Never transpose a line/time chart** — a multi-series time trend (`year, France, Switzerland`) is `d3-lines` with one line per column and NO transpose. `multiple-lines`/`multiple-columns` = deliberate small multiples (one panel per series), not a single trend.
- **Two-point comparison (prose-extracted):** a claim with exactly two values (e.g. 2019 vs 2024) renders as a **slope**, **dumbbell**, or **paired columns** — NEVER a continuous line, which would imply a trend from two points.
- **Honest source label (prose):** when the data is `provenance: "prose"`, the chart's source reads "Figures as reported in this article" (or the source the article itself names) — never a fabricated dataset attribution.

## Self-check

- **Chart path:** the emitted spec MUST pass `validateChartSpec` (run it via the dw-chart skill). Title
  and altInsight must state the **insight**, not the column names.
- **Map path:** the emitted `MapSpec` MUST pass `validateMapSpec` (run it via `map-dw/src/map-spec.ts`).
  Read all returned `warnings` and fix them. A `title looks like a label` warning means rewrite `title`
  as the spatial insight. `altInsight` must be non-empty and match the insight.
- In both cases: the decision output MUST cite which gate(s) drove the routing (Gate 5 for geographic
  routing; format gates for format escalation).

## Output

One of:
- a `ChartSpec` JSON for `dw-chart` (the default static chart path);
- a `NativeSpec` JSON for `chart-native` (when motion/interactivity is the ask);
- a `MapSpec` JSON with `producer: "map-dw"` (when Gate 5 routes to a choropleth map);
- or a `no-chart` decision with a reason.
