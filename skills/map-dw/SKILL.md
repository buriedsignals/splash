---
name: map-dw
description: Use when you need a Datawrapper map — choropleth (regions shaded by a value), symbol (proportional circles by lat/lon) or locator (point markers/pins) — published as an embed AND an owned static PNG, with colorblind-safe colours. Keywords map, choropleth, symbol, bubble, locator, marker, pin, datawrapper, region, country, state, geography, embed, png, journalism, dataviz.
output_mode: interactive+static
---

# map-dw — Datawrapper maps (choropleth · symbol · locator), with an owned PNG fallback

## Overview

Turns a validated `MapSpec` into a published Datawrapper map — **choropleth**, **symbol**
(proportional circles) or **locator** (point markers) — (embed) **and** an owned PNG.
Datawrapper renders the geography; we apply best-practice (colorblind-safe sequential scale, WCAG
alt = the insight) via its real config fields. The PNG means the visual survives even if Datawrapper
changes — no archive rot. Reuses the proven dw-chart REST client; only the contract, mapper and
orchestration are map-specific.

For animated/video maps use the map-video skills; for rich custom interactivity use a D3 map skill.

## When to use

- **Choropleth** — regions (countries, states, counties) shaded by one numeric value: rates,
  shares, totals per area.
- **Symbol** — points placed by lat/lon, with a value mapped to circle SIZE (and colour): city
  populations, event counts, station readings.
- **Locator** — a handful of point markers/pins calling out specific places in a story.
- You want it embeddable now AND archived as a file the newsroom owns.
- **Not** for: routes/line markers, area markers, or non-map visuals. For animated/video maps use
  the map-video skills; for rich custom interactivity use a D3 map skill.

## Four gotchas that will waste your day (read first)

1. **Colour scale (choropleth + symbol):** it lives in `metadata.visualize.colorscale.colors` as
   `{color, position}` stops. **If you also send `colorscale.stops` (a STRING like "equidistant"),
   the renderer paints every region/symbol AND the legend BLACK.** The mapper deliberately emits
   `mode` + `interpolation` + `colors` and NEVER a `stops` string.
2. **Symbol map SIZE binding:** circles are placed by lat/lon, NOT a region join. The value→SIZE
   field is **`axes.area`**; value→COLOUR is `axes.values`. Setting `axes.keys/values` (choropleth
   style) renders the basemap but **no circles at all** — the trap a prior spike hit.
3. **Locator framing:** DW's `view.fit:true` does **not** reliably frame to the markers — it
   rendered the **whole world**. The mapper always computes an explicit `view.center` + `view.zoom`
   from the markers' bounding box (40% padding). Caught only by looking at the PNG.
4. **`numberFormat` is a Datawrapper numeral.js token, NOT printf/Python.** Use `"0%"` for a
   column that is already percentage-scale (16 meaning 16%, not 0.16 — Datawrapper appends the
   sign without multiplying), `"0.0"`/`"0,0"` for decimals/thousands. A printf leftover (`".0f%"`)
   is silently unrecognised by Datawrapper and the legend falls back to bare numbers ("15…70"
   instead of "15%…70%") — indistinguishable from the field having been dropped. `spec-to-map-metadata.ts`
   normalises it the same way `dw-chart/src/chart-spec.ts` does for value labels/axes;
   `validateMapSpec` warns when a token was auto-corrected and rejects one it cannot map.

(Also: SVG/PDF export is paid → the owned fallback is PNG, free. Token in `.env` as
`DATAWRAPPER_API_TOKEN`; `bun test` needs `set -a; source .env; set +a`.)

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Contract | `src/map-spec.ts` | `MapSpec` + `validateMapSpec` (key-bound, CVD-safe stops, WCAG alt) |
| Mapping | `src/spec-to-map-metadata.ts` | MapSpec → DW metadata (colorscale-without-`stops` fix) |
| Client | `../dw-chart/src/datawrapper.ts` | REUSED generic REST client (create/data/patch/publish/png) |
| Orchestrator | `src/produce.ts` | `produceMap` → `{chartId, embed, pngPath, publicUrl}` |

## How it works (the shape)

1. **Validate** the `MapSpec` (fail loud on missing bindings/alt, bad colour stop, and confirm the
   geo/value columns are real CSV columns — the data↔map binding; markers carry valid lng/lat).
2. **Map** spec → DW `metadata`, dispatched on `mapType`:
   - **choropleth** (`d3-maps-choropleth`): `axes.keys`=region col, `axes.values`=value col;
     `visualize.basemap`, `visualize["map-key-attr"]`=basemap join key (e.g. `DW_STATE_CODE`),
     `visualize.colorscale` (light→`#0072B2`, no `stops` string), tooltip.
   - **symbol** (`d3-maps-symbols`): `axes.lat`/`axes.lon`=coordinate cols, **`axes.area`=size col**,
     `axes.values`=colour col; `visualize.basemap` (backdrop, no join), `visualize["map-type-set"]`,
     same `colorscale`.
   - **locator** (`locator-map`): `visualize.markers`=array of `{type:"point", coordinates:[lng,lat],
     title, markerColor (Okabe-Ito cycle), icon}`; computed `visualize.view.center`+`zoom`. No data table.
   - All carry `describe.aria-description` (alt = the insight).
3. **Drive** the API: create → setData (CSV; skipped for locator) → patch → publish → export PNG.
4. **Return** the embed iframe + the owned PNG path.

**Basemap must fit the data's geographic extent (choropleth + symbol).** EU countries →
`europe-sovereign-states`; US states → `us-states`; French points → a France basemap; only use
`world-2019` for genuinely global data. A regional story on the world basemap is a *valid* spec but a
*poor* map — a tiny cluster lost in empty grey. Pick the smallest basemap that contains all the data.
For continental-US data prefer **`us-states-continental`** (not `us-states`): some basemap ids pass
`validateMapSpec` but **500 on publish** (`us-states` does) — if a publish 500s, switch to the safe
variant (`-continental`, or another id of the same extent).
(Caught only by looking at the render, never by `validateMapSpec`.)

## Quick start

1. Build a `MapSpec` (see `eval/cases/eu-renewables.json`). Pick a basemap from `GET /v3/basemaps`
   and its join key from `GET /v3/basemaps/{id}` → `meta.keys[].value (some basemaps expose it at top-level `keys[].value`)` (the `map-key-attr`).
2. `set -a; source /atelier/.env; set +a` (token).
3. `produceMap(spec, 'out.png')`.

## Tuning knobs (each is one value)

| Want | Knob | Where |
| --- | --- | --- |
| Map type (choropleth/symbol/locator) | `spec.mapType` | MapSpec |
| Basemap (choropleth + symbol) | `spec.basemap` | MapSpec |
| Basemap join key (choropleth) | `spec.mapKeyAttr` | MapSpec |
| Region-code data column (choropleth) | `spec.regionKey` | MapSpec |
| Value data column (choropleth) | `spec.valueColumn` | MapSpec |
| Lat/lon data columns (symbol) | `spec.latColumn` / `spec.lonColumn` | MapSpec |
| Symbol SIZE data column (symbol) | `spec.sizeColumn` (→`axes.area`) | MapSpec |
| Symbol COLOUR data column (symbol) | `spec.colorColumn` (defaults to sizeColumn) | MapSpec |
| Pins (locator) | `spec.markers` (`{lng,lat,label,color?}`) | MapSpec |
| Explicit locator framing | `spec.view` (`{center,zoom}`; else auto from markers) | MapSpec |
| Colour gradient (choropleth + symbol) | `spec.colorScale` (default light→`#0072B2`) | MapSpec |
| Number format | `spec.numberFormat` | MapSpec |
| PNG width | `exportPng(id, path, width)` | `dw-chart/src/datawrapper.ts` |

## Files

- `src/{map-spec,spec-to-map-metadata,produce}.ts` — contract (3 mapType variants), mapper, orchestrator.
- `src/tests/` — pure unit tests + live e2e for all three types (skips without token).
- `eval/` — `scoreMapSpec` (pure gate, per-type) + `basemaps.ts` allowlist + generic cases
  (choropleth, symbol, locator) + live basemap check.
- `output-proof/` — the real published choropleth, symbol and locator maps (PNG + publicUrl), left published.

## Deferred (next cuts)

- Line/route markers and area markers on locator maps (different marker shapes). Shares the client.
- The native geo-prep stack (MapTiler/Cesium) for animated/3D maps — a separate heavy cut.
