# Interactive Scrolly for Point-Based Map Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the interactive HTML scrolly (`skills/scrolly`) to render the three point-based map types
(hex-grid, dot-density, locator), so they genuinely ship the interactive-scrolly format instead of
falling into the broken choropleth fallback.

**Architecture:** One new `{config, currentStep}` sticky-map component per type
(`ScrollyHexMap`/`ScrollyDotDensityMap`/`ScrollyLocatorMap`), each a port of `ScrollySymbolMap` (live
MapTiler, init-once, precompute per-beat cameras, `flyTo` on step) fused with the type's video scrolly
sibling (layer build + per-step dim-emphasis). `Scrolly.tsx` gains a story branch + a render-slot dispatch
per type. Docs corrected. Lands on `feat/map-hex-grid-video` so hex-grid reaches genuine six-format parity
in one merge.

**Tech Stack:** Bun, TypeScript, React, MapTiler SDK, turf, Vite, `bun:test`, Playwright smoke harness.

**Prereq:** hex-grid Slice A + Slice B (video) on the current branch; dot-density + locator already on main.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`; dev/build: `bun`/`bunx vite`.
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log it. Components read
  `import.meta.env.VITE_MAPTILER_KEY` and fail fast if absent (existing guard — copy it verbatim).
- **Uniform-cell invariant** (hex-grid): cell colour encodes magnitude, never cell size; no size legend.
- **Locator:** camera stays on the data zone (the over-zoom lesson); no double text — the caption is the
  prose card, never also an on-map callout.
- Reuse the geo cores (`computeHexGrid`/`computeDotDensity`/`locatorGeometry`), the `deriveXStory`
  derivers, `mapStoryToChapters`, `resolveMapStyle`, and the `ScrollySymbolMap` camera/step pattern; do
  not fork them.
- Interactive/live (NOT Remotion) — no frame-determinism rule, but geometry is computed ONCE on load, not
  per step.
- After writing any `.tsx`, verify NUL-free: `python3 -c "print(open('<file>','rb').read().count(b'\\x00'))"` prints 0.

---

## File structure

**Create:** `skills/scrolly/src/ScrollyHexMap.tsx`, `ScrollyDotDensityMap.tsx`, `ScrollyLocatorMap.tsx`.
**Modify:** `skills/scrolly/src/Scrolly.tsx` (story branches + render dispatch + config union),
`skills/scrolly/src/mount.tsx` (widen config type), `skills/scrolly/scripts/smoke.mjs` (per-type layer
assertion), the three KB docs (`knowledge/references/map/types/{hex-grid,dot-density,locator}.md`).

**Reference (read, do not modify):** `skills/scrolly/src/ScrollySymbolMap.tsx` (the canonical
camera/step pattern), `skills/scrolly/src/ScrollyMap.tsx` (highlight-update mechanism),
`skills/map-native/src/components/{HexGridScrolly,DotDensityScrolly,LocatorScrolly}.tsx` (layer build +
dim-emphasis per type), the type geo cores + `deriveXStory`.

---

## Task 1: `ScrollyHexMap` + Scrolly dispatch (hex-grid)

**Files:** Create `skills/scrolly/src/ScrollyHexMap.tsx`; Modify `skills/scrolly/src/Scrolly.tsx`,
`skills/scrolly/src/mount.tsx`.

**Interfaces:**
- Consumes: `computeHexGrid`/`HexGridLayout` (`../../map-native/src/hex-grid-geo`), `deriveHexGridStory`
  (`../../map-native/src/hex-grid-story`), `resolveMapStyle` (`../../map-native/src/route-geo`),
  `mapStoryToChapters` (`./chapters`), `Beat` (`../../map-native/src/map-story`).
- Produces: `export const ScrollyHexMap: React.FC<{ config: ScrollyHexConfig; currentStep: number }>` and
  `export interface ScrollyHexConfig` (the hex-grid config shape: `type:"hex-grid"`, `points`,
  `binShape?`, `aggregate?`, `mapStyle?`, `title?`, `description?`, `insight?`, `source?`).

- [ ] **Step 1: Write `ScrollyHexMap.tsx`**

Port `skills/scrolly/src/ScrollySymbolMap.tsx` (read it fully — it is the camera/step skeleton) and fuse
the cell-build + dim-emphasis from `skills/map-native/src/components/HexGridScrolly.tsx` (read it fully).
Structure:
- Same key guard + `maptilersdk.config.apiKey` block as ScrollySymbolMap (verbatim).
- `export interface ScrollyHexConfig { type: "hex-grid"; points: {lon:number;lat:number;value?:number}[]; binShape?: "hex"|"square"; aggregate?: "count"|"sum"|"mean"; mapStyle?: string; basemap?: string; title?: string; description?: string; insight?: string; source?: {name:string;url:string}; }`
- Precompute outside the effect (pure, stable): `const layout = computeHexGrid(config);` and
  `const beats = deriveHexGridStory(layout, { title: config.title ?? "", insight: config.insight ?? config.title ?? "" });`
- Init map ONCE (`startedRef` guard) with `style` chosen by `resolveMapStyle(config.mapStyle) === "dataviz-dark" ? maptilersdk.MapStyle.DATAVIZ.DARK : maptilersdk.MapStyle.DATAVIZ.LIGHT`, navigation fully disabled (copy ScrollySymbolMap's option block verbatim), `fadeDuration: 0`. Expose `window.__map__`.
- On `map.on("load")`: add a `geojson` source `"hex-grid"` whose features are the cells tagged
  `{ __color: cell.color, __count: cell.count, __value: cell.value, __cellIdx: String(i) }` (copy the
  exact cell-build from HexGridScrolly). Add the fill layer **id `hex-grid-cells`**:
  `fill-color: ["get","__color"]`, `fill-opacity: 0.9` (static — emphasis is applied per step below),
  plus a thin outline layer (`line-color`, `line-width: 0.6`, mapStyle-adaptive) exactly as HexGridScrolly.
  Never colour/scale by cell size.
- Precompute per-beat cameras with `cameraForBounds(beat.camera, { padding: 64 })` → `{center,zoom}|null`
  (verbatim from ScrollySymbolMap). `jumpTo` beat 0 (fallback `fitBounds(layout.bounds)`).
- Build the sequential bin legend overlay (copy HexGridScrolly's legend DOM/markup + `aggregateLabel`).
- `setMapState({ map, beats, cameras })`.
- On `currentStep` change (second `useEffect`, deps `[currentStep, mapState]`): clamp
  `step = max(0, min(currentStep, beats.length-1))`; set `window.__scrolly_step__ = step`; apply
  dim-emphasis via `map.setPaintProperty("hex-grid-cells", "fill-opacity", expr)` where, for a reveal beat
  with `highlightKey = beats[step].highlight[0]`, `expr = ["case", ["==", ["get","__cellIdx"], highlightKey], 0.9, 0.2]`, and for a non-reveal beat (empty highlight) `expr = 0.9` (all cells full) — mirror HexGridScrolly's emphasis rule; then `flyTo`/`jumpTo` the camera exactly as ScrollySymbolMap (reduced-motion → jumpTo).
- Return the same container JSX as ScrollySymbolMap (`role="img"`, `aria-label` "Map: <title>" or "Hex-grid density map"), with the legend overlay div.

Verify NUL-free.

- [ ] **Step 2: Add the hex-grid story branch + render dispatch in `Scrolly.tsx`**

Read `skills/scrolly/src/Scrolly.tsx`. In the `story` `useMemo`, add BEFORE the choropleth fallback:
```tsx
if (config.type === "hex-grid") {
  const layout = computeHexGrid(config);
  const beats = deriveHexGridStory(layout, {
    title: config.title ?? "",
    insight: config.insight ?? config.title ?? "",
  });
  return mapStoryToChapters(beats, {
    title: config.title ?? "",
    description: config.description,
    source: config.source,
    regionsWithData: layout.cells.length,
  });
}
```
Add the imports (`computeHexGrid` from `../../map-native/src/hex-grid-geo`, `deriveHexGridStory` from
`../../map-native/src/hex-grid-story`, `ScrollyHexMap` + `ScrollyHexConfig` from `./ScrollyHexMap`).
Widen the component prop union: `config: ScrollyMapConfig | ScrollySymbolConfig | ScrollyHexConfig`.
In the render slot, add before the choropleth branch:
```tsx
) : config.type === "hex-grid" ? (
  <ScrollyHexMap config={config as ScrollyHexConfig} currentStep={currentBeatRef} />
```
(fit it into the existing ternary chain — symbol → hex-grid → choropleth fallback).

- [ ] **Step 3: Widen the mount config type**

In `skills/scrolly/src/mount.tsx`, add `ScrollyHexConfig` to the `__CONFIG__` + `config` union types
(import it from `./ScrollyHexMap`).

- [ ] **Step 4: Typecheck**

Run: `cd skills/scrolly && bunx tsc --noEmit`
Expected: clean (apart from any pre-existing errors unrelated to this change).

- [ ] **Step 5: Render-verify hex-grid interactive scrolly**

```bash
cd skills/scrolly
set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a
node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync('../map-native/assets/sample-data/hex-grid-count.json','utf8'));fs.writeFileSync('/tmp/isc-hex.json',JSON.stringify(c))"
CONFIG_JSON=/tmp/isc-hex.json bun scripts/smoke.mjs 2>&1 | tail -20 || true
```
(If `smoke.mjs` takes the config a different way, read it first and adapt — Step 6 of Task 4 formalises
the smoke wiring; for this task the goal is a manual visual confirmation.) Build + open the dist, or drive
the smoke harness, and capture a still: cells (hex/square) drawn coloured by bin — NOT an empty/broken
choropleth — the focus cell emphasised while others dim as the step advances, the sequential legend, the
prose cards scrolling over the sticky map. Confirm `window.__map__.getLayer("hex-grid-cells")` is present.

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/ScrollyHexMap.tsx skills/scrolly/src/Scrolly.tsx skills/scrolly/src/mount.tsx
git commit -m "feat(scrolly): interactive scrolly renders hex-grid (ScrollyHexMap)"
```

---

## Task 2: `ScrollyDotDensityMap` + Scrolly dispatch (dot-density)

**Files:** Create `skills/scrolly/src/ScrollyDotDensityMap.tsx`; Modify `skills/scrolly/src/Scrolly.tsx`,
`skills/scrolly/src/mount.tsx`.

**Interfaces:**
- Consumes: `computeDotDensity`/`DotDensityLayout` (`../../map-native/src/dot-density-geo`),
  `deriveDotDensityStory` (`../../map-native/src/dot-density-story`), `resolveMapStyle`,
  `mapStoryToChapters`, `Beat`.
- Produces: `export const ScrollyDotDensityMap: React.FC<{ config: ScrollyDotDensityConfig; currentStep: number }>`
  and `export interface ScrollyDotDensityConfig` (the dot-density config shape).

- [ ] **Step 1: Write `ScrollyDotDensityMap.tsx`**

Port `ScrollySymbolMap.tsx` (camera/step skeleton) + fuse the region+dots layer build and per-step
`__region` dim-emphasis from `skills/map-native/src/components/DotDensityScrolly.tsx` (read it fully).
Deltas vs Task 1:
- Geometry: `computeDotDensity(config)` → the region polygons + scattered dots; build the source(s) and
  layers exactly as DotDensityScrolly (region fill/outline + dot circle layer, dots tagged with their
  region key `__region`). Use DotDensityScrolly's exact layer ids so the ready-gate can target one.
- Beats: `deriveDotDensityStory(...)` with the same meta pattern DotDensityScrolly uses.
- Per-step emphasis: dim non-highlighted regions/dots (`__region` case expression, full vs ~0.2) synced to
  `currentStep`, mirroring DotDensityScrolly. Legend as in DotDensityScrolly.
- Camera precompute + `flyTo` on step: identical to Task 1 / ScrollySymbolMap.
Verify NUL-free.

- [ ] **Step 2: Scrolly.tsx dot-density branch + dispatch**

Mirror Task 1 Step 2 for `config.type === "dot-density"`: story branch
(`deriveDotDensityStory(computeDotDensity(config), meta) → mapStoryToChapters`, `regionsWithData` = the
count of regions with data as DotDensityScrolly computes it), imports, union widening
(`| ScrollyDotDensityConfig`), and a render-slot branch
`config.type === "dot-density" ? <ScrollyDotDensityMap ... /> :`.

- [ ] **Step 3: Widen the mount config type** — add `ScrollyDotDensityConfig` to `mount.tsx` union.

- [ ] **Step 4: Typecheck** — `cd skills/scrolly && bunx tsc --noEmit` (clean).

- [ ] **Step 5: Render-verify dot-density interactive scrolly**

Same harness as Task 1 Step 5 with `../map-native/assets/sample-data/dot-density-uni.json` (and, if quick,
`dot-density-multi.json`). Capture a still: dots scattered inside the region polygons (NOT a broken
choropleth), the focus region emphasised while others dim as the step advances, the legend, prose cards
scrolling. Confirm the dot layer is present via `window.__map__.getLayer(<dot-layer-id>)`.

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/ScrollyDotDensityMap.tsx skills/scrolly/src/Scrolly.tsx skills/scrolly/src/mount.tsx
git commit -m "feat(scrolly): interactive scrolly renders dot-density (ScrollyDotDensityMap)"
```

---

## Task 3: `ScrollyLocatorMap` + Scrolly dispatch (locator)

**Files:** Create `skills/scrolly/src/ScrollyLocatorMap.tsx`; Modify `skills/scrolly/src/Scrolly.tsx`,
`skills/scrolly/src/mount.tsx`.

**Interfaces:**
- Consumes: `locatorGeometry`/`LocatorGeometry` (`../../map-native/src/locator-geo`), `deriveLocatorStory`
  (`../../map-native/src/locator-story`), `resolveMapStyle`, `mapStoryToChapters`, `Beat`.
- Produces: `export const ScrollyLocatorMap: React.FC<{ config: ScrollyLocatorConfig; currentStep: number }>`
  and `export interface ScrollyLocatorConfig` (the locator config shape).

- [ ] **Step 1: Write `ScrollyLocatorMap.tsx`**

Port `ScrollySymbolMap.tsx` + fuse the marker/point+label layer build and per-step emphasis from
`skills/map-native/src/components/LocatorScrolly.tsx` and `LocatorStory.tsx` (read both fully). Deltas:
- Geometry: `locatorGeometry(config)` → placed markers (+ optional labels/symbols); build source + layers
  exactly as LocatorScrolly. Use LocatorScrolly's exact layer ids.
- Beats: `deriveLocatorStory(...)` with LocatorScrolly's meta pattern.
- Per-step emphasis synced to `currentStep`, mirroring LocatorScrolly/LocatorStory. **No double text** —
  the prose card is the only caption; do NOT add an on-map callout duplicating it (the locator feedback
  lesson). **Camera stays on the data zone** — use the beats' cameras (which already frame the zone); do
  not over-zoom to a single marker.
- Camera precompute + `flyTo` on step: identical to Task 1.
Verify NUL-free.

- [ ] **Step 2: Scrolly.tsx locator branch + dispatch**

Mirror Task 1 Step 2 for `config.type === "locator"`: story branch
(`deriveLocatorStory(locatorGeometry(config), meta) → mapStoryToChapters`; `regionsWithData` = marker
count), imports, union widening (`| ScrollyLocatorConfig`), render-slot branch
`config.type === "locator" ? <ScrollyLocatorMap ... /> :`.

- [ ] **Step 3: Widen the mount config type** — add `ScrollyLocatorConfig` to `mount.tsx` union.

- [ ] **Step 4: Typecheck** — `cd skills/scrolly && bunx tsc --noEmit` (clean).

- [ ] **Step 5: Render-verify locator interactive scrolly**

Same harness as Task 1 Step 5 with `../map-native/assets/sample-data/locator-few.json` and
`locator-many.json`. Capture a still per sample: markers/points drawn (NOT a broken choropleth), the
camera framed on the data zone (surrounding context visible, not a single over-zoomed marker), the focus
marker emphasised, no duplicated caption text on the map, prose cards scrolling. Confirm the marker layer
is present via `getLayer`.

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/ScrollyLocatorMap.tsx skills/scrolly/src/Scrolly.tsx skills/scrolly/src/mount.tsx
git commit -m "feat(scrolly): interactive scrolly renders locator (ScrollyLocatorMap)"
```

---

## Task 4: Smoke gate per type + doc corrections + final matrix

**Files:** Modify `skills/scrolly/scripts/smoke.mjs`, the three KB docs.

- [ ] **Step 1: Read `skills/scrolly/scripts/smoke.mjs`**

Understand how it selects the config (Vite `__CONFIG__` define, or a `CONFIG_JSON` env, or the mount
fallback) and how it asserts readiness (`window.__map__.loaded()`). Note the exact mechanism — do not
guess.

- [ ] **Step 2: Add a per-type layer assertion to the smoke harness**

Extend `smoke.mjs` so that, after `window.__map__.loaded()`, it asserts the EXPECTED layer for the config
type is present and the choropleth fallback is NOT: e.g. for `type:"hex-grid"` assert
`window.__map__.getLayer("hex-grid-cells")` is truthy; for dot-density the dot layer id; for locator the
marker layer id; for symbol `symbol-circles`; else `choropleth-fill`. Drive one step change and assert
`window.__scrolly_step__` advanced and the camera center/zoom changed. Keep it ADDITIVE — the existing
symbol/choropleth smoke path must still pass. This is the regression that catches the original overclaim.

- [ ] **Step 3: Run the smoke harness for all five types**

For each of `hex-grid-count`, `dot-density-uni`, `locator-few`, plus the existing `symbol` and
`choropleth` samples, run the smoke harness (per its config mechanism from Step 1) and confirm: map loads,
correct layer present, step advances the camera. Report any failure — do not mark complete on a failing
type.

- [ ] **Step 4: Correct the three KB docs**

In `knowledge/references/map/types/hex-grid.md`, `dot-density.md`, `locator.md`: the "Interactive scrolly
✓" claim is now backed by a real render. Keep the ✓ but fix the implementation pointer to name the new
component (`ScrollyHexMap` / `ScrollyDotDensityMap` / `ScrollyLocatorMap`) and state that the interactive
scrolly dispatches on `config.type` in `Scrolly.tsx`. Remove any wording implying it works "for free via
the mapStoryToChapters contract with no scrolly change" (that was the false assumption). One focused edit
per doc; do not restructure.

- [ ] **Step 5: Full suite + typecheck**

Run: `cd skills/scrolly && bunx tsc --noEmit && bun test` and `cd skills/map-native && bun test`.
Expected: all pass (map-native unaffected: still 243; scrolly tests green).

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/scripts/smoke.mjs knowledge/references/map/types/hex-grid.md knowledge/references/map/types/dot-density.md knowledge/references/map/types/locator.md
git commit -m "test(scrolly): per-type layer smoke gate + docs: interactive scrolly point-types shipped"
```

---

## Self-Review

**Spec coverage:** ScrollyHexMap → Task 1; ScrollyDotDensityMap → Task 2; ScrollyLocatorMap → Task 3;
Scrolly.tsx story+render dispatch + mount union widened incrementally across Tasks 1-3; smoke per-type
layer gate + doc corrections → Task 4. Uniform-cell invariant (hex), locator camera-on-zone + no-double-
text restated in the relevant tasks. All three types' interactive scrolly rendered + smoke-gated.

**Placeholder scan:** Each component task is a port of a NAMED in-repo sibling (`ScrollySymbolMap` +
`{HexGridScrolly,DotDensityScrolly,LocatorScrolly}`) with enumerated deltas and the exact
imports/interfaces; the Scrolly.tsx branch code is given verbatim for hex-grid and by-parallel for the
siblings. The smoke assertion names concrete layer ids. No "TBD"; the only "read it first" items point at
real files (correct — the layer ids/legend markup live there and must be copied, not invented).

**Type consistency:** `ScrollyHexConfig`/`ScrollyDotDensityConfig`/`ScrollyLocatorConfig` and
`ScrollyHexMap`/`ScrollyDotDensityMap`/`ScrollyLocatorMap` names match between their defining task, the
Scrolly.tsx dispatch, and mount.tsx. Each consumes the confirmed core exports: `computeHexGrid`/
`HexGridLayout`, `computeDotDensity`/`DotDensityLayout`, `locatorGeometry`/`LocatorGeometry`, and
`deriveHexGridStory`/`deriveDotDensityStory`/`deriveLocatorStory`. The `{config, currentStep}` prop
contract matches ScrollySymbolMap/ScrollyMap exactly. Layer id `hex-grid-cells` matches Slice A + the
smoke gate.
