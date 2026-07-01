# map-native — SP3a: route map type (static + interactive) — design

**Date:** 2026-07-01
**Status:** approved (brainstorming)
**Scope:** the FOUNDATION of the route/flow map type — the first map type with a LINEAR feature (a route
LineString) plus the territories it crosses. SP3a delivers the static + interactive formats (a
config-driven `route` type, mirroring how choropleth/symbol are built); the route-reveal VIDEO (Tom's
draw-on aesthetic) is the sibling sub-project **SP3b**. Each fix ships its four coupled artifacts (code +
conformance/harness + KB at the right layer + render verification). Also introduces the **AI-selected
`mapStyle`** capability (basemap tile style is a parameter the AI picks per article, not a hardcoded
default).

SP3 of the maps roadmap. Order within SP3: **SP3a route type (static + interactive)** → SP3b route-reveal
video. SP3b plugs the `cameraMode = "route-reveal"` dispatch point that SP2 laid down (produce throws for
it today) into a `RouteReveal` composition, reusing SP3a's `route-geo` + config.

## Why

The existing map types (choropleth regions, proportional-symbol points) have no linear feature, so the
`route-reveal` camera mode (a line drawing across the map) has nowhere to attach. The route type adds a
first-class linear map: a route (river / journey / border) plus the territories it passes through. Tom
Vaillant's map-explainer pilot (`src/components/RiverReveal.tsx`, hardcoded to the Yarlung/China-India-
Bangladesh example) proves the video aesthetic; SP3a builds the reusable, config-driven foundation
(geometry + static + interactive) that SP3b's generalized `RouteReveal` will sit on.

## A. The route type + AI-selected basemap

- **Type:** `config.type === "route"`. Config shape:
  ```
  { type: "route",
    route: [[lon,lat], …],            // the LineString (≥ 2 points)
    basemap: "world",                 // boundary PRESET (existing config convention: this field
                                      //   names the boundary geojson, e.g. world countries — a misnomer
                                      //   we keep for consistency with choropleth/symbol configs)
    mapStyle: "dataviz-dark",         // AI-selected TILE style (the actual basemap background) — see below
    title, description?, source?,     // furniture
    palette?: string[],               // optional qualitative palette override
    territories?: [                   // OPTIONAL per-territory overrides (label/colour/order)
      { key, label?, color?, order? } ] }
  ```
  NOTE on the two fields: `basemap` (existing, required by every map config) selects the boundary preset;
  `mapStyle` (NEW) selects the tile background style. Confusing names, but `basemap`-means-preset is the
  pre-existing convention and renaming it is out of scope here.
- **AI-selected `mapStyle` (capability, not a default):** the basemap tile style is a config parameter the
  AI chooses per the article's need (a dark base for a dramatic explainer, a light base for a clean
  locator). The option space is an enum resolved to a MapTiler style: `dataviz-light` →
  `MapStyle.DATAVIZ.LIGHT`, `dataviz-dark` → `MapStyle.DATAVIZ.DARK` (extensible). A `resolveMapStyle(mapStyle)`
  helper maps the token to the MapTiler style; an unknown token is rejected by validation (like the
  `cameraMode` guard). `RouteMap` (and, in SP3b, `RouteReveal`) reads it. This applies to the route type in
  SP3a; generalizing `mapStyle` to choropleth/symbol (which hardcode `DATAVIZ.LIGHT`) is a candidate future
  improvement, out of scope here.

## B. `route-geo.ts` — geometry (framework-free, unit-tested)

`computeRoute(config, boundaries: FeatureCollection) → { route, territories, bounds }`:

- **Parse** the route LineString.
- **Auto-detect** the territories the route crosses: for each boundary polygon in the preset, test with
  turf whether the route line intersects it (`turf.booleanIntersects` / `lineIntersect`); keep the ones it
  crosses.
- **Order** the crossed territories along the route: for each, the arc-length fraction of the route's FIRST
  entry into it (turf: nearest-point-on-line of the first intersection) → sort ascending. This is the same
  `stop` notion Tom bakes, computed here (SP3b reuses/extends it for the draw timing).
- **Colour** each territory from a qualitative, CVD-safe palette (distinct hues), cycling if there are more
  territories than palette entries; `palette` / per-territory `color` overrides win.
- **Anchor** each territory with a label point — turf pole-of-inaccessibility (`turf.pointOnFeature` /
  polylabel) so the label sits inside the polygon even when it crosses the frame edge.
- **Bounds:** the bbox of the route ∪ the crossed territories, latitude-clamped to ±85 (mercator-safe),
  padded.

Returns `{ route: LineStringFeature, territories: [{ key, label, color, order, anchor:[lon,lat] }], bounds }`.
Framework-free (no MapTiler / React), so it unit-tests without a browser.

## C. `RouteMap.tsx` — static + interactive (mirror ChoroplethMap / SymbolMap)

A React + MapTiler component driven by the config, rendering the route map's resting state:

- Basemap = `resolveMapStyle(config.mapStyle)`. Strip basemap symbol labels + inner admin borders (as
  RiverReveal does) for a clean editorial base.
- **Territory fills:** each crossed territory filled with its colour (moderate opacity so the base reads
  through), from a `route-fill` layer keyed by territory.
- **Route line:** the LineString as a styled line layer (a clean, legible stroke — the electric draw-head
  is SP3b's video-only treatment; the static/interactive route is a calm line).
- **Labels:** each territory's `label` at its `anchor`, projected — a `symbol` layer or projected overlay.
- **Furniture:** wrapped in `MapFrame` (title + source), `furnitureOpacity` default (the scene model is
  video-only; static/interactive show furniture normally).
- **Interactive:** `NavigationControl` + reset, `maxBounds` + `minZoom` bounded to the route extent,
  `ResizeObserver` re-fit (recompute minZoom per size — the SP1 web-framing-v2 pattern), `window.__map__`
  exposed, hover tooltip on a territory (name). Static build has no controls (the SP1 guard).
- `resolveMapFrame().pad` keeps the route/territories out of the title/source bands.

## D. Produce + validation + conformance + KB

- **Produce:** `scripts/produce.mjs` learns `config.type === "route"` — it builds + snaps `RouteMap` for
  static + interactive (same web-build + snap pipeline as choropleth/symbol). The `story` video kind for a
  route stays a `route-reveal` dispatch that THROWS "not implemented (SP3b)" until SP3b (the SP2 extension
  point, now type-aware). Nested JSON output unchanged.
- **Validation** (`src/validate-config.ts`): `validateRouteConfig` — `route` is an array of ≥ 2 `[lon,lat]`
  pairs in range; `basemap` (boundary preset) is a non-empty known preset; `mapStyle` (if present) is in the option space (else
  error, mirroring the `cameraMode` guard); `title` is an insight; furniture warnings. A `RouteConfigShape`.
- **Conformance** (`src/conformance.ts`): `checkRouteConformance` — route non-empty; ≥ 1 crossed territory;
  territory colours mutually distinct (and, reusing the WCAG helper, distinguishable); `mapStyle` in the
  option space; title/source present. Test-only (consistent with the existing conformance discipline).
- **KB** (`knowledge/references/map/types/route.md`, NEW per-type doc): the route type — a linear feature +
  the territories it crosses; auto-detection from a boundary preset; qualitative palette; AI-selected
  `mapStyle`; WHEN to use a route map (a linear geographic story: a river, a journey, a border, a supply
  chain) vs choropleth (regional magnitude) vs symbol (point magnitude). Sourced by name (FT Visual
  Vocabulary — "flow / connection"; data-to-viz — connection maps). A one-line pointer to the future
  route-reveal video (SP3b) + the camera-modes doc.

## Testing / verification

- Pure: `route-geo.test.ts` — `computeRoute` on a small synthetic route + boundary set: it detects the
  crossed territories, orders them along the route, assigns distinct colours, anchors inside each polygon,
  and computes clamped bounds; `validate-config` + `conformance` cases for the route config + `mapStyle`
  guard.
- Render (static + interactive): produce the route static + interactive for a sample route config; READ the
  `static.png` (route line + coloured territories + labels + furniture, on the chosen basemap) and
  `interactive.png` (controls, bounded nav, tooltip). Verify a `dataviz-dark` and a `dataviz-light` sample
  both render correctly (the AI-selected basemap works both ways).

## Task decomposition (for the plan)

1. **`resolveMapStyle` + `route-geo.ts` `computeRoute`** (auto-detect + order + colour + anchor + bounds) +
   `route-geo.test.ts`.
2. **Route config validation** (`validateRouteConfig` + `mapStyle` guard) + tests.
3. **`RouteMap.tsx`** static + interactive (fills + route line + labels + MapFrame + bounded nav + resize) +
   the produce `type === "route"` static/interactive path (+ the route `story` → route-reveal THROW stub).
4. **`checkRouteConformance`** + tests.
5. **KB `types/route.md`** + render verification (static + interactive, dark + light samples).

(Each render task verifies the route type on both a dark-basemap and a light-basemap sample config.)

## Out of scope (deferred)

- **SP3b** — the `RouteReveal` video (generalize `RiverReveal`: the electric draw-on line, three-phase
  animate-in, the `stop`-timed sequence, the scene model, `cameraMode = "route-reveal"` dispatch, 3 sizes,
  `prep-geo` stops/anchors/clipped-borders, the video KB).
- Generalizing `mapStyle` to the choropleth/symbol types (they keep `DATAVIZ.LIGHT` for now).
- Non-preset (inline-polygon) territories; sub-country routes beyond the available presets.
- **SP4** — scrolly-as-video.

## Global constraints (binding)

- **Bun only** (`bun test`, `bun scripts/...`); web render via the existing Vite + Playwright snap pipeline.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never
  hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO
  `Co-Authored-By: Claude`.
- **English** throughout.
- **Additive** — a NEW type; choropleth/symbol/route-video paths and the produce selector are unchanged
  (the route `story` dispatch is a new, type-aware THROW stub SP3b fills).
- **Every fix ships four artifacts** (code + conformance/harness + KB at the right layer + render
  verification).
- **Grounded KB**, sourced by name (FT Visual Vocabulary, data-to-viz), no fabricated URLs.
- **`mapStyle` is AI-selected** (capability, not a hardcoded default) — verify BOTH a dark and a light
  sample render.
- **`clampBounds` on every bounds→MapTiler call**; bounded interactive nav; static build has no controls.
