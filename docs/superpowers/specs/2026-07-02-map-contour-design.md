# Map Contour / Isoline Type — Design

**Date:** 2026-07-02
**Status:** Approved (design phase)
**Depends on:** the map-native engine (choropleth binning + sequential/diverging scale; the hex-grid
cell-on-basemap render; the reveal/story/scrolly pipeline; `resolveMapStyle`; the type-add recipe; the
interactive-scrolly per-type component pattern — `ScrollyXMap` + `Scrolly.tsx` dispatch + smoke gate).
turf 7.2 (`interpolate`, `isolines`, `isobands`, `bbox`).

## Goal

Add the **contour / isoline** map type: render a continuous scalar field (temperature, elevation,
pollution, density…) sampled at points, as **filled contour bands and/or iso-lines**, in the family the
AI selects between ("capability, not a default"):

- **`bands`** — filled polygons between value breaks (`turf.isobands`), coloured by the sequential/
  diverging scale. Immediate "where is it high/dense" reading; sits well on the basemap.
- **`lines`** — iso-value lines (`turf.isolines`), optionally value-labelled; classic topographic reading.
- **`both`** — iso-lines drawn OVER filled bands.

The field is generated from the sampled points by deterministic interpolation. The map is **situated**
(a field over real geography) — the basemap is kept (no neutral background; that is the cartogram-`grid`
case). Distinct from hex-grid (bins a raw point cloud into discrete cells) and choropleth (fixed regions).
Ships in **all six formats** (static · interactive · interactive scrolly · video reveal · storytelling ·
scrolly).

## Non-goals

- No kriging / GP interpolation — use turf's deterministic IDW (`turf.interpolate`).
- No 3D / terrain — that is the Cesium flyover engine.
- No new furniture/format machinery — reuse `MapFrame`, choropleth binning + `BLUES`/`DIVERGING` scale,
  the reveal/story/scrolly pipeline, `resolveScene`, `resolveMapStyle`, the `ScrollyXMap` pattern.
- No neutral background — contour is situated; the basemap is always kept.

## Data model & capability space

Config `type: "contour"`:

```ts
interface ContourConfig {
  type: "contour";
  render?: "bands" | "lines" | "both";   // default "bands"; AI-selects
  points: { lon: number; lat: number; value: number }[]; // sampled field
  cellSizeKm?: number;                    // auto-derived when absent
  breaks?: number[];                      // explicit value breaks; else auto (5–7)
  bins?: number;                          // break count when auto (default 6)
  scaleType?: "sequential" | "diverging";
  basemap: string;                        // geography key (for framing/context)
  mapStyle?: string;                      // AI-selected dataviz-light / dataviz-dark
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
  valueLabel?: string;
}
```

- **render** — `bands` (`turf.isobands`), `lines` (`turf.isolines`), or `both` (lines over bands).
- **points** — the sampled scalar field; each carries a numeric `value`.
- **cellSizeKm** — when absent, auto-derived so the interpolation grid is readable (~a target cell count,
  as hex-grid does), capped for performance.
- **breaks** — explicit value breaks honoured; otherwise auto over the value range (equal-interval),
  reusing the choropleth binning for the break colours.

## Deterministic core (`contour-geo.ts`, pure)

Frame-safe by construction (IDW interpolation over a fixed grid; no randomness):

- Compute the points' bbox (Mercator-clamped ±85, small padding). Derive `cellSide` (km) for a readable
  grid; `turf.interpolate(pointsFC, cellSide, { gridType: "point", property: "value", units: "kilometers" })`
  → a regular value grid.
- Compute breaks (explicit or auto equal-interval, 5–7) and per-break colours via the reused choropleth
  binning (`BLUES` sequential / `DIVERGING`).
- If `render` includes bands → `turf.isobands(grid, breaks, { zProperty: "value" })` → filled polygons
  per band, coloured by band. If it includes lines → `turf.isolines(grid, breaks, { zProperty: "value" })`
  → MultiLineString per break (coloured or neutral; carry the break value for optional labels).
- Returns `{ bands: {feature,color,binIdx,min,max}[]; lines: {feature,value,color}[]; breaks: number[];
  render; bounds; valueLabel; scaleType }`.
- Pure, framework-free, unit-tested: determinism (same points/breaks → identical bands/lines/colours);
  breaks monotonic; band/line counts match the breaks; colours from the scale; render-mode gating (bands
  empty when render==="lines" and vice-versa); degenerate field (all-equal values) → one band, no lines
  (or a single line) without throwing; interpolation grid capped.

## Rendering, legend, interaction

- **Bands** — a `fill` layer id `contour-bands` coloured by the band colour; thin/no outline. mapStyle-adaptive.
- **Lines** — a `line` layer id `contour-lines`; width by mapStyle; optional value labels for `lines`/`both`.
- **Basemap** — always kept (situated field); `resolveMapStyle` dark/light AI-selected; `fitBounds(bounds)`.
- **Legend** — the sequential/diverging break scale + the `valueLabel` ("mean temperature (°C)", "µg/m³"…).
- **Interaction** — hover shows the value band / iso-value at the cursor.

## Formats — all six, in two slices

### Slice A — type core + static + interactive
`contour-geo.ts` (bands + lines), `ContourMap.tsx` (static + interactive: band fill + iso-lines + hover +
legend + mapStyle), validation, conformance, KB doc, mount + produce + Root wiring for static/interactive,
tests, audit case, two samples (one `bands`, one `both`).

### Slice B — video (reveal · storytelling · scrolly) + interactive scrolly
`deriveContourStory(layout, meta, opts) → Beat[]`: title → establish (whole field) → reveal the field's
**peaks** (top band centroids, capped) with a caption → takeaway; camera stays framed on the zone.
`ContourReveal` (bands fade in / lines draw on by progress), `ContourStory` (guided tour to the peaks),
`ContourScrolly` (via MapScrolly dispatch). **`ScrollyContourMap`** + `Scrolly.tsx` dispatch + per-type
smoke gate (`contour-bands` present AND `choropleth-fill` absent). All three sizes, `calculateMetadata`.

## Architecture / files (the recipe)

**Slice A — create:** `src/contour-geo.ts`, `src/ContourMap.tsx`, `assets/sample-data/contour-bands.json`,
`contour-both.json`, `knowledge/references/map/types/contour.md`, `tests/contour-geo.test.ts`.
**Slice A — modify:** `src/validate-config.ts`, `src/conformance.ts`, `src/mount.tsx`, `scripts/produce.mjs`,
`scripts/audit-cases.mjs`, `SKILL.md`.
**Slice B — create/modify:** `src/contour-story.ts`, `src/components/ContourReveal.tsx`,
`ContourStory.tsx`, `ContourScrolly.tsx`, `skills/scrolly/src/ScrollyContourMap.tsx`,
`skills/scrolly/src/Scrolly.tsx`, `skills/scrolly/src/mount.tsx`, `skills/scrolly/scripts/smoke.mjs`,
`remotion/src/Root.tsx`, `scripts/produce.mjs`, `src/route-story.ts` (scrollyStepCount branch),
`src/components/MapScrolly.tsx` (dispatch), KB + roadmap.

## Error handling & edge cases

- Empty `points` / a point missing lon/lat/value → validation error.
- Fewer than ~3 points (interpolation degenerate) → validation error or a single-band fallback (document).
- All values equal → one band, zero or one iso-line — must not throw.
- Auto `cellSize` exceeding the cap → clamp (coarser grid) + warn.
- Explicit `breaks` non-monotonic / outside the value range → validation error.
- Mercator-unsafe latitudes → clamp bbox to ±85.
- Frame-determinism (Slice B): the grid + isobands/isolines computed once and held; camera animates; no
  `Date.now`/`Math.random`.

## Testing

- `contour-geo.test.ts` — determinism; band/line counts match breaks; monotonic breaks; colours from the
  scale (sequential + diverging); render-mode gating (bands vs lines vs both); degenerate all-equal field;
  grid cap; explicit-breaks honoured.
- `checkContourConformance` — break legend present; value label present; bounds non-empty; ≥1 band (or ≥1
  line for `lines`); valid mapStyle; title/description/source (global L0).
- Render verification — Slice A: bands + both samples, static + interactive, light + dark. Slice B:
  reveal/story/scrolly × 3 sizes; interactive scrolly smoke gate green (contour layer present,
  choropleth-fill absent).

## Global constraints

- Runtime **Bun** always (never npm/node); tests `bun test`.
- Code, comments, commits, branch names in **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log it.
- Reuse existing building blocks (choropleth binning + `BLUES`/`DIVERGING` scale, MapFrame, reveal/story/
  scrolly pipeline, `resolveScene`, `resolveMapStyle`, the `ScrollyXMap` interactive-scrolly pattern); do
  not fork them. Use turf `interpolate`/`isobands`/`isolines`/`bbox`.
- Frame-deterministic Remotion (Slice B): no `Date.now`/`Math.random`/argless `new Date()`; grid computed once.
- Interactive scrolly MUST ship a real `ScrollyContourMap` + `Scrolly.tsx` dispatch + smoke gate — never
  claim the format from the story contract alone (the point-types overclaim lesson).
- The basemap is ALWAYS kept (situated field) — do NOT apply the cartogram grid-neutral background here.
