# Map Hex-Grid (Spatial Bins) Type — Design

**Date:** 2026-07-02
**Status:** Approved (design phase)
**Depends on:** the map-native engine (choropleth binning + sequential scale; the reveal/story/scrolly
pipeline; `resolveMapStyle`; the type-add recipe). turf 7.2 (`hexGrid`, `squareGrid`, `collect`, `bbox`).

## Goal

Add the **hex-grid (spatial bins)** map type: aggregate a scatter of points into a regular tessellation
of cells — hexagons or squares — coloured by an aggregate (point count, or sum/mean of a value). The
grid is generated over the data extent, regular and independent of administrative boundaries. Distinct
from dot-density (dots scattered inside existing regions) and choropleth (fixed admin regions).

It covers **both bin shapes** (hex / square) and **all three aggregations** (count / sum / mean), and
ships in **all six formats** (static · interactive · interactive scrolly · video reveal · storytelling ·
scrolly). The AI/config picks per the data — "capability, not a default".

## Non-goals

- No h3-js dependency — use turf's `hexGrid`/`squareGrid` (already a dependency; deterministic).
- No new furniture/format machinery — reuse `MapFrame`, the choropleth binning + `BLUES` scale, the
  reveal/story/scrolly pipeline, `resolveScene`, `resolveMapStyle`.
- No size-encoding — cells are uniform in size; magnitude is encoded by cell colour, never cell size.

## Data model & capability space

Config `type: "hex-grid"`:

```ts
interface HexGridConfig {
  type: "hex-grid";
  points: { lon: number; lat: number; value?: number }[];
  binShape?: "hex" | "square";        // default "hex"
  aggregate?: "count" | "sum" | "mean"; // default "count"; sum/mean use point.value
  cellSizeKm?: number;                // auto-derived when absent
  basemap: string;
  mapStyle?: string;                  // AI-selected dataviz-light / dataviz-dark
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
}
```

- **binShape** — `hex` (`turf.hexGrid`) or `square` (`turf.squareGrid`).
- **aggregate** — `count` (points per cell), or `sum`/`mean` of each point's `value`.
- **cellSizeKm** — when absent, auto-derived so the grid holds ~250 cells across the points' bbox
  (readable), with a hard cap (~2,000 cells) for performance; a config value is honoured but the cell
  count is still capped (warn). The legend states the cell size / aggregate.

## Deterministic binning (`hex-grid-geo.ts`, pure core)

Frame-safe by construction (a fixed grid over a fixed bbox; no randomness):

- Compute the points' bbox (Mercator-clamped, small padding). Derive `cellSide` (km) from the bbox and
  the target cell count (`turf.hexGrid(bbox, cellSide, { units: "kilometers" })` /
  `turf.squareGrid(...)`).
- Bin the points into cells with `turf.collect(grid, pointsFC, "value", "__values")` (collects each
  cell's contained point values) plus a count; compute the per-cell aggregate (count / sum / mean).
- **Drop empty cells** (0 points) — standard hexbin; only populated cells render.
- Colour by **sequential bins reused from the choropleth core** (`BLUES`, 5 classes over the aggregate's
  min/max). Returns the cell polygons + aggregate + colour + bin index + a legend model + bounds.
- Pure, framework-free, unit-tested: determinism (same input → same cells/colours), aggregation
  correctness (count/sum/mean), bins/colours, empty cells excluded, cell-count cap.

## Rendering, legend, interaction

- **Cells** — a `fill` layer coloured by the cell's bin colour, plus a thin cell outline; only populated
  cells. mapStyle-adaptive.
- **Legend** — the sequential bin scale + the aggregate label ("points per hexagon" / "mean of <field>").
  Never a size legend.
- **Interaction** — hover targets the **cell**: shows the count / aggregate value (and cell coordinates if
  useful). mapStyle dark/light AI-selected via `resolveMapStyle`.

## Formats — all six, in two slices

### Slice A — type core + static + interactive
`hex-grid-geo.ts`, `HexGridMap.tsx` (static + interactive: cell fill + outline + hover + legend +
mapStyle), validation, conformance, KB doc, mount + produce + Root wiring for static/interactive, tests,
audit case, two samples (hex/count + square/mean).

### Slice B — video (reveal · storytelling · scrolly) + interactive scrolly
`deriveHexGridStory(layout, meta, opts) → Beat[]`: title → establish (all cells) → reveal the **highest
cells** (top-N by aggregate, capped) with a caption → takeaway. `HexGridReveal` (cells fade in),
`HexGridStory` (guided tour to the peak cells), `HexGridScrolly` (via MapScrolly dispatch). Interactive
scrolly free via the shared `deriveHexGridStory → mapStoryToChapters` contract. All three sizes,
`calculateMetadata` for duration.

## Architecture / files (the recipe)

**Slice A — create:** `src/hex-grid-geo.ts`, `src/HexGridMap.tsx`, `assets/sample-data/hex-grid-count.json`,
`hex-grid-mean.json`, `knowledge/references/map/types/hex-grid.md`, `tests/hex-grid-geo.test.ts`.
**Slice A — modify:** `src/validate-config.ts` (`validateHexGridConfig`), `src/conformance.ts`
(`checkHexGridConformance`), `src/mount.tsx`, `scripts/produce.mjs`, `scripts/audit-cases.mjs`, `SKILL.md`.
**Slice B — create/modify:** `src/hex-grid-story.ts`, `src/components/HexGridReveal.tsx`,
`HexGridStory.tsx`, `HexGridScrolly.tsx`, `remotion/src/Root.tsx`, `scripts/produce.mjs`,
`src/route-story.ts` (scrollyStepCount branch), `src/components/MapScrolly.tsx` (dispatch), KB + roadmap.

## Error handling & edge cases

- Empty `points` / a point missing lon/lat → validation error.
- `aggregate: sum|mean` with points missing `value` → validation error.
- All points coincident (degenerate bbox) → pad the bbox to a minimum extent so at least one cell forms.
- Auto `cellSizeKm` that would exceed the cap → clamp the cell count (coarser cells) + warn.
- All cells empty after binning (impossible if points exist, but guard) → conformance flags "no cells".
- Mercator-unsafe latitudes → clamp bbox to ±85.
- Frame-determinism (Slice B): the grid + binning is computed once and held; camera animates; no
  `Date.now`/`Math.random`.

## Testing

- `hex-grid-geo.test.ts` — determinism (same points/shape/aggregate → identical cells + colours);
  count/sum/mean correctness on a known point set; hex vs square shape selection; empty cells excluded;
  bin/colour assignment (BLUES); cell-count cap; degenerate-bbox padding.
- `checkHexGridConformance` — sequential bin legend present; aggregate label present; bounds non-empty;
  at least one populated cell; valid mapStyle; title/description/source (global L0).
- Render verification — Slice A: hex/count + square/mean samples, static + interactive, light + dark.
  Slice B: reveal/story/scrolly × 3 sizes, stills at key frames.

## Global constraints

- Runtime **Bun** always (never npm/node); tests `bun test`.
- Code, comments, commits, branch names in **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `splash/.env` (gitignored) — never commit/log it.
- Reuse existing building blocks (choropleth binning + `BLUES` scale, MapFrame, reveal/story/scrolly
  pipeline, `resolveScene`, `resolveMapStyle`); do not fork them. Use turf `hexGrid`/`squareGrid`/`collect`.
- Frame-deterministic Remotion (Slice B): no `Date.now`/`Math.random`/argless `new Date()`; grid computed once.
