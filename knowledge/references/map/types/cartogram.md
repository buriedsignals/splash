---
id: cartogram
engines:
  map-native: cartogram
intent: [spatial, magnitude]
shape: spatial
limits: {}
formats: [static, interactive, video]
bestFor:
  - "which regions dominate the total (scaled variant) — area distortion makes the biggest contributors unmissable; best when magnitudes span at least an order of magnitude"
  - "equal visual weight per region while roughly preserving spatial arrangement (grid variant) — useful when small regions are invisible on a choropleth"
notFor:
  - "stories where real boundaries matter visually (rivers, coastlines) — use a choropleth with real polygons"
  - "raw point-cloud data with no pre-aggregated region values — use a hex-grid to aggregate and visualise the point cloud"
---

# Cartogram — per-type best practice

> Sources: data-to-viz.com (cartogram) — https://www.data-to-viz.com/graph/cartogram.html ·
> Financial Times Visual Vocabulary (SPATIAL group) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> Turf.js (centroid / transformScale) — https://turfjs.org/

A cartogram **encodes a numeric value by the visual size or position of existing administrative
regions** — not by colour alone. Unlike a choropleth (which keeps real boundaries and maps value
to colour), a cartogram physically distorts or repositions regions so the spatial layout itself
communicates magnitude.

Two families are supported:

- **`scaled` (non-contiguous area cartogram)** — each real region polygon is scaled around its own
  centroid so that **area ∝ value** (scale factor = √(value / maxValue)). The shapes stay in their
  true geographic positions and retain their real outlines; they do not fill every gap — overlaps
  between adjacent regions are expected and are NOT a rendering bug. Colour reuses the standard
  choropleth bin palette (sequential or diverging) to double-encode magnitude.
- **`grid` (tile-grid cartogram)** — one **uniform square** is drawn per region. Squares are
  placed by a deterministic auto-layout: the engine maps each region's true centroid into an
  ideal (row, col) grid position, then assigns each square to the nearest free grid cell (minimum
  Euclidean distance in grid coordinates). The sort order is north-to-south then west-to-east,
  ties broken by region key — fully deterministic and stable. Squares are rendered over the real
  basemap geography at their assigned positions; colour encodes the value.

## When to use

- **Use `scaled`** when the story is "which regions dominate the total?" — area distortion makes
  the biggest contributors unmissable. Best when magnitudes span at least one order of magnitude;
  if all regions are similar, the distortion is barely visible.
- **Use `grid`** when the story needs equal visual weight per region while still roughly preserving
  spatial arrangement — useful for "the pattern across a zone" when some regions (e.g. small
  countries) are invisible on a choropleth.
- **Not** for: stories where real boundaries matter visually (river systems, coastline features)
  — use a **choropleth** for rate/ratio per region with real polygons.
- **Not** for: raw point-cloud data with no pre-aggregated region values — use a **hex-grid**
  (spatial bins) to aggregate and visualise the point cloud.

### FT Visual Vocabulary distinction (SPATIAL group)

| Question | Type |
| --- | --- |
| Magnitude of a **region value** where area should encode quantity | **Cartogram (scaled)** |
| Equal-weight layout of **region values** preserving rough geography | **Cartogram (grid)** |
| Rate or normalised value **per admin area**, real boundaries | Choropleth |
| Density / pattern of a **point cloud** (no admin boundary) | Hex-grid / spatial bins |

(Source: FT Visual Vocabulary — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary)

## Variants

### `scaled` — non-contiguous area cartogram

Each real region polygon (world.geojson `mainland` selection via `mainlandFeature`) is scaled by
`turf.transformScale(feature, factor, { origin: centroid(feature) })` where
`factor = Math.sqrt(value / maxValue)`. A floor of `1e-3` prevents zero-area degenerate features
for zero-value regions. Scaled shapes stay at their true centroid; the surrounding space is
basemap geography; **overlaps with adjacent regions are expected** — they signal that those
regions dominate by value.

### `grid` — tile-grid cartogram

One uniform square per region, placed by the auto-layout algorithm:

1. Compute each region's true centroid (turf `centroid` on `mainlandFeature`).
2. Map centroids to ideal floating-point `(row, col)` positions within a `rows × cols` grid
   (rows/cols derived from `Math.ceil(Math.sqrt(n))`), where col grows east and row grows south.
3. Sort regions north-to-south, then west-to-east, ties broken by region key — stable, deterministic.
4. Assign each region to the nearest free grid cell (minimum Euclidean distance in grid coords).
5. Render each cell as a square of `sizeDeg × sizeDeg` degrees centred at its assigned position
   inside the real lon/lat extent, drawn over the basemap.

**No hand-authored layout file is needed.** The algorithm works for any supported geography
(`world`, `fr-departments`, `fr-regions`, `us-states`). The layout is fully reproducible — no
randomness; given the same data and basemap, the grid is always identical.

## Encoding rules

### 1. Sequential or diverging bin palette; 3–7 bins

Colour is drawn from the shared BLUES sequential scale or the shared DIVERGING scale (reused from
choropleth binning via `computeChoropleth`). Sequential is the default — lighter = lower value,
darker = higher. Diverging is appropriate when values span a meaningful midpoint (e.g. growth
above/below zero). The bin count defaults to 5 and can be set via `bins` (3–7).

`checkCartogramConformance` enforces: `bins.length >= 1` — a legend with no bins is undecodable.

### 2. Value label required

The `valueLabel` field must name the quantity encoded by colour and (for `scaled`) by area:
"CO₂ emissions (Mt)", "Renewable energy share (%)". An unlabelled encoding is an undisclosed
editorial choice.

`checkCartogramConformance` enforces: `valueLabel` non-empty.

### 3. UNIFORM-CELL invariant (grid variant)

Every grid cell must have the **same bbox width and height in degrees** (`sizeDeg × sizeDeg`).
Geodesic area (in km²) legitimately varies with latitude even for degree-equal squares — a cell at
60° N subtends less land than one at 30° N. This is expected and is NOT a conformance violation.
The invariant is: **degree-size, not geodesic area**. Colour encodes magnitude; cell size NEVER
encodes magnitude (every cell is identical in degree-size).

`checkCartogramConformance` enforces: all cells share the same bbox width and height (within 1e-9
tolerance).

### 4. Area ∝ value (scaled variant)

For `scaled`, the visual area of each region polygon is proportional to its value (scale factor =
√(value / maxValue)). Regions with zero value are rendered at a minimum scale of `1e-3` (nearly
invisible). Overlapping shapes from adjacent dominant regions are expected and intentional.

### 5. Basemap style: dark / light, AI-selected; grid renders on a neutral background

The `mapStyle` config key (`"dataviz-light"` or `"dataviz-dark"`) controls the MapTiler basemap.
The AI selects the style best suited to the editorial context.

The **`scaled`** variant renders over the full MapTiler basemap (coastlines, countries, water) so
that resized shapes stay situated in real geography. The **`grid`** variant renders cells on a flat
neutral background instead — light → `#f2f3f5`, dark → `#1b1d21` — with all basemap tile layers
hidden. This is intentional: a tile-grid is an abstract schematic where "equal tiles, colour =
value" must read without the visual noise of real coastlines or water behind the cells.

`checkCartogramConformance` enforces: `mapStyle` must be one of the declared `MAP_STYLES` values.

### 6. Furniture: title as insight, description, source

Every module requires a title that states the insight (not a label or a year range), a description
that answers what/when/where, and a named + URL source. These are editorial minimums enforced by
the shared L0 (`checkGlobalMapConformance`).

## Hover interaction (interactive format)

In the interactive build, hovering a cell shows a popup with:
- The **region id / name** (the join key value, e.g. ISO-A3 code).
- The **value** labelled with `valueLabel`.

The hover is tied to the `cartogram-cells` layer id.

## Auto-layout note

The grid auto-layout requires no configuration beyond the data: it derives its grid dimensions
from the number of matched regions, maps their centroids to ideal positions, and assigns cells
deterministically. Journalists and data producers never need to supply a layout file or manually
position tiles. The same code path works for all supported boundary presets.

## Anti-patterns

- **Contiguous diffusion (Gastner-Newman)** — a true contiguous cartogram where all regions stay
  adjacent while their areas distort is OUT OF SCOPE. No deterministic library with acceptable
  licensing exists in the engine's stack, and the Gastner-Newman diffusion algorithm is not
  frame-deterministic. Do not attempt or request this variant.
- **Colour-scaling a grid by cell size** — grid cells are always the same degree-size; making
  some cells larger to encode magnitude undermines the equal-weight principle of the tile-grid and
  violates the UNIFORM-CELL invariant.
- **Treating scaled overlaps as bugs** — when a dominant-value region expands to overlap its
  neighbours, this is the intended behaviour. The overlap communicates that this region's value is
  large relative to its neighbours. Do not filter or clip overlapping cells.
- **Omitting the value label** — `valueLabel` is mandatory. A colour legend without a label
  (e.g. showing only colour swatches) is undecodable to the reader.

## Slice A / B scope note

**Slice A (shipped):** static and interactive builds for both `scaled` and `grid` variants.
Auto-layout for all supported boundary presets. Hover popup (region id + value). MapTiler
basemap with AI-selected dark/light style.

**Slice A interactive nav caveat:** `CartogramMap` pins `minZoom` to the fitted zoom level
(so users cannot zoom below the full-data extent), but does **not** call `setMaxBounds`. The
MapTiler SDK shifts the map centre when a lon-range `maxBounds` is narrower than the viewport,
which breaks responsive centring checks at wide viewports. This is a known Slice-A limitation;
adding `setMaxBounds` with a viewport-width guard is a future refinement.

**Slice B (shipped):** video formats (reveal, storytelling, scrolly video) and interactive
scrolly are all built and verified.

- **Video reveal** — fixed-camera animation; `CartogramReveal` component. `scaled` animates
  `fill-opacity` from 0 to target on the uniform ramp; `grid` animates cell opacity similarly.
  Camera locked on full data extent from frame 0.
- **Video storytelling** — guided-tour beat structure via `deriveCartogramStory`: title card →
  establish (full data extent, cells/shapes fade in) → reveal ×N (highest-value regions in
  descending order, camera stays on zone bounding the highlighted cells — never a fixed
  absolute-per-place box) → takeaway (returns to full extent). `CartogramStory` component.
- **Video scrolly** — `CartogramScrolly` component; same `ScrollyStory` as the interactive
  scrolly; three sizes (landscape 1280×720, square 1080×1080, portrait 1080×1350).
- **Interactive scrolly** — `ScrollyCartogramMap` component
  (`skills/scrolly/src/ScrollyCartogramMap.tsx`), dispatched from `Scrolly.tsx` on
  `config.type === "cartogram"` (NOT the story contract alone).

**Grid-neutral-background rule across ALL formats:** the shared helper
`applyCartogramBasemap` (`skills/map-native/src/theme/cartogram-basemap.ts`) is called in
`CartogramMap` and in all four Slice B components. It applies the rule uniformly: `grid` →
neutral background (light `#f2f3f5`, dark `#1b1d21`), `scaled` → full MapTiler basemap. No
format bypasses this helper.

## Implementation pointers

- `skills/map-native/src/cartogram-geo.ts` — `computeCartogram` (both `scaled` and `grid`
  variants), `CartogramData`, `CartogramLayout`, `CartogramCell` types.
- `skills/map-native/src/CartogramMap.tsx` — static + interactive render (`CartogramMap`
  component), `cartogram-cells` layer, hover popup, legend, `mapStyle` selection.
- `skills/map-native/src/theme/cartogram-basemap.ts` — `applyCartogramBasemap(map, dark, variant)`;
  shared basemap helper called by all cartogram components across all formats.
- `skills/map-native/src/cartogram-story.ts` — `deriveCartogramStory(layout, meta, opts?)`,
  `CartogramStoryMeta`; produces the `Beat[]` for storytelling and scrolly.
- `CartogramReveal`, `CartogramStory`, `CartogramScrolly` — Slice B video components.
- `skills/scrolly/src/ScrollyCartogramMap.tsx` — interactive scrolly component; wired in
  `Scrolly.tsx` via `config.type === "cartogram"` dispatch.
- `skills/map-native/src/conformance.ts` — `checkCartogramConformance` (valueLabel, bins,
  cell count, bounds, mapStyle, grid uniform-cell invariant).
- Sample configs: `skills/map-native/assets/sample-data/cartogram-scaled.json` (18 Eurasian
  emitters, CO₂ Mt, sequential), `skills/map-native/assets/sample-data/cartogram-grid.json`
  (18 European countries, renewable energy share %).

## Credit conventions

Per data-to-viz norms and FT Visual Vocabulary expectations:

- Always name and link the **primary data source** in `source.name` + `source.url`.
- Credit **data-to-viz.com** in editorial documentation when referencing the cartogram
  decision tree.
- Credit the **FT Visual Vocabulary** (SPATIAL group) when justifying the choice between
  cartogram, choropleth, and hex-grid.
