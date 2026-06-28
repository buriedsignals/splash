---
name: map-native
description: Use when you need a native (non-Datawrapper) map that ships ALL THREE formats from ONE React+MapTiler component — a static PNG, a self-contained interactive HTML (pan/zoom/hover/legend, responsive), and a Remotion mp4 motion build. The native map engine — 9 MapTiler 2D types covering the FT "MAP" group + Cesium 3D flyover as a separate engine. The premium path for stories that want a motion reveal or rich interactivity on a map. Keywords choropleth, proportional symbol, flow route, explainer beat, dot density, hex grid, spatial bins, cartogram, contour isoline, locator markers, 3D terrain flyover, MapTiler, Remotion, Cesium, geojson, choropleth, sequential scale, diverging scale, CVD-safe, basemap-fit, fitBounds, region shading, data join, ISO-A3, world, fr-departments, fr-regions, us-states, legend, no-data, static PNG, interactive HTML, video mp4, animation, reveal, progress, react, native map.
---

# Map Native — the native map engine (one component per type → three formats)

> **9 MapTiler 2D types** (one React+MapTiler component each, `<Type>Map.tsx`, driven by a single
> `progress` → static + interactive + video), grouped by function:
> - **Area encoding** — choropleth (regions shaded by value)
> - **Point / symbol** — proportional symbol, dot density, locator / markers
> - **Movement / topology** — flow / route, explainer beat (region sequence)
> - **Spatial aggregation** — hex / grid (spatial bins)
> - **Geometry transform** — cartogram (grid / scaled), contour / isoline
>
> **Cesium 3D terrain flyover** is a separate engine (`cesium-flyover`) — not part of `map-native`.
>
> Every type shares the MapTiler+Remotion harness (Tom's per-frame `delayRender`/`idle` gate), the
> conformance guard, the basemap-fit rule, and the `produce` pipeline; the per-type knowledge lives
> in the component/geo-core header comment + its `check<Type>Conformance` rule. Build a specific
> map by setting `COMP=<type>` (web) or the `<Type>Reveal` composition (video, e.g. `ChoroplethReveal`).
> The choropleth is the worked exemplar (the "line" of maps); every other type follows the identical
> pattern. The full type registry is in `remotion/src/Root.tsx` and `scripts/audit-cases.mjs`.
>
> **Shared layer** — `src/`: `conformance.ts` (global L0 guard + WCAG math; per-type checks compose
> on top), `components/HarnessCheck.tsx` (the per-frame `delayRender`/`idle` gate — the canonical
> proof of Tom's harness), `theme/scale.ts` (BLUES sequential ramp, DIVERGING CVD-safe pair).

## Foundation — Tom's MapTiler+Remotion harness

The hard problem — a **frame-deterministic MapTiler WebGL map in Remotion** — was already solved by
Tom's `map-explainer` (operator-approved: water-wars Pilot A). `map-native` seeds from it verbatim
and does not reinvent it.

**The harness (per frame — `HarnessCheck.tsx` is the canonical reference):**

1. **Init once.** A `started` ref guard ensures the `Map` constructor runs exactly once across
   React renders. The map is created with `interactive: false`, `fadeDuration: 0`, and
   `canvasContextAttributes: { preserveDrawingBuffer: true }` — the last is mandatory for Remotion
   to read the WebGL canvas after each frame.

2. **On `load` — add sources/layers + `jumpTo`/`fitBounds`**, then `map.once('idle', () => continueRender(initHandle))`.
   `delayRender` is called synchronously at component mount (in a `useState` initialiser) so
   Remotion holds the first frame before the map has even loaded.

3. **Per frame** — `useEffect([map, frame])` runs on every frame Remotion renders:
   ```
   const h = delayRender(`frame-${frame}`)
   map.setPaintProperty(…) / map.setData(…) / map.jumpTo(…)   // mutate state
   map.once('idle', () => continueRender(h))                   // release frame
   map.triggerRepaint()                                        // force a WebGL tick
   ```
   This is the **`delayRender → setData/setPaintProperty → map.once('idle', continueRender)`**
   cycle. Without `triggerRepaint()` the SDK may not repaint if nothing changed in the viewport.

4. **Render flags** — `bunx remotion render --gl=angle --concurrency=1 --timeout=120000`.
   `--gl=angle` is mandatory for MapTiler WebGL under Remotion (headless Chrome). `--concurrency=1`
   prevents two Remotion workers racing on the same map instance.

**The web builds** (static + interactive) use the same `ChoroplethMap.tsx` component via Vite
(static: `progress=1`, screenshot; interactive: `INTERACTIVE=1` → Vite + `vite-plugin-singlefile`
→ single-file HTML with pan/zoom/hover). The MapTiler SDK key is injected as
`VITE_MAPTILER_KEY` (web) and `REMOTION_MAPTILER_KEY` (Remotion). Both are gitignored.

**Basemap-fit rule** — every map type calls `fitBounds` to the DATA extent (not the world default),
and the frame must hug the data **zone**, not stretch to far-flung territory:

- **Mainland framing.** Compute the bbox from each region's **largest-area polygon**, not the raw
  MultiPolygon. Natural Earth admin-0 features bundle overseas territories (NOR→Svalbard,
  FRA→French Guiana/Réunion, ESP→Canaries) that silently stretch the bbox to the whole world — the
  exact "why is it showing the planet" bug. The pure core does this (`mainlandFeature` in
  `choropleth-geo.ts`); the audit asserts ≥ **70%** fill on the binding dimension via `map.project()`.
- **maxBounds.** After `fitBounds`, set `map.setMaxBounds(dataBounds + ~35% margin)` so the reader
  stays on the subject and cannot pan back out to the whole world.
- **Breathing room.** `fitBounds` padding ≈ 48px so edge regions (the story's south, here Spain/Italy)
  are not clipped against the frame.

This is the known `map-dw` footgun — enforced here (core + audit), not left to the operator.

## The recipe — adding a map type (always these steps)

For each new map type, in order:

1. **KB first** — capture the type's knowledge as the header comment of `<type>-geo.ts` + the
   encoding rule it enforces: what the type is for, its non-negotiables (e.g. choropleth →
   CVD-safe sequential/diverging scale, mandatory legend, basemap-fit; proportional symbol →
   area-proportional radius, not linear), and the reveal gesture. Reuse the format disciplines in
   `knowledge/references/formats/{video,interactive}.md`.

2. **Pure geo core** — `src/<type>-geo.ts` (framework-free, no MapTiler import): join/transform the
   data, compute the paint spec, compute the data bbox for `fitBounds`, flag no-data features.
   Unit-tested with `bun:test`. The choropleth exemplar is `src/choropleth-geo.ts`
   (`computeChoropleth` → `ChoroplethLayout`: joined array, bins, bounds, noData, unmatched).

3. **Component** — `src/<Type>Map.tsx` driven by one `progress` (0→1). Uses Tom's harness:
   init-once ref guard, `on('load')` to add sources/layers + `fitBounds`, per-frame
   `delayRender → setPaintProperty/setData → map.once('idle', continueRender) → triggerRepaint`.
   The `interactive` prop switches hover popup on/off. Same component renders static, interactive,
   and video — no forks.

4. **Conformance rule** — `check<Type>Conformance` in `src/conformance.ts`, composing on the global
   L0 guard (insight title ≥ 12 chars + not a year range, source name + url, WCAG text contrast
   ≥ 4.5:1). Type-specific additions for choropleth: CVD-safe scale (≥ 3 steps), legend present,
   ≥ 1 region with data, bounds non-empty. Unit-tested.

5. **Classify global vs type-specific (every time).** For each concern ask: *is this an invariant
   true for all map types, or specific to this type?*
   - **Global** (basemap-fit, contrast, legend required for region maps, insight title, source) →
     reuse the shared mechanism (`conformance.ts`, harness `fitBounds`, audit) and enforce with a
     test. Never re-solve per component.
   - **Type-specific** (the geo math, which `setPaintProperty` to animate, where the legend goes,
     what no-data looks like) → lives in the type module.

6. **Pass the layout audit, then look** — add the type to `scripts/audit-cases.mjs` (sample +
   ≥ 1 stress config: many regions, missing data, extreme values, narrow viewport) and run
   `bun run audit`. It renders every config × 7 viewports in a real browser, waits for `map.once('idle')`,
   then asserts: title/legend/source in bounds, no significant text overlap, AND the projected data
   bbox fills ≥ 50% of a canvas dimension (the basemap-fit gate). The audit MUST be green. The eye
   missed basemap-fit failures on several `map-dw` stories that `map.project()` catches — never
   rely on the eye alone again.

## Overview

**MapTiler SDK does the geo rendering; React drives the component; a single `progress` value drives
the animation.** Every type is one framework-free geo core (`<type>-geo.ts`) computing joins/bins/bounds
+ a deterministic reveal, and one React component (`<Type>Map.tsx`) parameterised only by a `progress`
(0→1) prop. From that one component three formats derive: a **static** PNG (render at progress=1,
screenshot), a self-contained **interactive** HTML (pan/zoom/hover/legend), and a **video** mp4 (a
Remotion composition drives `progress` per frame through Tom's harness). The `choropleth` type below
is the worked exemplar; the other types follow the identical pattern. Per-type artifacts are in
`output-proof/<type>/`.

This is the native premium path. `map-dw` (Datawrapper) stays the no-code fallback — do not touch it.

## When to use

- Any of the 9 FT-vocabulary map types where the story wants a **motion reveal** (video) or **rich
  pan/zoom/hover** interactivity beyond what Datawrapper exposes.
- You want one owned artifact per format (PNG / HTML / mp4) the newsroom keeps — no SaaS dependency.
- **Not** for: standard static locator maps with no motion/interaction need (→ `map-dw`); 3D terrain
  flyovers (→ `cesium-flyover`); charts (→ `chart-native`). A type the engine doesn't have yet →
  add it with the recipe above.

## The one gotcha that will waste your day (read first)

The animation MUST be a **pure function of `frame`** — never `Date.now()`, `Math.random()`, or a
wall-clock in the Remotion path. The per-frame gate (`delayRender → idle → continueRender`) makes
each frame reproducible, but only if the MapTiler mutations (setPaintProperty, setData, jumpTo) are
also deterministic given `frame`. Two more plumbing musts for the video: render with **`--gl=angle`**
and **`--concurrency=1`** (a second Remotion worker racing on the same map instance corrupts frames),
and **validate ONE still frame before the full mp4** (a half-reveal still catches framing/easing bugs
the tests can't). The static and interactive web builds need `VITE_MAPTILER_KEY` in `.env`; the
Remotion build needs `REMOTION_MAPTILER_KEY` — both free-tier keys, gitignored.

## Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Geo core | **turf + plain TS in `src/<type>-geo.ts`** — framework-free | Joins/bins/bounds are pure math, unit-tested with `bun:test`. No MapTiler/React coupling. |
| Render | **React `src/<Type>Map.tsx`** + **MapTiler SDK** | Remotion is React-only. `progress` prop is the single animation input. |
| Static | **Vite build + Playwright** (`scripts/snap-static.mjs`) | Render at progress=1, wait for `map.once('idle')`, screenshot → PNG. |
| Interactive | **Vite + `vite-plugin-singlefile`** (`INTERACTIVE=1`) | One embeddable HTML file with pan/zoom + hover popup + legend. Verified live in the browser (hover + popup), not just a static PNG. |
| Video | **Remotion** (`remotion/`) wrapping the SAME component | `useCurrentFrame` → eased `progress` → `<Type>Map`. `bunx remotion render --gl=angle --concurrency=1`. |

Conformance is enforced, not hand-baked: `src/conformance.ts` (`checkChoroplethConformance`)
is the map-native equivalent of chart-native's `checkConformance` — it runs the global L0 guard
(insight title, source name + url, WCAG contrast) plus type-specific map checks (CVD-safe scale,
legend, basemap-fit possible). Unit-tested in `tests/conformance.test.ts`.

## Choropleth — the worked exemplar

The **choropleth** (slice 1) is the "line chart" of maps: regions shaded by a value, with a legend,
a CVD-safe sequential or diverging colour scale, and a `fitBounds` to the data extent.

**Pure core `src/choropleth-geo.ts`** (`computeChoropleth`):
- Joins CSV rows to GeoJSON features by `regionKey` (e.g. ISO-A3 for `world`). Reports unmatched
  CSV rows — never silently drops them.
- Computes **bins** (equal-interval, 5 steps default) from the joined values, picking colours from
  `BLUES` (sequential) or `DIVERGING` (diverging, symmetric around a configurable midpoint).
- Computes the **data bbox** (`turf.bbox`) over only the matched features — this is what
  `ChoroplethMap` passes to `fitBounds` and what the audit measures.
- Returns `ChoroplethLayout`: `joined`, `bins`, `bounds`, `noData`, `unmatched`, `scaleType`.

**Component `src/ChoroplethMap.tsx`**: MapTiler SDK map, init-once, `on('load')` wires sources/layers
+ `fitBounds(layout.bounds, { duration: 0 })`. `progress` drives `fill-opacity` via
`setPaintProperty` (the reveal). Exposes `window.__map__` and `window.__layout_bounds__` for the
audit's basemap-fit check. Strips symbol/label clutter from the basemap. Hover popup on mousemove.
No-data regions rendered in neutral `#e0e0e0` + named in the legend.

**Remotion compositions**: `ChoroplethReveal` (1280×720 landscape), `ChoroplethSquare` (1080×1080),
`ChoroplethPortrait` (1080×1350) — all 6 s at 30 fps (180 frames).

## How it works (the shape)

1. **Geo core** — `computeChoropleth(data, features, joinKey, options)` → `ChoroplethLayout`.
   Framework-free. Pure, deterministic, unit-tested.
2. **Component** — `ChoroplethMap` builds the SDK map, joins the data, renders bins and legend.
   At any `progress` value, `fill-opacity` = `progress` — the regions fade in as the video plays.
3. **Static** — Vite build (`dist/static/`) → `scripts/snap-static.mjs` waits for idle, screenshots.
4. **Interactive** — `INTERACTIVE=1` Vite build (single file, `vite-plugin-singlefile`) →
   `scripts/snap-proof.mjs` loads it, hovers a region, asserts the popup, screenshots.
5. **Video** — `remotion/src/Root.tsx` registers `ChoroplethReveal/Square/Portrait`; `produce.mjs`
   renders a still (`--frame=140`) first, then the full mp4 (`--gl=angle --concurrency=1`).

## Quick start

```bash
cd skills/map-native
bun install
# Set keys in .env: VITE_MAPTILER_KEY=... and REMOTION_MAPTILER_KEY=...
bun run audit                                                   # layout + basemap-fit gate
bun scripts/snap-static.mjs                                     # static PNG
bun scripts/snap-proof.mjs                                      # interactive hover proof
bunx remotion still remotion/src/index.ts ChoroplethReveal \
  output-proof/choropleth/still.png --frame=140 --gl=angle      # validate one frame first
bunx remotion render remotion/src/index.ts ChoroplethReveal \
  output-proof/choropleth/landscape.mp4 --gl=angle --concurrency=1 --timeout=120000
```

Or via `produce.mjs` with an arbitrary config (nothing touches the committed sample):
```bash
bun scripts/produce.mjs assets/sample-data/choropleth.json output-proof/choropleth
```

## Map-type roadmap

`map-native` is ONE engine, exactly as `chart-native` is one engine for 41 types. The choropleth is
the worked exemplar; every other type plugs into the **same foundation** (Tom's harness + a per-type
pure geo-core + conformance + audit + `produce`) and is added one at a time via the recipe above.
S/I/V = which formats fit (Static / Interactive / Video):

| Map type | Engine | S | I | V | Tom reference |
| --- | --- | --- | --- | --- | --- |
| **Choropleth** | MapTiler 2D | ✓ | ✓ | ✓ | geojsonPreset — **slice 1 (built)** |
| Proportional symbol | MapTiler 2D | ✓ | ✓ | ◻ | convert-map markers |
| Flow / route | MapTiler 2D | ◻ | ◻ | ✓ | map-explainer (river/route) |
| Explainer beat (region sequence) | MapTiler 2D | — | — | ✓ | **map-explainer (proven)** |
| Dot density | MapTiler 2D | ✓ | ✓ | ◻ | |
| Hex / grid (spatial bins) | MapTiler 2D / deck.gl | ◻ | ✓ | ◻ | CARTO analysis (H3) |
| Cartogram (grid / scaled) | precompute + 2D | ✓ | ◻ | ◻ | square-grid-maps-of-the-usa |
| Contour / isoline | MapTiler 2D | ◻ | ◻ | — | |
| Locator / markers | MapTiler 2D | ✓ | ✓ | — | map-dw locator (native port) |
| **3D terrain flyover** | **Cesium (separate engine)** | — | — | ✓ | cesium-flyover |

The first nine ride the one `map-native` engine. The 3D flyover is a separate engine (`cesium-flyover`).

## Boundary presets (slice 1: `world` only)

| Preset | Boundary | Join key | Source |
| --- | --- | --- | --- |
| `world` | Natural Earth admin-0 | `iso_a3` (ISO-A3) | Natural Earth |
| `fr-departments` | French departments | dept code `01`–`95`/`2A`/`2B` | Eurostat NUTS |
| `fr-regions` | French regions (2016) | region code | Eurostat NUTS |
| `us-states` | US states | 2-letter postal code | US Census |

Slice 1 ships only `world`. The others are added by dropping their simplified GeoJSON into
`assets/geo/` and declaring their join key — no engine change. Every preset credits its source
(per data-to-viz norms).

## Produce — three formats from one config

`produce.mjs <config.json> <outDir>` → five outputs: `static.png`, `interactive.png` (hover proof),
`landscape.mp4`, `square.mp4`, `portrait.mp4`. The config is injected via the `__CONFIG__`
Vite define (web builds) and `--props` (Remotion), so nothing touches the committed sample. Pass
`formats=static` to skip the video render.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| Slower / faster reveal (video) | `durationInFrames` (180 = 6 s @ 30 fps) | `remotion/src/Root.tsx` |
| Reveal easing | `interpolate(frame, [0, dur-1], [0, 1], {easing})` | `ChoroplethReveal.tsx` |
| Number of colour bins | `bins` (default 5) | choropleth config JSON |
| Sequential vs diverging scale | `scaleType: "sequential" | "diverging"` | choropleth config JSON |
| Diverging midpoint | `midpoint` (default: (min+max)/2) | choropleth config JSON |
| Basemap style | `MapStyle.DATAVIZ.LIGHT` | `ChoroplethMap.tsx` |
| Viewport padding on fitBounds | `padding: 24` | `ChoroplethMap.tsx` |
| Min data fill fraction (audit) | `MIN_DATA_FILL_FRACTION` (0.5) | `scripts/audit.mjs` |

## Files

- `src/choropleth-geo.ts` — framework-free geo core (join, bins, bounds, no-data). Unit-tested.
- `src/ChoroplethMap.tsx` — THE one React+MapTiler component, driven by `progress`. Wires Tom's
  `delayRender/idle/continueRender` harness for Remotion; same component for static + interactive.
- `src/conformance.ts` — global L0 guard + WCAG math (`relativeLuminance`, `contrastRatio`) +
  `checkChoroplethConformance` (CVD-safe scale, legend, basemap-fit possible, source, insight title).
- `src/components/HarnessCheck.tsx` — minimal MapTiler-in-Remotion smoke test; the canonical
  reference implementation of Tom's per-frame `delayRender → setPaintProperty → idle → continueRender`
  gate. Run `bunx remotion render … HarnessCheck --gl=angle` to prove the harness on a new machine.
- `src/theme/scale.ts` — `BLUES` (sequential monotonic-luminance) and `DIVERGING` (CVD-safe pair).
- `remotion/src/Root.tsx` — Remotion root: `MapExplainer`, `HarnessCheck`, `ChoroplethReveal`,
  `ChoroplethSquare`, `ChoroplethPortrait`.
- `scripts/audit.mjs` — layout + basemap-fit audit (real browser × 7 viewports; `map.project()`
  pixel-projects the data bbox to assert ≥ 50% fill on the binding canvas dimension).
- `scripts/audit-cases.mjs` — sample + stress cases registry for the audit.
- `scripts/snap-static.mjs` — Playwright: waits for `map.once('idle')`, screenshots static build.
- `scripts/snap-proof.mjs` — Playwright: loads interactive build, hovers a region, screenshots popup.
- `scripts/produce.mjs` — `produce(configPath, outDir)`: all three formats from an arbitrary config.
- `scripts/prep-geo.mjs` — build-time geo prep (Tom's pattern: bakes the GeoJSON the component needs).
- `assets/geo/world.geojson` — Natural Earth admin-0 boundaries (simplified).
- `assets/sample-data/choropleth.json` — runnable sample (EU renewable energy share by country).
- `tests/` — `bun:test` suites: geo core (join/bins/bounds/no-data) + conformance guard.
- `output-proof/choropleth/` — real artifacts: `static.png`, `interactive.png`, 3 × mp4 + stills.
