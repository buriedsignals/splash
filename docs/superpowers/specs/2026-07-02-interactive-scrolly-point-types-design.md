# Interactive Scrolly for Point-Based Map Types — Design

**Date:** 2026-07-02
**Status:** Approved (design phase)
**Depends on:** the map-native engine (hex-grid / dot-density / locator geo cores + `deriveXStory` derivers),
the interactive scrolly skill (`skills/scrolly`: `Scrolly.tsx`, `ScrollyMap`, `ScrollySymbolMap`,
`mapStoryToChapters`), MapTiler SDK, turf.

## Problem

`skills/scrolly/src/Scrolly.tsx` builds the story and renders one sticky map, dispatching on
`config.type`: `symbol` → `ScrollySymbolMap`, else → `ScrollyMap` (choropleth, via
`computeChoropleth(config, world, "iso_a3")`). The point-based types — **hex-grid, dot-density,
locator** — carry a point array and no `iso_a3`-keyed region values, so they fall into the choropleth
branch and render a broken / empty choropleth. The `mapStoryToChapters` contract these types produce only
drives the scroll → `currentStep` logic; it never teaches the *map layer* how to draw cells / dots /
points.

Consequently the "Interactive scrolly ✓ shipped" claim in the KB docs for all three types
(`knowledge/references/map/types/hex-grid.md`, `dot-density.md`, `locator.md`) is an **overclaim** — the
format does not render. This violates the project's "verify at render, not just claim" principle and the
"every type ships in all six formats" goal. hex-grid, dot-density, and locator do NOT actually have
six-format parity today.

## Goal

Teach the interactive HTML scrolly to render point-based map types, so hex-grid, dot-density, and locator
genuinely ship the interactive-scrolly format (the sixth format). The video scrolly (MapScrolly MP4) is
already real for these types; this closes the interactive-HTML gap and makes the KB claims true.

## Non-goals

- No change to the video (Remotion) scrolly path — it already renders correctly.
- No new story/beat machinery — reuse each type's existing `deriveXStory` + `mapStoryToChapters`.
- No new camera/step abstraction — follow the accepted sibling-component pattern (`ScrollyMap` and
  `ScrollySymbolMap` are already near-duplicates, one per map family).
- No H3 / deck.gl, no new dependencies.

## Architecture

Follow the established `ScrollySymbolMap` pattern. Each new component is a self-contained
`{ config, currentStep }` React component: live MapTiler map, init-once via `startedRef`, all navigation
disabled (scroll drives the camera), per-beat cameras precomputed via `cameraForBounds`, `jumpTo` beat 0
on load, `flyTo` (or `jumpTo` under `prefers-reduced-motion`) on `currentStep` change, and it exposes
`window.__map__` + `window.__scrolly_step__` for the smoke harness.

### Three new components (`skills/scrolly/src/`)

1. **`ScrollyHexMap.tsx`** — `config.type === "hex-grid"`.
   - Geometry: `computeHexGrid(config)` → a FeatureCollection of cell polygons carrying
     `{ __color, __count, __value, __cellIdx: String(idx) }` (the same cell-build as `HexGridMap` /
     `HexGridScrolly`). Fill layer `fill-color: ["get","__color"]`, thin outline. Never colour/scale by
     cell size (uniform-cell invariant).
   - Beats: `deriveHexGridStory(layout, meta)`. Cameras precomputed from `beat.camera`.
   - Per-step dim-emphasis synced to `currentStep`: on a reveal beat the highlighted cell
     (`__cellIdx === beat.highlight[0]`) is full opacity (~0.9), others dimmed (~0.2); on
     title/establish/takeaway all cells full. Applied via a `setPaintProperty` `case` expression, exactly
     as `HexGridScrolly` does.
   - `mapStyle` (`dataviz-light`/`dataviz-dark`) via `resolveMapStyle`. Sequential bin legend.
   - Cell layer id `hex-grid-cells` (matches Slice A; used by the ready-gate).

2. **`ScrollyDotDensityMap.tsx`** — `config.type === "dot-density"`.
   - Geometry: the dot-density geo core (as `DotDensityMap` / `DotDensityScrolly` build it) — region
     polygons + scattered dots, dots tagged with their region key. Beats:
     `deriveDotDensityStory(...)`. Per-step region dim-emphasis (`__region`) synced to `currentStep`,
     matching `DotDensityScrolly`. Legend as in the type's static build.

3. **`ScrollyLocatorMap.tsx`** — `config.type === "locator"`.
   - Geometry: the locator geo core (points + optional labels/symbols as `LocatorMap` /
     `LocatorScrolly` build it). Beats: `deriveLocatorStory(...)`. Per-step emphasis synced to
     `currentStep`, matching `LocatorStory`/`LocatorScrolly` (no double text — the caption is the prose
     card, per the locator feedback lessons). Camera stays on the data zone (locator camera lesson).

Each component reads its exact layer/paint/legend setup from the type's existing map component and its
video scrolly sibling — a port, not a re-invention.

### `Scrolly.tsx` — extend two dispatches

- **Story build** (`useMemo`): add branches for `hex-grid` / `dot-density` / `locator`, each
  `deriveXStory(compute...(config), meta) → mapStoryToChapters(beats, { title, description, source,
  regionsWithData })`. `regionsWithData` = the count that best fits (cells / dots-regions / points).
- **Render slot:** dispatch `config.type` → the matching `ScrollyXMap` (before the choropleth fallback).
- Widen the `config` union type to include the three point-based config shapes.

### Docs

`hex-grid.md`, `dot-density.md`, `locator.md`: the "Interactive scrolly ✓" claim is now backed by a real
render. Keep the claim; adjust the implementation pointer to name the new `ScrollyXMap` component. No
overclaim remains.

## Data flow

```
config (point-based) ──► Scrolly.tsx
   ├─ story build:  deriveXStory(computeX(config)) ──► mapStoryToChapters ──► steps
   │                                   (scroll → currentStep via IntersectionObserver)
   └─ render slot:  <ScrollyXMap config currentStep={story.steps[currentStep].ref} />
                          │ init-once: computeX(config) → source + layers, precompute cameras
                          │ on currentStep: flyTo camera[step] + setPaintProperty dim-emphasis
                          ▼
                     live MapTiler map (cells / dots / points), focus+context
```

## Error handling & edge cases

- A point-based config with an empty/degenerate point set → the geo core's existing guards apply
  (same as the static/video paths); the component renders whatever the core returns (≥1 cell/point).
- `currentStep` clamped to `[0, beats.length - 1]` (as `ScrollySymbolMap` does).
- `prefers-reduced-motion` → `jumpTo` instead of `flyTo`.
- Missing `VITE_MAPTILER_KEY` → fail fast (existing guard, never log the key).
- No frame-determinism constraint here (interactive/live, not Remotion) — but geometry is still computed
  once on load, not per step.

## Testing

- **Smoke test per type** (extend `skills/scrolly/scripts/smoke.mjs` or add cases): mount the type's
  sample config, wait for `window.__map__.loaded()`, assert the type's layer is present (e.g.
  `getLayer("hex-grid-cells")` non-null — NOT a choropleth fill), drive a step change, assert the camera
  moved (`__scrolly_step__` advanced + center/zoom changed). This is the regression that would have
  caught the original overclaim.
- **Visual still per type** — confirm the map draws cells / dots / points (not a broken choropleth), the
  focus cell/region is emphasised while others dim, the prose card advances, the legend is correct.
- Existing scrolly tests (symbol + choropleth) stay green.

## Global constraints

- Runtime **Bun** always (never npm/node); tests `bun test`.
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `splash/.env` (gitignored) — never commit/log the value; components read
  `import.meta.env.VITE_MAPTILER_KEY` and fail fast if absent.
- Reuse the type geo cores + `deriveXStory` + `mapStoryToChapters` + the `ScrollySymbolMap` camera/step
  pattern; do not fork them. Uniform-cell invariant for hex-grid (colour = magnitude, never size).
  Locator camera stays on the data zone; no double text (caption is the prose card).
- This work lands on the `feat/map-hex-grid-video` branch so hex-grid reaches genuine six-format parity in
  one merge; it also retires the identical interactive-scrolly overclaim on the already-merged
  dot-density and locator types.
