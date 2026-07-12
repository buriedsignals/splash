---
name: map-dw
description: Use when you need a Datawrapper map — choropleth (regions shaded by a value) or locator (point markers/pins) — as an owned static PNG (format "static") or a hosted embed (format "interactive"), one pinned format per element, with colorblind-safe colours. Symbol / proportional / dot maps (valued circles) route to map-native, not map-dw (see below). Keywords map, choropleth, symbol, bubble, locator, marker, pin, datawrapper, region, country, state, geography, embed, png, journalism, dataviz.
output_mode: single-format (static | interactive)
---

# map-dw — Datawrapper maps (choropleth · locator), single-format

## Overview

Turns a validated `MapSpec` into a Datawrapper map — **choropleth** or **locator** (point
markers) — building ONLY the element's pinned format (single-format-produce-export):

- **`static`** (the default) → the owned PNG alone, exported at the CADRAGE channel's box
  (`spec.channel`: feed → 1:1, social/vertical → 9:16, web/article → 16:9 default) and
  **render-size-verified fail-hard** (the PNG's real IHDR dims must equal the channel's mediaSize
  ±2px — the same floor chart-native/map-native enforce). The owned file survives even if
  Datawrapper changes — no archive rot.
- **`interactive`** → the hosted embed (`publicUrl`) alone — no PNG is exported for it.
- **`video` / `scrolly`** → **fail hard BEFORE any API call** (`map-dw cannot build format …` —
  animated maps are map-native's), both in `produceMap` itself and at the orchestrator dispatch
  (`skills/atelier/src/adapters.ts`). Format/channel resolution runs before `createChart`, so a
  bad pin or garbled channel never leaves an orphaned published map behind.

Datawrapper renders the geography; we apply best-practice (colorblind-safe sequential scale, WCAG
alt = the insight) via its real config fields. Reuses the proven dw-chart REST client; only the
contract, mapper and orchestration are map-specific. **Known limitation:** no rendered-contrast
check runs on the DW-exported raster (the native producers snap-contrast their own renders);
contrast is enforced at the spec level only (CVD-safe `colorScale` stops).

**Symbol / proportional / dot maps (valued circles) are NOT produced here — route them to `map-native`.**
Datawrapper draws proportional circles with values on HOVER only and offers no "label symbols by column"
option (Datawrapper Academy), so a `map-dw` symbol map's owned static PNG ships mute, unlabeled circles
that cannot carry the claim without interaction. `validateMapSpec` therefore **rejects** a symbol spec and
routes it to `map-native`, whose proportional-symbol renderer directly labels the circles by name + value.

For animated/video maps use the map-video skills; for rich custom interactivity use a D3 map skill.

## When to use

- **Choropleth** — regions (countries, states, counties) shaded by one numeric value: rates,
  shares, totals per area.
- **Locator** — a handful of point markers/pins calling out specific places in a story (no value
  per point). Wide extent (≥ ~12°) only; a sub-national locator routes to `map-native` (coastline
  accuracy).
- You want ONE of: an archived file the newsroom owns (format `static`) or a hosted embed
  (format `interactive`) — the element's pinned format decides which single artifact is built.
- **Not** for: **symbol / proportional / dot maps** (points carrying a VALUE mapped to circle size) —
  those route to `map-native`, which ships a statically-labeled PNG (`map-dw` symbol maps are hover-only
  and `validateMapSpec` rejects them). Also **not** for routes/line markers, area markers, or non-map
  visuals. For animated/video maps use the map-video skills; for rich custom interactivity use a D3 map skill.

## Five gotchas that will waste your day (read first)

0. **Join key (choropleth) — the silent grey map.** `mapKeyAttr` MUST be one of the chosen
   basemap's real join keys, and the data's `regionKey` values must live in that key's code
   space. A wrong key (e.g. `ISO_A3` on `world-2019`, whose alpha-3 key is `DW_STATE_CODE`)
   silently fails the region join and ships a **fully grey, dataless map** — Datawrapper still
   publishes it, so nothing surfaces until someone reads the PNG. Two guards protect this:
   `validateMapSpec` rejects a `mapKeyAttr` that is not a declared key of a **known** basemap
   (`src/basemap-keys.ts`, sourced from `GET /v3/basemaps/{id}` → `meta.keys[].value`) and names
   the valid keys; and `produceMap` runs a **dataless-join guard** (`src/join-match.ts`) that
   recomputes the real match rate from the live basemap geometry and **fails hard** (never
   publishes) when fewer than `MIN_JOIN_MATCH_RATE` (50%) of the data rows join — covering ANY
   basemap, known to the registry or not. Pick the key from `GET /v3/basemaps/{id}` → `meta.keys`;
   e.g. `world-2019`→`DW_STATE_CODE` (alpha-3), `us-states`→`id` (2-letter postal, NOT `NAME_ABBR`
   which is the dotted "Ala." form), `europe-sovereign-states`→`ISO_3_SOV`.
1. **Colour scale (choropleth + symbol):** it lives in `metadata.visualize.colorscale.colors` as
   `{color, position}` stops. **If you also send `colorscale.stops` (a STRING like "equidistant"),
   the renderer paints every region/symbol AND the legend BLACK.** The mapper deliberately emits
   `mode` + `interpolation` + `colors` and NEVER a `stops` string.
2. **Symbol map SIZE binding (RETIRED path — historical):** symbol maps are hover-only and no longer
   producible here (`validateMapSpec` rejects them; route valued point maps to `map-native`). The binding
   is recorded for reference: circles are placed by lat/lon, NOT a region join — value→SIZE is `axes.area`,
   value→COLOUR is `axes.values`; setting `axes.keys/values` (choropleth style) renders the basemap but
   **no circles at all**. This is exactly why the static PNG is unlabeled: the values live only in the
   hover tooltip, so route to `map-native` (statically labeled) instead.
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
| Contract | `src/map-spec.ts` | `MapSpec` + `validateMapSpec` (key-bound, valid join key, CVD-safe stops, WCAG alt) |
| Join keys | `src/basemap-keys.ts` | registry of each known basemap's valid `map-key-attr` values (from the live DW basemap API) |
| Mapping | `src/spec-to-map-metadata.ts` | MapSpec → DW metadata (colorscale-without-`stops` fix) |
| Client | `../dw-chart/src/datawrapper.ts` | REUSED generic REST client (create/data/patch/publish/png) |
| Dataless guard | `src/join-match.ts` | produce-time real join-match rate from live geometry; fails hard on a dataless join |
| Orchestrator | `src/produce.ts` | `produceMap(spec, pngPath, {format?})` → `{chartId, embed, pngPath?, publicUrl}` — single-format (`static` default \| `interactive`; video/scrolly fail hard pre-API); channel-derived export box + render-size floor (shared `skills/atelier/src/channel.ts`) |

## How it works (the shape)

0. **Format gate** — FIRST. `format` outside {`static`, `interactive`} throws
   (`video/scrolly require map-native`) before anything else runs.
1. **Validate** the `MapSpec` (fail loud on missing bindings/alt, bad colour stop, and confirm the
   geo/value columns are real CSV columns — the data↔map binding; markers carry valid lng/lat; and
   for a choropleth on a **known** basemap, that `mapKeyAttr` is one of its real join keys).
1.2. **Channel → export box, resolved BEFORE any API call** (the dw-chart orphaned-published-chart
   lesson, mirrored): `spec.channel` resolves fail-closed (`normalizeChannel` throws on a garbled
   value; absent → article-web) to HALF the channel's mediaSize (`mapExportSize`) — DW's PNG export
   rasterizes at 2×, so the halved request doubles back onto the channel size, the same halving
   chart-native applies at deviceScaleFactor:2. Maps are always fixed-aspect (DW scales the
   geography into the box), so the height is always pinned — no row-cropping concern here.
1.5. **Dataless-join guard** (choropleth): fetch the live basemap geometry and confirm the data's
   `regionKey` values actually join to regions. Below `MIN_JOIN_MATCH_RATE` (50% matched) the join
   has failed — the map would be fully grey — so `produceMap` **throws before publishing** rather
   than ship a dataless "produced" render. Covers any basemap, registry-known or not.
2. **Map** spec → DW `metadata`, dispatched on `mapType`:
   - **choropleth** (`d3-maps-choropleth`): `axes.keys`=region col, `axes.values`=value col;
     `visualize.basemap`, `visualize["map-key-attr"]`=basemap join key (e.g. `DW_STATE_CODE`),
     `visualize.colorscale` (light→`#0072B2`, no `stops` string), tooltip.
   - **symbol** (`d3-maps-symbols`) — RETIRED: `validateMapSpec` rejects a symbol spec (hover-only, no
     static labels → route to `map-native`). The mapper (`symbolMetadata`) is kept only to document the
     historical DW binding (`axes.area`=size, `axes.values`=colour); it is never reached in production.
   - **locator** (`locator-map`): `visualize.markers`=array of `{type:"point", coordinates:[lng,lat],
     title, markerColor (Okabe-Ito cycle), icon}`; computed `visualize.view.center`+`zoom`. No data table.
   - All carry `describe.aria-description` (alt = the insight).
3. **Drive** the API: create → setData (CSV; skipped for locator) → patch → publish. The publish is
   unconditional infrastructure (hosted producer: even the static PNG can only be exported FROM a
   published map) — it is not a deliverable of its own.
4. **Build ONLY the pinned format**: `static` → export the PNG at the channel box, then read the
   file's own IHDR dims back and `assertRenderedSize` against the channel's mediaSize (±2px,
   fail-hard — the shared render-size floor). `interactive` → skip the export entirely; the hosted
   embed IS the deliverable. (No rendered-contrast check runs on the DW raster — known limitation;
   the CVD-safe scale is enforced at the spec level.)
5. **Return** `{chartId, embed, pngPath?, publicUrl}` — `pngPath` present only for `static`.

**Basemap must fit the data's geographic extent (choropleth).** EU countries →
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
   The `mapKeyAttr` MUST be one of those declared keys AND match the data's `regionKey` code space
   (e.g. alpha-3 `DW_STATE_CODE`, not `ISO_A3`, on `world-2019`) — a wrong key ships a grey dataless
   map. Known basemaps' keys are recorded in `src/basemap-keys.ts` (validated offline); add a basemap
   there when you introduce it.
2. `set -a; source /atelier/.env; set +a` (token).
3. `produceMap(spec, 'out.png')` — static by default (owned PNG at the channel box);
   `produceMap(spec, 'out.png', { format: 'interactive' })` for the hosted embed alone.

## Tuning knobs (each is one value)

| Want | Knob | Where |
| --- | --- | --- |
| Map type (choropleth/locator) | `spec.mapType` | MapSpec |
| Basemap (choropleth) | `spec.basemap` | MapSpec |
| Basemap join key (choropleth) | `spec.mapKeyAttr` | MapSpec |
| Region-code data column (choropleth) | `spec.regionKey` | MapSpec |
| Value data column (choropleth) | `spec.valueColumn` | MapSpec |
| Valued point map (symbol/proportional/dot) | route to **`map-native`** (rejected here) | — |
| Pins (locator) | `spec.markers` (`{lng,lat,label,color?}`) | MapSpec |
| Explicit locator framing | `spec.view` (`{center,zoom}`; else auto from markers) | MapSpec |
| Colour gradient (choropleth) | `spec.colorScale` (default light→`#0072B2`) | MapSpec |
| Number format | `spec.numberFormat` | MapSpec |
| Built format (static PNG / hosted embed) | `opts.format` (`"static"` default \| `"interactive"`) | `produceMap` |
| Static export box (channel-derived) | `spec.channel` (feed→1:1, social→9:16, web→16:9 default) | MapSpec |

## Files

- `src/{map-spec,spec-to-map-metadata,produce}.ts` — contract (choropleth + locator produced; symbol
  rejected → `map-native`), mapper, orchestrator (single-format: static PNG at the channel box with
  the render-size floor, or hosted embed alone; video/scrolly fail hard pre-API).
- `src/basemap-keys.ts` — per-basemap valid join keys (offline registry) for the `validateMapSpec`
  join-key check; `src/join-match.ts` — produce-time dataless-join guard (live match rate, fail-hard).
- `src/furniture-i18n.ts` — i18n furniture gate (fail-hard in `produceMap`, before any API call): a
  non-English spec's outgoing metadata must carry the localized "Source : X" line in `annotate.notes`
  and blank `describe.source-name`/`source-url` (mirrored from dw-chart).
- `src/tests/` — pure unit tests + live e2e (choropleth + locator; symbol asserts rejection; join-key
  mismatch asserts validation error + a dataless join asserts a produce refusal; static asserts the
  delivered PNG dims == channel mediaSize ±2px; interactive asserts embed-alone/no PNG) (live tests
  skip without token). `produce-format.test.ts` — token-free: format gate + channel resolution beat
  the missing-token error (proof both run before any API call) + `mapExportSize` derivation.
- `eval/` — `scoreMapSpec` (pure gate, per-type) + `basemaps.ts` allowlist + generic cases
  (choropleth, locator) + live basemap check.
- `output-proof/` — the real published choropleth and locator maps (PNG + publicUrl), left published;
  the symbol proof is retained as historical evidence that the static export is hover-only/unlabeled.

## Deferred (next cuts)

- Line/route markers and area markers on locator maps (different marker shapes). Shares the client.
- The native geo-prep stack (MapTiler/Cesium) for animated/3D maps — a separate heavy cut.
