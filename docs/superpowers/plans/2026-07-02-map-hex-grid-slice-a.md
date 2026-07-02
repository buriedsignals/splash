# Map Hex-Grid — Slice A (type core + static + interactive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the hex-grid (spatial bins) map type's core plus its static PNG and interactive free-nav
map — points aggregated into a regular hex/square tessellation, cells coloured by count/sum/mean, empty
cells hidden, with a sequential legend and AI-selected light/dark basemap.

**Architecture:** A pure core `hex-grid-geo.ts` (bbox → derived cell size → `turf.hexGrid`/`squareGrid` →
`turf.collect` binning → count/sum/mean aggregate → sequential `BLUES` bins) plus `HexGridMap.tsx` (a
cell `fill` layer coloured by bin + outline + hover + legend), ported from ChoroplethMap.

**Tech Stack:** Bun, TypeScript, MapTiler SDK, turf 7.2 (`hexGrid`/`squareGrid`/`collect`/`distance`),
`bun:test`. (No Remotion in Slice A.)

**Scope note:** Slice A = static + interactive free-nav. Video (reveal/story/scrolly) + interactive
scrolly are Slice B (they add `deriveHexGridStory`), out of scope here.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`.
- Code, comments, commit messages, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key lives in `atelier/.env` (gitignored) — never commit or log it.
- Reuse: `BLUES` (`src/theme/scale.ts`), `MapFrame`/`resolveMapFrame`, `resolveMapStyle`/`MAP_STYLES`
  (`src/route-geo.ts`). Use turf `hexGrid`/`squareGrid`/`collect` — NO h3-js.
- **Frame-determinism:** the grid + binning is deterministic (fixed bbox, no `Math.random`/`Date.now`)
  and computed ONCE; magnitude is encoded by cell colour, never cell size.
- After writing `HexGridMap.tsx`, verify NUL-free: `grep -c $'\\x00' <file>` prints 0.

---

## File structure

**Create:** `src/hex-grid-geo.ts`, `src/HexGridMap.tsx`, `assets/sample-data/hex-grid-count.json`,
`assets/sample-data/hex-grid-mean.json`, `knowledge/references/map/types/hex-grid.md`,
`tests/hex-grid-geo.test.ts`, `tests/hex-grid-conformance.test.ts`.
**Modify:** `src/validate-config.ts`, `src/conformance.ts`, `src/mount.tsx`, `scripts/produce.mjs`,
`scripts/snap-*.mjs` (ready-gate), `scripts/audit-cases.mjs`, `SKILL.md`.

---

## Task 1: `hex-grid-geo.ts` — binning core

**Files:** Create `skills/map-native/src/hex-grid-geo.ts`; Test `skills/map-native/tests/hex-grid-geo.test.ts`.

**Interfaces:**
- Consumes: `BLUES` (`./theme/scale`), turf `hexGrid`/`squareGrid`/`collect`/`distance`/`point`/`featureCollection`.
- Produces:
  - `interface HexGridData { points: { lon: number; lat: number; value?: number }[]; binShape?: "hex" | "square"; aggregate?: "count" | "sum" | "mean"; cellSizeKm?: number }`
  - `interface HexCell { feature: GeoJSON.Feature; count: number; value: number; color: string; binIdx: number }`
  - `interface HexGridLayout { cells: HexCell[]; bins: { min: number; max: number; color: string }[]; cellSizeKm: number; bounds: [number, number, number, number]; aggregate: "count"|"sum"|"mean"; binShape: "hex"|"square"; aggregateLabel: string; capped: boolean }`
  - `function computeHexGrid(data: HexGridData): HexGridLayout`

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/hex-grid-geo.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { computeHexGrid } from "../src/hex-grid-geo";
import { BLUES } from "../src/theme/scale";

// A tight cluster (many points) + a lone point far away → two populated cell regions.
const cluster = Array.from({ length: 30 }, (_, i) => ({ lon: 2 + (i % 6) * 0.02, lat: 48 + Math.floor(i / 6) * 0.02, value: 10 }));
const lone = [{ lon: 9, lat: 45, value: 100 }];
const points = [...cluster, ...lone];

describe("computeHexGrid — count", () => {
  const layout = computeHexGrid({ points, binShape: "hex", aggregate: "count" });
  it("produces only populated cells (empty cells dropped)", () => {
    expect(layout.cells.length).toBeGreaterThan(0);
    for (const c of layout.cells) expect(c.count).toBeGreaterThan(0);
  });
  it("colours cells from the BLUES ramp via sequential bins", () => {
    for (const c of layout.cells) expect(BLUES).toContain(c.color);
    expect(layout.bins.length).toBe(5);
  });
  it("count aggregate = number of points in the cell", () => {
    const total = layout.cells.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(points.length); // every point lands in exactly one cell
    for (const c of layout.cells) expect(c.value).toBe(c.count);
  });
  it("is deterministic", () => {
    const a = computeHexGrid({ points, binShape: "hex", aggregate: "count" });
    const b = computeHexGrid({ points, binShape: "hex", aggregate: "count" });
    expect(a.cells.map((c) => [c.count, c.color])).toEqual(b.cells.map((c) => [c.count, c.color]));
  });
});

describe("computeHexGrid — sum/mean + shape", () => {
  it("sum aggregate sums point values in each cell", () => {
    const layout = computeHexGrid({ points, binShape: "square", aggregate: "sum" });
    expect(layout.binShape).toBe("square");
    const total = layout.cells.reduce((s, c) => s + c.value, 0);
    expect(total).toBe(30 * 10 + 100); // 400
  });
  it("mean aggregate averages point values in each cell", () => {
    const layout = computeHexGrid({ points, binShape: "hex", aggregate: "mean" });
    // the lone cell has one point value 100 → its mean is exactly 100
    const loneCell = layout.cells.find((c) => c.count === 1);
    expect(loneCell?.value).toBe(100);
    expect(layout.aggregateLabel).toContain("mean");
  });
});

describe("computeHexGrid — cap + degenerate", () => {
  it("flags capped when a tiny cellSizeKm would exceed the cell cap", () => {
    const layout = computeHexGrid({ points, binShape: "square", aggregate: "count", cellSizeKm: 2 });
    expect(layout.capped).toBe(true);
    expect(layout.cells.length).toBeLessThanOrEqual(2000);
  });
  it("pads a single-point (degenerate) bbox so a cell still forms", () => {
    const layout = computeHexGrid({ points: [{ lon: 5, lat: 45 }], aggregate: "count" });
    expect(layout.cells.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/hex-grid-geo.test.ts`
Expected: FAIL — `computeHexGrid` not exported.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/hex-grid-geo.ts`:

```typescript
// Pure spatial-binning core for the hex-grid map — no MapTiler, no React. A regular hex/square
// tessellation is generated over the points' bbox and each cell aggregates the points inside
// (count / sum / mean). Deterministic (fixed bbox + fixed cell size, no randomness), so the cells are
// stable across every Remotion render frame. Empty cells are dropped. Colour reuses the choropleth's
// sequential BLUES ramp.
import {
  hexGrid,
  squareGrid,
  collect,
  distance,
  point as turfPoint,
  featureCollection,
} from "@turf/turf";
import { BLUES } from "./theme/scale";

export interface HexGridData {
  points: { lon: number; lat: number; value?: number }[];
  binShape?: "hex" | "square";
  aggregate?: "count" | "sum" | "mean";
  cellSizeKm?: number;
}
export interface HexCell {
  feature: GeoJSON.Feature;
  count: number;
  value: number;
  color: string;
  binIdx: number;
}
export interface HexGridLayout {
  cells: HexCell[];
  bins: { min: number; max: number; color: string }[];
  cellSizeKm: number;
  bounds: [number, number, number, number];
  aggregate: "count" | "sum" | "mean";
  binShape: "hex" | "square";
  aggregateLabel: string;
  capped: boolean;
}

const TARGET_CELLS = 250;
const MAX_CELLS = 2000;
const MERC = 85;
const clampLat = (v: number) => Math.max(-MERC, Math.min(MERC, v));

export function computeHexGrid(data: HexGridData): HexGridLayout {
  const pts = data.points;
  if (!pts.length) throw new Error("hex-grid: no points — nothing to bin");
  const binShape = data.binShape === "square" ? "square" : "hex";
  const aggregate = data.aggregate ?? "count";

  // bbox with a minimum extent (degenerate guard) + 5% padding, Mercator-clamped.
  const lons = pts.map((p) => p.lon);
  const lats = pts.map((p) => p.lat);
  let w = Math.min(...lons), e = Math.max(...lons);
  let s = clampLat(Math.min(...lats)), n = clampLat(Math.max(...lats));
  const MIN_EXT = 0.5;
  if (e - w < MIN_EXT) { const c = (e + w) / 2; w = c - MIN_EXT / 2; e = c + MIN_EXT / 2; }
  if (n - s < MIN_EXT) { const c = (n + s) / 2; s = clampLat(c - MIN_EXT / 2); n = clampLat(c + MIN_EXT / 2); }
  const padX = (e - w) * 0.05, padY = (n - s) * 0.05;
  const bbox: [number, number, number, number] = [w - padX, clampLat(s - padY), e + padX, clampLat(n + padY)];

  // Derive a cell side (km) targeting ~TARGET_CELLS across the bbox.
  const midLat = (bbox[1] + bbox[3]) / 2;
  const widthKm = distance(turfPoint([bbox[0], midLat]), turfPoint([bbox[2], midLat]), { units: "kilometers" }) || 1;
  const heightKm = distance(turfPoint([bbox[0], bbox[1]]), turfPoint([bbox[0], bbox[3]]), { units: "kilometers" }) || 1;
  const areaKm = widthKm * heightKm;
  const perCellFactor = binShape === "hex" ? 2.6 : 1; // rough cell-area / side² factor
  let cellSide = data.cellSizeKm ?? Math.max(1, Math.sqrt(areaKm / (TARGET_CELLS * perCellFactor)));

  const make = (side: number): GeoJSON.FeatureCollection =>
    (binShape === "hex"
      ? hexGrid(bbox, side, { units: "kilometers" })
      : squareGrid(bbox, side, { units: "kilometers" })) as GeoJSON.FeatureCollection;

  let grid = make(cellSide);
  let capped = false;
  let guard = 0;
  while (grid.features.length > MAX_CELLS && guard++ < 24) {
    cellSide *= 1.5;
    grid = make(cellSide);
    capped = true;
  }

  // Bin the points: tag each with a numeric "v" and collect into cells.
  const pointsFC = featureCollection(
    pts.map((p) => turfPoint([p.lon, p.lat], { v: aggregate === "count" ? 1 : Number(p.value) || 0 })),
  );
  const collected = collect(grid as never, pointsFC as never, "v", "__vals") as GeoJSON.FeatureCollection;

  const raw = collected.features
    .map((f) => {
      const vals = ((f.properties?.__vals ?? []) as number[]);
      const count = vals.length;
      const sum = vals.reduce((a, b) => a + b, 0);
      const value = aggregate === "count" ? count : aggregate === "sum" ? sum : count ? sum / count : 0;
      return { feature: { type: "Feature" as const, properties: {}, geometry: f.geometry }, count, value };
    })
    .filter((c) => c.count > 0);

  if (!raw.length) throw new Error("hex-grid: no populated cells");

  // Sequential bins on the aggregate value (BLUES ramp, 5 classes) — mirrors choropleth's sequential scale.
  const values = raw.map((c) => c.value);
  const min = Math.min(...values), max = Math.max(...values);
  const nBins = 5;
  const span = max - min || 1;
  const bins = Array.from({ length: nBins }, (_, i) => ({
    min: min + (span * i) / nBins,
    max: min + (span * (i + 1)) / nBins,
    color: BLUES[Math.round((i / (nBins - 1)) * (BLUES.length - 1))],
  }));
  const binOf = (v: number) => {
    for (let i = 0; i < nBins - 1; i++) if (v < bins[i].max) return i;
    return nBins - 1;
  };

  const cells: HexCell[] = raw.map((c) => {
    const bi = binOf(c.value);
    return { ...c, color: bins[bi].color, binIdx: bi };
  });

  const aggregateLabel =
    aggregate === "count"
      ? `points per ${binShape === "hex" ? "hexagon" : "cell"}`
      : aggregate === "sum"
        ? "sum of values"
        : "mean value";

  return { cells, bins, cellSizeKm: cellSide, bounds: bbox, aggregate, binShape, aggregateLabel, capped };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/hex-grid-geo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/hex-grid-geo.ts skills/map-native/tests/hex-grid-geo.test.ts
git commit -m "feat(map-native): hex-grid binning core (turf hex/square grid + collect, count/sum/mean, sequential bins)"
```

---

## Task 2: Config validation + conformance

**Files:** Modify `src/validate-config.ts`, `src/conformance.ts`; Test `tests/hex-grid-conformance.test.ts` (create).

**Interfaces:**
- Consumes: `MAP_STYLES` (route-geo), `checkGlobalMapConformance` (conformance.ts).
- Produces:
  - `type HexGridConfigShape = { type: "hex-grid"; points: { lon: number; lat: number; value?: number }[]; binShape?: "hex" | "square"; aggregate?: "count" | "sum" | "mean"; cellSizeKm?: number; basemap: string; mapStyle?: string; title: string; description?: string; source?: { name?: string; url?: string } }`
  - `validateHexGridConfig(spec: unknown): { ok: true; spec: HexGridConfigShape; warnings: string[] } | { ok: false; errors: string[] }`
  - `checkHexGridConformance(input: { title: string; description?: string; source: { name?: string; url?: string }; hasBinLegend: boolean; hasAggregateLabel: boolean; cellCount: number; boundsNonEmpty: boolean; mapStyle?: string }, textColors: { text: string[]; bg: string }): string[]`

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/hex-grid-conformance.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { validateHexGridConfig } from "../src/validate-config";
import { checkHexGridConformance } from "../src/conformance";

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };
const good = {
  title: "Where the earthquakes cluster",
  description: "Seismic events binned into 50km hexagons, 2026",
  source: { name: "USGS", url: "https://x" },
  hasBinLegend: true,
  hasAggregateLabel: true,
  cellCount: 180,
  boundsNonEmpty: true,
  mapStyle: "dataviz-dark",
};

describe("validateHexGridConfig", () => {
  it("accepts a count config", () => {
    const r = validateHexGridConfig({
      type: "hex-grid", points: [{ lon: 2, lat: 48 }], basemap: "world",
      title: "Where the earthquakes cluster",
    });
    expect(r.ok).toBe(true);
  });
  it("rejects sum/mean when points lack value", () => {
    const r = validateHexGridConfig({
      type: "hex-grid", points: [{ lon: 2, lat: 48 }], aggregate: "mean", basemap: "world",
      title: "Where the earthquakes cluster",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects an invalid binShape", () => {
    const r = validateHexGridConfig({
      type: "hex-grid", points: [{ lon: 2, lat: 48 }], binShape: "triangle", basemap: "world",
      title: "Where the earthquakes cluster",
    });
    expect(r.ok).toBe(false);
  });
});

describe("checkHexGridConformance", () => {
  it("passes a well-formed hex-grid", () => {
    expect(checkHexGridConformance(good, okColors)).toEqual([]);
  });
  it("flags a missing bin legend", () => {
    expect(checkHexGridConformance({ ...good, hasBinLegend: false }, okColors).join(" ")).toContain("legend");
  });
  it("flags zero cells", () => {
    expect(checkHexGridConformance({ ...good, cellCount: 0 }, okColors).join(" ")).toContain("cell");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/hex-grid-conformance.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement `validateHexGridConfig`**

In `skills/map-native/src/validate-config.ts` append (mirror `validateSymbolConfig`; `MAP_STYLES` already imported):

```typescript
export type HexGridConfigShape = {
  type: "hex-grid";
  points: { lon: number; lat: number; value?: number }[];
  binShape?: "hex" | "square";
  aggregate?: "count" | "sum" | "mean";
  cellSizeKm?: number;
  basemap: string;
  mapStyle?: string;
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
};

export function validateHexGridConfig(
  spec: unknown,
):
  | { ok: true; spec: HexGridConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");
  if (s.mapStyle !== undefined && !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string))
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  if (s.binShape !== undefined && !["hex", "square"].includes(s.binShape as string))
    errors.push('binShape must be one of: hex, square');
  const aggregate = (s.aggregate ?? "count") as string;
  if (!["count", "sum", "mean"].includes(aggregate))
    errors.push('aggregate must be one of: count, sum, mean');
  if (s.cellSizeKm !== undefined && (typeof s.cellSizeKm !== "number" || !(s.cellSizeKm > 0)))
    errors.push("cellSizeKm must be a positive number");

  const points = s.points;
  if (!Array.isArray(points) || points.length === 0) {
    errors.push("points must be a non-empty array");
  } else {
    const needsValue = aggregate === "sum" || aggregate === "mean";
    for (let i = 0; i < points.length; i++) {
      const p = points[i] as Record<string, unknown> | null;
      if (!p || typeof p !== "object") { errors.push(`point ${i} is not an object`); continue; }
      if (typeof p.lon !== "number" || Number.isNaN(p.lon) || p.lon < -180 || p.lon > 180)
        errors.push(`point ${i} lon must be a number in [-180, 180]`);
      if (typeof p.lat !== "number" || Number.isNaN(p.lat) || p.lat < -90 || p.lat > 90)
        errors.push(`point ${i} lat must be a number in [-90, 90]`);
      if (needsValue && (typeof p.value !== "number" || Number.isNaN(p.value)))
        errors.push(`point ${i} needs a numeric value for aggregate "${aggregate}"`);
    }
  }

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12) errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim())) warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim())) warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as HexGridConfigShape, warnings };
}
```

- [ ] **Step 4: Implement `checkHexGridConformance`**

In `skills/map-native/src/conformance.ts` append (compose the global L0 guard first):

```typescript
export function checkHexGridConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    hasBinLegend: boolean;
    hasAggregateLabel: boolean;
    cellCount: number;
    boundsNonEmpty: boolean;
    mapStyle?: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    { title: input.title, description: input.description, source: input.source },
    textColors,
  );
  if (!input.hasBinLegend)
    v.push("hex-grid needs a sequential bin legend — the colour scale is undecodable without it");
  if (!input.hasAggregateLabel)
    v.push("hex-grid must label its aggregate (points per cell / sum / mean of what)");
  if (input.cellCount < 1) v.push("no populated cells to draw");
  if (!input.boundsNonEmpty) v.push("empty grid bounds — basemap-fit impossible");
  if (input.mapStyle && !(MAP_STYLES as readonly string[]).includes(input.mapStyle))
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  return v;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/hex-grid-conformance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/src/conformance.ts skills/map-native/tests/hex-grid-conformance.test.ts
git commit -m "feat(map-native): hex-grid config validation + conformance guard"
```

---

## Task 3: `HexGridMap.tsx` (static + interactive) + wiring + render-verify

**Files:** Create `src/HexGridMap.tsx`, `assets/sample-data/hex-grid-count.json`, `hex-grid-mean.json`;
Modify `src/mount.tsx`, `scripts/produce.mjs`, `scripts/snap-*.mjs`.

**Interfaces:**
- Consumes: `computeHexGrid` (Task 1), `resolveMapStyle`/`MAP_STYLES` (route-geo), `resolveMapFrame`/`MapFrame`,
  `HexGridConfigShape` (Task 2).
- Produces: `HexGridMap` React component `{ config: HexGridConfigShape; progress?: number }`.

Port the MapTiler harness from `skills/map-native/src/ChoroplethMap.tsx` (read it fully — init-once,
fitBounds, resize, MapFrame, legend, interactive hover popup). Apply these deltas:

1. **No world.geojson fetch** — the geometry is the computed grid, not admin boundaries. On init compute
   `const layout = computeHexGrid(config)` and build a FeatureCollection from `layout.cells` (each cell
   feature carries `{ __color: cell.color, __count: cell.count, __value: cell.value }`).
2. **Cell fill layer** — a `fill` layer on the cell source: `fill-color: ["get","__color"]`,
   `fill-opacity: 0.8` (ramped by `progress` when `progress < 1`); plus a thin cell outline `line` layer.
   Only populated cells exist in the source (empty already dropped by the core).
3. **Style mapStyle-adaptive** via `resolveMapStyle(config.mapStyle)` (mirror RouteMap), adapting outline
   + legend ink per style.
4. **Legend** — the sequential bin scale (`layout.bins` swatches with min–max ranges) + the aggregate
   label (`layout.aggregateLabel`). Never a size legend. In the MapFrame legend slot.
5. **Interaction** — hover a cell → popup with the count and the aggregate value (e.g. "42 points" or
   "mean 3.1"). Interactive build only.
6. **fitBounds** to `layout.bounds` with `mapFrame.pad`.
7. Keep a `progress` prop (Slice B reuse): `progress < 1` ramps cell fill opacity 0→1; omitted ⇒ 1. No
   Remotion import.

- [ ] **Step 1: Create the two sample configs**

`hex-grid-count.json` — a realistic point scatter (e.g. incidents/events across a region), `aggregate:"count"`,
`binShape:"hex"`, no `cellSizeKm` (auto), mapStyle unset (light). `hex-grid-mean.json` — points with a
`value`, `aggregate:"mean"`, `binShape:"square"`, `mapStyle:"dataviz-dark"`. Both: `type:"hex-grid"`,
`basemap:"world"`, ≥12-char insight title, description, source{name,url}. Keep the points within a
regional extent (a few hundred points) so the grid + snap-responsive extent gate behave (like the other
regional samples).

- [ ] **Step 2: Write `HexGridMap.tsx`** per the deltas. Verify `grep -c $'\\x00'` = 0.

- [ ] **Step 3: Wire `mount.tsx`**

Add: `if (config.type === "hex-grid") return <HexGridMap config={config} />;` (mirror choropleth), with the import.

- [ ] **Step 4: Wire `produce.mjs` + snap ready-gates**

Add `const isHexGrid = parsedConfig.type === "hex-grid";` and make `kinds` yield NO video kinds:
`const kinds = isHexGrid ? [] : isDotDensity ? [] : isLocator ? [] : isRoute ? (/* unchanged */) : (/* unchanged */);`.
Add the cell fill layer id (name it `hex-grid-cells`) to the layer-ready OR-gate in snap-static/proof/
responsive/a11y (additive, the way `dot-density-dots` / `locator-glyphs` were added) so hex-grid produces.

- [ ] **Step 5: Typecheck + tests**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean tsc (apart from pre-existing react-dom TS2688); all tests pass.

- [ ] **Step 6: Render-verify static + interactive, both regimes, light + dark**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a
bun scripts/produce.mjs assets/sample-data/hex-grid-count.json /tmp/hg/count static
bun scripts/produce.mjs assets/sample-data/hex-grid-mean.json /tmp/hg/mean static
```
Expected: each prints `PRODUCE_RESULT` with `static` + `interactive` PNGs. Inspect: count = hexagons
shaded by point density (darker where denser), sequential legend + "points per hexagon" label, light
basemap; mean = squares shaded by mean value, dark basemap. Confirm empty areas have NO cells, the grid
is legible, furniture correct. If a produce run errors in the web-build/snapshot phase (unrelated to
hex-grid), STOP and report DONE_WITH_CONCERNS with what completed.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/HexGridMap.tsx skills/map-native/src/mount.tsx skills/map-native/scripts/produce.mjs skills/map-native/scripts/snap-*.mjs skills/map-native/assets/sample-data/hex-grid-count.json skills/map-native/assets/sample-data/hex-grid-mean.json
git commit -m "feat(map-native): HexGridMap static+interactive (cell fill by bin, cell hover, sequential legend, mapStyle) + wiring"
```

---

## Task 4: KB type doc + SKILL roadmap + audit case

**Files:** Create `knowledge/references/map/types/hex-grid.md`; Modify `skills/map-native/SKILL.md`,
`skills/map-native/scripts/audit-cases.mjs`.

- [ ] **Step 1: Write the KB type doc**

Create `knowledge/references/map/types/hex-grid.md` (< 500 lines, mirror `types/choropleth.md`): what a
hex-grid/spatial-bins map is (aggregate points into a regular tessellation, colour by count/sum/mean;
distinct from dot-density [dots in existing regions] and choropleth [fixed admin regions]), the two bin
shapes (hex/square), the three aggregations, the deterministic turf-grid binning + auto cell size + cap,
empty-cells-dropped, hover = cell, mapStyle capability, when to use it (FT Visual Vocabulary — density of
a point cloud without admin boundaries). Note Slice A ships static + interactive; video = a following
slice. Credit conventions (data-to-viz, FT visual-vocabulary).

- [ ] **Step 2: Refresh the roadmap in SKILL.md**

In the map-type roadmap table, mark the Hex / grid row built (Slice A: static + interactive; video to
follow — V column `◻`) with all-formats as the target. Do not restructure the table.

- [ ] **Step 3: Add a hex-grid audit case**

In `skills/map-native/scripts/audit-cases.mjs`, add a hex-grid case (mirror an existing type) pointing at
`assets/sample-data/hex-grid-count.json`.

- [ ] **Step 4: Run tests + audit**

Run: `cd skills/map-native && bun test && bun run audit`
Expected: all tests pass; the audit runs the hex-grid case without a hex-grid-specific error
(pre-existing attribution-overlap violations affecting all types are unrelated).

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/hex-grid.md skills/map-native/SKILL.md skills/map-native/scripts/audit-cases.mjs
git commit -m "docs(map-native): hex-grid KB type doc + roadmap + audit case"
```

---

## Self-Review

**Spec coverage (Slice A):** binning core (grid + collect + aggregate + bins + empty-drop + cap +
degenerate) → Task 1; validation + conformance → Task 2; static + interactive + cell hover + legend +
mapStyle → Task 3; KB + roadmap + audit → Task 4. Slice B (video + `deriveHexGridStory`) is out of scope.

**Placeholder scan:** Pure cores (Tasks 1–2) carry complete code + tests. Task 3 (component) ports
`ChoroplethMap.tsx` with enumerated deltas — complete-by-reference to real in-repo code; sample-data
content is described by required fields. No "TBD".

**Type consistency:** `computeHexGrid`/`HexGridLayout`/`HexCell`, `validateHexGridConfig`/`HexGridConfigShape`,
`checkHexGridConformance`, `HexGridMap` names match across tasks. `BLUES` (theme/scale) + turf
`hexGrid`/`squareGrid`/`collect` consumed by Task 1. `binShape`/`aggregate` config keys consistent between
geo, validation, and the component. The cell layer id `hex-grid-cells` matches between the component
(Task 3) and the snap ready-gate (Task 3).
