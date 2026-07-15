# Proportional Symbol Map (map-native, 2nd type) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **proportional symbol** map type to `map-native` — points sized by value on a MapTiler basemap, shipping the same three formats as choropleth (static PNG, interactive HTML, Remotion video) plus a conformance guard.

**Architecture:** Extract a pure **point-based geometric core** (`symbol-geo.ts`, no MapTiler/React) distinct from the choropleth region-join core; render it through one `progress`-driven `SymbolMap.tsx` (a MapTiler GL `circle` layer, reusing Tom's per-frame harness); derive static/interactive via Vite (web entry dispatches on `config.type`) and video via new `SymbolStory` Remotion compositions; gate quality with `checkSymbolConformance` and `validateSymbolConfig`.

**Tech Stack:** Bun, TypeScript, bun:test, React, `@maptiler/sdk`, Remotion, `@turf/turf` (already deps of map-native).

## Global Constraints

- **Bun only** — `bun`, `bunx`, `bun test`. The sole accepted exception is Remotion render via `bunx remotion` (its node toolchain), exactly as choropleth already does.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO `Co-Authored-By: Claude`. (User rule; overrides any default trailer instruction.)
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** (`VITE_MAPTILER_KEY` web / `REMOTION_MAPTILER_KEY` video, from `/splash/.env`) — never hard-code or log it.
- **Area-proportional sizing** (`r ∝ √value`), never radius-proportional — enforced by the conformance guard.
- **Single hue** (size is the encoding); furniture standard = title-insight + description + source.
- **Verify at render** — eyeball each format at multiple widths (360→1600) and on the margins, not just at the unit-test level. A static PNG cannot show hover — verify interactive behaviour live in-browser (Playwright hover + screenshot).

All work happens in `skills/map-native/`. Paths below are relative to that directory unless noted.

---

### Task 1: `symbol-geo.ts` — the pure point-based core

**Files:**
- Create: `skills/map-native/src/symbol-geo.ts`
- Test: `skills/map-native/tests/symbol-geo.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module, framework-free).
- Produces:
  - `interface SymbolPoint { lon: number; lat: number; value: number; label?: string }`
  - `interface SymbolData { points: SymbolPoint[] }`
  - `interface PlacedSymbol extends SymbolPoint { radius: number }`
  - `interface LegendStop { value: number; radius: number }`
  - `interface SymbolGeometry { symbols: PlacedSymbol[]; maxRadius: number; legend: LegendStop[]; domain: [number, number]; bounds: [number, number, number, number] }`
  - `function symbolRadius(value: number, maxValue: number, maxRadius: number): number`
  - `function niceNumber(x: number): number`
  - `function legendStops(domain: [number, number], maxRadius: number): LegendStop[]`
  - `function symbolGeometry(data: SymbolData, maxRadius: number): SymbolGeometry`

- [ ] **Step 1: Write the failing test**

Create `tests/symbol-geo.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import {
  symbolGeometry,
  symbolRadius,
  niceNumber,
  legendStops,
  type SymbolData,
} from "../src/symbol-geo";

const data: SymbolData = {
  points: [
    { lon: 2.35, lat: 48.85, value: 100, label: "Paris" },
    { lon: 13.4, lat: 52.52, value: 25, label: "Berlin" },
    { lon: -3.7, lat: 40.4, value: 400, label: "Madrid" },
  ],
};

describe("symbolRadius", () => {
  it("is area-proportional: 4x the value gives 2x the radius", () => {
    const r1 = symbolRadius(100, 400, 40);
    const r4 = symbolRadius(400, 400, 40);
    expect(r4).toBeCloseTo(40, 6); // max value → maxRadius
    expect(r4 / r1).toBeCloseTo(2, 6); // √(400/100) = 2, NOT 4
  });
  it("returns 0 for a non-positive max", () => {
    expect(symbolRadius(10, 0, 40)).toBe(0);
  });
});

describe("niceNumber", () => {
  it("rounds to one significant figure", () => {
    expect(niceNumber(412)).toBe(400);
    expect(niceNumber(87)).toBe(90);
    expect(niceNumber(0)).toBe(0);
  });
});

describe("symbolGeometry", () => {
  const g = symbolGeometry(data, 40);
  it("sorts symbols by value descending (large drawn first, small on top)", () => {
    expect(g.symbols.map((s) => s.value)).toEqual([400, 100, 25]);
  });
  it("sizes radii area-proportionally against the max value", () => {
    const madrid = g.symbols[0];
    const paris = g.symbols[1];
    expect(madrid.radius).toBeCloseTo(40, 6);
    expect(paris.radius / madrid.radius).toBeCloseTo(Math.sqrt(100 / 400), 6);
  });
  it("reports the value domain and a non-empty bbox", () => {
    expect(g.domain).toEqual([25, 400]);
    expect(g.bounds).toEqual([-3.7, 40.4, 13.4, 52.52]);
  });
  it("builds at least two nested legend stops with nice values", () => {
    expect(g.legend.length).toBeGreaterThanOrEqual(2);
    expect(g.legend[0].value).toBe(400); // largest stop = nice(max)
    expect(g.legend.every((s) => s.radius > 0)).toBe(true);
  });
  it("is deterministic — same input, same output", () => {
    expect(symbolGeometry(data, 40)).toEqual(g);
  });
});

describe("legendStops", () => {
  it("dedupes collapsed nice values and still returns >= 2 stops", () => {
    const stops = legendStops([1, 3], 40); // tiny domain
    expect(stops.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/symbol-geo.test.ts`
Expected: FAIL — `Cannot find module '../src/symbol-geo'`.

- [ ] **Step 3: Write the implementation**

Create `src/symbol-geo.ts`:

```ts
// Pure point-based core for the proportional symbol map — no MapTiler, no React.
// The render harness mutates state frame-by-frame, so every number a frame needs
// must come from a deterministic pure function (this file). Mirror of choropleth-geo
// for the point (lat/lon) case: no region join, sizing instead of binning.

export interface SymbolPoint {
  lon: number;
  lat: number;
  value: number;
  label?: string;
}
export interface SymbolData {
  points: SymbolPoint[];
}
export interface PlacedSymbol extends SymbolPoint {
  radius: number;
}
export interface LegendStop {
  value: number;
  radius: number;
}
export interface SymbolGeometry {
  symbols: PlacedSymbol[]; // sorted by value DESC
  maxRadius: number;
  legend: LegendStop[];
  domain: [number, number]; // [min, max]
  bounds: [number, number, number, number]; // [west, south, east, north]
}

// Area-proportional radius: a symbol's AREA (πr²) scales with value, so r ∝ √value.
// Radius-proportional sizing (r ∝ value) exaggerates large values quadratically — banned.
export function symbolRadius(
  value: number,
  maxValue: number,
  maxRadius: number,
): number {
  if (maxValue <= 0) return 0;
  return maxRadius * Math.sqrt(Math.max(0, value) / maxValue);
}

// Round to one significant figure — legend reference values read as "nice" numbers.
export function niceNumber(x: number): number {
  if (x <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  return Math.round(x / mag) * mag;
}

// Nested-circle legend: largest + two smaller reference values, deduped, each ≥ 2 kept.
export function legendStops(
  domain: [number, number],
  maxRadius: number,
): LegendStop[] {
  const [, max] = domain;
  const candidates = [max, max * 0.4, max * 0.1].map(niceNumber);
  const seen = new Set<number>();
  const stops: LegendStop[] = [];
  for (const value of candidates) {
    if (value <= 0 || seen.has(value)) continue;
    seen.add(value);
    stops.push({ value, radius: symbolRadius(value, max, maxRadius) });
  }
  // Guarantee at least two stops even when nice-rounding collapses the candidates.
  if (stops.length < 2 && max > 0) {
    const half = niceNumber(max / 2) || max / 2;
    if (!seen.has(half) && half > 0)
      stops.push({ value: half, radius: symbolRadius(half, max, maxRadius) });
  }
  return stops;
}

export function symbolGeometry(
  data: SymbolData,
  maxRadius: number,
): SymbolGeometry {
  if (!data.points.length)
    throw new Error("symbolGeometry: no points — nothing to map");

  const values = data.points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const symbols: PlacedSymbol[] = [...data.points]
    .sort((a, b) => b.value - a.value) // large first → small drawn on top
    .map((p) => ({ ...p, radius: symbolRadius(p.value, max, maxRadius) }));

  const lons = data.points.map((p) => p.lon);
  const lats = data.points.map((p) => p.lat);
  const bounds: [number, number, number, number] = [
    Math.min(...lons),
    Math.min(...lats),
    Math.max(...lons),
    Math.max(...lats),
  ];

  return {
    symbols,
    maxRadius,
    legend: legendStops([min, max], maxRadius),
    domain: [min, max],
    bounds,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/map-native && bun test tests/symbol-geo.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/symbol-geo.ts skills/map-native/tests/symbol-geo.test.ts
git commit -m "feat(map-native): symbol-geo pure core — area-proportional sizing + nested legend"
```
(NO Claude-Session trailer.)

---

### Task 2: `validateSymbolConfig` — framework-free config validation

**Files:**
- Modify: `skills/map-native/src/validate-config.ts` (append; keep `validateChoroplethConfig` intact)
- Test: `skills/map-native/tests/validate-config.test.ts` (append a `validateSymbolConfig` describe block)

**Interfaces:**
- Consumes: `SymbolPoint` shape from Task 1 (structurally — the validator does not import it; it checks raw `unknown`).
- Produces:
  - `type SymbolConfigShape = { type: "symbol"; points: { lon: number; lat: number; value: number; label?: string }[]; basemap: string; title: string; description?: string; valueUnit?: string; source?: { name?: string; url?: string } }`
  - `function validateSymbolConfig(spec: unknown): { ok: true; spec: SymbolConfigShape; warnings: string[] } | { ok: false; errors: string[] }`

- [ ] **Step 1: Write the failing test**

Append to `tests/validate-config.test.ts`:

```ts
import { validateSymbolConfig } from "../src/validate-config";

const okSymbol = {
  type: "symbol",
  points: [
    { lon: 2.35, lat: 48.85, value: 100, label: "Paris" },
    { lon: -3.7, lat: 40.4, value: 400, label: "Madrid" },
  ],
  basemap: "world",
  title: "Madrid dwarfs Paris on this measure",
  description: "Value by city, 2024",
  valueUnit: "k",
  source: { name: "Source 2025", url: "https://example.org/x" },
};

describe("validateSymbolConfig", () => {
  it("accepts a well-formed symbol config with no warnings", () => {
    const r = validateSymbolConfig(okSymbol);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });
  it("rejects an out-of-range longitude", () => {
    const r = validateSymbolConfig({
      ...okSymbol,
      points: [{ lon: 200, lat: 40, value: 1 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => /lon/.test(e))).toBe(true);
  });
  it("rejects a non-numeric or negative value", () => {
    const bad = validateSymbolConfig({
      ...okSymbol,
      points: [{ lon: 2, lat: 48, value: -5 }],
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => /value/.test(e))).toBe(true);
  });
  it("rejects an empty points array", () => {
    const r = validateSymbolConfig({ ...okSymbol, points: [] });
    expect(r.ok).toBe(false);
  });
  it("rejects a title that is just a year range", () => {
    const r = validateSymbolConfig({ ...okSymbol, title: "2024" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => /title/.test(e))).toBe(true);
  });
  it("warns on missing description and source", () => {
    const r = validateSymbolConfig({
      type: "symbol",
      points: [{ lon: 2, lat: 48, value: 1 }],
      basemap: "world",
      title: "A perfectly long insight title here",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => /description/.test(w))).toBe(true);
      expect(r.warnings.some((w) => /source/.test(w))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/validate-config.test.ts`
Expected: FAIL — `validateSymbolConfig` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/validate-config.ts` (after `validateChoroplethConfig`). Reuse the same title rule as choropleth — title < 12 chars or matching the year-range regex is an error:

```ts
export type SymbolConfigShape = {
  type: "symbol";
  points: { lon: number; lat: number; value: number; label?: string }[];
  basemap: string;
  title: string;
  description?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
};

// Framework-free structural validation of a symbol-map config (pre-render — no
// MapTiler needed). Errors block; warnings flag the furniture standard. Mirror of
// validateChoroplethConfig for the point case (lat/lon, no region join).
export function validateSymbolConfig(
  spec: unknown,
):
  | { ok: true; spec: SymbolConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12)
    errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  const points = s.points;
  if (!Array.isArray(points) || points.length === 0) {
    errors.push("points must be a non-empty array");
  } else {
    for (let i = 0; i < points.length; i++) {
      const p = points[i] as Record<string, unknown> | null;
      if (!p || typeof p !== "object") {
        errors.push(`point ${i} is not an object`);
        continue;
      }
      const lon = p.lon;
      const lat = p.lat;
      const value = p.value;
      if (typeof lon !== "number" || Number.isNaN(lon) || lon < -180 || lon > 180)
        errors.push(`point ${i} lon must be a number in [-180, 180]`);
      if (typeof lat !== "number" || Number.isNaN(lat) || lat < -90 || lat > 90)
        errors.push(`point ${i} lat must be a number in [-90, 90]`);
      if (typeof value !== "number" || Number.isNaN(value) || value < 0)
        errors.push(`point ${i} value must be a non-negative number`);
    }
  }

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as SymbolConfigShape, warnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/map-native && bun test tests/validate-config.test.ts`
Expected: PASS (existing choropleth cases + new symbol cases).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/tests/validate-config.test.ts
git commit -m "feat(map-native): validateSymbolConfig — point/coord + furniture validation"
```
(NO Claude-Session trailer.)

---

### Task 3: `checkSymbolConformance` — the per-type quality guard

**Files:**
- Modify: `skills/map-native/src/conformance.ts` (append; keep `checkChoroplethConformance`, `contrastRatio`, `relativeLuminance` intact)
- Test: `skills/map-native/tests/conformance.test.ts` (append a `checkSymbolConformance` describe block)

**Interfaces:**
- Consumes: `contrastRatio(a, b)` already in `conformance.ts`.
- Produces:
  - `const SYMBOL_MAX_VIEWPORT_FRACTION = 0.25`
  - `function checkSymbolConformance(input: { title: string; description?: string; source: { name?: string; url?: string }; sizingMode: "area" | "radius"; hasLegend: boolean; legendStops: number; maxRadiusPx: number; viewportMinPx: number; pointsWithData: number; boundsNonEmpty: boolean; strokeContrast: number }, textColors: { text: string[]; bg: string }): string[]`
  - Returns an array of violation strings (empty = conformant), exactly like `checkChoroplethConformance`.

- [ ] **Step 1: Write the failing test**

Append to `tests/conformance.test.ts`:

```ts
import { checkSymbolConformance } from "../src/conformance";

const symText = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const okSymbol = {
  title: "Madrid dwarfs Paris and Berlin on this measure",
  description: "Value by city, 2024",
  source: { name: "Source 2025", url: "https://example.org/x" },
  sizingMode: "area" as const,
  hasLegend: true,
  legendStops: 3,
  maxRadiusPx: 40,
  viewportMinPx: 720,
  pointsWithData: 3,
  boundsNonEmpty: true,
  strokeContrast: 4,
};

describe("checkSymbolConformance", () => {
  it("passes a conformant symbol map", () => {
    expect(checkSymbolConformance(okSymbol, symText)).toEqual([]);
  });
  it("flags radius-proportional sizing", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, sizingMode: "radius" }, symText).some(
        (m) => /area-proportional/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a missing legend", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, hasLegend: false }, symText).some(
        (m) => /legend/.test(m),
      ),
    ).toBe(true);
  });
  it("flags fewer than two legend stops", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, legendStops: 1 }, symText).some((m) =>
        /legend/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a symbol that swallows the map", () => {
    expect(
      checkSymbolConformance(
        { ...okSymbol, maxRadiusPx: 300, viewportMinPx: 720 },
        symText,
      ).some((m) => /too large|swallows|viewport/.test(m)),
    ).toBe(true);
  });
  it("flags a faint stroke (symbol not separable from basemap)", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, strokeContrast: 1.2 }, symText).some(
        (m) => /stroke/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a year-range title", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, title: "2024" }, symText).some((m) =>
        /title/.test(m),
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: FAIL — `checkSymbolConformance` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/conformance.ts`:

```ts
// A symbol's largest radius must not exceed this fraction of the smaller viewport
// dimension — beyond it, one symbol swallows the map and the pattern is unreadable.
export const SYMBOL_MAX_VIEWPORT_FRACTION = 0.25;

export function checkSymbolConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    sizingMode: "area" | "radius";
    hasLegend: boolean;
    legendStops: number;
    maxRadiusPx: number;
    viewportMinPx: number;
    pointsWithData: number;
    boundsNonEmpty: boolean;
    strokeContrast: number;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v: string[] = [];
  const title = input.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    v.push(`title is a year range, not an insight: "${title}"`);
  if (!input.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!input.source?.name?.trim()) v.push("missing source name");
  if (!input.source?.url?.trim()) v.push("missing source url");
  for (const t of textColors.text) {
    const r = contrastRatio(t, textColors.bg);
    if (r < 4.5)
      v.push(
        `text colour ${t} contrast ${r.toFixed(2)}:1 on ${textColors.bg} < 4.5:1`,
      );
  }
  if (input.sizingMode !== "area")
    v.push(
      "symbols must be area-proportional (r ∝ √value), not radius-proportional",
    );
  if (!input.hasLegend)
    v.push("symbol map needs a legend (size is undecodable without it)");
  if (input.legendStops < 2)
    v.push(
      `legend has ${input.legendStops} reference circle(s) — need at least 2 to read the size scale`,
    );
  if (input.maxRadiusPx > input.viewportMinPx * SYMBOL_MAX_VIEWPORT_FRACTION)
    v.push(
      `largest symbol ${input.maxRadiusPx}px is too large for the ${input.viewportMinPx}px viewport (swallows the map)`,
    );
  if (input.pointsWithData < 1) v.push("no point has data");
  if (!input.boundsNonEmpty) v.push("empty data bounds — basemap-fit impossible");
  if (input.strokeContrast < 2)
    v.push(
      `symbol stroke contrast ${input.strokeContrast.toFixed(2)} too faint to separate symbols from the basemap`,
    );
  return v;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: PASS (existing choropleth cases + new symbol cases).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "feat(map-native): checkSymbolConformance — area-sizing + legend + size-bound guard"
```
(NO Claude-Session trailer.)

---

### Task 4: `SymbolMap.tsx` + web wiring (static + interactive)

This task is **render-verified**, not unit-tested: it is a MapTiler+React WebGL component that must look right, mirroring `src/ChoroplethMap.tsx`. Hold to the exemplar's structure exactly — the harness rules are non-negotiable.

**Files:**
- Create: `skills/map-native/src/SymbolMap.tsx`
- Create: `skills/map-native/assets/sample-data/symbol.json` (a committed sample, like `choropleth.json`)
- Modify: `skills/map-native/src/mount.tsx` (dispatch on `config.type`)

**Interfaces:**
- Consumes: `symbolGeometry`, `type SymbolData`, `type SymbolGeometry` (Task 1).
- Produces:
  - `interface SymbolConfig extends SymbolData { type: "symbol"; basemap: string; title?: string; description?: string; valueUnit?: string; source?: { name: string; url: string } }`
  - `const SymbolMap: React.FC<{ config: SymbolConfig; progress?: number; interactive?: boolean }>`

- [ ] **Step 1: Create the committed sample**

Create `assets/sample-data/symbol.json`:

```json
{
  "type": "symbol",
  "points": [
    { "lon": 2.3522, "lat": 48.8566, "value": 181, "label": "Paris" },
    { "lon": -0.1276, "lat": 51.5072, "value": 296, "label": "London" },
    { "lon": 13.405, "lat": 52.52, "value": 88, "label": "Berlin" },
    { "lon": -3.7038, "lat": 40.4168, "value": 124, "label": "Madrid" },
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

- [ ] **Step 2: Write `SymbolMap.tsx`**

Mirror `ChoroplethMap.tsx`'s harness exactly (the comments below mark where it diverges from choropleth). Create `src/SymbolMap.tsx`:

```tsx
import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { symbolGeometry, type SymbolData } from "./symbol-geo";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

const SYMBOL_FILL = "#2171b5"; // single hue — size is the encoding
const SYMBOL_STROKE = "#ffffff"; // white halo separates symbols from the basemap
const MAX_RADIUS_PX = 40;

export interface SymbolConfig extends SymbolData {
  type: "symbol";
  basemap: string;
  title?: string;
  description?: string;
  valueUnit?: string;
  source?: { name: string; url: string };
}

interface Props {
  config: SymbolConfig;
  progress?: number;
  interactive?: boolean;
}

export const SymbolMap: React.FC<Props> = ({
  config,
  progress = 1,
  interactive = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);

  const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

  // Init once.
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ],
      zoom: 3,
      interactive,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    mapRef.current = map;

    map.on("load", () => {
      // One GeoJSON source: a point per symbol, carrying its target radius.
      map.addSource("symbols", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geo.symbols.map((s) => ({
            type: "Feature",
            properties: { value: s.value, label: s.label ?? "", radius: s.radius },
            geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          })),
        },
      });
      // Circle layer; radius driven by the feature's `radius` × progress (set per frame).
      map.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        paint: {
          "circle-radius": ["*", ["get", "radius"], progress],
          "circle-color": SYMBOL_FILL,
          "circle-opacity": 0.75,
          "circle-stroke-color": SYMBOL_STROKE,
          "circle-stroke-width": 1.5,
        },
      });

      map.fitBounds(geo.bounds, { padding: 64, duration: 0 });

      if (interactive) {
        map.addControl(new maptilersdk.NavigationControl({}), "top-right");
        const popup = new maptilersdk.Popup({ closeButton: false });
        map.on("mouseenter", "symbol-circles", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { label: string; value: number };
          popup
            .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
            .setHTML(
              `<strong>${p.label}</strong><br/>${p.value}${config.valueUnit ?? ""}`,
            )
            .addTo(map);
        });
        map.on("mouseleave", "symbol-circles", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      renderLegend();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per frame: scale the radius by progress (the reveal — circles grow 0 → target).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("symbol-circles")) return;
    map.setPaintProperty("symbol-circles", "circle-radius", [
      "*",
      ["get", "radius"],
      progress,
    ]);
    map.triggerRepaint();
  }, [progress]);

  // Nested-circle legend (largest stop outermost), drawn as inline SVG.
  function renderLegend() {
    const el = legendRef.current;
    if (!el) return;
    const max = geo.legend[0]?.radius ?? MAX_RADIUS_PX;
    const h = max * 2 + 24;
    const rows = geo.legend
      .map(
        (s) =>
          `<circle cx="${max + 2}" cy="${h - s.radius - 2}" r="${s.radius}" fill="none" stroke="#666" />` +
          `<text x="${max * 2 + 10}" y="${h - s.radius * 2 - 2 + 4}" font-size="11" fill="#333">${s.value}${config.valueUnit ?? ""}</text>`,
      )
      .join("");
    el.innerHTML = `<svg width="${max * 2 + 70}" height="${h}">${rows}</svg>`;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        ref={legendRef}
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          background: "rgba(255,255,255,0.85)",
          padding: "8px 10px",
          borderRadius: 6,
        }}
      />
    </div>
  );
};
```

- [ ] **Step 3: Wire the web entry to dispatch on `config.type`**

Replace `src/mount.tsx` with a type dispatch (choropleth stays the default for back-compat):

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { ChoroplethMap, type ChoroplethConfig } from "./ChoroplethMap";
import { SymbolMap, type SymbolConfig } from "./SymbolMap";
import sampleChoropleth from "../assets/sample-data/choropleth.json";

declare const __CONFIG__: (ChoroplethConfig | SymbolConfig) | null;
declare const __INTERACTIVE__: boolean;

const config: ChoroplethConfig | SymbolConfig =
  typeof __CONFIG__ !== "undefined" && __CONFIG__ !== null
    ? __CONFIG__
    : (sampleChoropleth as ChoroplethConfig);

const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : true;

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");

const isSymbol = (config as { type?: string }).type === "symbol";

createRoot(root).render(
  <div style={{ width: "100vw", height: "100vh" }}>
    {isSymbol ? (
      <SymbolMap config={config as SymbolConfig} progress={1} interactive={interactive} />
    ) : (
      <ChoroplethMap config={config as ChoroplethConfig} progress={1} interactive={interactive} />
    )}
  </div>,
);
```

- [ ] **Step 4: Build + render static and interactive from the sample**

Load the key from `/splash/.env` (never print it) and produce the web formats only:

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/system-test/symbol-map static
```

Expected: `/tmp/system-test/symbol-map/static.png` and `interactive.png` written; `PRODUCE_RESULT` JSON logged. Open `static.png` — circles sized by funding (London largest, Amsterdam smallest), white-haloed, nested legend bottom-right, title/description/source furniture present.

- [ ] **Step 5: Verify interactive hover live (a PNG cannot show hover)**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
INTERACTIVE=1 bunx vite build
# then load dist/interactive/index.html in Playwright, hover a circle, assert the popup shows the city + value, screenshot to /tmp/system-test/symbol-map/hover.png
bun scripts/snap-proof.mjs
```

(`snap-proof.mjs` already drives the interactive build with a Playwright hover + screenshot; confirm it targets a `symbol-circles` feature when the config type is symbol — if it is choropleth-specific, hover the centre of the largest circle by screen coords and assert the popup text contains a city label.)

Expected: a hover screenshot showing the popup with a city name + value. If the snap helper is choropleth-coupled and cannot be reused as-is, note it in the task report and capture the hover with an inline Playwright snippet instead — do not claim hover works from a static render.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/SymbolMap.tsx skills/map-native/src/mount.tsx skills/map-native/assets/sample-data/symbol.json
git commit -m "feat(map-native): SymbolMap component + web dispatch (static + interactive)"
```
(NO Claude-Session trailer.)

---

### Task 5: Video compositions + live e2e proof

**Files:**
- Create: `skills/map-native/src/components/SymbolStory.tsx`
- Modify: `skills/map-native/remotion/src/Root.tsx` (register `SymbolStory` / `SymbolStorySquare` / `SymbolStoryPortrait`)
- Modify: `skills/map-native/scripts/produce.mjs` (choose the composition set by `config.type`)
- Create: `skills/map-native/output-proof/symbol/e2e-proof.md` (the honest record)

**Interfaces:**
- Consumes: `symbolGeometry`, `type SymbolData` (Task 1); `SymbolConfig` (Task 4).
- Produces: three Remotion compositions whose `component` is `SymbolStory` and whose `defaultProps` is `{ config: <symbol config> }`.

- [ ] **Step 1: Write `SymbolStory.tsx` (single-shot reveal — radii grow over the clip)**

v1 video is a single establish→reveal (no multi-beat camera tour — that is choropleth's `deriveMapStory`, deferred for symbols). Mirror the harness in `ChoroplethStory.tsx`. Create `src/components/SymbolStory.tsx`:

```tsx
import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { symbolGeometry } from "../symbol-geo";
import type { SymbolConfig } from "../SymbolMap";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const SYMBOL_FILL = "#2171b5";
const SYMBOL_STROKE = "#ffffff";
const MAX_RADIUS_PX = 40;

export const SymbolStory: React.FC<{ config: SymbolConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const [handle] = useState(() => delayRender("symbol-init"));

  const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

  // Eased reveal 0 → 1 across the clip.
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;
    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ],
      zoom: 3,
      interactive: false,
      attributionControl: true,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("symbols", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geo.symbols.map((s) => ({
            type: "Feature",
            properties: { radius: s.radius },
            geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          })),
        },
      });
      map.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        paint: {
          "circle-radius": 0,
          "circle-color": SYMBOL_FILL,
          "circle-opacity": 0.75,
          "circle-stroke-color": SYMBOL_STROKE,
          "circle-stroke-width": 1.5,
        },
      });
      map.fitBounds(geo.bounds, { padding: 64, duration: 0 });
      map.once("idle", () => continueRender(handle));
    });
  }, []);

  // Per frame: grow radii by progress.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("symbol-circles")) return;
    const h = delayRender(`symbol-frame-${frame}`);
    map.setPaintProperty("symbol-circles", "circle-radius", [
      "*",
      ["get", "radius"],
      progress,
    ]);
    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [frame, progress]);

  return (
    <AbsoluteFill>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 48,
          maxWidth: "70%",
          fontSize: 30,
          fontWeight: 700,
          color: "#1A1A1A",
          textShadow: "0 1px 6px rgba(255,255,255,0.9)",
        }}
      >
        {config.title}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Register the compositions in `Root.tsx`**

Add the import and three `Composition` entries (landscape 1280×720, square 1080×1080, portrait 1080×1350), `fps={30}`, `durationInFrames={5 * 30}` (a 5s reveal), `defaultProps={{ config: sampleSymbol }}` where `sampleSymbol` is imported from `../../assets/sample-data/symbol.json`:

```tsx
import { SymbolStory } from "../../src/components/SymbolStory";
import sampleSymbol from "../../assets/sample-data/symbol.json";
const symbolDefaultProps = { config: sampleSymbol };
const SYMBOL_FRAMES = 5 * 30;
// …inside <RemotionRoot>:
<Composition id="SymbolStory" component={SymbolStory} durationInFrames={SYMBOL_FRAMES} fps={30} width={1280} height={720} defaultProps={symbolDefaultProps} />
<Composition id="SymbolStorySquare" component={SymbolStory} durationInFrames={SYMBOL_FRAMES} fps={30} width={1080} height={1080} defaultProps={symbolDefaultProps} />
<Composition id="SymbolStoryPortrait" component={SymbolStory} durationInFrames={SYMBOL_FRAMES} fps={30} width={1080} height={1350} defaultProps={symbolDefaultProps} />
```

- [ ] **Step 3: Branch the video composition set in `produce.mjs` by `config.type`**

In `produce.mjs`, where the video loop currently hard-codes the choropleth compositions:

```js
for (const [comp, name] of [
  ["ChoroplethStory", "landscape"],
  ["ChoroplethStorySquare", "square"],
  ["ChoroplethStoryPortrait", "portrait"],
]) {
```

replace the literal pair-list with a type-driven selection (read `config.type` from the already-parsed `config`):

```js
const storyComps =
  config.type === "symbol"
    ? [
        ["SymbolStory", "landscape"],
        ["SymbolStorySquare", "square"],
        ["SymbolStoryPortrait", "portrait"],
      ]
    : [
        ["ChoroplethStory", "landscape"],
        ["ChoroplethStorySquare", "square"],
        ["ChoroplethStoryPortrait", "portrait"],
      ];
for (const [comp, name] of storyComps) {
```

- [ ] **Step 4: Produce all formats + render a still before each mp4**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/system-test/symbol-map all
```

Expected outputs in `/tmp/system-test/symbol-map/`: `static.png`, `interactive.png`, `video-landscape-still.png`, `landscape.mp4`, `square.mp4`, `portrait.mp4` (+ square/portrait stills). Watch the landscape still first — circles partway through the reveal, sized correctly, no NaN/blank canvas.

- [ ] **Step 5: Eyeball every format and write the honest proof**

Open the static PNG at widths 360 / 768 / 1280, the hover screenshot, the landscape still, and the three mp4s. Confirm: area-proportional sizing reads correctly, the largest symbol does not swallow the map, the legend is legible, furniture present, portrait/square keep the title un-clipped. Create `output-proof/symbol/e2e-proof.md` recording the config used, the `validateSymbolConfig` result, the produced file paths and sizes, and one honest sentence per format on what you actually saw. Do NOT claim a format you did not open; if a render failed, record the exact error.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/components/SymbolStory.tsx skills/map-native/remotion/src/Root.tsx skills/map-native/scripts/produce.mjs skills/map-native/output-proof/symbol/e2e-proof.md
git commit -m "feat(map-native): symbol video compositions + live e2e proof"
```
(NO Claude-Session trailer.)

---

### Task 6: Best-practice reference `proportional-symbol.md`

**Files:**
- Create: `knowledge/references/map/types/proportional-symbol.md` (repo root, NOT under `skills/`)

**Interfaces:** none (documentation). This is the grounding the conformance guard enforces — every rule in `checkSymbolConformance` must trace to a line here.

- [ ] **Step 1: Write the reference**

Create `<repo-root>/knowledge/references/map/types/proportional-symbol.md`, ≤ 200 lines, structured: when to use (counts/magnitudes at point locations — cities, events — not rates over regions, which is choropleth); the encoding rules wired into the guard, each with its source:
- **Area-proportional, never radius-proportional** (`r ∝ √value`) — source: data-to-viz "bubble map", FT Visual Vocabulary.
- **Sort descending + semi-transparent fill + contrasting stroke** for overlap — source: Datawrapper symbol-map guidance.
- **Nested-circle legend** with 2–3 "nice" reference values — source: data-to-viz, NYT/FT practice.
- **Single hue** (size is the encoding; colour is a second, deferred channel).
- **Bounded max size** (a symbol must not swallow the map).
- Known v1 limits: no geocoding (coords supplied), no de-overlap/dodge, monochrome.

End with a one-line pointer that the type is implemented by `skills/map-native/src/symbol-geo.ts` + `SymbolMap.tsx` and guarded by `checkSymbolConformance`.

- [ ] **Step 2: Verify the cross-reference holds**

Re-read `checkSymbolConformance` (Task 3) and confirm every violation it emits (area-sizing, legend present, ≥2 stops, bounded size, stroke contrast, furniture) is justified by a line in this reference. Fix any rule that has no grounding (either add the source line or remove the rule).

- [ ] **Step 3: Commit**

```bash
git add knowledge/references/map/types/proportional-symbol.md
git commit -m "docs(knowledge): proportional-symbol map best-practice reference"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Tasks 1–3 are pure TDD (complete code above; run the failing test first). Tasks 4–5 are render-verified MapTiler/Remotion work — mirror the choropleth exemplar's harness exactly; the acceptance is a real produced artifact eyeballed across formats, not a unit test.
- NEVER print or log the MapTiler key; load it via `set -a && . ../../.env && set +a`.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages (user rule).
- `suggest-visual` routing to the symbol map is intentionally OUT of scope (grouped routing pass after 2–3 point types exist).
- After all tasks: run `cd skills/map-native && bun test` → the full suite (existing choropleth + new symbol-geo/validate/conformance) must be green.
