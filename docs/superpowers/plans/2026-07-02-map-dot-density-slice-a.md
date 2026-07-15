# Map Dot-Density — Slice A (type core + static + interactive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the dot-density map type's core plus its static PNG and interactive free-nav map —
deterministic dots scattered inside each region proportional to a value (univariate) or split by
category (multivariate), with a "1 dot = N" legend and AI-selected light/dark basemap.

**Architecture:** Two pure cores — `dot-scatter.ts` (seeded, frame-deterministic point scatter
inside a polygon) and `dot-density-geo.ts` (region join + auto `dotValue` + per-region/per-category
dot allocation + legend) — plus `DotDensityMap.tsx` (a dot `circle` layer built from the scatter, a
transparent region hit-layer for hover, a legend), ported from ChoroplethMap. Reuses the choropleth
region-join pattern and the CVD `QUALITATIVE` palette.

**Tech Stack:** Bun, TypeScript, MapTiler SDK, turf, `bun:test`. (No Remotion in Slice A.)

**Scope note:** Slice A = static + interactive free-nav. Video (reveal/story/scrolly) + interactive
scrolly are Slice B (they add `deriveDotDensityStory`), out of scope here.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`.
- Code, comments, commit messages, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key lives in `splash/.env` (gitignored) — never commit or log it.
- Reuse: the choropleth region-join pattern (`src/choropleth-geo.ts`), `mainlandFeature`/`regionBounds`,
  `MapFrame`/`resolveMapFrame`, `resolveMapStyle`/`MAP_STYLES` + `QUALITATIVE` (`src/route-geo.ts`).
- **Frame-determinism:** the scatter uses a seeded PRNG (never `Math.random`/`Date.now`) and is
  computed ONCE; magnitude is encoded by dot count, never dot radius.
- After writing `DotDensityMap.tsx`, verify NUL-free: `grep -c $'\\x00' <file>` prints 0.

---

## File structure

**Create:** `src/dot-scatter.ts`, `src/dot-density-geo.ts`, `src/DotDensityMap.tsx`,
`assets/sample-data/dot-density-uni.json`, `assets/sample-data/dot-density-multi.json`,
`knowledge/references/map/types/dot-density.md`, `tests/dot-scatter.test.ts`,
`tests/dot-density-geo.test.ts`, `tests/dot-density-conformance.test.ts`.
**Modify:** `src/validate-config.ts`, `src/conformance.ts`, `src/mount.tsx`, `scripts/produce.mjs`,
`scripts/audit-cases.mjs`, `SKILL.md`.

---

## Task 1: `dot-scatter.ts` — deterministic scatter

**Files:** Create `skills/map-native/src/dot-scatter.ts`; Test `skills/map-native/tests/dot-scatter.test.ts`.

**Interfaces:**
- Produces: `mulberry32(seed: number): () => number`, `hashSeed(s: string): number`,
  `scatterInPolygon(feature: GeoJSON.Feature, nDots: number, seed: number): [number, number][]`.
- `scatterInPolygon` returns EXACTLY `nDots` points, all inside the feature, deterministic per
  `(feature, nDots, seed)`.

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/dot-scatter.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { scatterInPolygon, mulberry32, hashSeed } from "../src/dot-scatter";
import { booleanPointInPolygon } from "@turf/turf";

// A unit square polygon [0,0]-[10,10].
const square: GeoJSON.Feature = {
  type: "Feature",
  properties: {},
  geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
};

describe("mulberry32 / hashSeed", () => {
  it("is deterministic and in [0,1)", () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = [a(), a(), a()], ys = [b(), b(), b()];
    expect(xs).toEqual(ys);
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
  it("hashSeed is stable for a string", () => {
    expect(hashSeed("FRA|2")).toBe(hashSeed("FRA|2"));
    expect(hashSeed("FRA|2")).not.toBe(hashSeed("FRA|3"));
  });
});

describe("scatterInPolygon", () => {
  it("returns exactly nDots points", () => {
    expect(scatterInPolygon(square, 50, 7).length).toBe(50);
    expect(scatterInPolygon(square, 0, 7).length).toBe(0);
  });
  it("places every point inside the polygon", () => {
    for (const pt of scatterInPolygon(square, 200, 7))
      expect(booleanPointInPolygon(pt, square as any)).toBe(true);
  });
  it("is deterministic for the same (feature, n, seed)", () => {
    expect(scatterInPolygon(square, 40, 99)).toEqual(scatterInPolygon(square, 40, 99));
  });
  it("differs for a different seed", () => {
    expect(scatterInPolygon(square, 40, 1)).not.toEqual(scatterInPolygon(square, 40, 2));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/dot-scatter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/dot-scatter.ts`:

```typescript
// Deterministic point scatter inside a polygon — no Math.random, no Date.now. A seeded PRNG
// (mulberry32) drives rejection sampling in the feature's bbox; the same (feature, n, seed) always
// yields the same points, so the dots are stable across every Remotion render frame. The scatter is
// computed ONCE (not per frame). MultiPolygon regions allocate dots to sub-polygons by area.
import { bbox, booleanPointInPolygon, area, pointOnFeature, polygon } from "@turf/turf";

// Fast 32-bit PRNG. Returns a function producing floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a string hash → uint32, for a stable per-region (+category) seed.
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const MAX_ATTEMPTS_PER_DOT = 40;

function scatterSingle(
  feature: GeoJSON.Feature,
  nDots: number,
  seed: number,
): [number, number][] {
  if (nDots <= 0) return [];
  const [w, s, e, n] = bbox(feature);
  const rand = mulberry32(seed);
  const fallback = pointOnFeature(feature).geometry.coordinates as [number, number];
  const out: [number, number][] = [];
  for (let d = 0; d < nDots; d++) {
    let placed = false;
    for (let a = 0; a < MAX_ATTEMPTS_PER_DOT; a++) {
      const lon = w + rand() * (e - w);
      const lat = s + rand() * (n - s);
      if (booleanPointInPolygon([lon, lat], feature as never)) {
        out.push([lon, lat]);
        placed = true;
        break;
      }
    }
    // Thin/sliver region exhausted the attempt budget → a guaranteed-inside fallback point.
    if (!placed) out.push([fallback[0], fallback[1]]);
  }
  return out;
}

export function scatterInPolygon(
  feature: GeoJSON.Feature,
  nDots: number,
  seed: number,
): [number, number][] {
  if (nDots <= 0) return [];
  const geom = feature.geometry;
  if (geom.type !== "MultiPolygon") return scatterSingle(feature, nDots, seed);

  // MultiPolygon: allocate dots to sub-polygons by area (deterministic largest-remainder), scatter each.
  const polys = geom.coordinates.map(
    (rings) => polygon(rings) as GeoJSON.Feature,
  );
  const areas = polys.map((p) => area(p));
  const total = areas.reduce((sum, a) => sum + a, 0) || 1;
  const raw = areas.map((a) => (nDots * a) / total);
  const counts = raw.map((x) => Math.floor(x));
  let rem = nDots - counts.reduce((sum, c) => sum + c, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < rem; k++) counts[order[k].i]++;

  const out: [number, number][] = [];
  polys.forEach((p, i) => {
    out.push(...scatterSingle(p, counts[i], (seed + i + 1) >>> 0));
  });
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/dot-scatter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/dot-scatter.ts skills/map-native/tests/dot-scatter.test.ts
git commit -m "feat(map-native): deterministic seeded dot scatter (mulberry32 + rejection sampling)"
```

---

## Task 2: `dot-density-geo.ts` — join, auto dotValue, allocation

**Files:** Create `skills/map-native/src/dot-density-geo.ts`; Test `skills/map-native/tests/dot-density-geo.test.ts`.

**Interfaces:**
- Consumes: `QUALITATIVE` (from `./route-geo`), `hashSeed` (from `./dot-scatter`), `mainlandFeature` (from `./choropleth-geo`).
- Produces:
  - `interface DotDensityData { regionKey: string; valueField?: string; categories?: { field: string; label: string; color?: string }[]; rows: Record<string, string | number>[]; dotValue?: number }`
  - `interface RegionDotSpec { key: string; feature: GeoJSON.Feature; groups: { category: string | null; color: string; count: number; seed: number }[] }`
  - `interface DotDensityLayout { regions: RegionDotSpec[]; dotValue: number; categories: string[]; legend: { category: string; color: string }[]; bounds: [number, number, number, number]; hasCategories: boolean; capped: boolean; totalDots: number; unmatched: string[] }`
  - `function computeDotDensity(data: DotDensityData, features: GeoJSON.FeatureCollection, joinKey: string): DotDensityLayout`

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/dot-density-geo.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { computeDotDensity } from "../src/dot-density-geo";
import { QUALITATIVE } from "../src/route-geo";

const feat = (id: string): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: { type: "Polygon", coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] },
});
const world = { type: "FeatureCollection", features: [feat("AAA"), feat("BBB")] } as GeoJSON.FeatureCollection;

describe("computeDotDensity — univariate", () => {
  const layout = computeDotDensity(
    { regionKey: "id", valueField: "pop", rows: [{ id: "AAA", pop: 500000 }, { id: "BBB", pop: 100000 }] },
    world, "iso_a3",
  );
  it("auto-derives a nice dotValue near the target total", () => {
    // 600k units / ~5000 target ≈ 120 → nice round to 200 (nice ∈ 1/2/5×10^k)
    expect([100, 200, 500]).toContain(layout.dotValue);
    expect(layout.totalDots).toBeGreaterThan(1000);
    expect(layout.totalDots).toBeLessThanOrEqual(10000);
  });
  it("allocates one monochrome group per region, count = round(value/dotValue)", () => {
    expect(layout.hasCategories).toBe(false);
    const aaa = layout.regions.find((r) => r.key === "AAA")!;
    expect(aaa.groups.length).toBe(1);
    expect(aaa.groups[0].category).toBeNull();
    expect(aaa.groups[0].count).toBe(Math.round(500000 / layout.dotValue));
    expect(layout.legend).toEqual([]);
  });
});

describe("computeDotDensity — multivariate", () => {
  const layout = computeDotDensity(
    {
      regionKey: "id",
      categories: [{ field: "a", label: "Group A" }, { field: "b", label: "Group B" }],
      rows: [{ id: "AAA", a: 300000, b: 100000 }, { id: "BBB", a: 50000, b: 50000 }],
    },
    world, "iso_a3",
  );
  it("splits a region's dots by category, coloured from the CVD palette (sorted)", () => {
    expect(layout.hasCategories).toBe(true);
    expect(layout.categories).toEqual(["a", "b"]);
    expect(layout.legend).toEqual([
      { category: "Group A", color: QUALITATIVE[0] },
      { category: "Group B", color: QUALITATIVE[1] },
    ]);
    const aaa = layout.regions.find((r) => r.key === "AAA")!;
    expect(aaa.groups.map((g) => g.category)).toEqual(["a", "b"]);
    expect(aaa.groups[0].count).toBe(Math.round(300000 / layout.dotValue));
    expect(aaa.groups[0].color).toBe(QUALITATIVE[0]);
  });
});

describe("computeDotDensity — dotValue override + cap", () => {
  it("honours a supplied dotValue and flags the cap when total dots exceed the max", () => {
    const layout = computeDotDensity(
      { regionKey: "id", valueField: "pop", dotValue: 10, rows: [{ id: "AAA", pop: 500000 }] },
      world, "iso_a3",
    );
    expect(layout.dotValue).toBe(10);
    expect(layout.capped).toBe(true); // 50000 dots >> 10000 cap
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/dot-density-geo.test.ts`
Expected: FAIL — `computeDotDensity` not exported.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/dot-density-geo.ts`:

```typescript
// Pure core for the dot-density map: joins rows→regions (choropleth pattern), auto-derives a "nice"
// dotValue targeting a readable total dot count, and allocates dots per region (and per category in
// the multivariate regime). No MapTiler, no React. The component turns the output into a dot GeoJSON
// via dot-scatter's scatterInPolygon.
import { bbox } from "@turf/turf";
import { mainlandFeature } from "./choropleth-geo";
import { hashSeed } from "./dot-scatter";
import { QUALITATIVE } from "./route-geo";

export interface DotDensityData {
  regionKey: string;
  valueField?: string;
  categories?: { field: string; label: string; color?: string }[];
  rows: Record<string, string | number>[];
  dotValue?: number;
}
export interface RegionDotSpec {
  key: string;
  feature: GeoJSON.Feature;
  groups: { category: string | null; color: string; count: number; seed: number }[];
}
export interface DotDensityLayout {
  regions: RegionDotSpec[];
  dotValue: number;
  categories: string[];
  legend: { category: string; color: string }[];
  bounds: [number, number, number, number];
  hasCategories: boolean;
  capped: boolean;
  totalDots: number;
  unmatched: string[];
}

const TARGET_TOTAL_DOTS = 5000;
const MAX_TOTAL_DOTS = 10000;
const ACCENT = "#2171b5"; // univariate single hue

// Round up to a "nice" number (1/2/5 × 10^k) ≥ raw.
function niceValue(raw: number): number {
  const r = Math.max(1, raw);
  const mag = Math.pow(10, Math.floor(Math.log10(r)));
  const norm = r / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

export function computeDotDensity(
  data: DotDensityData,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
): DotDensityLayout {
  const hasCategories = !!(data.categories && data.categories.length > 0);
  const fields = hasCategories
    ? data.categories!.map((c) => c.field)
    : [data.valueField as string];

  // rows → region key → per-field value
  const byKey = new Map<string, number[]>();
  for (const row of data.rows) {
    const key = String(row[data.regionKey]);
    const vals = fields.map((f) => {
      const v = Number(row[f]);
      if (Number.isNaN(v)) throw new Error(`dot-density: invalid value for "${f}" in region ${key}`);
      return v;
    });
    byKey.set(key, vals);
  }

  const featureKeys = new Set(features.features.map((f) => String(f.properties?.[joinKey])));
  const unmatched = [...byKey.keys()].filter((k) => !featureKeys.has(k));

  const totalUnits = [...byKey.values()].reduce((s, vals) => s + vals.reduce((a, b) => a + b, 0), 0);
  if (totalUnits <= 0) throw new Error("dot-density: no positive values — nothing to map");

  const dotValue = data.dotValue ?? niceValue(totalUnits / TARGET_TOTAL_DOTS);

  // Category colours: sorted category order → QUALITATIVE (override via categories[].color).
  const categories = hasCategories ? data.categories!.map((c) => c.field) : [];
  const colorByField = new Map<string, string>();
  const legend: { category: string; color: string }[] = [];
  if (hasCategories) {
    data.categories!.forEach((c, i) => {
      const color = c.color ?? QUALITATIVE[i % QUALITATIVE.length];
      colorByField.set(c.field, color);
      legend.push({ category: c.label, color });
    });
  }

  let totalDots = 0;
  const regions: RegionDotSpec[] = [];
  for (const f of features.features) {
    const key = String(f.properties?.[joinKey]);
    const vals = byKey.get(key);
    if (!vals) continue; // no data for this region
    const groups = fields.map((field, i) => {
      const count = Math.round(vals[i] / dotValue);
      totalDots += count;
      return {
        category: hasCategories ? field : null,
        color: hasCategories ? (colorByField.get(field) as string) : ACCENT,
        count,
        seed: hashSeed(`${key}|${i}`),
      };
    });
    regions.push({ key, feature: f, groups });
  }

  const withData = {
    type: "FeatureCollection",
    features: regions.map((r) => mainlandFeature(r.feature)),
  } as GeoJSON.FeatureCollection;
  const bounds = (withData.features.length ? bbox(withData) : [-180, -85, 180, 85]) as [number, number, number, number];

  return {
    regions,
    dotValue,
    categories,
    legend,
    bounds,
    hasCategories,
    capped: totalDots > MAX_TOTAL_DOTS,
    totalDots,
    unmatched,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/dot-density-geo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/dot-density-geo.ts skills/map-native/tests/dot-density-geo.test.ts
git commit -m "feat(map-native): dot-density geo core — join, auto dotValue, per-region/category allocation"
```

---

## Task 3: Config validation + conformance

**Files:** Modify `src/validate-config.ts`, `src/conformance.ts`; Test `tests/dot-density-conformance.test.ts` (create).

**Interfaces:**
- Consumes: `MAP_STYLES` (route-geo), `checkGlobalMapConformance` (conformance.ts).
- Produces:
  - `type DotDensityConfigShape = { type: "dot-density"; regionKey: string; boundaries: string; rows: Record<string, string | number>[]; valueField?: string; categories?: { field: string; label: string; color?: string }[]; dotValue?: number; basemap: string; mapStyle?: string; title: string; description?: string; source?: { name?: string; url?: string } }`
  - `validateDotDensityConfig(spec: unknown): { ok: true; spec: DotDensityConfigShape; warnings: string[] } | { ok: false; errors: string[] }`
  - `checkDotDensityConformance(input: { title: string; description?: string; source: { name?: string; url?: string }; hasCategories: boolean; hasCategoryLegend: boolean; hasDotValueLegend: boolean; boundsNonEmpty: boolean; totalDots: number; capped: boolean; mapStyle?: string }, textColors: { text: string[]; bg: string }): string[]`

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/dot-density-conformance.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { validateDotDensityConfig } from "../src/validate-config";
import { checkDotDensityConformance } from "../src/conformance";

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };
const good = {
  title: "Where the population actually lives",
  description: "One dot = 1,000 residents, 2026",
  source: { name: "INSEE", url: "https://x" },
  hasCategories: false,
  hasCategoryLegend: false,
  hasDotValueLegend: true,
  boundsNonEmpty: true,
  totalDots: 4200,
  capped: false,
  mapStyle: "dataviz-light",
};

describe("validateDotDensityConfig", () => {
  it("accepts a univariate config", () => {
    const r = validateDotDensityConfig({
      type: "dot-density", regionKey: "dept", boundaries: "world",
      valueField: "pop", rows: [{ dept: "FRA", pop: 100 }], basemap: "world",
      title: "Where the population actually lives",
    });
    expect(r.ok).toBe(true);
  });
  it("rejects a config with neither valueField nor categories", () => {
    const r = validateDotDensityConfig({
      type: "dot-density", regionKey: "dept", boundaries: "world",
      rows: [{ dept: "FRA", pop: 100 }], basemap: "world",
      title: "Where the population actually lives",
    });
    expect(r.ok).toBe(false);
  });
});

describe("checkDotDensityConformance", () => {
  it("passes a well-formed univariate dot map", () => {
    expect(checkDotDensityConformance(good, okColors)).toEqual([]);
  });
  it("flags a missing '1 dot = N' legend", () => {
    expect(checkDotDensityConformance({ ...good, hasDotValueLegend: false }, okColors).join(" ")).toContain("1 dot");
  });
  it("flags a multivariate map missing its category legend", () => {
    expect(
      checkDotDensityConformance({ ...good, hasCategories: true, hasCategoryLegend: false }, okColors).join(" "),
    ).toContain("legend");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/dot-density-conformance.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement `validateDotDensityConfig`**

In `skills/map-native/src/validate-config.ts` append (mirror `validateRouteConfig`; `MAP_STYLES` is
already imported):

```typescript
export type DotDensityConfigShape = {
  type: "dot-density";
  regionKey: string;
  boundaries: string;
  rows: Record<string, string | number>[];
  valueField?: string;
  categories?: { field: string; label: string; color?: string }[];
  dotValue?: number;
  basemap: string;
  mapStyle?: string;
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
};

export function validateDotDensityConfig(
  spec: unknown,
):
  | { ok: true; spec: DotDensityConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  if (typeof s.regionKey !== "string" || !s.regionKey.trim())
    errors.push("regionKey must be a non-empty string");
  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");
  if (s.mapStyle !== undefined && !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string))
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);

  const hasCats = Array.isArray(s.categories) && (s.categories as unknown[]).length > 0;
  const hasValue = typeof s.valueField === "string" && s.valueField.trim().length > 0;
  if (!hasCats && !hasValue)
    errors.push("dot-density needs either valueField (univariate) or categories (multivariate)");
  if (hasCats) {
    for (let i = 0; i < (s.categories as unknown[]).length; i++) {
      const c = (s.categories as Record<string, unknown>[])[i];
      if (!c || typeof c.field !== "string" || !c.field.trim())
        errors.push(`categories[${i}].field must be a non-empty string`);
      if (typeof c.label !== "string" || !c.label.trim())
        errors.push(`categories[${i}].label must be a non-empty string`);
    }
  }
  if (s.dotValue !== undefined && (typeof s.dotValue !== "number" || !(s.dotValue > 0)))
    errors.push("dotValue must be a positive number");

  if (!Array.isArray(s.rows) || s.rows.length === 0)
    errors.push("rows must be a non-empty array");

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
  return { ok: true, spec: s as DotDensityConfigShape, warnings };
}
```

- [ ] **Step 4: Implement `checkDotDensityConformance`**

In `skills/map-native/src/conformance.ts` append (compose the global L0 guard first):

```typescript
export function checkDotDensityConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    hasCategories: boolean;
    hasCategoryLegend: boolean;
    hasDotValueLegend: boolean;
    boundsNonEmpty: boolean;
    totalDots: number;
    capped: boolean;
    mapStyle?: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    { title: input.title, description: input.description, source: input.source },
    textColors,
  );
  if (!input.hasDotValueLegend)
    v.push("dot-density needs a '1 dot = N' legend — the count is undecodable without it");
  if (input.hasCategories && !input.hasCategoryLegend)
    v.push("multivariate dot-density needs a category legend — the colour code is undecodable");
  if (!input.boundsNonEmpty) v.push("empty region bounds — basemap-fit impossible");
  if (input.totalDots < 1) v.push("no dots to place — all regions rounded to zero");
  if (input.mapStyle && !(MAP_STYLES as readonly string[]).includes(input.mapStyle))
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  return v;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/dot-density-conformance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/src/conformance.ts skills/map-native/tests/dot-density-conformance.test.ts
git commit -m "feat(map-native): dot-density config validation + conformance guard"
```

---

## Task 4: `DotDensityMap.tsx` (static + interactive) + wiring + render-verify

**Files:** Create `src/DotDensityMap.tsx`, `assets/sample-data/dot-density-uni.json`,
`dot-density-multi.json`; Modify `src/mount.tsx`, `scripts/produce.mjs`.

**Interfaces:**
- Consumes: `computeDotDensity` (Task 2), `scatterInPolygon` (Task 1), `resolveMapStyle`/`MAP_STYLES`
  (route-geo), `resolveMapFrame`/`MapFrame`, `DotDensityConfigShape` (Task 3).
- Produces: `DotDensityMap` React component `{ config: DotDensityConfigShape; progress?: number }`.

Port the MapTiler harness from `skills/map-native/src/ChoroplethMap.tsx` (read it fully — it fetches
`geo/world.geojson` via `staticFile`, joins, and renders region layers). Apply these deltas:

1. **Style mapStyle-adaptive** via `resolveMapStyle(config.mapStyle)` (not hardcoded LIGHT), mirroring
   RouteMap. Adapt legend ink + region-outline colour per style.
2. On load, after fetching the world GeoJSON: `const layout = computeDotDensity(config, worldGeoJson, "iso_a3")`.
   Build the **dot GeoJSON**: for each `region` and each `group`, call
   `scatterInPolygon(region.feature, group.count, group.seed)` and emit one Point feature per dot with
   `{ color: group.color }`. Assemble into one FeatureCollection. (This scatter is heavy but runs ONCE.)
3. **Dot layer** — a `circle` layer on the dot source: `circle-radius: 2` (fixed; ramp by `progress`
   only if `progress < 1`), `circle-color: ["get","color"]`, no stroke (or 0.3px hairline).
4. **Region context + hit-layer** — draw a faint region outline (`line`, low opacity) for context, and
   a transparent region `fill` layer bound to the boundary features (with region name + value(s) in
   properties) that captures hover → show region name + value(s) in a popup (interactive build only).
5. **Legend** — "1 dot = N units" (N = `layout.dotValue`) always; plus category swatches
   (`layout.legend`) when `layout.hasCategories`. Never a size legend. Render in the MapFrame legend slot.
6. **`fitBounds`** to `layout.bounds` with `mapFrame.pad`.
7. Keep a `progress` prop (Slice B reuse): `progress < 1` ramps dot opacity 0→1; omitted ⇒ 1 (static).
   No Remotion import.

- [ ] **Step 1: Create the two sample configs**

`dot-density-uni.json` — univariate over `world` (a handful of regions with a population-like value,
`valueField`, no `dotValue` so it auto-derives), mapStyle unset (light), `type:"dot-density"`,
`basemap:"world"`, ≥12-char insight title, description, source. `dot-density-multi.json` — multivariate
with 2–3 `categories` (each a value field per region), `mapStyle:"dataviz-dark"`. Use `iso_a3` region
keys present in `assets/geo/world.geojson`.

- [ ] **Step 2: Write `DotDensityMap.tsx`** per the deltas. Verify `grep -c $'\\x00'` = 0.

- [ ] **Step 3: Wire `mount.tsx`**

Add: `if (config.type === "dot-density") return <DotDensityMap config={config} />;` (mirror the
choropleth branch), with the import.

- [ ] **Step 4: Wire `produce.mjs` (static + interactive only — no video in Slice A)**

Add `const isDotDensity = parsedConfig.type === "dot-density";` and make `kinds` yield no video kinds:
`const kinds = isDotDensity ? [] : isLocator ? [] : isRoute ? (/* unchanged */) : (/* unchanged */);`
(Web build + snaps run for every type, so static + interactive are produced unchanged.) If the snap
scripts gate on a layer id, add the dot-density layer id (e.g. `dot-density-dots`) to their ready-gate
the way locator's `locator-glyphs` was added.

- [ ] **Step 5: Typecheck + tests**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean tsc (apart from the pre-existing react-dom TS2688); all tests pass.

- [ ] **Step 6: Render-verify static + interactive, both regimes, light + dark**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bun scripts/produce.mjs assets/sample-data/dot-density-uni.json /tmp/dd/uni static
bun scripts/produce.mjs assets/sample-data/dot-density-multi.json /tmp/dd/multi static
```
Expected: each prints `PRODUCE_RESULT` with `static` + `interactive` PNGs. Inspect: uni = monochrome
dots denser where the value is higher, faint region outlines, "1 dot = N" legend, light basemap;
multi = dots coloured by category with a category legend, dark basemap. Confirm dots stay inside their
regions and the map is legible (not an ink-blob). If a produce run errors in the web-build/snapshot
phase (unrelated to dot-density), STOP and report DONE_WITH_CONCERNS with what completed.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/DotDensityMap.tsx skills/map-native/src/mount.tsx skills/map-native/scripts/produce.mjs skills/map-native/scripts/snap-*.mjs skills/map-native/assets/sample-data/dot-density-uni.json skills/map-native/assets/sample-data/dot-density-multi.json
git commit -m "feat(map-native): DotDensityMap static+interactive (deterministic dots, region hover, dot-value + category legend, mapStyle) + wiring"
```

---

## Task 5: KB type doc + SKILL roadmap + audit case

**Files:** Create `knowledge/references/map/types/dot-density.md`; Modify `skills/map-native/SKILL.md`,
`skills/map-native/scripts/audit-cases.mjs`.

- [ ] **Step 1: Write the KB type doc**

Create `knowledge/references/map/types/dot-density.md` (< 500 lines, mirror `types/choropleth.md`):
what a dot-density map is (density without area-bias; one dot = N units; distinct from choropleth
[shade per area] and proportional-symbol [size at a point]), the two regimes (univariate monochrome /
multivariate coloured-by-category), the deterministic seeded scatter (frame-safe), the auto `dotValue`
+ cap, hover = region, mapStyle capability, when to use it (FT Visual Vocabulary). Note Slice A ships
static + interactive; video = a following slice. Credit conventions (data-to-viz, FT visual-vocabulary).

- [ ] **Step 2: Refresh the roadmap in SKILL.md**

In the map-type roadmap table, mark the dot-density row built (Slice A: static + interactive; video to
follow) with all-formats as the target. Do not restructure the table.

- [ ] **Step 3: Add a dot-density audit case**

In `skills/map-native/scripts/audit-cases.mjs`, add a dot-density case (mirror an existing type)
pointing at `assets/sample-data/dot-density-multi.json`.

- [ ] **Step 4: Run tests + audit**

Run: `cd skills/map-native && bun test && bun run audit`
Expected: all tests pass; the audit runs the dot-density case without a dot-density-specific error
(pre-existing attribution-overlap violations affecting all types are unrelated).

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/dot-density.md skills/map-native/SKILL.md skills/map-native/scripts/audit-cases.mjs
git commit -m "docs(map-native): dot-density KB type doc + roadmap + audit case"
```

---

## Self-Review

**Spec coverage (Slice A):** deterministic scatter → Task 1; join + auto dotValue + allocation +
legend model → Task 2; validation + conformance → Task 3; static + interactive + hover + legend +
mapStyle → Task 4; KB + roadmap + audit → Task 5. Slice B (video + `deriveDotDensityStory`) is
explicitly out of scope.

**Placeholder scan:** Pure cores (Tasks 1–3) carry complete code + tests. Task 4 (component) ports
`ChoroplethMap.tsx` with enumerated deltas — complete-by-reference to real in-repo code, the
established pattern; sample-data content is described by required fields. No "TBD".

**Type consistency:** `scatterInPolygon(feature, nDots, seed)`, `hashSeed`, `computeDotDensity`,
`DotDensityLayout`/`RegionDotSpec`, `validateDotDensityConfig`/`DotDensityConfigShape`,
`checkDotDensityConformance`, `DotDensityMap` names match across tasks. `hashSeed` is defined in Task 1
and consumed by Task 2's `computeDotDensity` (the per-group seed). `QUALITATIVE` (from route-geo,
exported during the locator work) is consumed by Task 2. Regime detection = `categories` presence,
consistent between geo, validation, and conformance.
