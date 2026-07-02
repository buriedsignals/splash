# Map Cartogram Type — Design

**Date:** 2026-07-02
**Status:** Approved (design phase)
**Depends on:** the map-native engine (choropleth region-join + binning + sequential/diverging scale; the
hex-grid cell-drawing on the basemap; the reveal/story/scrolly pipeline; `resolveMapStyle`; the type-add
recipe; the interactive-scrolly per-type component pattern — `ScrollyXMap` + `Scrolly.tsx` dispatch).
turf 7.2 (`centroid`, `transformScale`, `bbox`, `area`, `featureCollection`).

## Goal

Add the **cartogram** map type: distort geography by a value so magnitude is read as area, in two
deterministic families the AI selects between ("capability, not a default"):

- **`scaled`** (non-contiguous) — each real region polygon is scaled around its own centroid so its
  **area ∝ value**; overlaps are expected. Self-contained from the existing geography + a value field.
- **`grid`** (tile-grid) — each region becomes **one uniform square** placed by a deterministic
  auto-layout (nearest free grid cell to the region's true centroid), drawn on the basemap, colored by
  value. Regularizes area bias; no per-geography layout files.

Distinct from choropleth (real boundaries, colour only) and hex-grid (bins a raw point cloud). Ships in
**all six formats** (static · interactive · interactive scrolly · video reveal · storytelling · scrolly).

## Non-goals

- **No contiguous (Gastner-Newman diffusion) cartogram** — no deterministic turf/JS lib available, heavy
  and iteration-order-sensitive, wrong fit for the frame-deterministic Remotion pipeline.
- No hand-authored per-geography grid layout files — the grid layout is auto-derived from centroids.
- No new furniture/format machinery — reuse `MapFrame`, choropleth binning + `BLUES`/`DIVERGING` scale,
  the reveal/story/scrolly pipeline, `resolveScene`, `resolveMapStyle`, the `ScrollyXMap` pattern.
- No size legend for `grid` (cells are uniform; magnitude is colour). `scaled` encodes magnitude by area.

## Data model & capability space

Config `type: "cartogram"`:

```ts
interface CartogramConfig {
  type: "cartogram";
  variant?: "scaled" | "grid";        // default "scaled"; AI-selects per the story
  basemap: string;                     // the geography key (world / fr-departments / us-states / …)
  joinKey?: string;                    // region id key (default "iso_a3", as choropleth)
  values: { id: string; value: number }[]; // value per region, joined by joinKey
  scaleType?: "sequential" | "diverging"; // colour ramp (reused from choropleth)
  bins?: number;                       // 3–7, default 5
  mapStyle?: string;                   // AI-selected dataviz-light / dataviz-dark
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
}
```

- **variant** — `scaled` (`turf.transformScale` around each centroid) or `grid` (auto tile-grid).
- **values** — one numeric value per region, joined to the geography by `joinKey`; regions without a
  value are dropped (scaled) or omitted from the grid.
- **colour** — reuse the choropleth `computeChoropleth` binning + `BLUES` (sequential) / `DIVERGING`
  scale. The legend names the value.

## Deterministic core (`cartogram-geo.ts`, pure)

Frame-safe by construction (no randomness; a fixed transform / a stable greedy assignment):

- Join `values` to the geography features by `joinKey`; drop unmatched/valueless regions.
- Bin + colour via the reused choropleth core (`BLUES`/`DIVERGING`, 3–7 bins over the value range).
- **`scaled`:** for each region, `factor = sqrt(value / maxValue)` (so area ∝ value), then
  `turf.transformScale(feature, factor, { origin: turf.centroid(feature) })`. Returns the scaled
  polygons + colour + bin index + legend model + bounds (the union of scaled bboxes).
- **`grid`:** compute each region's true centroid; choose grid dims (`cols = ceil(sqrt(n))`,
  `rows = ceil(n / cols)`); map centroids to an ideal (row,col); assign each region to the nearest FREE
  grid cell by a stable, deterministic greedy pass (sort by centroid lat desc then lon asc; on contention
  take the next-nearest free cell). Emit one uniform square polygon per region at its assigned cell,
  spaced by a uniform cell size anchored to the data bbox (drawn on the basemap, like hex-grid). Returns
  the cell polygons + region id/label + value + colour + bin index + legend + bounds.
- Pure, framework-free, unit-tested: determinism (same input → same polygons/cells/colours), area∝value
  for scaled, one-cell-per-region + no-collision for grid, bin/colour assignment, valueless-region drop,
  degenerate cases (1 region, all-equal values).

## Rendering, legend, interaction

- **Cells / regions** — a `fill` layer coloured by the bin colour + a thin outline; `scaled` draws the
  scaled real polygons, `grid` draws the uniform squares. mapStyle-adaptive.
- **Legend** — the sequential/diverging bin scale + the value label. A uniform-cell note for `grid`
  (colour = magnitude); `scaled` reads magnitude as area. Never a symbol-size legend.
- **Interaction** — hover targets the region/cell: region name + value. `resolveMapStyle` dark/light.
- **Label** — region id/name on/near each grid cell (grid) where space allows; scaled uses hover.

## Formats — all six, in two slices

### Slice A — type core + static + interactive
`cartogram-geo.ts` (both variants), `CartogramMap.tsx` (static + interactive: fill + outline + hover +
legend + mapStyle), `validateCartogramConfig`, `checkCartogramConformance`, KB doc, mount + produce + Root
wiring for static/interactive, tests, audit case, two samples (scaled + grid).

### Slice B — video (reveal · storytelling · scrolly) + interactive scrolly
`deriveCartogramStory(layout, meta, opts) → Beat[]`: title → establish (all regions) → reveal the
**highest-value regions** (top-N, capped) with a caption → takeaway; camera stays framed on the zone.
`CartogramReveal` (scaled: regions grow from centroid 0→full via progress; grid: cells fade in),
`CartogramStory` (guided tour, dim-emphasis on the highlighted region/cell), `CartogramScrolly` (video, via
MapScrolly dispatch). **`ScrollyCartogramMap`** + `Scrolly.tsx` dispatch (story branch + render slot +
config union) + per-type smoke gate (`cartogram-cells` layer present AND `choropleth-fill` absent) — the
interactive scrolly done right per the point-types lesson. All three sizes, `calculateMetadata` duration.

## Architecture / files (the recipe)

**Slice A — create:** `src/cartogram-geo.ts`, `src/CartogramMap.tsx`, `assets/sample-data/cartogram-scaled.json`,
`cartogram-grid.json`, `knowledge/references/map/types/cartogram.md`, `tests/cartogram-geo.test.ts`.
**Slice A — modify:** `src/validate-config.ts`, `src/conformance.ts`, `src/mount.tsx`, `scripts/produce.mjs`,
`scripts/audit-cases.mjs`, `SKILL.md`.
**Slice B — create/modify:** `src/cartogram-story.ts`, `src/components/CartogramReveal.tsx`,
`CartogramStory.tsx`, `CartogramScrolly.tsx`, `skills/scrolly/src/ScrollyCartogramMap.tsx`,
`skills/scrolly/src/Scrolly.tsx`, `skills/scrolly/src/mount.tsx`, `skills/scrolly/scripts/smoke.mjs`,
`remotion/src/Root.tsx`, `scripts/produce.mjs`, `src/route-story.ts` (scrollyStepCount branch),
`src/components/MapScrolly.tsx` (dispatch), KB + roadmap.

## Error handling & edge cases

- Empty `values` / all regions unmatched → validation error.
- A region with a non-positive/zero value → scaled: renders at ~0 area (or a small floor); grid: still one
  cell coloured by the bin (0 is a valid value). Document the floor.
- All values equal → scaled: all regions scaled by the same factor; grid: a regular grid. Both valid.
- 1 region → scaled: one scaled polygon; grid: a 1×1 grid. Guard against divide-by-zero (maxValue>0).
- Grid auto-layout contention → deterministic next-nearest-free-cell; assignment is stable across runs.
- Mercator-unsafe latitudes → clamp bbox to ±85 (as hex-grid).
- Frame-determinism (Slice B): geometry computed once and held; camera animates; no `Date.now`/`Math.random`.

## Testing

- `cartogram-geo.test.ts` — determinism; scaled area∝value on a known set; grid one-cell-per-region +
  no collisions + stable assignment; bin/colour (sequential + diverging); valueless-region drop;
  degenerate (1 region, all-equal); maxValue>0 guard.
- `checkCartogramConformance` — bin legend present; value label present; bounds non-empty; ≥1 region;
  valid mapStyle; title/description/source (global L0); `grid` uniform-cell (no size encoding).
- Render verification — Slice A: scaled + grid samples, static + interactive, light + dark. Slice B:
  reveal/story/scrolly × 3 sizes; interactive scrolly smoke gate green (cartogram layer present,
  choropleth-fill absent).

## Global constraints

- Runtime **Bun** always (never npm/node); tests `bun test`.
- Code, comments, commits, branch names in **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log it.
- Reuse existing building blocks (choropleth join + binning + `BLUES`/`DIVERGING` scale, hex-grid cell
  drawing, MapFrame, reveal/story/scrolly pipeline, `resolveScene`, `resolveMapStyle`, the `ScrollyXMap`
  interactive-scrolly pattern); do not fork them. Use turf `centroid`/`transformScale`/`bbox`.
- Frame-deterministic Remotion (Slice B): no `Date.now`/`Math.random`/argless `new Date()`; geometry once.
- Interactive scrolly MUST ship a real `ScrollyCartogramMap` + `Scrolly.tsx` dispatch + smoke gate — never
  claim the format from the story contract alone (the point-types overclaim lesson).
