# Map Contour / Isoline — Slice A (type core + static + interactive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the contour/isoline type's core + static + interactive: a pure `contour-geo.ts` producing
filled bands and iso-lines from a sampled point field (via turf interpolate → isobands/isolines), and
`ContourMap.tsx` rendering them on the basemap with hover + legend + mapStyle. (Slice B — video + interactive
scrolly — is a separate plan.)

**Architecture:** `contour-geo.ts` interpolates the sampled `(lon,lat,value)` points to a regular grid
(`turf.interpolate`, IDW, deterministic), computes equal-interval breaks + colours (reusing the choropleth
scale), then emits filled bands (`turf.isobands`) and/or iso-lines (`turf.isolines`) per the `render` mode.
`ContourMap.tsx` renders a `contour-bands` fill layer + a `contour-lines` line layer on the basemap.

**Tech Stack:** Bun, TypeScript, turf 7.2 (`interpolate`/`isobands`/`isolines`/`bbox`), MapTiler SDK,
React, `bun:test`.

**Prereq:** the map-native engine (choropleth `BLUES`/`DIVERGING` scale; `HexGridMap`/`CartogramMap` as the
layer-on-basemap references; `resolveMapStyle`). Contour design spec approved.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests `bun test`.
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log it; render commands
  `set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a`.
- **Determinism:** the geometry is a pure function of the config — turf `interpolate`/`isobands`/`isolines`
  are deterministic; no `Date.now`/`Math.random`/argless `new Date()`.
- **Basemap always kept** (situated field) — do NOT apply any neutral background (that is cartogram-grid).
- Reuse the choropleth `BLUES`/`DIVERGING` scale, the `HexGridMap`/`CartogramMap` layer/hover/legend pattern,
  `resolveMapStyle`/`MAP_STYLES`. Colour bands by break INDEX (deterministic), not by parsing turf's band
  label string.
- After writing any `.tsx`, verify NUL-free: `python3 -c "print(open('<file>','rb').read().count(b'\\x00'))"` prints 0.

---

## File structure

**Create:** `src/contour-geo.ts`, `src/ContourMap.tsx`, `assets/sample-data/contour-bands.json`,
`assets/sample-data/contour-both.json`, `knowledge/references/map/types/contour.md`,
`tests/contour-geo.test.ts`.
**Modify:** `src/validate-config.ts` (`validateContourConfig`), `src/conformance.ts`
(`checkContourConformance`), `src/mount.tsx`, `scripts/produce.mjs`, `scripts/audit-cases.mjs`, `SKILL.md`.

**Reference (read, do not modify):** `src/hex-grid-geo.ts` (bbox/cellSide auto-derive + BLUES bin reuse),
`src/CartogramMap.tsx` / `src/HexGridMap.tsx` (cell layer id, hover, legend, mapStyle, fitBounds),
`src/theme/scale.ts` (`BLUES`, `DIVERGING`), the hex-grid entries in `validate-config.ts` + `conformance.ts`.

---

## Task 1: `contour-geo.ts` (interpolate → bands + lines, pure core)

**Files:** Create `skills/map-native/src/contour-geo.ts`, `skills/map-native/tests/contour-geo.test.ts`.

**Interfaces:**
- Consumes: turf `interpolate`/`isobands`/`isolines`/`bbox`/`point`/`featureCollection`; `BLUES`/`DIVERGING`
  (`./theme/scale`).
- Produces:
  - `interface ContourBand { feature: GeoJSON.Feature; color: string; binIdx: number; min: number; max: number }`
  - `interface ContourLine { feature: GeoJSON.Feature; value: number; color: string }`
  - `interface ContourLayout { bands: ContourBand[]; lines: ContourLine[]; breaks: number[]; render: "bands" | "lines" | "both"; bounds: [number,number,number,number]; valueLabel: string; scaleType: "sequential" | "diverging" }`
  - `interface ContourData { render?: "bands" | "lines" | "both"; points: { lon: number; lat: number; value: number }[]; cellSizeKm?: number; breaks?: number[]; bins?: number; scaleType?: "sequential" | "diverging"; valueLabel?: string }`
  - `function computeContour(data: ContourData): ContourLayout`

- [ ] **Step 1: Write the failing test** — `tests/contour-geo.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { computeContour } from "../src/contour-geo";

// A smooth-ish field: value rises toward the NE corner.
const pts = [
  { lon: 0, lat: 0, value: 5 }, { lon: 1, lat: 0, value: 10 },
  { lon: 0, lat: 1, value: 8 }, { lon: 1, lat: 1, value: 20 },
  { lon: 0.5, lat: 0.5, value: 14 }, { lon: 0.5, lat: 1, value: 16 },
  { lon: 1, lat: 0.5, value: 18 }, { lon: 0, lat: 0.5, value: 6 },
];

describe("computeContour", () => {
  const layout = computeContour({ points: pts, render: "both", bins: 5, valueLabel: "temp" });
  it("emits bands + lines for render=both, coloured, break-indexed", () => {
    expect(layout.render).toBe("both");
    expect(layout.bands.length).toBeGreaterThanOrEqual(1);
    expect(layout.lines.length).toBeGreaterThanOrEqual(1);
    expect(layout.bands.every((b) => typeof b.color === "string" && b.color.startsWith("#"))).toBe(true);
    expect(layout.bands.map((b) => b.binIdx)).toEqual(layout.bands.map((_, i) => i));
  });
  it("has monotonic breaks spanning the data range", () => {
    for (let i = 1; i < layout.breaks.length; i++) expect(layout.breaks[i]).toBeGreaterThan(layout.breaks[i - 1]);
    expect(layout.breaks[0]).toBeLessThanOrEqual(5);
    expect(layout.breaks[layout.breaks.length - 1]).toBeGreaterThanOrEqual(20);
  });
  it("is deterministic (same input → identical bands + lines)", () => {
    const again = computeContour({ points: pts, render: "both", bins: 5, valueLabel: "temp" });
    expect(JSON.stringify(again.bands)).toBe(JSON.stringify(layout.bands));
    expect(JSON.stringify(again.lines)).toBe(JSON.stringify(layout.lines));
  });
  it("gates render mode: bands-only has no lines, lines-only has no bands", () => {
    expect(computeContour({ points: pts, render: "bands", valueLabel: "t" }).lines.length).toBe(0);
    expect(computeContour({ points: pts, render: "lines", valueLabel: "t" }).bands.length).toBe(0);
  });
  it("honours explicit breaks", () => {
    const l = computeContour({ points: pts, render: "bands", breaks: [0, 10, 20, 30], valueLabel: "t" });
    expect(l.breaks).toEqual([0, 10, 20, 30]);
  });
  it("does not throw on an all-equal field", () => {
    const flat = [{ lon: 0, lat: 0, value: 7 }, { lon: 1, lat: 0, value: 7 }, { lon: 0, lat: 1, value: 7 }, { lon: 1, lat: 1, value: 7 }];
    expect(() => computeContour({ points: flat, render: "both", valueLabel: "t" })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `cd skills/map-native && bun test tests/contour-geo.test.ts` → FAIL (not exported).

- [ ] **Step 3: Write the implementation** — `skills/map-native/src/contour-geo.ts`:

```typescript
// Contour / isoline core. Interpolate a sampled (lon,lat,value) field to a regular grid (turf.interpolate,
// IDW, deterministic), compute equal-interval breaks + colours (choropleth scale), then emit filled bands
// (turf.isobands) and/or iso-lines (turf.isolines) per render mode. Bands are coloured by break INDEX
// (deterministic) — never by parsing turf's band-label string. Pure + frame-safe: no randomness.
import { bbox, interpolate, isobands, isolines, point, featureCollection } from "@turf/turf";
import { BLUES, DIVERGING } from "./theme/scale";

export interface ContourBand { feature: GeoJSON.Feature; color: string; binIdx: number; min: number; max: number }
export interface ContourLine { feature: GeoJSON.Feature; value: number; color: string }
export interface ContourLayout {
  bands: ContourBand[]; lines: ContourLine[]; breaks: number[];
  render: "bands" | "lines" | "both";
  bounds: [number, number, number, number];
  valueLabel: string; scaleType: "sequential" | "diverging";
}
export interface ContourData {
  render?: "bands" | "lines" | "both";
  points: { lon: number; lat: number; value: number }[];
  cellSizeKm?: number; breaks?: number[]; bins?: number;
  scaleType?: "sequential" | "diverging"; valueLabel?: string;
}

const MERCATOR_MAX_LAT = 85;
const TARGET_GRID = 40;      // ~40 cells across the longer bbox side (readable, bounded)
const MIN_EXT = 0.5;         // degenerate-bbox guard (degrees)

function autoBreaks(min: number, max: number, bins: number): number[] {
  // bins bands ⇒ bins+1 breaks, spanning [min,max] inclusive (isobands needs breaks bracketing the data).
  if (max - min < 1e-9) return [min - 1, max + 1]; // all-equal ⇒ one band
  const step = (max - min) / bins;
  const out: number[] = [];
  for (let i = 0; i <= bins; i++) out.push(min + step * i);
  out[out.length - 1] = max; // exact max
  return out;
}

export function computeContour(data: ContourData): ContourLayout {
  const render = data.render ?? "bands";
  const scaleType = data.scaleType ?? "sequential";
  const ramp = scaleType === "diverging" ? DIVERGING : BLUES;

  const pts = data.points;
  if (!pts || pts.length < 3) throw new Error("contour: need at least 3 points to interpolate a field");

  const values = pts.map((p) => p.value);
  const vMin = Math.min(...values), vMax = Math.max(...values);

  // bbox of the sample points, Mercator-clamped + padded + degenerate-guarded.
  let [w, s, e, n] = bbox(featureCollection(pts.map((p) => point([p.lon, p.lat], { value: p.value }))));
  s = Math.max(-MERCATOR_MAX_LAT, s); n = Math.min(MERCATOR_MAX_LAT, n);
  if (e - w < MIN_EXT) { const c = (e + w) / 2; w = c - MIN_EXT / 2; e = c + MIN_EXT / 2; }
  if (n - s < MIN_EXT) { const c = (n + s) / 2; s = c - MIN_EXT / 2; n = c + MIN_EXT / 2; }
  const padX = (e - w) * 0.05, padY = (n - s) * 0.05;
  w -= padX; e += padX; s -= padY; n += padY;

  // cellSide (km) for ~TARGET_GRID cells across the longer side; honour cellSizeKm if given.
  const spanKm = Math.max((e - w), (n - s)) * 111; // rough deg→km
  const cellSide = data.cellSizeKm ?? Math.max(spanKm / TARGET_GRID, 1);

  const samplesFC = featureCollection(pts.map((p) => point([p.lon, p.lat], { value: p.value })));
  const grid = interpolate(samplesFC, cellSide, { gridType: "point", property: "value", units: "kilometers" });

  const breaks = data.breaks ?? autoBreaks(vMin, vMax, Math.max(2, data.bins ?? 6));

  const colorForIdx = (i: number, count: number) =>
    ramp[count <= 1 ? 0 : Math.round((i / (count - 1)) * (ramp.length - 1))];

  const bands: ContourBand[] = [];
  if (render === "bands" || render === "both") {
    const bandFC = isobands(grid as never, breaks, { zProperty: "value" });
    const nBands = breaks.length - 1;
    bandFC.features.forEach((f, i) => {
      // Bands come back in break order; colour by index (NOT by the band-label string).
      const idx = Math.min(i, nBands - 1);
      bands.push({ feature: f as GeoJSON.Feature, color: colorForIdx(idx, nBands), binIdx: idx, min: breaks[idx], max: breaks[idx + 1] });
    });
  }

  const lines: ContourLine[] = [];
  if (render === "lines" || render === "both") {
    const lineFC = isolines(grid as never, breaks, { zProperty: "value" });
    lineFC.features.forEach((f) => {
      const v = Number((f.properties as Record<string, unknown>)?.["value"] ?? 0);
      const idx = breaks.indexOf(v);
      lines.push({ feature: f as GeoJSON.Feature, value: v, color: colorForIdx(idx < 0 ? 0 : Math.min(idx, breaks.length - 2), Math.max(breaks.length - 1, 1)) });
    });
  }

  return {
    bands, lines, breaks, render,
    bounds: [w, s, e, n],
    valueLabel: data.valueLabel ?? "value",
    scaleType,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass** — `cd skills/map-native && bun test tests/contour-geo.test.ts`. If `isobands` throws on breaks not bracketing the grid's interpolated range (interpolation can overshoot slightly beyond vMin/vMax), widen the outer breaks by a tiny epsilon in `autoBreaks` (`min - ε`, `max + ε`) and adjust the test's range expectation accordingly. If an all-equal field makes `isolines` return an odd feature, guard the flat case (breaks `[min-1, max+1]` ⇒ one band, no interior line).

- [ ] **Step 5: Full suite** — `cd skills/map-native && bun test` (baseline 278 + new contour tests).

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/contour-geo.ts skills/map-native/tests/contour-geo.test.ts
git commit -m "feat(map-native): contour core — interpolate field → isobands + isolines, choropleth-scale breaks"
```

---

## Task 2: `validateContourConfig` + `checkContourConformance`

**Files:** Modify `skills/map-native/src/validate-config.ts`, `skills/map-native/src/conformance.ts`; add
cases to the existing validation/conformance test files (next to the hex-grid/cartogram cases).

**Interfaces:**
- Consumes: `computeContour`/`ContourLayout` (Task 1), the global L0 `checkGlobalMapConformance`.
- Produces: `validateContourConfig(config)` and `checkContourConformance(config)` — mirror the SHAPE of the
  hex-grid siblings EXACTLY (read `validateHexGridConfig` + `checkHexGridConformance` first; match their
  return types verbatim — do not invent a different shape).

Deltas: **validate** — `type === "contour"`; non-empty `points` (each `{lon,lat,value:number}`, ≥3);
`render` ∈ {bands,lines,both} if present; `scaleType` ∈ {sequential,diverging} if present; `bins` 3–7 if
present; explicit `breaks` (if present) monotonic increasing; a title. **conformance** — compute the
layout, assert `hasBreakLegend` (breaks.length ≥ 2), `hasValueLabel` (`valueLabel` non-empty),
`boundsNonEmpty`, `hasGeometry` (bands.length ≥ 1 for bands/both, lines.length ≥ 1 for lines/both), valid
`mapStyle` (∈ `MAP_STYLES`), and the global L0.

- [ ] **Step 1: Write failing tests** (validate rejects: <3 points, bad render, bad scaleType, bins out of
  range, non-monotonic breaks, missing title; conformance passes a good bands config + a good both config,
  fails on missing value label / bad mapStyle). Mirror the hex-grid/cartogram test block.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** both append-only in the dispatch (don't touch other types).
- [ ] **Step 4: Run to verify pass + full suite** `cd skills/map-native && bun test`.
- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/src/conformance.ts skills/map-native/tests/
git commit -m "feat(map-native): contour config validation + conformance guard"
```

---

## Task 3: `ContourMap.tsx` (static + interactive) + wiring + samples + render-verify

**Files:** Create `skills/map-native/src/ContourMap.tsx`, `assets/sample-data/contour-bands.json`,
`assets/sample-data/contour-both.json`; Modify `src/mount.tsx`, `scripts/produce.mjs`.

- [ ] **Step 1: Write `ContourMap.tsx`** — port `skills/map-native/src/HexGridMap.tsx` (read fully). Deltas:
  1. `computeContour(config)` ONCE.
  2. If `render` includes bands: a `fill` layer id **`contour-bands`** from a FeatureCollection of the band
     polygons tagged `{ __color, __min, __max }`, `fill-color: ["get","__color"]`, `fill-opacity` 0.7
     (× reveal progress if animated; static = full). If includes lines: a `line` layer id
     **`contour-lines`** from the line features tagged `{ __value, __color }`, `line-color`
     (mapStyle-adaptive or `["get","__color"]`), `line-width` ~1.2. Bands under lines.
  3. Sequential/diverging break legend + `valueLabel` (reuse HexGridMap's legend; label the break ranges).
     Hover → the value band / iso-value (`__min`–`__max` or `__value`).
  4. mapStyle-adaptive via `resolveMapStyle`; **keep the basemap** (no neutral bg); `fitBounds(layout.bounds)`.
     Verify NUL-free.
- [ ] **Step 2: Author two samples** — `contour-bands.json` (a real sampled field, e.g. temperature or air
  quality over a country/region, `render:"bands"`, sequential, full furniture: title ≥12 & not a year range,
  description, source{name,url}, mapStyle) and `contour-both.json` (`render:"both"`, a different field, maybe
  diverging, dark mapStyle). Points are illustrative but plausible + sourced; ≥ ~12 points for a legible field.
- [ ] **Step 3: Wire `mount.tsx` + `produce.mjs`** — add the contour type to mount (render `ContourMap`) and
  to produce's static/interactive path, mirroring hex-grid/cartogram's arms (video kinds EMPTY in Slice A:
  `isContour ? []`). Snap ready-gate: add `contour-bands` (and `contour-lines`) to the layer-ready OR-gate
  ADDITIVELY; keep hover branches type-gated.
- [ ] **Step 4: Typecheck + full suite** — `cd skills/map-native && bunx tsc --noEmit && bun test`
  (clean apart from pre-existing react-dom TS2688; all pass).
- [ ] **Step 5: Render-verify static + interactive, both samples, light + dark** — COMMIT first, then:

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a
bun scripts/produce.mjs assets/sample-data/contour-bands.json /tmp/contour/bands static
bun scripts/produce.mjs assets/sample-data/contour-both.json /tmp/contour/both static
```
Inspect the PNG/interactive stills: bands = smooth filled contour bands coloured by the scale over the
basemap, legend + value label, mapStyle correct; both = filled bands WITH iso-lines drawn over them, hover
shows the value band. If a render exceeds ~8 min, STOP → DONE_WITH_CONCERNS.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/ContourMap.tsx skills/map-native/assets/sample-data/contour-bands.json skills/map-native/assets/sample-data/contour-both.json skills/map-native/src/mount.tsx skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): ContourMap static+interactive (isobands + isolines, break legend, hover) + wiring"
```

---

## Task 4: KB type doc + roadmap + audit case

**Files:** Create `knowledge/references/map/types/contour.md`; Modify `skills/map-native/SKILL.md`,
`skills/map-native/scripts/audit-cases.mjs`.

- [ ] **Step 1: Write `knowledge/references/map/types/contour.md`** — mirror `types/hex-grid.md`'s
  structure. Cover: what a contour/isoline map is + the three render modes (bands / lines / both); when to
  use vs hex-grid (bins a discrete point cloud) and choropleth (fixed regions) — contour is a CONTINUOUS
  field interpolated from samples; FT visual-vocabulary framing; encoding (sequential/diverging break
  scale, value label, break count 3–7); the interpolation note (turf IDW, deterministic, auto grid); the
  basemap-always-kept rule (situated field, never a neutral background); hover; anti-patterns (don't
  contour a handful of unrelated points; don't use for discrete regions; explicit breaks must bracket the
  data); credit conventions; a **Slice A scope note** (static + interactive shipped; video + interactive
  scrolly = Slice B, with a real `ScrollyContourMap` needed — do not claim them yet). Implementation
  pointer: `contour-geo.ts` + `ContourMap.tsx` + `checkContourConformance`.
- [ ] **Step 2: Update `SKILL.md` roadmap** — the Contour / isoline row (line ~296): set S ✓ I ✓, V ◻;
  update the note. Match the table format of the other rows; do not restructure.
- [ ] **Step 3: Add an audit case** — wire contour (bands + both) into `scripts/audit-cases.mjs` +
  `audit.mjs` additively (like cartogram); run the audit and confirm the contour cases are clean.
- [ ] **Step 4: Final full suite** — `cd skills/map-native && bun test` (all pass).
- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/contour.md skills/map-native/SKILL.md skills/map-native/scripts/audit-cases.mjs skills/map-native/scripts/audit.mjs
git commit -m "docs(map-native): contour KB type doc + roadmap (S✓ I✓ V◻) + audit case"
```

---

## Self-Review

**Spec coverage (Slice A):** `computeContour` (interpolate → isobands + isolines, break-indexed colours,
render-mode gating) → Task 1; validation + conformance → Task 2; `ContourMap` static+interactive + samples
+ wiring + render-verify → Task 3; KB + roadmap + audit → Task 4. Slice B (video + interactive scrolly incl.
`ScrollyContourMap` + smoke gate) is a separate plan. Basemap-always-kept restated (no neutral bg).

**Placeholder scan:** Task 1 carries complete code + tests (the novel turf pipeline, including the isobands
break-bracketing + all-equal guards). Tasks 2-4 port named in-repo siblings (hex-grid/cartogram
validate/conformance/Map/KB/audit) with enumerated deltas + exact render commands. No "TBD".

**Type consistency:** `computeContour`/`ContourData`/`ContourLayout`/`ContourBand`/`ContourLine` names
match across tasks; layer ids `contour-bands` + `contour-lines` match between `ContourMap` (Task 3), the
produce snap ready-gate (Task 3), and (later) Slice B's smoke gate. Bands coloured by break index; breaks
monotonic. `BLUES`/`DIVERGING` reuse confirmed against `theme/scale.ts`.
