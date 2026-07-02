# Hex-Grid / Spatial Bins Map — per-type best practice

> Sources: data-to-viz.com (density map) — https://www.data-to-viz.com/graph/density2d.html ·
> Financial Times Visual Vocabulary (SPATIAL group) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> Turf.js (hexGrid / squareGrid / collect) — https://turfjs.org/

A hex-grid (spatial bins) map **aggregates a raw scatter of geocoded points** into a regular
tessellation of cells — hexagons or squares — and colours each cell by an aggregate of the
points it contains (count, sum, or mean). The grid is generated over the data extent, independent
of any administrative boundary. The spatial pattern answers "where do these events cluster, and
how intensely?"

## When to use

- **Use** for: a **point cloud** where the raw markers would overlap to the point of illegibility —
  crashes, crimes, disease cases, sensor readings, social-media check-ins. The goal is to reveal
  the **density or aggregate magnitude pattern** of the point cloud, not the exact location of
  each record.
- **Not** for: data that is already bound to administrative regions (country, department, district)
  — use a **choropleth** for rate/ratio per region instead.
- **Not** for: communicating the magnitude of a phenomenon *within* existing regions (e.g. energy
  production per country) — use a **dot-density** map that scatters dots inside the existing region
  polygons.

### FT Visual Vocabulary distinction (SPATIAL group)

| Question | Type |
| --- | --- |
| Density / pattern of a **point cloud** (no admin boundary) | **Hex-grid / spatial bins** |
| Magnitude within **existing regions** (how many per region) | Dot density |
| Rate or normalised value **per admin area** | Choropleth |

(Source: FT Visual Vocabulary — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary)

## Bin shapes

Two tessellation options, set via config `binShape`:

- **`hex`** (default) — regular hexagons via `turf.hexGrid()`. Preferred for most density stories:
  each hexagon has six equidistant neighbours, which avoids the directional bias of squares and
  gives a smoother visual impression of the underlying density surface.
- **`square`** — axis-aligned squares via `turf.squareGrid()`. Useful when the editorial frame
  emphasises a grid / raster reading, or when direct alignment with lat/lon grid lines aids
  interpretation.

Cell size is computed automatically: the engine targets ~250 populated cells, capped at 2 000.
Empty cells (zero points) are dropped before rendering.

## Aggregation modes

Three modes, set via config `aggregate`:

| Value | Meaning | When to use |
| --- | --- | --- |
| `count` (default) | Number of points per cell | Hotspot / density stories |
| `sum` | Sum of each point's numeric `value` field | Total magnitude (e.g. TWh, casualties) |
| `mean` | Arithmetic mean of each point's `value` field | Average intensity (e.g. mean delay, mean fine) |

For `sum` and `mean`, each point object in the config must carry a numeric `value` field.

## Encoding rules

### 1. Sequential BLUES scale; bin count 3–7

Cells are coloured with the shared `BLUES` sequential scale (reused from choropleth), split into
3–7 quantile bins. Sequential ramps are mandatory for density/count data: a lighter shade signals
fewer events, a darker shade signals more. Diverging ramps are inappropriate here — there is no
meaningful midpoint in a count or aggregate.

`checkHexGridConformance` enforces: `hasBinLegend` — the scale is undecodable without a legend.

### 2. Aggregate label required

The legend or caption must name what the colour encodes: "incidents per cell", "total TWh per
cell", "mean delay (min) per cell". An unlabelled aggregate is an undisclosed editorial choice.

`checkHexGridConformance` enforces: `hasAggregateLabel`.

### 3. Empty cells dropped; at least one populated cell

The grid is generated over the full data extent, but cells that contain zero points are removed
before rendering. The conformance guard rejects a build where no populated cells remain.

`checkHexGridConformance` enforces: `cellCount >= 1` and `boundsNonEmpty`.

### 4. Basemap style: dark / light, AI-selected

The `mapStyle` config key (`"dataviz-light"` or `"dataviz-dark"`) controls the MapTiler basemap. The AI selects
the style best suited to the editorial context — dark basemaps make the BLUES ramp pop on
density stories; light basemaps suit editorial explainers. Both are CVD-safe with the BLUES scale.

`checkHexGridConformance` enforces: `mapStyle` must be one of the declared `MAP_STYLES` values.

### 5. Furniture: title as insight, description, source

Every module requires a title that states the insight (not a label or a year range), a description
that answers what/when/where, and a named + URL source for the data. These are editorial minimums
enforced by the shared L0 (`checkGlobalMapConformance`).

`checkHexGridConformance` enforces (via `checkGlobalMapConformance`): `title` ≥ 12 characters and
not a bare year range; `description` non-empty; `source.name` and `source.url` non-empty.

## Hover interaction (interactive format)

In the interactive build, hovering a cell shows a tooltip with:
- The **count** of points in the cell.
- The **aggregate value** (sum or mean), if `aggregate !== "count"`.

The tooltip is tied to the `hex-grid-cells` layer id.

## Anti-patterns

- **Choropleth confusion** — if the story is "rate per region" (e.g. deaths per 100 k inhabitants
  per department), use a choropleth, not a hex-grid. A hex-grid ignores admin boundaries by design.
- **Fixed cell size** — choosing a cell size that is too large collapses all variation into a
  handful of cells; too small produces a nearly empty grid where few cells contain more than one
  point. The auto cell-size (targeting ~250 populated cells) avoids both failure modes.
- **Unlabelled aggregate** — a legend that shows only colours without naming the aggregate
  (count? sum? mean of what?) is undecodable. Always label the encoding.
- **Using sum/mean without a value field** — if `aggregate` is `sum` or `mean` but the point
  objects carry no numeric `value`, the engine falls back to count. This is a data-prep error,
  not an engine fallback to rely on.

## Known v1 limits (Slice A)

- **Static and interactive formats ship in Slice A.** Video formats (reveal, story, scrolly,
  interactive scrolly) are deferred to Slice B.
- **Single value field.** Each point carries at most one numeric `value` field. Multi-field
  aggregation (e.g. sum casualties AND sum property damage in one grid) is not yet supported.
- **No H3 / deck.gl.** The engine uses `turf.hexGrid` / `turf.squareGrid` over the data extent.
  Uber's H3 hierarchical hex system and deck.gl GPU rendering are a future upgrade path for
  very large point clouds (> 100 k points).
- **No user-configurable cell size.** The auto cell-size targets ~250 populated cells (cap: 2 000).
  Manual override is not yet a config knob.

## Implementation pointer

This type is implemented by `skills/map-native/src/hex-grid-geo.ts` (grid generation via
`turf.hexGrid` / `turf.squareGrid`, point collection via `turf.collect`, aggregate computation,
sequential BLUES bin colouring, empty-cell drop, auto cell-size) and
`skills/map-native/src/HexGridMap.tsx` (static + interactive render, cell hover, legend,
`mapStyle` selection). All configs are guarded at render time by `checkHexGridConformance` in
`skills/map-native/src/conformance.ts`.

## Credit conventions

Per data-to-viz norms and FT Visual Vocabulary expectations:

- Always name and link the **primary data source** (the point dataset) in `source.name` +
  `source.url`.
- Credit **data-to-viz.com** in editorial documentation when referencing the density-map
  decision tree.
- Credit the **FT Visual Vocabulary** (SPATIAL group) when justifying the choice between
  hex-grid, dot-density, and choropleth.
