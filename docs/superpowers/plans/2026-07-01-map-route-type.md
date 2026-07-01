# Route Map Type (SP3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a config-driven `route` map type (a LineString + the territories it crosses, auto-detected) in the static + interactive formats, with an AI-selected `mapStyle` (tile background) capability.

**Architecture:** `route-geo.ts` (framework-free `computeRoute` — turf auto-detects crossed territories, orders them along the route, colours + anchors them, computes bounds). `RouteMap.tsx` renders the resting map (route line + territory fills + labels) in `MapFrame`, mirroring `ChoroplethMap`/`SymbolMap` (bounded nav, resize re-fit, controls). `mount.tsx` dispatches `type === "route"` → `RouteMap`; produce's web pipeline is already type-agnostic. `mapStyle` (`dataviz-light`/`dataviz-dark`) resolves to a MapTiler style. The route-reveal VIDEO is SP3b (produce throws for it).

**Tech Stack:** Bun, TypeScript, bun:test, React, `@maptiler/sdk` (MapLibre), `@turf/turf`, Vite, Playwright.

## Global Constraints

- **Bun only** (`bun test`, `bun scripts/...`); web render via the Vite + Playwright snap pipeline.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO `Co-Authored-By: Claude`.
- **English** throughout.
- **Additive** — a NEW type; choropleth/symbol/route-video paths + the produce format selector are unchanged. Do NOT overwrite existing test files — APPEND.
- **`clampBounds` on every bounds→MapTiler call**; bounded interactive nav; static build has no controls.
- **`mapStyle` is AI-selected** (a parameter, not a hardcoded default) — verify BOTH a dark and a light sample render.
- **Grounded KB**, sourced by name (FT Visual Vocabulary, data-to-viz), no fabricated URLs.
- Baseline before this plan: **140 tests passing** — keep them green.

All paths relative to `skills/map-native/` unless stated otherwise.

---

### Task 1: `resolveMapStyle` + `route-geo.ts` `computeRoute`

**Files:**
- Create: `src/route-geo.ts`
- Test: `tests/route-geo.test.ts`

**Interfaces:**
- Produces: `computeRoute(config, boundaries)` → `RouteLayout`; `resolveMapStyle(token)`; `MAP_STYLES` (the option space); types `RouteConfig`, `RouteTerritory`, `RouteLayout`.

- [ ] **Step 1: Write the failing test**

Create `tests/route-geo.test.ts`. Use a synthetic 3-cell boundary set and a route crossing two of them:

```ts
import { describe, it, expect } from "bun:test";
import { computeRoute, resolveMapStyle, MAP_STYLES } from "../src/route-geo";

// three unit squares side by side along +lon: A [0,0]-[1,1], B [1,0]-[2,1], C [2,0]-[3,1]
const poly = (k: string, x0: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: k, name: k },
  geometry: { type: "Polygon", coordinates: [[[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1], [x0, 0]]] },
});
const boundaries: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [poly("AAA", 0), poly("BBB", 1), poly("CCC", 2)],
};
// route runs west→east across A then B (not C), at lat 0.5
const config = {
  type: "route" as const,
  route: [[0.2, 0.5], [1.5, 0.5]] as [number, number][],
  basemap: "world",
  mapStyle: "dataviz-dark",
  title: "A river crossing two lands",
};

describe("computeRoute", () => {
  const layout = computeRoute(config, boundaries);
  it("auto-detects only the territories the route crosses, ordered along the route", () => {
    expect(layout.territories.map((t) => t.key)).toEqual(["AAA", "BBB"]);
  });
  it("gives each territory a distinct colour and an anchor inside its polygon", () => {
    const [a, b] = layout.territories;
    expect(a.color).not.toBe(b.color);
    expect(a.anchor[0]).toBeGreaterThanOrEqual(0);
    expect(a.anchor[0]).toBeLessThanOrEqual(1); // anchor inside AAA's x-range
  });
  it("computes bounds covering the route, latitude-clamped to ±85", () => {
    const [w, s, e, n] = layout.bounds;
    expect(w).toBeLessThanOrEqual(0.2);
    expect(e).toBeGreaterThanOrEqual(1.5);
    expect(s).toBeGreaterThanOrEqual(-85);
    expect(n).toBeLessThanOrEqual(85);
  });
});

describe("resolveMapStyle", () => {
  it("maps known tokens and lists the option space", () => {
    expect(MAP_STYLES).toContain("dataviz-light");
    expect(MAP_STYLES).toContain("dataviz-dark");
    expect(resolveMapStyle("dataviz-dark")).toBeTruthy();
    expect(resolveMapStyle(undefined)).toBe(resolveMapStyle("dataviz-light")); // default
  });
});
```

- [ ] **Step 2: Run the test → FAIL** (`Cannot find module '../src/route-geo'`).

Run: `cd skills/map-native && bun test tests/route-geo.test.ts`

- [ ] **Step 3: Implement `src/route-geo.ts`**

Use `@turf/turf` (already a dependency). Key logic:
- `MAP_STYLES = ["dataviz-light", "dataviz-dark"] as const;` `resolveMapStyle(token)` maps `"dataviz-dark"` → the MapTiler dark style string/enum and `"dataviz-light"` (default) → light. To keep `route-geo.ts` framework-free (no `@maptiler/sdk` import — it must unit-test without a browser), `resolveMapStyle` returns a STABLE TOKEN/URL the component maps to a MapTiler style, OR a small union the component switches on. Return the token itself validated against `MAP_STYLES` (default `"dataviz-light"` for undefined/unknown) and let `RouteMap` map token→`MapStyle` (Task 3). So: `resolveMapStyle(token?: string): (typeof MAP_STYLES)[number]` — returns a member of `MAP_STYLES`, defaulting to `"dataviz-light"`.
- `computeRoute(config, boundaries)`:
  ```ts
  const line = turf.lineString(config.route);
  const origin = turf.point(config.route[0]);
  // detect crossed territories
  const crossed = boundaries.features.filter((f) => turf.booleanIntersects(line, f));
  // order by arc-length of FIRST entry into each territory. Robust to the route STARTING
  // inside a territory (then its stop is 0, not the exit crossing):
  const firstInsideAlong = (f: GeoJSON.Feature): number => {
    if (turf.booleanPointInPolygon(origin, f as any)) return 0;   // route origin already inside → stop 0
    const inter = turf.lineIntersect(line, f);                     // boundary crossings
    if (!inter.features.length) return Infinity;
    return Math.min(
      ...inter.features.map((pt) => turf.length(turf.lineSlice(origin, pt, line))),
    );
  };
  const withStop = crossed
    .map((f) => ({ f, along: firstInsideAlong(f) }))
    .sort((a, b) => a.along - b.along);
  // colour (qualitative CVD-safe palette, cycling) + anchor (pole of inaccessibility) + overrides
  const territories = withStop.map(({ f }, i) => {
    const key = String(f.properties?.iso_a3 ?? f.properties?.name ?? i);
    const override = config.territories?.find((t) => t.key === key);
    const anchor = turf.pointOnFeature(f).geometry.coordinates as [number, number];
    return {
      key,
      label: override?.label ?? String(f.properties?.name ?? key),
      color: override?.color ?? (config.palette ?? QUALITATIVE)[i % (config.palette ?? QUALITATIVE).length],
      order: override?.order ?? i,
      anchor,
    };
  }).sort((a, b) => a.order - b.order);
  // bounds = route ∪ territories bbox, clamped ±85, padded
  ```
  Define `QUALITATIVE` = a 6–8 colour CVD-safe qualitative palette (e.g. Okabe-Ito or a colorbrewer Set2). Latitude-clamp helper (±85). Export `RouteConfig`, `RouteTerritory` (`{key,label,color,order,anchor}`), `RouteLayout` (`{route, territories, bounds}`) types. NOTE: `turf.pointOnFeature` returns a point guaranteed ON the feature (a usable label anchor); it is turf's practical pole-of-inaccessibility.

- [ ] **Step 4: Run the test → PASS.**

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/route-geo.ts skills/map-native/tests/route-geo.test.ts
git commit -m "feat(map-native): route-geo computeRoute (auto-detect crossed territories) + resolveMapStyle"
```
(NO Claude-Session trailer.)

---

### Task 2: Route config validation + `mapStyle` guard

**Files:**
- Modify: `src/validate-config.ts`
- Test: `tests/validate-config.test.ts` (APPEND — do NOT overwrite; the file already has choropleth + symbol + cameraMode cases)

**Interfaces:**
- Consumes: `MAP_STYLES` from `src/route-geo.ts` (Task 1).
- Produces: `validateRouteConfig(spec) → { ok: true, spec: RouteConfigShape, warnings } | { ok: false, errors }`; `RouteConfigShape`.

- [ ] **Step 1: Write the failing tests (APPEND to `tests/validate-config.test.ts`)**

Add a `describe("validateRouteConfig", …)` block. `import { validateRouteConfig } from "../src/validate-config";` (add to imports at the top). Cases:

```ts
const okRoute = {
  type: "route",
  route: [[89.6, 27.7], [90.2, 24.0], [90.4, 23.7]],
  basemap: "world",
  mapStyle: "dataviz-dark",
  title: "The river that crosses three lands",
  description: "Its course, 2024",
  source: { name: "Source 2025", url: "https://example.org/x" },
};

describe("validateRouteConfig", () => {
  it("accepts a well-formed route config", () => {
    expect(validateRouteConfig(okRoute).ok).toBe(true);
  });
  it("rejects a route with fewer than 2 points or an out-of-range coord", () => {
    expect(validateRouteConfig({ ...okRoute, route: [[1, 1]] }).ok).toBe(false);
    expect(validateRouteConfig({ ...okRoute, route: [[200, 1], [2, 2]] }).ok).toBe(false);
  });
  it("rejects an empty basemap (boundary preset)", () => {
    expect(validateRouteConfig({ ...okRoute, basemap: "" }).ok).toBe(false);
  });
  it("accepts a known mapStyle and rejects an unknown one", () => {
    expect(validateRouteConfig({ ...okRoute, mapStyle: "dataviz-light" }).ok).toBe(true);
    const bad = validateRouteConfig({ ...okRoute, mapStyle: "midnight" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => /mapStyle/.test(e))).toBe(true);
  });
  it("rejects a title that is not an insight", () => {
    expect(validateRouteConfig({ ...okRoute, title: "Map" }).ok).toBe(false);
  });
});
```

Run `cd skills/map-native && bun test tests/validate-config.test.ts` → FAIL (`validateRouteConfig` not exported).

- [ ] **Step 2: Implement `validateRouteConfig`**

In `src/validate-config.ts`: add `import { MAP_STYLES } from "./route-geo";` and a `RouteConfigShape` type. `validateRouteConfig(spec)` mirrors `validateSymbolConfig`'s structure: require `basemap` non-empty (boundary preset); validate `route` is an array of ≥ 2 `[lon,lat]` pairs each a number pair with `lon ∈ [-180,180]`, `lat ∈ [-90,90]`; if `mapStyle` present, it must be in `MAP_STYLES` (else push `mapStyle must be one of: ${MAP_STYLES.join(", ")}`); reuse the shared title-insight check (too-short / year-range) and the furniture warnings (description / source). Return `{ ok, spec/errors, warnings }`.

Run the tests → PASS.

- [ ] **Step 3: Run the full suite**

Run: `cd skills/map-native && bun test` → 140 + your new cases green.

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/tests/validate-config.test.ts
git commit -m "feat(map-native): validateRouteConfig + mapStyle option-space guard"
```
(NO Claude-Session trailer.)

---

### Task 3: `RouteMap.tsx` (static + interactive) + mount dispatch + produce + sample config

**Files:**
- Create: `src/RouteMap.tsx`
- Create: `assets/sample-data/route.json`
- Modify: `src/mount.tsx`, `scripts/produce.mjs`

**Interfaces:**
- Consumes: `computeRoute`, `resolveMapStyle` (Task 1).
- Produces: `RouteMap` React component + `RouteConfig` export used by `mount.tsx`.

- [ ] **Step 1: Create the sample route config**

Create `assets/sample-data/route.json` reusing a real route that crosses several world countries — the Yarlung/Brahmaputra coords already in the repo at `assets/geo/yarlung-flow.json` are ideal (they cross China / India / Bangladesh in `world.geojson`). Read that file and inline its coordinates as the `route`:

```json
{
  "type": "route",
  "route": [ /* the [lon,lat] pairs from assets/geo/yarlung-flow.json */ ],
  "basemap": "world",
  "mapStyle": "dataviz-dark",
  "title": "The Yarlung Tsangpo's long road to the sea",
  "description": "The river's course from Tibet to the Bay of Bengal",
  "source": { "name": "Natural Earth", "url": "https://www.naturalearthdata.com" }
}
```

- [ ] **Step 2: Implement `src/RouteMap.tsx`**

Mirror `src/ChoroplethMap.tsx` (READ it first — copy its structure: the `fitToData()` + `clampBounds` + bounded-nav (`maxBounds`/`minZoom`) + `ResizeObserver` re-fit + measured-title-height + `MapFrame` + `window.__map__` + `NavigationControl`/`makeResetControl`/static-no-controls-via-`interactive`-flag pattern). The route-specific deltas:
- `export interface RouteConfig extends RouteConfigShape { … }` (or import the type); the component takes `{ config, interactive }`.
- Basemap style: `const styleToken = resolveMapStyle(config.mapStyle);` then map the token to a MapTiler style: `styleToken === "dataviz-dark" ? maptilersdk.MapStyle.DATAVIZ.DARK : maptilersdk.MapStyle.DATAVIZ.LIGHT`. (This token→MapStyle map lives in `RouteMap`, keeping `route-geo` framework-free.)
- Compute `const world = JSON.parse(worldGeoJsonRaw)` (import `worldGeoJsonRaw from "../assets/geo/world.geojson?raw"` as ChoroplethMap does) and `const layout = computeRoute(config, world);`.
- On `load`: strip basemap symbol layers + inner admin borders (`/other border/i`) for a clean base (as `RiverReveal` does). Add a `route-territories` GeoJSON source (the crossed territory polygons, tagged with their colour) + a `route-fill` fill layer (per-feature `fill-color` from the territory colour, moderate `fill-opacity` ~0.55) + a `route-line` line layer for the route LineString (a clean 3px stroke, e.g. `#E8F7FF` on dark / a dark stroke on light) + a `route-labels` symbol layer (or projected overlay) placing each territory `label` at its `anchor`.
- `dataBounds = clampBounds(layout.bounds)`; `fitToData()`; bounded nav (`setMaxBounds` + `setMinZoom` after fit); `ResizeObserver` re-fit; `window.__map__`. Interactive-only controls; hover tooltip showing the territory name.
- Wrap in `MapFrame` (title/description/source, `responsive`); `resolveMapFrame().pad` for `fitBounds`.

- [ ] **Step 3: Dispatch `route` in `mount.tsx`**

In `src/mount.tsx`: it currently does `const isSymbol = config.type === "symbol"` and renders `SymbolMap`/`ChoroplethMap`. Add a `route` branch: `import { RouteMap, type RouteConfig } from "./RouteMap"`, extend the `__CONFIG__` union type to include `RouteConfig`, and render `RouteMap` when `config.type === "route"` (keep symbol/choropleth as the fallback). Pass `interactive` the same way the others do.

- [ ] **Step 4: Produce — route static/interactive works; route video throws (SP3b)**

`scripts/produce.mjs`: the web build + snaps (static/interactive) are type-agnostic (mount dispatches), so a route config already produces static + interactive once mount handles it — confirm no produce change is needed for the web path. For the VIDEO kinds, make the dispatch type-aware: when `parsedConfig.type === "route"`, any video kind (`reveal`/`story`/`all`'s video portion) must `throw new Error("route video (route-reveal) ships in SP3b — not implemented yet")` rather than trying to pick a `SymbolStory`/`ChoroplethStory` comp. (Add a guard at the top of the video-render block: if route type and a video kind was requested, throw; `static` still works.)

- [ ] **Step 5: Verify at render (static + interactive, dark AND light)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/route.json /tmp/route/dark static
python3 -c "import json;c=json.load(open('assets/sample-data/route.json'));c['mapStyle']='dataviz-light';open('/tmp/route-light.json','w').write(json.dumps(c))"
bun scripts/produce.mjs /tmp/route-light.json /tmp/route/light static
```

READ `/tmp/route/dark/static.png` + `/tmp/route/dark/interactive.png` (route line + coloured territories + labels + title/source furniture on a DARK basemap; interactive has controls + bounded nav) AND `/tmp/route/light/static.png` (the SAME map on a LIGHT basemap — proves `mapStyle` is honoured both ways). `bun test` → green.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/RouteMap.tsx skills/map-native/assets/sample-data/route.json skills/map-native/src/mount.tsx skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): RouteMap static + interactive + mount/produce route dispatch (mapStyle honoured)"
```
(NO Claude-Session trailer.)

---

### Task 4: `checkRouteConformance`

**Files:**
- Modify: `src/conformance.ts`
- Test: `tests/conformance.test.ts` (APPEND)

**Interfaces:**
- Consumes: `MAP_STYLES` (Task 1); the `relativeLuminance`/contrast helper already in `conformance.ts`.

- [ ] **Step 1: Write the failing test (APPEND to `tests/conformance.test.ts`)**

Add a `describe("checkRouteConformance", …)` block (import `checkRouteConformance`). It takes a small input shape (route length, the territory colours, `mapStyle`, title/source presence) — mirror the existing `checkRevealConformance` input style:

```ts
describe("checkRouteConformance", () => {
  const ok = {
    routePoints: 12,
    territoryColors: ["#1b9e77", "#d95f02", "#7570b3"],
    mapStyle: "dataviz-dark",
    title: "The river that crosses three lands",
    source: { name: "Natural Earth", url: "https://naturalearthdata.com" },
  };
  it("passes a well-formed route", () => {
    expect(checkRouteConformance(ok).violations).toEqual([]);
  });
  it("flags a degenerate route (< 2 points)", () => {
    expect(checkRouteConformance({ ...ok, routePoints: 1 }).violations.some((m) => /route/i.test(m))).toBe(true);
  });
  it("flags no territories", () => {
    expect(checkRouteConformance({ ...ok, territoryColors: [] }).violations.some((m) => /territ/i.test(m))).toBe(true);
  });
  it("flags duplicate territory colours", () => {
    expect(checkRouteConformance({ ...ok, territoryColors: ["#111111", "#111111"] }).violations.some((m) => /colour|distinct/i.test(m))).toBe(true);
  });
  it("flags an unknown mapStyle", () => {
    expect(checkRouteConformance({ ...ok, mapStyle: "midnight" }).violations.some((m) => /mapStyle/i.test(m))).toBe(true);
  });
  it("flags a missing source", () => {
    expect(checkRouteConformance({ ...ok, source: { name: "" } }).violations.some((m) => /source/i.test(m))).toBe(true);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implement `checkRouteConformance`** in `src/conformance.ts`:

```ts
import { MAP_STYLES } from "./route-geo";

export function checkRouteConformance(input: {
  routePoints: number;
  territoryColors: string[];
  mapStyle?: string;
  title?: string;
  source?: { name?: string; url?: string };
}): { violations: string[] } {
  const v: string[] = [];
  if (input.routePoints < 2) v.push("route must have at least 2 points");
  if (input.territoryColors.length < 1) v.push("route crosses no territories");
  if (new Set(input.territoryColors).size !== input.territoryColors.length)
    v.push("territory colours must be distinct");
  if (input.mapStyle && !(MAP_STYLES as readonly string[]).includes(input.mapStyle))
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  if (!input.source?.name?.trim()) v.push("route must cite a source");
  return { violations: v };
}
```

Run → PASS. Then `bun test` → all green.

- [ ] **Step 3: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "feat(map-native): checkRouteConformance (route/territories/colours/mapStyle/source)"
```
(NO Claude-Session trailer.)

---

### Task 5: KB `types/route.md` + final render verification

**Files:**
- Create: `knowledge/references/map/types/route.md`

- [ ] **Step 1: Write the per-type KB doc**

Create `knowledge/references/map/types/route.md` (<160 lines), matching the house style of `types/choropleth.md` / `types/proportional-symbol.md`. Cover, each line grounded and sourced BY NAME (no fabricated URLs):
- What a route map is: a LINEAR feature (a route / river / journey / border / supply chain) plus the territories it passes through, auto-detected from a boundary preset.
- WHEN to use it vs choropleth (regional magnitude) vs proportional-symbol (point magnitude): a route map is for a *linear geographic story* — following something across space. (Sources: FT Visual Vocabulary — "flow / connection"; data-to-viz — connection maps.)
- The territories: auto-detected (turf line∩polygon), ordered along the route, a qualitative CVD-safe palette, labels at the pole-of-inaccessibility anchor.
- **AI-selected `mapStyle`:** the basemap tile style is chosen per the article (a dark base for a dramatic explainer, a light base for a clean locator) — a capability, not a fixed default. List the option space (`dataviz-light`, `dataviz-dark`).
- Furniture + bounded interactive nav (same discipline as the other types).
- A one-line pointer to the route-reveal video (SP3b) + `camera-modes.md`.

- [ ] **Step 2: Verify grounding + final render**

Re-read the doc: every best-practice line names a real source; no fabricated URLs. Then the FINAL render verification (both basemaps):
```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/route.json /tmp/route/final-dark static
```
READ `/tmp/route/final-dark/static.png` + `interactive.png` once more: route line + coloured, labelled territories + furniture on the dark base; interactive controls + bounded nav. Confirm `bun test` is green and the route video kind still throws the SP3b message (`bun scripts/produce.mjs assets/sample-data/route.json /tmp/route/x story` exits non-zero with "ships in SP3b").

- [ ] **Step 3: Commit**

```bash
git add knowledge/references/map/types/route.md
git commit -m "docs(map-native): KB — route map type (linear feature + crossed territories, AI-selected mapStyle)"
```
(NO Claude-Session trailer.)

## Notes for the executor

- `route-geo.ts` stays framework-free (turf only, NO `@maptiler/sdk`/React) so it unit-tests headless; the token→`MapStyle` mapping lives in `RouteMap.tsx`.
- Task 3 is the crux — READ `ChoroplethMap.tsx` fully and mirror its `fitToData`/bounded-nav/resize/MapFrame/controls skeleton; the route deltas are the fill+line+label layers, the `mapStyle` resolution, and `computeRoute` instead of `computeChoropleth`.
- Keep `clampBounds` on every bounds→MapTiler call.
- Do NOT overwrite existing test files (`validate-config.test.ts`, `conformance.test.ts`) — APPEND new `describe` blocks (a prior task in this project clobbered a test file by overwriting — don't repeat it).
- NEVER print or log the MapTiler key.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages or files.
- After all tasks: `bun test` green; the route type produces static + interactive on both a dark and a light `mapStyle`; the route video kind throws the SP3b stub; `route-geo`/validation/conformance are unit-tested.
