---
name: map-dw
description: Use when you need a choropleth map (regions shaded by a value) published as a Datawrapper embed AND an owned static PNG, with a colorblind-safe sequential scale. Keywords map, choropleth, datawrapper, region, country, state, geography, embed, png, journalism, dataviz.
output_mode: interactive+static
---

# map-dw — choropleth maps via Datawrapper, with an owned PNG fallback

## Overview

Turns a validated `MapSpec` into a published Datawrapper **choropleth** (embed) **and** an owned PNG.
Datawrapper renders the geography; we apply best-practice (colorblind-safe sequential scale, WCAG
alt = the insight) via its real config fields. The PNG means the visual survives even if Datawrapper
changes — no archive rot. Reuses the proven dw-chart REST client; only the contract, mapper and
orchestration are map-specific.

For animated/video maps use the map-video skills; for rich custom interactivity use a D3 map skill.

## When to use

- Regions (countries, states, counties) shaded by one numeric value: rates, shares, totals per area.
- You want it embeddable now AND archived as a file the newsroom owns.
- **Not** for: point/symbol maps (deferred `d3-maps-symbols`), single-location locator maps
  (deferred `locator-map`), routes, or non-map visuals.

## The one gotcha that will waste your day (read first)

The choropleth colour scale lives in `metadata.visualize.colorscale.colors` as `{color, position}`
stops. **If you also send `colorscale.stops` (a STRING like "equidistant"), the renderer paints every
region AND the legend BLACK.** The mapper here deliberately emits `mode` + `interpolation` + `colors`
and NEVER a `stops` string. (Also: SVG/PDF export is paid → the owned fallback is PNG, free. Token in
`/atelier/.env` as `DATAWRAPPER_API_TOKEN`; `bun test` needs `set -a; source /atelier/.env; set +a`.)

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Contract | `src/map-spec.ts` | `MapSpec` + `validateMapSpec` (key-bound, CVD-safe stops, WCAG alt) |
| Mapping | `src/spec-to-map-metadata.ts` | MapSpec → DW metadata (colorscale-without-`stops` fix) |
| Client | `../dw-chart/src/datawrapper.ts` | REUSED generic REST client (create/data/patch/publish/png) |
| Orchestrator | `src/produce.ts` | `produceMap` → `{chartId, embed, pngPath, publicUrl}` |

## How it works (the shape)

1. **Validate** the `MapSpec` (fail loud on missing key/value/basemap/alt, bad colour stop, and
   confirm `regionKey`/`valueColumn` are real columns of the CSV — the data↔map binding).
2. **Map** spec → DW `metadata`: `axes.keys`=region column, `axes.values`=value column;
   `visualize.basemap`, `visualize["map-key-attr"]`=the basemap join key (e.g. `DW_STATE_CODE`),
   `visualize.colorscale` (light→`#0072B2`, no `stops` string), tooltip; `describe.aria-description`.
3. **Drive** the API: create → setData (CSV) → patch → publish → export PNG.
4. **Return** the embed iframe + the owned PNG path.

**Basemap must fit the data's geographic extent.** EU countries → `europe-sovereign-states`; US states → `us-states`; one country's regions → that country's basemap; only use `world-2019` for genuinely global data. A regional story on the world basemap is a *valid* spec but a *poor* map — a tiny coloured cluster lost in empty grey. Pick the smallest basemap that contains all the data's regions. (Caught only by looking at the render, never by `validateMapSpec`.)

## Quick start

1. Build a `MapSpec` (see `eval/cases/eu-renewables.json`). Pick a basemap from `GET /v3/basemaps`
   and its join key from `GET /v3/basemaps/{id}` → `meta.keys[].value (some basemaps expose it at top-level `keys[].value`)` (the `map-key-attr`).
2. `set -a; source /atelier/.env; set +a` (token).
3. `produceMap(spec, 'out.png')`.

## Tuning knobs (each is one value)

| Want | Knob | Where |
| --- | --- | --- |
| Basemap (world/europe/us-states/…) | `spec.basemap` | MapSpec |
| Basemap join key | `spec.mapKeyAttr` | MapSpec |
| Region-code data column | `spec.regionKey` | MapSpec |
| Value data column | `spec.valueColumn` | MapSpec |
| Colour gradient | `spec.colorScale` (stops; default light→`#0072B2`) | MapSpec |
| Number format | `spec.numberFormat` | MapSpec |
| PNG width | `exportPng(id, path, width)` | `dw-chart/src/datawrapper.ts` |

## Files

- `src/{map-spec,spec-to-map-metadata,produce}.ts` — contract, mapper, orchestrator.
- `src/tests/` — pure unit tests + live e2e (skips without token).
- `eval/` — `scoreMapSpec` (pure gate) + `basemaps.ts` allowlist + generic cases + live basemap check.
- `output-proof/` — the real published choropleth (PNG + publicUrl + result), left published.

## Deferred (next cuts, stated in the spec)

- `d3-maps-symbols` — symbol/bubble map (region or lat/lon + size scale). Shares the client.
- `locator-map` — marker map, no data join. Shares the client.
  Build only when needed; they need different `axes`/`visualize` bindings than choropleth.
