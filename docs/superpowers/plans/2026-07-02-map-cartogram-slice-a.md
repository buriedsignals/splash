# Map Cartogram — Slice A (type core + static + interactive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the cartogram map type's core + static + interactive formats: a pure `cartogram-geo.ts`
producing both variants (`scaled` non-contiguous + `grid` auto-layout tile-grid), and `CartogramMap.tsx`
rendering them on the basemap with hover + legend + mapStyle. (Slice B — video + interactive scrolly — is
a separate plan.)

**Architecture:** `cartogram-geo.ts` joins values to the geography by key, bins+colours via the reused
choropleth core, then either scales each real polygon around its centroid so area∝value (`scaled`) or
places one uniform square per region via a deterministic nearest-free-cell auto-layout (`grid`).
`CartogramMap.tsx` ports `HexGridMap.tsx` (uniform cells on the basemap, fill-by-bin, hover, legend).

**Tech Stack:** Bun, TypeScript, turf 7.2, MapTiler SDK, React, `bun:test`.

**Prereq:** the map-native engine (choropleth `computeChoropleth` + `BLUES`/`DIVERGING` scale; `HexGridMap`
as the cell-on-basemap reference; `resolveMapStyle`). Cartogram design spec approved.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`.
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `splash/.env` (gitignored) — never commit/log it; render commands
  `set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a`.
- **Determinism:** the geometry is a pure function of the config — no `Date.now`/`Math.random`/argless
  `new Date()`; the grid auto-layout assignment is stable (explicit sort + deterministic tie-break).
- **Uniform-cell invariant (`grid`):** cell colour encodes magnitude, never cell size; no size legend.
  `scaled` encodes magnitude by area (√ scale factor), never by colour intensity alone.
- Reuse `computeChoropleth` (join + bins + `BLUES`/`DIVERGING`), `HexGridMap`'s cell-layer/hover/legend
  pattern, `resolveMapStyle`/`MAP_STYLES`. Use turf `centroid`/`transformScale`/`bbox`/`area`.
- After writing any `.tsx`, verify NUL-free: `python3 -c "print(open('<file>','rb').read().count(b'\\x00'))"` prints 0.

---

## File structure

**Create:** `src/cartogram-geo.ts`, `src/CartogramMap.tsx`, `assets/sample-data/cartogram-scaled.json`,
`assets/sample-data/cartogram-grid.json`, `knowledge/references/map/types/cartogram.md`,
`tests/cartogram-geo.test.ts`.
**Modify:** `src/validate-config.ts` (`validateCartogramConfig`), `src/conformance.ts`
(`checkCartogramConformance`), `src/mount.tsx`, `scripts/produce.mjs`, `scripts/audit-cases.mjs`, `SKILL.md`.

**Reference (read, do not modify):** `src/hex-grid-geo.ts` (returned-layout shape + BLUES bin reuse),
`src/HexGridMap.tsx` (cell fill layer id, hover, legend, mapStyle, fitBounds), `src/choropleth-geo.ts`
(`computeChoropleth`, `regionBounds`, `mainlandFeature`), `src/conformance.ts` +
`src/validate-config.ts` (the hex-grid entries as the template).

---

## Task 1: `cartogram-geo.ts` (both variants, pure core)

**Files:** Create `skills/map-native/src/cartogram-geo.ts`, `skills/map-native/tests/cartogram-geo.test.ts`.

**Interfaces:**
- Consumes: `computeChoropleth`/`ChoroplethLayout` (`./choropleth-geo`), turf `centroid`/`transformScale`/
  `bbox`/`area`/`featureCollection`.
- Produces:
  - `interface CartogramCell { feature: GeoJSON.Feature; id: string; value: number; color: string; binIdx: number }`
  - `interface CartogramLayout { cells: CartogramCell[]; bins: { min: number; max: number; color: string }[]; variant: "scaled" | "grid"; bounds: [number,number,number,number]; valueLabel: string; scaleType: "sequential" | "diverging" }`
  - `interface CartogramData { variant?: "scaled" | "grid"; joinKey?: string; values: { id: string; value: number }[]; scaleType?: "sequential" | "diverging"; bins?: number; valueLabel?: string }`
  - `function computeCartogram(data: CartogramData, features: GeoJSON.FeatureCollection): CartogramLayout`

- [ ] **Step 1: Write the failing test** — create `tests/cartogram-geo.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { computeCartogram } from "../src/cartogram-geo";
import { area } from "@turf/turf";

// Four unit-square regions in a 2x2 arrangement, keyed A..D.
const sq = (id: string, x: number, y: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: { type: "Polygon", coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]] },
});
const features: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [sq("A", 0, 1), sq("B", 2, 1), sq("C", 0, -1), sq("D", 2, -1)],
};
const values = [
  { id: "A", value: 4 }, { id: "B", value: 16 }, { id: "C", value: 1 }, { id: "D", value: 9 },
];

describe("computeCartogram — scaled", () => {
  const layout = computeCartogram({ variant: "scaled", values, valueLabel: "pop" }, features);
  it("emits one cell per matched region", () => {
    expect(layout.cells.length).toBe(4);
    expect(layout.variant).toBe("scaled");
  });
  it("scales area proportional to value (B:16 has 4x the area of A:4)", () => {
    const a = area(layout.cells.find((c) => c.id === "A")!.feature);
    const b = area(layout.cells.find((c) => c.id === "B")!.feature);
    expect(b / a).toBeGreaterThan(3.6);
    expect(b / a).toBeLessThan(4.4);
  });
  it("is deterministic (same input → identical geometry)", () => {
    const again = computeCartogram({ variant: "scaled", values, valueLabel: "pop" }, features);
    expect(JSON.stringify(again.cells)).toBe(JSON.stringify(layout.cells));
  });
});

describe("computeCartogram — grid", () => {
  const layout = computeCartogram({ variant: "grid", values, valueLabel: "pop" }, features);
  it("emits one uniform square per region with no two on the same cell", () => {
    expect(layout.cells.length).toBe(4);
    const centers = layout.cells.map((c) => JSON.stringify(area(c.feature).toFixed(6)));
    // all cells same area (uniform)
    const areas = layout.cells.map((c) => Number(area(c.feature).toFixed(3)));
    expect(new Set(areas).size).toBe(1);
    // no two cells share the same centroid position
    const pos = layout.cells.map((c) => JSON.stringify(c.feature.geometry));
    expect(new Set(pos).size).toBe(4);
  });
  it("is deterministic (stable assignment)", () => {
    const again = computeCartogram({ variant: "grid", values, valueLabel: "pop" }, features);
    expect(JSON.stringify(again.cells)).toBe(JSON.stringify(layout.cells));
  });
});

describe("computeCartogram — colour + guards", () => {
  it("assigns a bin colour to every cell and carries the value label", () => {
    const layout = computeCartogram({ variant: "scaled", values, valueLabel: "residents" }, features);
    expect(layout.cells.every((c) => typeof c.color === "string" && c.color.startsWith("#"))).toBe(true);
    expect(layout.valueLabel).toBe("residents");
    expect(layout.bins.length).toBe(5);
  });
  it("drops regions with no value", () => {
    const layout = computeCartogram({ variant: "scaled", values: [{ id: "A", value: 4 }], valueLabel: "x" }, features);
    expect(layout.cells.length).toBe(1);
    expect(layout.cells[0].id).toBe("A");
  });
  it("throws when no region matches", () => {
    expect(() => computeCartogram({ variant: "scaled", values: [{ id: "Z", value: 1 }], valueLabel: "x" }, features)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/cartogram-geo.test.ts`
Expected: FAIL — `computeCartogram` not exported.

- [ ] **Step 3: Write the implementation** — create `skills/map-native/src/cartogram-geo.ts`:

```typescript
// Cartogram core — two deterministic families. `scaled`: scale each real region polygon around its own
// centroid so area ∝ value (turf.transformScale, factor = sqrt(value/max)). `grid`: one uniform square
// per region placed by a stable nearest-free-cell auto-layout keyed on the region's true centroid. Colour
// is reused from the choropleth binning (BLUES sequential / DIVERGING). Pure + frame-deterministic: no
// randomness; the grid assignment sorts explicitly and breaks ties by index.
import { bbox, area, centroid, transformScale, polygon } from "@turf/turf";
import { computeChoropleth } from "./choropleth-geo";
import { mainlandFeature } from "./choropleth-geo";

export interface CartogramCell {
  feature: GeoJSON.Feature;
  id: string;
  value: number;
  color: string;
  binIdx: number;
}
export interface CartogramLayout {
  cells: CartogramCell[];
  bins: { min: number; max: number; color: string }[];
  variant: "scaled" | "grid";
  bounds: [number, number, number, number];
  valueLabel: string;
  scaleType: "sequential" | "diverging";
}
export interface CartogramData {
  variant?: "scaled" | "grid";
  joinKey?: string;
  values: { id: string; value: number }[];
  scaleType?: "sequential" | "diverging";
  bins?: number;
  valueLabel?: string;
}

// Pick the bin index whose [min,max] contains v (last bin inclusive of max).
function binIndexFor(v: number, bins: { min: number; max: number }[]): number {
  for (let i = 0; i < bins.length; i++) {
    if (v >= bins[i].min && (v <= bins[i].max || i === bins.length - 1)) return i;
  }
  return bins.length - 1;
}

export function computeCartogram(
  data: CartogramData,
  features: GeoJSON.FeatureCollection,
): CartogramLayout {
  const variant = data.variant ?? "scaled";
  const joinKey = data.joinKey ?? "iso_a3";
  const scaleType = data.scaleType ?? "sequential";

  // Reuse the choropleth binning for colours + bin edges (join by key, drop no-data).
  const cho = computeChoropleth(
    { regionKey: "id", valueField: "value", rows: data.values as unknown as Record<string, string | number>[] },
    features,
    joinKey,
    { bins: data.bins ?? 5, scaleType },
  );

  // Map region key → value (matched only).
  const valueByKey = new Map<string, number>();
  for (const v of data.values) valueByKey.set(String(v.id), v.value);

  // Matched features, in feature order (deterministic).
  const matched = features.features
    .map((f) => ({ f, key: String(f.properties?.[joinKey]) }))
    .filter(({ key }) => valueByKey.has(key));

  if (matched.length === 0) throw new Error("cartogram: no region matched the data");

  const maxValue = Math.max(...matched.map(({ key }) => valueByKey.get(key)!), 1e-9);

  const colorFor = (value: number) => {
    const idx = binIndexFor(value, cho.bins);
    return { binIdx: idx, color: cho.bins[idx].color };
  };

  let cells: CartogramCell[];

  if (variant === "scaled") {
    cells = matched.map(({ f, key }) => {
      const value = valueByKey.get(key)!;
      const src = mainlandFeature(f);
      const factor = Math.sqrt(Math.max(value, 0) / maxValue) || 1e-3; // area ∝ value; floor avoids 0-area
      const scaled = transformScale(src, factor, { origin: centroid(src) });
      const { binIdx, color } = colorFor(value);
      return { feature: scaled, id: key, value, color, binIdx };
    });
  } else {
    // grid auto-layout: choose dims, map centroids to ideal (row,col), assign nearest FREE cell.
    const n = matched.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const withC = matched.map(({ f, key }) => {
      const c = centroid(mainlandFeature(f)).geometry.coordinates as [number, number];
      return { key, value: valueByKey.get(key)!, cx: c[0], cy: c[1] };
    });
    const lons = withC.map((r) => r.cx);
    const lats = withC.map((r) => r.cy);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const lonSpan = maxLon - minLon || 1;
    const latSpan = maxLat - minLat || 1;
    // Ideal grid coords from geographic position (col grows east, row grows south).
    const ideal = withC.map((r) => ({
      ...r,
      ic: ((r.cx - minLon) / lonSpan) * (cols - 1),
      ir: ((maxLat - r.cy) / latSpan) * (rows - 1),
    }));
    // Deterministic order: north-to-south, then west-to-east.
    ideal.sort((a, b) => a.ir - b.ir || a.ic - b.ic || (a.key < b.key ? -1 : 1));
    const taken = new Set<string>();
    const assign: { key: string; value: number; row: number; col: number }[] = [];
    for (const r of ideal) {
      let best: { row: number; col: number; d: number } | null = null;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (taken.has(`${row},${col}`)) continue;
          const d = (row - r.ir) ** 2 + (col - r.ic) ** 2;
          if (!best || d < best.d) best = { row, col, d };
        }
      }
      if (!best) best = { row: 0, col: 0, d: 0 };
      taken.add(`${best.row},${best.col}`);
      assign.push({ key: r.key, value: r.value, row: best.row, col: best.col });
    }
    // Render uniform squares on the basemap, anchored to the data bbox, with a small gap.
    const cellW = lonSpan / Math.max(cols - 1, 1);
    const cellH = latSpan / Math.max(rows - 1, 1);
    const size = Math.min(cellW, cellH) * 0.8 || 1;
    // Re-key to feature order for stable output.
    assign.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    cells = assign.map((a) => {
      const x = minLon + a.col * cellW;
      const y = maxLat - a.row * cellH;
      const half = size / 2;
      const feature = polygon([[
        [x - half, y - half], [x + half, y - half], [x + half, y + half], [x - half, y + half], [x - half, y - half],
      ]]);
      const { binIdx, color } = colorFor(a.value);
      return { feature, id: a.key, value: a.value, color, binIdx };
    });
  }

  const fc = { type: "FeatureCollection" as const, features: cells.map((c) => c.feature) };
  const bounds = bbox(fc) as [number, number, number, number];

  return {
    cells,
    bins: cho.bins,
    variant,
    bounds,
    valueLabel: data.valueLabel ?? "value",
    scaleType,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/cartogram-geo.test.ts`
Expected: PASS. If the scaled area ratio is off, confirm `transformScale` scales area by `factor²`
(so `factor = sqrt(value/max)` gives area ∝ value). If a grid test flakes on ordering, confirm the final
`assign.sort` by key makes the output feature-order-stable.

- [ ] **Step 5: Full suite**

Run: `cd skills/map-native && bun test`
Expected: all pass (baseline 243 + the new cartogram-geo tests).

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/cartogram-geo.ts skills/map-native/tests/cartogram-geo.test.ts
git commit -m "feat(map-native): cartogram core — scaled (area∝value) + grid (auto-layout), reused binning"
```

---

## Task 2: `validateCartogramConfig` + `checkCartogramConformance`

**Files:** Modify `skills/map-native/src/validate-config.ts`, `skills/map-native/src/conformance.ts`;
Test — add cases to the existing validation/conformance test files (find them next to the hex-grid cases).

**Interfaces:**
- Consumes: `computeCartogram`/`CartogramLayout` (Task 1), the global L0 `checkGlobalMapConformance`.
- Produces: `validateCartogramConfig(config): string[]` (append-only in the validate dispatch) and
  `checkCartogramConformance(config): { ok: boolean; checks: Record<string, boolean> }` (mirror
  `checkHexGridConformance`'s shape exactly).

Read the hex-grid entries in both files as the template. Deltas:
- **validate:** require `type === "cartogram"`, non-empty `values` (each `{ id, value:number }`),
  `variant` ∈ {scaled, grid} if present, `scaleType` ∈ {sequential, diverging} if present, `bins` 3–7 if
  present, a title. Error strings mirror the hex-grid phrasing.
- **conformance:** compute the layout, then assert `hasBinLegend` (bins ≥ 1), `hasValueLabel`
  (`valueLabel` non-empty), `boundsNonEmpty`, `cellCount >= 1`, valid `mapStyle` (∈ `MAP_STYLES`), and the
  global L0 (title ≥ 12 chars & not a bare year range, description non-empty, source name+url). For
  `grid`, also assert `uniformCells` (all cell areas equal within epsilon — the uniform-cell invariant).

- [ ] **Step 1: Write failing tests** for `validateCartogramConfig` (reject: empty values, bad variant,
  bad scaleType, bins out of range, missing title) and `checkCartogramConformance` (pass on a good
  scaled + a good grid config; fail on missing value label / bad mapStyle / grid non-uniform is
  impossible from the core so assert it passes). Mirror the hex-grid test block.
- [ ] **Step 2: Run to verify they fail.** `cd skills/map-native && bun test <the two test files>`
- [ ] **Step 3: Implement** both functions append-only in the dispatch (do not touch other types' paths).
- [ ] **Step 4: Run to verify pass** + full suite `cd skills/map-native && bun test`.
- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/src/conformance.ts skills/map-native/tests/
git commit -m "feat(map-native): cartogram config validation + conformance guard"
```

---

## Task 3: `CartogramMap.tsx` (static + interactive) + wiring + samples + render-verify

**Files:** Create `skills/map-native/src/CartogramMap.tsx`,
`assets/sample-data/cartogram-scaled.json`, `assets/sample-data/cartogram-grid.json`; Modify
`src/mount.tsx`, `scripts/produce.mjs`.

**Interfaces:**
- Consumes: `computeCartogram`/`CartogramLayout` (Task 1), `resolveMapStyle` (route-geo), the world/region
  geojson loader used by `HexGridMap`/`ChoroplethMap`.
- Produces: `CartogramMap` React component `{ config }`.

- [ ] **Step 1: Write `CartogramMap.tsx`** — port `skills/map-native/src/HexGridMap.tsx` (read it fully).
  Deltas:
  1. Load the geography geojson for `config.basemap` (as ChoroplethMap does), then
     `computeCartogram(config, features)` ONCE.
  2. Cell `fill` layer id **`cartogram-cells`**: `fill-color: ["get","__color"]`, `fill-opacity` 0.85
     (× reveal progress if the static build animates; static = full), thin outline. Never colour/scale by
     cell size.
  3. Sequential/diverging bin legend + `valueLabel` (reuse HexGridMap's legend, swap the label). For
     `grid`, add the uniform-cell note. Hover a cell → region id + value (`valueLabel`).
  4. mapStyle-adaptive via `resolveMapStyle`; `fitBounds(layout.bounds)`. Verify NUL-free.
- [ ] **Step 2: Author two samples** — `cartogram-scaled.json` (a real geography with a value per region,
  `variant:"scaled"`, sequential, a proper title/description/source) and `cartogram-grid.json`
  (`variant:"grid"`, a geography with a clear tile-grid reading, diverging or sequential). Use an existing
  geography key (`us-states` or `world`) whose geojson the engine already ships; values are illustrative
  but plausible + sourced.
- [ ] **Step 3: Wire `mount.tsx` + `produce.mjs`** — add the cartogram type to the mount dispatch (render
  `CartogramMap`) and to produce's static/interactive path, mirroring hex-grid's `isHexGrid` arms
  (static + interactive only in Slice A; video kinds are Slice B → `isCartogram ? []` for now). Keep snap
  ready-gate additive: add `cartogram-cells` to the layer-ready OR-gate; keep hover branches type-gated.
- [ ] **Step 4: Typecheck + full suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean (apart from pre-existing react-dom TS2688); all tests pass.

- [ ] **Step 5: Render-verify static + interactive, both variants, light + dark**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bun scripts/produce.mjs assets/sample-data/cartogram-scaled.json /tmp/carto/scaled static
bun scripts/produce.mjs assets/sample-data/cartogram-grid.json /tmp/carto/grid static
```
COMMIT before rendering. Inspect the PNG/interactive stills: scaled = real region shapes resized by value
(bigger = larger value), coloured by bin, legend + value label, mapStyle correct; grid = a regular grid of
uniform squares (one per region) roughly preserving geographic arrangement, coloured by bin, no size
variation, hover shows region + value. If a render exceeds ~8 min, STOP and report DONE_WITH_CONCERNS.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/CartogramMap.tsx skills/map-native/assets/sample-data/cartogram-scaled.json skills/map-native/assets/sample-data/cartogram-grid.json skills/map-native/src/mount.tsx skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): CartogramMap static+interactive (scaled + grid, fill-by-bin, hover, legend) + wiring"
```

---

## Task 4: KB type doc + roadmap + audit case

**Files:** Create `knowledge/references/map/types/cartogram.md`; Modify `skills/map-native/SKILL.md`,
`skills/map-native/scripts/audit-cases.mjs`.

- [ ] **Step 1: Write `knowledge/references/map/types/cartogram.md`** — mirror `types/hex-grid.md`'s
  structure. Cover: what a cartogram is + the two variants (scaled non-contiguous area∝value; grid
  auto-layout tile-grid), when to use vs choropleth (real boundaries, colour only) and hex-grid (bins a
  point cloud) with the FT visual-vocabulary distinction, encoding rules (sequential/diverging bins,
  value label, uniform-cell invariant for grid, area∝value for scaled), the auto-layout note (nearest
  free cell to centroid, deterministic — no hand-authored layout), hover, anti-patterns (contiguous
  diffusion out of scope; don't colour-scale a grid; scaled overlaps are expected), the credit conventions
  (data-to-viz + FT visual vocabulary), and a **Slice A scope note** (static + interactive shipped; video
  + interactive scrolly = Slice B). Implementation pointer: `cartogram-geo.ts` + `CartogramMap.tsx` +
  `checkCartogramConformance`. Accuracy: do NOT claim video/scrolly yet.
- [ ] **Step 2: Update `SKILL.md` roadmap** — the Cartogram row: set S ✓ I ✓ (static + interactive
  shipped), V ◻ (Slice B). Do not restructure the table; match the symbol convention of the other rows.
- [ ] **Step 3: Add an audit case** — wire cartogram (scaled + grid) into `scripts/audit-cases.mjs`
  additively (2-line hook, like hex-grid); run it and confirm the cartogram cases are clean.
- [ ] **Step 4: Final full suite** — `cd skills/map-native && bun test` (all pass).
- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/cartogram.md skills/map-native/SKILL.md skills/map-native/scripts/audit-cases.mjs
git commit -m "docs(map-native): cartogram KB type doc + roadmap (S✓ I✓ V◻) + audit case"
```

---

## Self-Review

**Spec coverage (Slice A):** `computeCartogram` both variants (scaled area∝value + grid auto-layout) →
Task 1; validation + conformance (incl. grid uniform-cell) → Task 2; `CartogramMap` static+interactive +
samples + wiring + render-verify → Task 3; KB + roadmap + audit → Task 4. Slice B (video + interactive
scrolly, incl. `ScrollyCartogramMap` + smoke gate) is explicitly a separate plan.

**Placeholder scan:** Task 1 carries complete code + tests (the novel algorithm). Tasks 2-4 port named
in-repo siblings (hex-grid's validate/conformance/Map/KB/audit entries) with enumerated deltas —
complete-by-reference to real code; render steps give exact commands. No "TBD".

**Type consistency:** `computeCartogram`/`CartogramData`/`CartogramLayout`/`CartogramCell` names match
across tasks; the layout shape (`cells:{feature,id,value,color,binIdx}[]`, `bins`, `variant`, `bounds`,
`valueLabel`, `scaleType`) is consumed identically by `CartogramMap` (Task 3), conformance (Task 2), and
matches the reused `computeChoropleth` bin shape (`{min,max,color}`). Cell layer id `cartogram-cells`
matches between `CartogramMap`, the produce snap ready-gate, and (later) Slice B's smoke gate. `mainlandFeature`
+ turf `transformScale`/`centroid` reuse confirmed against `choropleth-geo.ts`.
