# Map Contour / Isoline Type (v2 — gridded input) — Design

**Date:** 2026-07-02
**Status:** Approved (design phase). **Supersedes** the scatter+IDW contour design
(`2026-07-02-map-contour-design.md`), which was abandoned: turf IDW interpolation of a sparse point
scatter produced bullseye artifacts and an arbitrary hull footprint that did not correspond to the data.
This v2 takes an already-gridded field and runs `turf.isobands`/`isolines` directly — no interpolation,
no artifacts, and the visible zone is defined by the data's own cells.

**Depends on:** the map-native engine (choropleth binning + sequential/diverging scale + the OPT-IN
diverging `reverseScale` + `midpoint` fix on branch `feat/map-contour` commit `66ed609`, to cherry-pick;
the hex-grid/cartogram cell-on-basemap render; the reveal/story/scrolly pipeline; `resolveMapStyle`; the
type-add recipe; the `ScrollyXMap` interactive-scrolly pattern). turf 7.2 (`isobands`, `isolines`, `point`,
`featureCollection`, `bbox`).

## Goal

Add the **contour / isoline** map type: render a continuous scalar field supplied as a **regular grid**
(the form real gridded data takes — ERA5, satellite, sensor grids) as filled bands and/or iso-lines, in
the family the AI selects between ("capability, not a default"): `bands` (`turf.isobands`), `lines`
(`turf.isolines`), or `both` (lines over bands). Situated field → basemap always kept. Ships in all six
formats.

## Why gridded input (the core lesson)

The visible zone must **correspond to the data**. A grid does this by construction: each cell is a real
datum, cells outside the coverage are `null` (no-data) and excluded, so the contour follows the true data
footprint (a coastline, a country, a study area) — not the convex hull of a point cloud. And because the
grid values ARE the field, `turf.isobands`/`isolines` run directly: no IDW, no bullseye artifacts, a
smooth surface.

## Non-goals

- **No interpolation** (no IDW/kriging). The input is already a field on a grid. (A separate "gridify a
  point scatter" preprocessing step could be added later, explicitly, but is out of scope.)
- No 3D / terrain (that is the Cesium engine).
- No neutral background — contour is situated; the basemap is always kept.
- No new furniture/format machinery — reuse `MapFrame`, choropleth binning + `BLUES`/`DIVERGING` scale
  (+ the `reverseScale`/`midpoint` opt-in), the reveal/story/scrolly pipeline, `resolveMapStyle`, the
  `ScrollyXMap` pattern.

## Data model & capability space

Config `type: "contour"`:

```ts
interface ContourConfig {
  type: "contour";
  render?: "bands" | "lines" | "both";     // default "bands"
  field: {
    values: (number | null)[][];           // row-major; row 0 = NORTH edge; null = no data
    bounds: [number, number, number, number]; // [west, south, east, north] of the grid
  };
  breaks?: number[];                        // explicit; else auto (3–7)
  bins?: number;                            // auto break count (default 6)
  scaleType?: "sequential" | "diverging";
  midpoint?: number;                        // diverging: anchor neutral here (e.g. 0 for anomaly)
  reverseScale?: boolean;                   // diverging/sequential: warm=high etc.
  basemap: string;
  mapStyle?: string;
  title: string; description?: string; source?: { name?: string; url?: string };
  valueLabel?: string;
}
```

- **field.values** — a `rows × cols` matrix; `values[r][c]` is the datum at that cell; `null` = no data.
  Row 0 is the north edge, last row the south. Column 0 is the west edge.
- **field.bounds** — the geographic extent of the grid; cell centres are derived from bounds + dims.
- **midpoint / reverseScale** — the diverging correctness fix (warm=high, neutral at the meaningful value).

## Deterministic core (`contour-geo.ts`, pure — rewritten)

- Derive cell-centre coordinates from `field.bounds` + the matrix dims (`cols = values[0].length`,
  `rows = values.length`); build a turf point FeatureCollection of the NON-NULL cells, each carrying its
  value. (No-data cells are omitted → the field footprint = the real data coverage.)
- Compute breaks (explicit, or auto; diverging → symmetric around `midpoint`) and per-break colours via the
  reused choropleth scale (`BLUES`/`DIVERGING`, with `reverseScale`).
- `render` includes bands → `turf.isobands(pointGrid, breaks, { zProperty: "value" })` → filled polygons;
  includes lines → `turf.isolines(pointGrid, breaks, { zProperty: "value" })` → MultiLineString per break.
  Colour bands by break INDEX. **No convex-hull clip, no IDW.** The no-data omission already bounds the field.
- Returns `{ bands: {feature,color,binIdx,min,max}[]; lines: {feature,value,color}[]; breaks; render;
  bounds; valueLabel; scaleType }`.
- Pure, deterministic, unit-tested: determinism; band/line counts match breaks; monotonic breaks;
  diverging symmetric around midpoint; reverseScale flips colours; no-data cells excluded (footprint
  follows non-null coverage); sequential + diverging colouring; render-mode gating; degenerate (all-equal /
  a single non-null cell) does not throw.

**Note on turf isobands + no-data:** turf's `isobands`/`isolines` expect a value at every grid point. Two
viable approaches — the plan picks one and tests it: (a) build the point grid from only non-null cells and
let turf triangulate over them (simplest; the footprint follows the non-null cells); or (b) fill null cells
with a sentinel far outside the break range and clip out the sentinel bands afterwards. Approach (a) is
preferred if turf handles a sparse (ragged) point set cleanly; the plan verifies at render.

## Rendering, legend, interaction

- **Bands** — `fill` layer id `contour-bands` coloured by band; thin/no outline. mapStyle-adaptive.
- **Lines** — `line` layer id `contour-lines`; width by mapStyle; optional value labels.
- **Basemap** — always kept (situated); `resolveMapStyle` dark/light; `fitBounds(bounds)`.
- **Legend** — the break scale + `valueLabel`; diverging shows the neutral at `midpoint`.
- **Interaction** — hover shows the value band / iso-value.

## Formats — all six, in two slices

### Slice A — type core + static + interactive
`contour-geo.ts` (grid → isobands/isolines, no-data-aware), `ContourMap.tsx` (static + interactive),
validation (`field.values` rectangular matrix, `bounds` 4-tuple, render/scaleType/bins/breaks/midpoint/
reverseScale), conformance, KB, two samples (one `bands`, one `both`, each a real-ish gridded field with
`null` outside its region so the footprint follows the data), tests, audit, mount + produce + Root wiring.
**Cherry-pick the diverging `reverseScale`/`midpoint` fix** (`feat/map-contour` `66ed609`) into
`choropleth-geo`/`cartogram-geo`/`validate` as part of this slice (the shared, reusable half).

### Slice B — video + interactive scrolly
`deriveContourStory` (title → establish → reveal the field's peaks → takeaway), `ContourReveal`/`Story`/
`Scrolly`, `ScrollyContourMap` + `Scrolly.tsx` dispatch + smoke gate. Same recipe as cartogram Slice B.

## Error handling & edge cases

- `field.values` not a rectangular matrix (ragged rows) / empty → validation error.
- All cells null → validation/conformance error ("no data in the grid").
- `bounds` not [w<e, s<n] → validation error.
- Explicit `breaks` non-monotonic / outside the data range → validation error.
- All non-null values equal → one band, no interior line; must not throw.
- A single non-null cell → guard (too little to contour) → conformance flags it.
- Frame-determinism (Slice B): the grid + isobands/isolines computed once and held.

## Testing

- `contour-geo.test.ts` — determinism; grid→bands/lines; no-data cells excluded (footprint = non-null
  coverage, verified by a grid with a null border); monotonic + count-matches-breaks; diverging symmetric
  around midpoint; reverseScale flips colours; render gating; all-equal + single-cell guards.
- `checkContourConformance` — break legend; value label; bounds non-empty; ≥1 band (bands/both) / ≥1 line
  (lines/both); non-null data present; valid mapStyle; global L0.
- Render verification (controller views personally): bands + both samples, static + interactive, light +
  dark — the field must be SMOOTH (no bullseyes) and its footprint must follow the data's non-null region
  (not a rectangle/blob). Slice B: reveal/story/scrolly × 3 sizes; interactive scrolly smoke gate green.

## Global constraints

- Runtime **Bun** always; tests `bun test`. English everywhere. **No** Claude/Anthropic mention, **no**
  `Co-Authored-By`, **no** Claude-Session trailer.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log it.
- Reuse the choropleth binning + scale (+ the diverging `reverseScale`/`midpoint` opt-in), MapFrame, the
  reveal/story/scrolly pipeline, `resolveMapStyle`, the `ScrollyXMap` pattern; don't fork. Use turf
  `isobands`/`isolines` directly on the gridded values — NO IDW/interpolation.
- Basemap always kept (situated field). The visible zone corresponds to the data (non-null cells).
- Frame-deterministic Remotion (Slice B): no `Date.now`/`Math.random`; grid computed once.
- Interactive scrolly needs a real `ScrollyContourMap` + dispatch + smoke gate.
- **Render quality is a merge gate:** the controller personally verifies the field is smooth and the
  footprint corresponds to the data before merge — no bullseye artifacts, no arbitrary blob.
