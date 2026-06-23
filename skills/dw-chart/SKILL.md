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
| Number format | `spec.numberFormat` | ChartSpec |
| PNG width | `exportPng(id, path, width)` | `datawrapper.ts` |

## Files

- `src/{chart-spec,spec-to-metadata,datawrapper,produce}.ts` — the four layers.
- `assets/sample-data/` — runnable sample CSV + spec.
- `output-proof/` — the proven published chart (PNG + embed + result).
- `references/api-flow.md` — endpoints + field mapping.
