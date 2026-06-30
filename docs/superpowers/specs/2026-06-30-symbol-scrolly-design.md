# scrolly — proportional symbol scrolly — design

**Date:** 2026-06-30
**Status:** approved (brainstorming)
**Scope:** add a **proportional-symbol** scrolly to the `skills/scrolly` engine, which today only does
choropleth. A symbol config (points / cities) becomes a scroll-driven narrative that flies from city
to city with data callouts — the symbol sibling of the existing choropleth scrolly. Mirrors the
choropleth→symbol generalisation already done in `map-native`.

## Why

The scrolly engine produces a guided scroll narrative from a CHOROPLETH config only (`Scrolly.tsx`
hardcodes `computeChoropleth → deriveMapStory`; `ScrollyMap.tsx` renders regions). The symbol map type
has static / interactive / video but no scrolly. The user asked for parity: a symbol scrolly. The
scrolly's `Beat`/`ScrollyStep` model and its orchestrator (sticky map + IntersectionObserver) are
type-agnostic — only the story derivation and the rendered map differ. So this slice adds a symbol
story derivation + a symbol scrolly map, and dispatches on `config.type`.

## Architecture — reuse the Beat model, dispatch by type

### 1. `map-native/src/symbol-story.ts` (NEW) — `deriveSymbolStory` (pure, tested)

Produce the SAME `Beat[]` shape that `deriveMapStory` produces (`map-native/src/map-story.ts`), but
from points. `Beat.camera` is a `[w,s,e,n]` bbox (the scrolly's `cameraForBounds` turns it into
center/zoom), so each beat carries a bbox:

```ts
import type { SymbolPoint } from "./symbol-geo";
import type { Beat } from "./map-story";

export interface SymbolStoryMeta { title: string; insight?: string; unit?: string }

// title → establish(points bbox) → reveal each city (value desc, callout name+value,
// camera = a small bbox around the city → city-level zoom) → takeaway(points bbox).
export function deriveSymbolStory(points: SymbolPoint[], meta: SymbolStoryMeta): Beat[];
```

- **Points bbox** = `[minLon, minLat, maxLon, maxLat]` of all points (reuse the same bbox `symbolGeometry` computes).
- **City camera bbox** for a point `[lon, lat]` = `[lon - D, lat - D, lon + D, lat + D]` with `D = CITY_DELTA` (≈ 1.5°) → `cameraForBounds` yields a tight city zoom.
- **Reveal order:** points sorted by value DESCENDING (same as `symbolGeometry`), so the story walks largest → smallest; each reveal `callout = { region: label, name: label, value: fmt(value), text: "label — value" }`, `copy = "label — value"`.
- `kind` sequence: `title` (camera = points bbox, copy = title) → `establish` (points bbox, copy = "") → `reveal` per city → `takeaway` (points bbox, copy = insight when distinct from title). Matches `deriveMapStory` exactly so `mapStoryToChapters` (in `scrolly/src/chapters.ts`) consumes it UNCHANGED (it is beat-based + callout-based; the "highest of N shown / lowest" descriptors already key off the reveal order).
- `fmt(value)` = `Math.round(value) + (unit ?? "")` (same default as `deriveMapStory`).

### 2. `scrolly/src/ScrollySymbolMap.tsx` (NEW) — the symbol scrolly map

Sibling of `ScrollyMap.tsx`, same structure (`{ config, currentStep }`, `interactive:false` so the
reader can't pan, init-once, precompute `cameras` via `cameraForBounds` per beat, `flyTo` on
`currentStep`), but renders the SYMBOL visual instead of choropleth regions:

- Reuse `symbolGeometry` + `symbolLabels` (`map-native/src/symbol-geo.ts` / `symbol-labels.ts`).
- Add the GL `circle` layer + the variable-anchor label layer, IDENTICAL config to `SymbolMap`/`SymbolStory` (single hue, white halo, `text-variable-anchor` + `text-radial-offset` from `labelRadialOffset`). Circles render at full size (no reveal-by-radius — the scroll reveal is the camera flight, not the growth).
- Re-derive the story internally via `deriveSymbolStory(config.points, meta)` (self-contained on `config + currentStep`, exactly as `ScrollyMap` re-derives its choropleth story), precompute `cameras`, and `flyTo(cameras[step])` when `currentStep` changes.
- Optional: emphasise the focused city (the beat's `highlight`) — e.g. a thin ring or full opacity while others dim. v1 may simply fly without dimming (keep it simple); the callout names the city.

### 3. `scrolly/src/Scrolly.tsx` — dispatch on `config.type`

The orchestrator already documents the generality hook ("switch(story.visual)"). Add a `config.type`
branch:
- `type === "symbol"`: build the story via `deriveSymbolStory(config.points, meta) → mapStoryToChapters`, and render `<ScrollySymbolMap config currentStep>` in the sticky slot.
- else (choropleth, the default — no `type` or `type:"choropleth"`): the current `computeChoropleth → deriveMapStory` path + `<ScrollyMap>`, UNCHANGED (back-compat).
The IntersectionObserver, the sticky layout, the header title, the source credit, and the prose cards
are shared (type-agnostic).

### 4. `scrolly/src/mount.tsx` — config type flows through

The config is already injected via `__CONFIG__`. The `ScrollyMapConfig` type widens to a union
`ScrollyMapConfig | ScrollySymbolConfig` where `ScrollySymbolConfig = { type: "symbol"; points: {lon,lat,value,label?}[]; basemap?; title?; description?; insight?; unit?; valueUnit?; source? }`. The
fallback sample stays the choropleth one.

## Data flow

```
config (type:"symbol", points)
  → Scrolly: deriveSymbolStory(points, meta) → mapStoryToChapters → steps   (chapters reused)
  → IntersectionObserver → currentStep → <ScrollySymbolMap config currentStep>
       re-derives deriveSymbolStory → cameras (cameraForBounds per beat) → flyTo(cameras[step])
       renders symbol circles + labels (symbolGeometry / symbolLabels)
```

## Testing

| Unit | Cases |
| --- | --- |
| `symbol-story.test.ts` (map-native) | `deriveSymbolStory`: emits title→establish→reveal×N→takeaway in that order; reveals sorted value-desc; each reveal `callout.text === "label — value"`; reveal `camera` is a small bbox centred on the point (`[lon-D, lat-D, lon+D, lat+D]`); establish/takeaway `camera` = full points bbox; deterministic |
| live e2e (render) | produce a symbol scrolly: a `{type:"symbol", points:[…cities…]}` config → `bun skills/scrolly/scripts/produce.mjs <config> <out>` → `scrolly.html`; load in Playwright, screenshot the establish view + a mid-scroll view; **eyeball**: establish shows all city circles + labels + title + source; scrolling flies to a city with its callout ("London — 296$bn"); the choropleth scrolly still works (back-compat) on its sample |

## Task decomposition

1. `deriveSymbolStory` in `map-native/src/symbol-story.ts` + tests (pure, TDD).
2. `ScrollySymbolMap.tsx` (reuse symbol-geo / symbol-labels; mirror ScrollyMap's camera+flyTo) — render-verified.
3. `Scrolly.tsx` `config.type` dispatch + `mount.tsx` config union + a symbol scrolly sample config; produce + eyeball the symbol scrolly AND confirm the choropleth scrolly still renders (back-compat).

## Out of scope (deferred)

- A symbol-video **camera tour** (SymbolStory is a fixed-camera reveal; `deriveSymbolStory` could later drive a symbol video tour — not now).
- Other map types' scrolly (flow, dot-density…) — future, once those engine types exist.
- Highlight/dim styling polish for the focused city — v1 may fly without dimming.
- Wiring symbol scrolly into the `suggest-visual` router — the grouped routing pass.

## Global constraints (binding)

- **Bun only** — `bun`, `bunx`, `bun test`.
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer, no `Co-Authored-By: Claude`.
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** (`VITE_MAPTILER_KEY` at build) — never hard-code or log it.
- **Back-compat:** the choropleth scrolly path is unchanged when `config.type` is absent or `"choropleth"`; verify it still renders.
- **Reuse, not duplication:** reuse `Beat` + `mapStoryToChapters` + `symbolGeometry`/`symbolLabels` + the `ScrollyMap` camera pattern; do not fork the orchestrator.
- **Verify at render** — eyeball the produced symbol `scrolly.html` (establish + a mid-scroll fly-to-city) and confirm the choropleth scrolly still works.
