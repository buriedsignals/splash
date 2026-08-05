# Proportional Symbol Scrolly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proportional-symbol scrolly to the `skills/scrolly` engine — a symbol config becomes a scroll-driven narrative that flies city to city with data callouts, the sibling of the existing choropleth scrolly.

**Architecture:** A pure `deriveSymbolStory` emits the SAME `Beat[]` shape `deriveMapStory` does (so `mapStoryToChapters` is reused unchanged); a `ScrollySymbolMap` renders the symbol circles+labels and flies the camera per scroll step (mirroring `ScrollyMap`); `Scrolly.tsx` dispatches on `config.type`. Choropleth scrolly path is unchanged.

**Tech Stack:** Bun, TypeScript, bun:test, React, `@maptiler/sdk`, Vite (singlefile scrolly build).

## Global Constraints

- **Bun only** — `bun`, `bunx`, `bun test`.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO an authorship trailer naming an assistant.
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** (`VITE_MAPTILER_KEY` at build; `set -a && . ../../.env && set +a` from `skills/scrolly/`) — never hard-code or log it.
- **Back-compat:** the choropleth scrolly path is unchanged when `config.type` is absent or `"choropleth"`; verify it still renders.
- **Reuse, not duplication:** reuse `Beat` + `mapStoryToChapters` + `symbolGeometry`/`symbolLabels` + the `ScrollyMap` camera pattern; do not fork the orchestrator.

Paths are relative to the repo root unless noted.

---

### Task 1: `deriveSymbolStory` — the pure symbol story (Beat[])

**Files:**
- Create: `skills/map-native/src/symbol-story.ts`
- Test: `skills/map-native/tests/symbol-story.test.ts`

**Interfaces:**
- Consumes: `type SymbolPoint` from `./symbol-geo` (`{ lon:number; lat:number; value:number; label?:string }`); `type Beat` from `./map-story` (`{ kind; camera:[number,number,number,number]; highlight:string[]; dim:boolean; callout:{region;name;value;text}|null; copy:string }`).
- Produces: `interface SymbolStoryMeta { title:string; insight?:string; unit?:string }`; `function deriveSymbolStory(points: SymbolPoint[], meta: SymbolStoryMeta): Beat[]`. Consumed by `Scrolly.tsx` (Task 3) and `ScrollySymbolMap.tsx` (Task 2).

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/symbol-story.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { deriveSymbolStory } from "../src/symbol-story";
import type { SymbolPoint } from "../src/symbol-geo";

const points: SymbolPoint[] = [
  { lon: -0.1, lat: 51.5, value: 296, label: "London" },
  { lon: 4.9, lat: 52.4, value: 52, label: "Amsterdam" },
  { lon: 2.35, lat: 48.85, value: 181, label: "Paris" },
];

describe("deriveSymbolStory", () => {
  const beats = deriveSymbolStory(points, { title: "Europe's tech-funding map", unit: "$bn" });

  it("emits title → establish → reveal×N → takeaway in order", () => {
    expect(beats.map((b) => b.kind)).toEqual([
      "title",
      "establish",
      "reveal",
      "reveal",
      "reveal",
      "takeaway",
    ]);
  });
  it("orders reveals by value descending", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.map((b) => b.callout!.name)).toEqual(["London", "Paris", "Amsterdam"]);
  });
  it("formats each reveal callout as 'name — value+unit'", () => {
    const london = beats.find((b) => b.callout?.name === "London")!;
    expect(london.callout!.value).toBe("296$bn");
    expect(london.callout!.text).toBe("London — 296$bn");
    expect(london.copy).toBe("London — 296$bn");
  });
  it("frames each reveal on a small bbox around the city", () => {
    const london = beats.find((b) => b.callout?.name === "London")!;
    expect(london.camera).toEqual([-0.1 - 1.5, 51.5 - 1.5, -0.1 + 1.5, 51.5 + 1.5]);
  });
  it("frames title/establish/takeaway on the full points bbox", () => {
    const full: [number, number, number, number] = [-0.1, 48.85, 4.9, 52.4];
    expect(beats[0].camera).toEqual(full); // title
    expect(beats[1].camera).toEqual(full); // establish
    expect(beats[beats.length - 1].camera).toEqual(full); // takeaway
  });
  it("puts the title in the title beat and leaves establish copy empty", () => {
    expect(beats[0].copy).toBe("Europe's tech-funding map");
    expect(beats[1].copy).toBe("");
  });
  it("is deterministic", () => {
    expect(deriveSymbolStory(points, { title: "Europe's tech-funding map", unit: "$bn" })).toEqual(beats);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test tests/symbol-story.test.ts`
Expected: FAIL — `deriveSymbolStory` not exported.

- [ ] **Step 3: Implement**

Create `skills/map-native/src/symbol-story.ts`:

```ts
// Point-based scroll/story derivation — the symbol sibling of map-story's
// deriveMapStory. Emits the SAME Beat shape (camera is a [w,s,e,n] bbox) so the
// scrolly's mapStoryToChapters consumes it unchanged. title → establish (points
// bbox) → reveal each city (value desc, callout name+value, camera = a small bbox
// around the city) → takeaway (points bbox).
import type { SymbolPoint } from "./symbol-geo";
import type { Beat } from "./map-story";

export interface SymbolStoryMeta {
  title: string;
  insight?: string;
  unit?: string;
}

// Half-width (degrees) of the city framing box → a tight, legible city zoom.
const CITY_DELTA = 1.5;

export function deriveSymbolStory(
  points: SymbolPoint[],
  meta: SymbolStoryMeta,
): Beat[] {
  const unit = meta.unit ?? "";
  const fmt = (v: number) => `${Math.round(v)}${unit}`;

  const lons = points.map((p) => p.lon);
  const lats = points.map((p) => p.lat);
  const bounds: [number, number, number, number] = [
    Math.min(...lons),
    Math.min(...lats),
    Math.max(...lons),
    Math.max(...lats),
  ];

  const beats: Beat[] = [];
  beats.push({
    kind: "title",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  beats.push({
    kind: "establish",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  const sorted = [...points].sort((a, b) => b.value - a.value);
  for (const p of sorted) {
    const name = p.label ?? "";
    const value = fmt(p.value);
    const text = `${name} — ${value}`;
    beats.push({
      kind: "reveal",
      camera: [
        p.lon - CITY_DELTA,
        p.lat - CITY_DELTA,
        p.lon + CITY_DELTA,
        p.lat + CITY_DELTA,
      ],
      highlight: [name],
      dim: true,
      callout: { region: name, name, value, text },
      copy: text,
    });
  }

  beats.push({
    kind: "takeaway",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd skills/map-native && bun test tests/symbol-story.test.ts` → PASS. Then `cd skills/map-native && bun test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/symbol-story.ts skills/map-native/tests/symbol-story.test.ts
git commit -m "feat(map-native): deriveSymbolStory — point-based Beat story (scrolly/video reuse)"
```
(NO Claude-Session trailer.)

---

### Task 2: `ScrollySymbolMap.tsx` — the symbol scrolly map

Render-verified (no unit test). Mirror `skills/scrolly/src/ScrollyMap.tsx`'s structure and camera handling; render the symbol visual instead of choropleth regions.

**Files:**
- Create: `skills/scrolly/src/ScrollySymbolMap.tsx`

**Interfaces:**
- Consumes: `deriveSymbolStory`, `SymbolStoryMeta` (Task 1); `symbolGeometry` from `map-native/src/symbol-geo`; `symbolLabels`, `labelRadialOffset` from `map-native/src/symbol-labels`.
- Produces: `interface ScrollySymbolConfig { type:"symbol"; points:{lon:number;lat:number;value:number;label?:string}[]; basemap?:string; title?:string; description?:string; insight?:string; unit?:string; valueUnit?:string; source?:{name:string;url:string} }`; `const ScrollySymbolMap: React.FC<{ config: ScrollySymbolConfig; currentStep: number }>`.

- [ ] **Step 1: Read the two references**

Read `skills/scrolly/src/ScrollyMap.tsx` (the camera pattern: init-once map with `interactive:false`/no nav handlers; on load precompute `cameras = beats.map(b => cameraForBounds(b.camera, {padding}))` → `{center,zoom}`; `jumpTo` beat 0; a `useEffect([currentStep])` that `flyTo(cameras[step])`). Read `skills/map-native/src/SymbolMap.tsx` (the GL `circle` layer + the `symbol-labels` layer config: single hue `#2171b5`, opacity 0.75, white stroke; labels via `text-variable-anchor:["left","right","top","bottom"]` + `text-radial-offset:["get","labelOffset"]`, `labelOffset = labelRadialOffset(s.radius, LABEL_TEXT_SIZE)` with `LABEL_TEXT_SIZE = 13`).

- [ ] **Step 2: Write `ScrollySymbolMap.tsx`**

Create `skills/scrolly/src/ScrollySymbolMap.tsx`. Mirror `ScrollyMap`'s skeleton (key guard, init-once `startedRef`, `interactive:false`, no pan/zoom handlers so the reader cannot manually move the map, `cameraForBounds` precompute, `flyTo` on `currentStep`), but:
- Build geometry from points: `const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX)` (`MAX_RADIUS_PX = 40`) and `const labels = symbolLabels(geo.symbols)`.
- Re-derive the story internally: `const beats = deriveSymbolStory(config.points, { title: config.title ?? "", insight: config.insight ?? config.title, unit: config.valueUnit ?? "" })`.
- On map `load`: add a `symbols` GeoJSON source (one Point feature per `geo.symbols[i]` with properties `radius`, `labelText` (= `labels[i].name ? \`${labels[i].name}\n${labels[i].valueText}\` : labels[i].valueText`), `labelOffset` = `labelRadialOffset(geo.symbols[i].radius, 13)`), then the `symbol-circles` `circle` layer (radius = `["get","radius"]`, full size — NO progress reveal; the scroll reveal is the camera flight) and the `symbol-labels` `symbol` layer (the exact variable-anchor + radial-offset config from `SymbolMap`). Expose `window.__map__ = map` (like ScrollyMap/SymbolMap, for the snap harness).
- Precompute `cameras = beats.map(b => { const r = map.cameraForBounds(b.camera, { padding: 48 }); return r ? { center:[r.center.lng, r.center.lat], zoom: r.zoom } : null })`; `jumpTo` `cameras[0]`.
- `useEffect([currentStep])`: clamp `step` to `[0, beats.length-1]`, `flyTo(cameras[step])` (guard null).
- Keep MapTiler key guard (`import.meta.env.VITE_MAPTILER_KEY`, throw if missing, never log).

(Optional v1: no per-city dim/highlight — fly + the callout names the city. Keep it simple.)

- [ ] **Step 3: Verify it compiles**

Run: `cd skills/scrolly && bunx vite build >/dev/null 2>&1 && echo BUILD_OK || echo BUILD_FAIL` (with the key loaded: `set -a && . ../../.env && set +a` first; never print it). Expected: `BUILD_OK` (the component type-checks and bundles; full render verification is in Task 3 once the dispatch is wired). If it fails on an unused import or type, fix it.

- [ ] **Step 4: Commit**

```bash
git add skills/scrolly/src/ScrollySymbolMap.tsx
git commit -m "feat(scrolly): ScrollySymbolMap — symbol circles + labels, scroll-driven flyTo"
```
(NO Claude-Session trailer.)

---

### Task 3: `Scrolly` dispatch + mount union + sample + produce/verify

Render-verified. Wire the type dispatch and prove the symbol scrolly end to end, with choropleth back-compat.

**Files:**
- Modify: `skills/scrolly/src/Scrolly.tsx`
- Modify: `skills/scrolly/src/mount.tsx`
- Create: `skills/scrolly/assets/sample-data/symbol-scrolly.json`

**Interfaces:**
- Consumes: `deriveSymbolStory` (Task 1), `ScrollySymbolMap`, `ScrollySymbolConfig` (Task 2), `mapStoryToChapters` (existing).

- [ ] **Step 1: Create the symbol sample config**

Create `skills/scrolly/assets/sample-data/symbol-scrolly.json`:

```json
{
  "type": "symbol",
  "points": [
    { "lon": -0.1276, "lat": 51.5072, "value": 296, "label": "London" },
    { "lon": 2.3522, "lat": 48.8566, "value": 181, "label": "Paris" },
    { "lon": -3.7038, "lat": 40.4168, "value": 124, "label": "Madrid" },
    { "lon": 13.405, "lat": 52.52, "value": 88, "label": "Berlin" },
    { "lon": 12.4964, "lat": 41.9028, "value": 67, "label": "Rome" },
    { "lon": 4.9041, "lat": 52.3676, "value": 52, "label": "Amsterdam" }
  ],
  "basemap": "world",
  "title": "London leads Europe's tech-funding map, Paris close behind",
  "description": "Venture funding raised by startups headquartered in each city, 2024",
  "valueUnit": "$bn",
  "source": { "name": "Dealroom 2025", "url": "https://example.org/dealroom" }
}
```

- [ ] **Step 2: Dispatch on `config.type` in `Scrolly.tsx`**

In `skills/scrolly/src/Scrolly.tsx`, import `deriveSymbolStory` (from `../../map-native/src/symbol-story`) and `ScrollySymbolMap, type ScrollySymbolConfig` (from `./ScrollySymbolMap`). Widen the prop type to `ScrollyMapConfig | ScrollySymbolConfig`. Branch the `story` useMemo and the sticky-slot render on `config.type === "symbol"`:
- story (symbol): `const beats = deriveSymbolStory(config.points, { title: config.title ?? "", insight: config.insight ?? config.title, unit: config.valueUnit ?? "" }); return mapStoryToChapters(beats, { title: config.title ?? "", description: config.description, source: config.source, regionsWithData: config.points.length });`
- sticky slot (symbol): `<ScrollySymbolMap config={config} currentStep={currentBeatRef} />`
- else: the existing choropleth `computeChoropleth → deriveMapStory → mapStoryToChapters` + `<ScrollyMap>` path, UNCHANGED.
Keep the IntersectionObserver, header, source credit, and prose cards shared (they read `story`/`config.source`, both present in either branch).

- [ ] **Step 3: Widen the config type in `mount.tsx`**

In `skills/scrolly/src/mount.tsx`, change the declared/casts type to the union `ScrollyMapConfig | ScrollySymbolConfig` (import `ScrollySymbolConfig` from `./ScrollySymbolMap`). The choropleth fallback sample stays as the default.

- [ ] **Step 4: Produce + eyeball the symbol scrolly AND confirm choropleth back-compat**

```bash
cd skills/scrolly
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol-scrolly.json /tmp/verify/symbol-scrolly
```

Then screenshot the produced `scrolly.html` at the top and mid-scroll (an inline Playwright snippet: load `file:///tmp/verify/symbol-scrolly/scrolly.html`, wait ~3.5s, screenshot `top.png`; `window.scrollTo(0, document.body.scrollHeight*0.45)`, wait ~2.5s, screenshot `mid.png`). READ both: the **establish** view must show all six city circles + labels + the title header + the source credit; the **mid** view must show the camera flown to a city with its callout card (e.g. "Paris — 181$bn" or "London — 296$bn"). If the map is blank or the camera doesn't move, debug before committing.

Then confirm CHOROPLETH back-compat: `bun scripts/produce.mjs assets/sample-data/scrolly.json /tmp/verify/choropleth-scrolly` (the existing choropleth sample) → screenshot the top → READ it → the choropleth scrolly still renders (regions + title + source). Do not skip this — the dispatch must not break the choropleth path.

- [ ] **Step 5: Commit**

```bash
git add skills/scrolly/src/Scrolly.tsx skills/scrolly/src/mount.tsx skills/scrolly/assets/sample-data/symbol-scrolly.json
git commit -m "feat(scrolly): dispatch config.type → symbol scrolly (choropleth back-compat)"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Task 1 is pure TDD (complete code above). Tasks 2-3 are render-verified — the acceptance is the produced `scrolly.html` eyeballed (symbol establish + a mid-scroll fly-to-city) AND the choropleth scrolly still rendering.
- Reuse: `Beat` + `mapStoryToChapters` + `symbolGeometry`/`symbolLabels` + the `ScrollyMap` camera pattern. Do NOT fork the orchestrator or re-implement the symbol layers — copy the layer config from `SymbolMap.tsx`.
- The scrolly map is non-interactive by design (`interactive:false`, no nav handlers) — the reader scrolls, the camera flies; do not add pan/zoom.
- NEVER print or log the MapTiler key; load it via `set -a && . ../../.env && set +a`.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages.
- After all tasks: `cd skills/map-native && bun test` green (the new `symbol-story` test), and both symbol + choropleth scrolly produce a working `scrolly.html`.
