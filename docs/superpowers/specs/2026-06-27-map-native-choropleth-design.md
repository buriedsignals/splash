# map-native — choropleth (slice 1) — design

**Date:** 2026-06-27
**Status:** approved (brainstorming)
**Scope:** a new `skills/map-native/` engine; slice 1 = the **choropleth** map type in three formats (static PNG + interactive HTML + Remotion video), seeded from Tom's `map-explainer`.

## Goal

Give small newsrooms native maps the way `chart-native` gives them native charts: **one component per map type → static + interactive + video, from arbitrary data**, with the same discipline (pure core + conformance guard + real-browser audit + `produce`). Slice 1 proves the pattern on the **choropleth** (regions shaded by a value); later slices add symbol, flow/route, dot-density, grid-heatmap, cartogram — the FT "MAP" group.

## The foundation — adopt Tom's `map-explainer`, don't reinvent

Tom's `map-explainer` skill (`~/Downloads/map-animation/map-explainer`) already solves the hard part — a **frame-deterministic MapTiler map in Remotion** — and is operator-approved (water-wars Pilot A). Its stack is **MapTiler SDK (`@maptiler/sdk`) + Remotion (React) + an HTML overlay for labels** — the SAME stack as `chart-native`. We seed `map-native` from it.

Reused verbatim as the engine foundation:

- **The render harness (per frame):** init the MapTiler map ONCE (ref guard); on `load` add sources/layers + `jumpTo`; per frame `delayRender → setData/setPaintProperty/jumpTo → map.once('idle', continueRender) → triggerRepaint`. `preserveDrawingBuffer:true`, render `--gl=angle`. This is what makes the WebGL/async-tiles map deterministic per frame.
- **Time-based timing** (`t = frame/fps`, constant-duration phases) and `turf` slicing helpers.
- **HTML overlay labels** positioned via `map.project(lngLat)` each frame.
- **Geo-prep** (`prep-geo.mjs` pattern): a build-time pipeline that bakes the geometry the component needs.
- Env `REMOTION_MAPTILER_KEY` (a MapTiler API key).

## Architecture (mirrors chart-native)

```
config (CSV + basemap preset + intent)
   │  choropleth-geo.ts  (pure: join, scale, bins, bounds)  ── bun:test
   ▼
ChoroplethMap.tsx (React, driven by one `progress`)  ── MapTiler SDK render
   ├── static     → screenshot the settled map (Playwright)
   ├── interactive→ same SDK build as single-file HTML (pan/zoom/hover/legend)
   └── video      → Remotion harness (Tom's per-frame gate) — reveal
   │
   checkChoroplethConformance (composes on the global L0 guard)
   audit (real browser × viewports)      produce(config, outDir) → 5 outputs
```

- **Pure core `src/choropleth-geo.ts`** (framework-free, unit-tested): join the CSV to the region features by `regionKey`; compute the colour **bins** + the **scale**; compute the data **bounds** (bbox of the joined regions) for `fitBounds` — the **basemap-fit** rule baked in; mark **no-data** regions. Returns a layer/paint spec + bounds + legend stops.
- **Component `src/ChoroplethMap.tsx`** (React): builds the MapTiler SDK map from the core's spec, driven by a single `progress` (0→1) — the reveal (regions fill in / bins appear). Reused harness from map-explainer for video; the same component renders static (progress=1) and interactive.
- **Geo data:** bundled standard boundary presets (like Tom's `geojsonPreset` + map-explainer's baked geo) — `world` (Natural Earth admin-0), `fr-departments`, `fr-regions`, `us-states` — as simplified GeoJSON under `assets/geo/`. Config picks a preset + supplies a CSV joined by `regionKey`. **Each preset declares its canonical join key** (e.g. `world` → ISO-A3; `fr-departments` → department code `01`–`95`/`2A`/`2B`; `us-states` → 2-letter postal code), and the CSV's `regionKey` column must match it; the core reports any unmatched CSV rows (a data error, not silent drop). Sourcing credited (Natural Earth / Eurostat NUTS / census), per data-to-viz norms.

## Choropleth specifics

- **Colour:** CVD-safe **sequential** ramp by default (reuse the monotonic-luminance BLUES from chart-native's heatmap); **diverging** ramp option for +/- data around a midpoint. Never a non-CVD-safe rainbow.
- **Bins:** quantile or equal-interval (config), 5 steps default; a continuous option later.
- **No-data:** regions with no joined value render a neutral grey AND are named in the legend ("No data").
- **Legend:** a discrete bin legend is **mandatory** (the map is undecodable without it).
- **Basemap-fit:** `fitBounds` to the joined-data extent (EU story → Europe, not the whole world). The known footgun from map-dw; enforced by the core (bounds) + checked by the audit.

## Conformance — `checkChoroplethConformance` (composes on global L0)

`{ title, source, scaleColors, scaleType: "sequential"|"diverging", hasLegend, regionsWithData, regionsTotal, boundsNonEmpty }` →
global L0 (insight title, source name+url, WCAG text contrast) **plus**: scale colours are CVD-safe (sequential monotonic-luminance or a diverging pair); a legend is present; at least one region has data; bounds are non-empty (basemap-fit possible). Unit-tested like every `chart-native` conformance check.

## Formats (slice 1 = all three)

- **Static** — Playwright loads the interactive build, waits for `map.once('idle')`, screenshots → PNG.
- **Interactive** — single-file HTML (Vite + the SDK), pan/zoom + hover popup (region + value) + the legend. Verified live in the browser (hover behaviour), not just the still — the recurring "a PNG can't show a hover" lesson.
- **Video** — Remotion composition (Tom's harness) renders the reveal in landscape/square/portrait, `--gl=angle`, frame-deterministic.

## Audit (reuses the chart-native harness pattern)

Render the choropleth × sample + stress datasets × viewports in a real browser and assert: title/subtitle/source/legend in bounds and non-overlapping; the map **fits the data extent** (bounds, not world); the legend is present and readable; for video, the reveal is blank at progress 0. Green is the gate before the eye.

## produce

`produce(config, outDir)` → `static.png`, `interactive.html`, and the 3 video mp4s (landscape/square/portrait), via config injection (the chart-native `__CONFIG__` Vite define + Remotion `--props` pattern), so nothing touches committed samples.

## Reused from chart-native

Tokens (the sequential ramp, type scale), the title/subtitle/source shell, the conformance L0 guard, the audit harness, `snap-proof`, the `produce` config-injection pattern, the Okabe-Ito set.

## Prerequisite

A MapTiler API key in `/splash/.env` as `REMOTION_MAPTILER_KEY` (and a client key for the web builds). Free tier. Like the Datawrapper token — gitignored, kept out of logs.

## Testing

| Case | Expectation |
| --- | --- |
| Sample choropleth (e.g. EU renewables by country) | joins, bins, fits Europe; legend; static+interactive+video render |
| No-data region | grey + "No data" in legend; not charted as 0 |
| Diverging data (+/-) | diverging CVD-safe ramp around the midpoint |
| Stress: world + a dominant outlier | bins hold; basemap fits; labels/legend in bounds (audit) |
| Conformance | non-CVD scale, missing legend, empty bounds → flagged |

## Map-type roadmap (engine-first — built like the 41 charts)

`map-native` is ONE engine, exactly as `chart-native` is one engine for 41 types. The choropleth is the
worked exemplar (the "line" of maps); every other type plugs into the **same foundation** (the
map-explainer harness + a per-type pure geo-core + the conformance guard + the audit + `produce`) and is
added **one at a time via the recipe**, not redesigned. The roadmap (source: the FT "MAP" group in
`docs/splash/visual-element-grid.md`, S/I/V = which formats fit):

| Map type | Engine | S | I | V | Tom reference |
| --- | --- | --- | --- | --- | --- |
| **Choropleth** | MapTiler 2D | ✓ | ✓ | ✓ | geojsonPreset — **slice 1** |
| Proportional symbol | MapTiler 2D | ✓ | ✓ | ◻ | convert-map markers |
| Flow / route | MapTiler 2D | ◻ | ◻ | ✓ | map-explainer (river/route) |
| Explainer beat (region sequence) | MapTiler 2D | — | — | ✓ | **map-explainer (proven)** |
| Dot density | MapTiler 2D | ✓ | ✓ | ◻ | |
| Hex / grid (spatial bins) | MapTiler 2D / deck.gl | ◻ | ✓ | ◻ | CARTO analysis (H3) |
| Cartogram (grid / scaled) | precompute + 2D | ✓ | ◻ | ◻ | square-grid-maps-of-the-usa |
| Contour / isoline | MapTiler 2D | ◻ | ◻ | — | |
| Locator / markers | MapTiler 2D | ✓ | ✓ | — | map-dw locator (native port) |
| 3D terrain flyover | **Cesium** (separate) | — | — | ✓ | cesium-flyover |

The first nine ride the one `map-native` engine; only the **3D flyover is a separate engine (Cesium)**.
The engine `SKILL.md` carries the recipe + this catalogue, the way `chart-native`'s does for 41 types.

## Out of scope (slice 1 — built later on the same engine)

- The other eight MapTiler map types above — future slices, same foundation, one at a time.
- 3D terrain flyover — Cesium (`cesium-flyover`), a separate engine, not `map-native`.
- The viznews Svelte `Explore.svelte` interactive device — a parallel product path; `map-native` is the React/Remotion splash engine. (We borrow Tom's geojsonPreset *idea*, not his Svelte component.)
- Scrolly/waypoints narration — a downstream archetype, not a map type.
- Reader-supplied arbitrary GeoJSON — slice 1 ships the standard presets; custom GeoJSON is a later option.
