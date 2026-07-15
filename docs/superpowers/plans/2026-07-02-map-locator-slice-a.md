# Map Locator — Slice A (type core + static + interactive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the locator/markers map type's core plus its static PNG and interactive free-nav
map — markers (dot/pin/icon) + direct labels with deterministic priority declutter + optional
category (CVD-safe colour + legend) + optional note, with AI-selected light/dark basemap.

**Architecture:** Follow the map-native type recipe (pure geo-core + pure label core + component +
validation + conformance + KB + wiring + tests), mirroring proportional-symbol. The two pure cores
(`locator-geo.ts`, `locator-labels.ts`) hold all deterministic logic and are unit-tested;
`LocatorMap.tsx` is the MapTiler harness for static + interactive, ported from `SymbolMap.tsx`.

**Tech Stack:** Bun, TypeScript, MapTiler SDK, `bun:test`. (No Remotion in Slice A — video is Slice B.)

**Scope note:** Slice A = static + interactive free-nav. Interactive scrolly + the three video
formats are Slice B (they share `deriveLocatorStory`, out of scope here).

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`.
- Code, comments, commit messages, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer in any
  commit, PR, file, or doc.
- MapTiler key lives in `splash/.env` (gitignored) — never commit or log its value.
- Reuse existing building blocks: `MapFrame`/`resolveMapFrame`, the bounds/fit logic, the
  `QUALITATIVE` palette + `resolveMapStyle`/`MAP_STYLES` from `route-geo.ts`. Do not fork them.
- A locator marker is **uniform-size** — never value-scaled (that is proportional-symbol).

---

## File structure

**Create:**
- `skills/map-native/src/locator-geo.ts` — pure core: parse markers, bounds, category→colour map,
  glyph resolution, legend model.
- `skills/map-native/src/locator-labels.ts` — pure declutter: `placeLabels` + `labelRadialOffset`.
- `skills/map-native/src/LocatorMap.tsx` — static + interactive component (ported from SymbolMap).
- `skills/map-native/assets/sample-data/locator-few.json` — few-annotated sample.
- `skills/map-native/assets/sample-data/locator-many.json` — many-categorized sample.
- `skills/map-native/knowledge/references/map/types/locator.md` — KB type doc (repo-root KB path:
  `knowledge/references/map/types/locator.md`).
- `skills/map-native/tests/locator-geo.test.ts`
- `skills/map-native/tests/locator-labels.test.ts`

**Modify:**
- `skills/map-native/src/route-geo.ts` — `export` the `QUALITATIVE` palette (currently a private
  const) so locator can reuse it.
- `skills/map-native/src/validate-config.ts` — `LocatorConfigShape` + `validateLocatorConfig`.
- `skills/map-native/src/conformance.ts` — `checkLocatorConformance`.
- `skills/map-native/src/mount.tsx` — dispatch `config.type === "locator"` → `<LocatorMap>`.
- `skills/map-native/scripts/produce.mjs` — locator branch (static + interactive only in Slice A).
- `skills/map-native/scripts/audit-cases.mjs` — a locator audit case.
- `skills/map-native/SKILL.md` — refresh the roadmap row + document the type.

---

## Task 1: `route-geo` palette export + `locator-geo.ts` pure core

**Files:**
- Modify: `skills/map-native/src/route-geo.ts`
- Create: `skills/map-native/src/locator-geo.ts`
- Test: `skills/map-native/tests/locator-geo.test.ts`

**Interfaces:**
- Consumes: `QUALITATIVE: string[]` (newly exported from `route-geo.ts`).
- Produces:
  - `interface LocatorMarker { lon: number; lat: number; label: string; category?: string; note?: string; priority?: number }`
  - `interface LocatorLegendEntry { category: string; color: string }`
  - `interface PlacedMarker extends LocatorMarker { color: string }`
  - `interface LocatorGeometry { markers: PlacedMarker[]; bounds: [number, number, number, number]; categories: string[]; legend: LocatorLegendEntry[]; markerStyle: "dot" | "pin" | "icon"; hasCategories: boolean }`
  - `function locatorGeometry(config: { markers: LocatorMarker[]; markerStyle?: string }): LocatorGeometry`

- [ ] **Step 1: Export the palette from `route-geo.ts`**

Change the private `const QUALITATIVE` to an exported one:

```typescript
// was: const QUALITATIVE: string[] = [
export const QUALITATIVE: string[] = [
```

(Leave everything else in `route-geo.ts` unchanged. `computeRoute`/`computeRouteReveal` already
reference `QUALITATIVE` by name — exporting does not change their behaviour.)

- [ ] **Step 2: Write the failing test**

Create `skills/map-native/tests/locator-geo.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { locatorGeometry } from "../src/locator-geo";
import { QUALITATIVE } from "../src/route-geo";

const fewCfg = {
  markers: [
    { lon: 2.35, lat: 48.85, label: "Paris" },
    { lon: -0.13, lat: 51.51, label: "London" },
  ],
};

const catCfg = {
  markers: [
    { lon: 2.35, lat: 48.85, label: "A", category: "hospital" },
    { lon: 2.4, lat: 48.9, label: "B", category: "clinic" },
    { lon: 2.3, lat: 48.8, label: "C", category: "hospital" },
    { lon: 2.5, lat: 48.7, label: "D" }, // no category
  ],
};

describe("locatorGeometry", () => {
  it("computes marker bbox bounds [w,s,e,n]", () => {
    const g = locatorGeometry(fewCfg);
    expect(g.bounds).toEqual([-0.13, 48.85, 2.35, 51.51]);
  });

  it("has no categories / empty legend when no marker is categorized", () => {
    const g = locatorGeometry(fewCfg);
    expect(g.hasCategories).toBe(false);
    expect(g.legend).toEqual([]);
    expect(g.categories).toEqual([]);
  });

  it("assigns a CVD palette colour per distinct category, sorted, deterministic", () => {
    const g = locatorGeometry(catCfg);
    expect(g.hasCategories).toBe(true);
    expect(g.categories).toEqual(["clinic", "hospital"]); // sorted
    // legend: one entry per category, colour = QUALITATIVE cycling in sorted order
    expect(g.legend).toEqual([
      { category: "clinic", color: QUALITATIVE[0] },
      { category: "hospital", color: QUALITATIVE[1] },
    ]);
    // same-category markers share the colour; uncategorized marker gets the neutral colour
    const byLabel = Object.fromEntries(g.markers.map((m) => [m.label, m.color]));
    expect(byLabel["A"]).toBe(QUALITATIVE[1]); // hospital
    expect(byLabel["C"]).toBe(QUALITATIVE[1]); // hospital
    expect(byLabel["B"]).toBe(QUALITATIVE[0]); // clinic
    expect(byLabel["D"]).toBe("#8a8a8a"); // uncategorized neutral
  });

  it("defaults markerStyle to dot and passes a valid one through", () => {
    expect(locatorGeometry(fewCfg).markerStyle).toBe("dot");
    expect(locatorGeometry({ ...fewCfg, markerStyle: "pin" }).markerStyle).toBe("pin");
    expect(locatorGeometry({ ...fewCfg, markerStyle: "nonsense" }).markerStyle).toBe("dot");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/locator-geo.test.ts`
Expected: FAIL — `locatorGeometry` not exported.

- [ ] **Step 4: Write the implementation**

Create `skills/map-native/src/locator-geo.ts`:

```typescript
// Pure point-based core for the locator / markers map — no MapTiler, no React.
// Unlike symbol-geo, markers are UNIFORM size (no value encoding); the only per-marker
// visual variable is category → colour. Mirrors the choropleth/symbol geo-core shape.
import { QUALITATIVE } from "./route-geo";

export interface LocatorMarker {
  lon: number;
  lat: number;
  label: string;
  category?: string;
  note?: string;
  priority?: number;
}
export interface LocatorLegendEntry {
  category: string;
  color: string;
}
export interface PlacedMarker extends LocatorMarker {
  color: string;
}
export interface LocatorGeometry {
  markers: PlacedMarker[];
  bounds: [number, number, number, number]; // [west, south, east, north]
  categories: string[];
  legend: LocatorLegendEntry[];
  markerStyle: "dot" | "pin" | "icon";
  hasCategories: boolean;
}

const MARKER_STYLES = ["dot", "pin", "icon"] as const;
const NEUTRAL = "#8a8a8a"; // uncategorized marker colour when a category scheme is in play

function clampLat(v: number): number {
  return Math.max(-85, Math.min(85, v));
}

export function locatorGeometry(config: {
  markers: LocatorMarker[];
  markerStyle?: string;
}): LocatorGeometry {
  const markers = config.markers;
  if (!markers.length)
    throw new Error("locatorGeometry: no markers — nothing to map");

  // Distinct categories, sorted for deterministic colour assignment.
  const categories = [
    ...new Set(
      markers
        .map((m) => m.category)
        .filter((c): c is string => !!c && c.trim().length > 0),
    ),
  ].sort();
  const hasCategories = categories.length > 0;

  const colorOf = new Map<string, string>();
  categories.forEach((c, i) => colorOf.set(c, QUALITATIVE[i % QUALITATIVE.length]));

  const placed: PlacedMarker[] = markers.map((m) => ({
    ...m,
    color:
      m.category && colorOf.has(m.category)
        ? (colorOf.get(m.category) as string)
        : hasCategories
          ? NEUTRAL
          : QUALITATIVE[0],
  }));

  const lons = markers.map((m) => m.lon);
  const lats = markers.map((m) => m.lat);
  const bounds: [number, number, number, number] = [
    Math.min(...lons),
    clampLat(Math.min(...lats)),
    Math.max(...lons),
    clampLat(Math.max(...lats)),
  ];

  const legend: LocatorLegendEntry[] = categories.map((c) => ({
    category: c,
    color: colorOf.get(c) as string,
  }));

  const markerStyle = (MARKER_STYLES as readonly string[]).includes(
    config.markerStyle ?? "",
  )
    ? (config.markerStyle as "dot" | "pin" | "icon")
    : "dot";

  return { markers: placed, bounds, categories, legend, markerStyle, hasCategories };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/locator-geo.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/route-geo.ts skills/map-native/src/locator-geo.ts skills/map-native/tests/locator-geo.test.ts
git commit -m "feat(map-native): locator geo-core (uniform markers, category→CVD colour, legend) + export QUALITATIVE"
```

---

## Task 2: `locator-labels.ts` — deterministic priority declutter

**Files:**
- Create: `skills/map-native/src/locator-labels.ts`
- Test: `skills/map-native/tests/locator-labels.test.ts`

**Interfaces:**
- Produces:
  - `interface LabelBox { key: string; x: number; y: number; w: number; h: number; priority: number }`
  - `function placeLabels(boxes: LabelBox[]): { shown: string[]; hidden: string[] }`
  - `function labelRadialOffset(markerRadius: number, textSize: number, gap?: number): number`
- `placeLabels` semantics: greedily place boxes by priority DESC, ties by `key` ASC (deterministic);
  a box is `shown` iff it does not overlap any already-shown box (axis-aligned rectangle overlap),
  else `hidden`. Markers always draw their glyph — only labels declutter.

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/locator-labels.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { placeLabels, labelRadialOffset, type LabelBox } from "../src/locator-labels";

const box = (key: string, x: number, y: number, priority = 0): LabelBox => ({
  key, x, y, w: 40, h: 12, priority,
});

describe("placeLabels", () => {
  it("shows all when nothing overlaps", () => {
    const r = placeLabels([box("a", 0, 0), box("b", 100, 100), box("c", 200, 0)]);
    expect(r.shown.sort()).toEqual(["a", "b", "c"]);
    expect(r.hidden).toEqual([]);
  });

  it("hides the lower-priority label of an overlapping pair", () => {
    const r = placeLabels([box("low", 0, 0, 1), box("high", 10, 0, 5)]);
    expect(r.shown).toEqual(["high"]);
    expect(r.hidden).toEqual(["low"]);
  });

  it("breaks priority ties deterministically by key", () => {
    const r = placeLabels([box("b", 0, 0, 3), box("a", 5, 0, 3)]);
    expect(r.shown).toEqual(["a"]); // same priority → "a" wins the tie
    expect(r.hidden).toEqual(["b"]);
  });

  it("is deterministic across input order", () => {
    const a = placeLabels([box("a", 0, 0, 1), box("b", 10, 0, 5), box("c", 300, 0, 2)]);
    const b = placeLabels([box("c", 300, 0, 2), box("a", 0, 0, 1), box("b", 10, 0, 5)]);
    expect(a).toEqual(b);
  });

  it("never leaves two shown boxes overlapping", () => {
    const boxes = [box("a", 0, 0, 1), box("b", 5, 5, 2), box("c", 8, 2, 3)];
    const { shown } = placeLabels(boxes);
    const byKey = Object.fromEntries(boxes.map((b) => [b.key, b]));
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < shown.length; j++) {
        const p = byKey[shown[i]], q = byKey[shown[j]];
        const overlap = p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y;
        expect(overlap).toBe(false);
      }
  });
});

describe("labelRadialOffset", () => {
  it("places the label just outside the marker radius, in ems", () => {
    expect(labelRadialOffset(10, 12, 6)).toBeCloseTo((10 + 6) / 12, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/locator-labels.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/locator-labels.ts`:

```typescript
// Pure label declutter for the locator map — no MapTiler, no React. Replaces MapLibre's
// silent culling with a DETERMINISTIC priority rule: markers always draw; labels are placed
// highest-priority first and a label shows only if its box does not collide with one already
// shown. Same input → same result, regardless of input order. Reusable by symbol later.

export interface LabelBox {
  key: string;
  x: number; // top-left screen x (px)
  y: number; // top-left screen y (px)
  w: number;
  h: number;
  priority: number; // higher = placed first
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function placeLabels(boxes: LabelBox[]): {
  shown: string[];
  hidden: string[];
} {
  const ordered = [...boxes].sort(
    (a, b) => b.priority - a.priority || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  const placed: LabelBox[] = [];
  const shown: string[] = [];
  const hidden: string[] = [];
  for (const box of ordered) {
    if (placed.some((p) => overlaps(box, p))) {
      hidden.push(box.key);
    } else {
      placed.push(box);
      shown.push(box.key);
    }
  }
  return { shown, hidden };
}

// Radial offset (ems) to place a label just outside a marker of `markerRadius` px, for
// MapLibre `text-radial-offset`. Mirrors symbol-labels' labelRadialOffset.
export function labelRadialOffset(
  markerRadius: number,
  textSize: number,
  gap = 6,
): number {
  return (markerRadius + gap) / textSize;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/locator-labels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/locator-labels.ts skills/map-native/tests/locator-labels.test.ts
git commit -m "feat(map-native): locator label declutter — deterministic priority placement"
```

---

## Task 3: Config validation + conformance

**Files:**
- Modify: `skills/map-native/src/validate-config.ts`
- Modify: `skills/map-native/src/conformance.ts`
- Test: `skills/map-native/tests/locator-conformance.test.ts` (create)

**Interfaces:**
- Consumes: `MAP_STYLES` (from `route-geo`), `checkGlobalMapConformance` (from `conformance.ts`).
- Produces:
  - `type LocatorConfigShape = { type: "locator"; markers: LocatorMarker[]; basemap: string; markerStyle?: string; mapStyle?: string; title: string; description?: string; source?: { name?: string; url?: string } }`
  - `validateLocatorConfig(spec: unknown): { ok: true; spec: LocatorConfigShape; warnings: string[] } | { ok: false; errors: string[] }`
  - `checkLocatorConformance(input: { title: string; description?: string; source: { name?: string; url?: string }; markerCount: number; labeledCount: number; hasCategories: boolean; hasLegend: boolean; boundsNonEmpty: boolean; mapStyle?: string }, textColors: { text: string[]; bg: string }): string[]`

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/locator-conformance.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { validateLocatorConfig } from "../src/validate-config";
import { checkLocatorConformance } from "../src/conformance";

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };
const goodInput = {
  title: "Where the wildfires burned this summer",
  description: "Fire perimeters, June 2026",
  source: { name: "Copernicus", url: "https://x" },
  markerCount: 5,
  labeledCount: 5,
  hasCategories: true,
  hasLegend: true,
  boundsNonEmpty: true,
  mapStyle: "dataviz-dark",
};

describe("validateLocatorConfig", () => {
  it("accepts a well-formed locator config", () => {
    const r = validateLocatorConfig({
      type: "locator",
      markers: [{ lon: 2.3, lat: 48.8, label: "Paris" }],
      basemap: "world",
      title: "Key sites of the flood response",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects markers with no label", () => {
    const r = validateLocatorConfig({
      type: "locator",
      markers: [{ lon: 2.3, lat: 48.8 }],
      basemap: "world",
      title: "Key sites of the flood response",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown mapStyle", () => {
    const r = validateLocatorConfig({
      type: "locator",
      markers: [{ lon: 2.3, lat: 48.8, label: "Paris" }],
      basemap: "world",
      mapStyle: "neon",
      title: "Key sites of the flood response",
    });
    expect(r.ok).toBe(false);
  });
});

describe("checkLocatorConformance", () => {
  it("passes a well-formed locator", () => {
    expect(checkLocatorConformance(goodInput, okColors)).toEqual([]);
  });
  it("flags unlabeled markers", () => {
    expect(
      checkLocatorConformance({ ...goodInput, labeledCount: 3 }, okColors).join(" "),
    ).toContain("labeled");
  });
  it("flags missing category legend when categories are present", () => {
    expect(
      checkLocatorConformance({ ...goodInput, hasLegend: false }, okColors).join(" "),
    ).toContain("legend");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/locator-conformance.test.ts`
Expected: FAIL — `validateLocatorConfig` / `checkLocatorConformance` not exported.

- [ ] **Step 3: Implement `validateLocatorConfig`**

In `skills/map-native/src/validate-config.ts`, import `LocatorMarker` type from `./locator-geo`
(add to the existing imports) and append (mirror `validateRouteConfig`'s structure — furniture
warnings, title ≥12, mapStyle in `MAP_STYLES`):

```typescript
import type { LocatorMarker } from "./locator-geo";

export type LocatorConfigShape = {
  type: "locator";
  markers: LocatorMarker[];
  basemap: string;
  markerStyle?: string;
  mapStyle?: string;
  title: string;
  description?: string;
  source?: { name?: string; url?: string };
};

export function validateLocatorConfig(
  spec: unknown,
):
  | { ok: true; spec: LocatorConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");

  if (s.mapStyle !== undefined && !(MAP_STYLES as readonly string[]).includes(s.mapStyle as string))
    errors.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);

  if (
    s.markerStyle !== undefined &&
    !["dot", "pin", "icon"].includes(s.markerStyle as string)
  )
    errors.push('markerStyle must be one of: dot, pin, icon');

  const markers = s.markers;
  if (!Array.isArray(markers) || markers.length === 0) {
    errors.push("markers must be a non-empty array");
  } else {
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i] as Record<string, unknown> | null;
      if (!m || typeof m !== "object") {
        errors.push(`marker ${i} is not an object`);
        continue;
      }
      if (typeof m.lon !== "number" || Number.isNaN(m.lon) || m.lon < -180 || m.lon > 180)
        errors.push(`marker ${i} lon must be a number in [-180, 180]`);
      if (typeof m.lat !== "number" || Number.isNaN(m.lat) || m.lat < -90 || m.lat > 90)
        errors.push(`marker ${i} lat must be a number in [-90, 90]`);
      if (typeof m.label !== "string" || !m.label.trim())
        errors.push(`marker ${i} label must be a non-empty string`);
    }
  }

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12) errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  if (!(typeof s.description === "string" && s.description.trim()))
    warnings.push("missing description — a module must state what/when/where");
  const source = (s.source ?? {}) as Record<string, unknown>;
  if (!(typeof source.name === "string" && source.name.trim()))
    warnings.push("missing source name");
  if (!(typeof source.url === "string" && source.url.trim()))
    warnings.push("missing source url");

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: s as LocatorConfigShape, warnings };
}
```

- [ ] **Step 4: Implement `checkLocatorConformance`**

In `skills/map-native/src/conformance.ts`, append (compose the global L0 guard first, like the
other per-type guards):

```typescript
export function checkLocatorConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    markerCount: number;
    labeledCount: number;
    hasCategories: boolean;
    hasLegend: boolean;
    boundsNonEmpty: boolean;
    mapStyle?: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    { title: input.title, description: input.description, source: input.source },
    textColors,
  );
  if (input.markerCount < 1) v.push("no markers to place");
  if (input.labeledCount < input.markerCount)
    v.push(
      "markers are not all directly labeled — a locator's places must be named, not hover-only",
    );
  if (input.hasCategories && !input.hasLegend)
    v.push("categories present but no legend — the colour code is undecodable");
  if (!input.boundsNonEmpty) v.push("empty marker bounds — basemap-fit impossible");
  if (input.mapStyle && !(MAP_STYLES as readonly string[]).includes(input.mapStyle))
    v.push(`mapStyle must be one of: ${MAP_STYLES.join(", ")}`);
  return v;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/locator-conformance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/src/conformance.ts skills/map-native/tests/locator-conformance.test.ts
git commit -m "feat(map-native): locator config validation + conformance guard"
```

---

## Task 4: `LocatorMap.tsx` (static + interactive) + wiring + render-verify

**Files:**
- Create: `skills/map-native/src/LocatorMap.tsx`
- Create: `skills/map-native/assets/sample-data/locator-few.json`, `locator-many.json`
- Modify: `skills/map-native/src/mount.tsx`, `skills/map-native/scripts/produce.mjs`

**Interfaces:**
- Consumes: `locatorGeometry` (Task 1), `placeLabels`/`labelRadialOffset` (Task 2),
  `resolveMapStyle`/`MAP_STYLES` (route-geo), `resolveMapFrame`/`MapFrame` (core).
- Produces: `LocatorMap` React component `{ config: LocatorConfigShape; progress?: number }` (static
  when `progress` omitted/1; interactive when mounted with `INTERACTIVE`).

Port the MapTiler harness from `skills/map-native/src/SymbolMap.tsx` (read it fully first). Keep its
init-once ref guard, `fitBounds`-to-data, resize handling, and MapFrame wrapper. Apply these deltas:

1. **Style is mapStyle-adaptive** (not hardcoded LIGHT): `const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark"; const style = dark ? maptilersdk.MapStyle.DATAVIZ.DARK : maptilersdk.MapStyle.DATAVIZ.LIGHT;` (mirror RouteMap.tsx).
2. **Geometry from `locatorGeometry(config)`** instead of `symbolGeometry`. The GeoJSON source
   features are the placed markers with properties `{ label, color, category, note, priority }`.
3. **Glyph layer by `markerStyle`:**
   - `dot` — a `circle` layer with a FIXED `circle-radius` (e.g. 6px; do NOT scale by any value),
     `circle-color: ["get", "color"]`, white stroke.
   - `pin`/`icon` — a `symbol` layer with `icon-image` (a built-in MapTiler/Maki glyph; for `icon`
     map category→icon name, fall back to a default pin when a marker has no category), `icon-color`
     where supported, `icon-allow-overlap: true` (glyphs always show).
4. **Label declutter:** project each marker to screen space (`map.project`), build a `LabelBox`
   (estimate `w` from label length × text size, `h` = text size; `priority = marker.priority ?? 0`),
   call `placeLabels(boxes)`, and render the label layer with a data-driven filter so only `shown`
   keys get a visible label (e.g. set a `__showLabel` feature property and filter the text layer on
   it, or set `text-opacity` per feature). Use `labelRadialOffset` for `text-radial-offset`. Glyphs
   always draw regardless of label visibility.
5. **Category legend:** when `geometry.hasCategories`, render a legend (swatch + category label per
   `geometry.legend` entry) in the MapFrame legend slot; no legend otherwise. (No size legend ever.)
6. **Interactive extras:** hover popup showing `label`, `category` (if any), and `note` (if any).
   For the interactive build, enable MapTiler clustering on the source at low zoom (cluster bubble
   with count, expands on zoom); the static build renders unclustered.
7. **`progress`** (kept for Slice B reuse): when `progress < 1`, ramp glyph opacity/scale 0→1; when
   omitted, treat as 1 (static). Do not add any Remotion import here.

- [ ] **Step 1: Create the two sample configs**

`locator-few.json` — 3-6 annotated places, no categories, with `note`s and `mapStyle` unset (light):
a real newsy locator (e.g. key sites of an event). `locator-many.json` — 30-60 markers across 3-4
`category` values, `markerStyle: "dot"`, some with `priority`, `mapStyle: "dataviz-dark"`. Both
carry `type: "locator"`, `basemap: "world"`, a ≥12-char insight `title`, `description`, `source`.

- [ ] **Step 2: Write `LocatorMap.tsx`** per the deltas above (port from SymbolMap.tsx).

- [ ] **Step 3: Wire `mount.tsx`**

Add the dispatch branch (mirror the symbol branch): `if (config.type === "locator") return <LocatorMap config={config} />;`.

- [ ] **Step 4: Wire `produce.mjs` (static + interactive only for locator)**

Add `const isLocator = parsedConfig.type === "locator";` and make the `kinds` computation yield NO
video kinds for locator in Slice A:

```js
const kinds = isLocator
  ? []                       // Slice A: static + interactive web builds only; video is Slice B
  : isRoute
    ? (/* unchanged route branch */)
    : (/* unchanged non-route branch */);
```

(The web build + snap-static + snap-proof/responsive/a11y steps already run for every type, so
static + interactive are produced with no further change.)

- [ ] **Step 5: Typecheck + tests**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean tsc (apart from the pre-existing `react-dom` TS2688); all tests pass.

- [ ] **Step 6: Render-verify static + interactive, both samples, light + dark**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bun scripts/produce.mjs assets/sample-data/locator-few.json /tmp/loc/few static
bun scripts/produce.mjs assets/sample-data/locator-many.json /tmp/loc/many static
```
Expected: each prints `PRODUCE_RESULT` with `static` + `interactive` PNG paths. Inspect the four
PNGs: few = annotated pins/dots with all labels + notes as callouts, light basemap; many =
categorized dots with a category legend, deterministic label declutter (no overlaps, glyphs all
present), dark basemap. Confirm no size legend, labels legible, furniture correct.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/LocatorMap.tsx skills/map-native/src/mount.tsx skills/map-native/scripts/produce.mjs skills/map-native/assets/sample-data/locator-few.json skills/map-native/assets/sample-data/locator-many.json
git commit -m "feat(map-native): LocatorMap static+interactive (glyph modes, category legend, priority declutter, mapStyle) + wiring"
```

---

## Task 5: KB type doc + SKILL roadmap refresh + audit case

**Files:**
- Create: `knowledge/references/map/types/locator.md`
- Modify: `skills/map-native/SKILL.md`, `skills/map-native/scripts/audit-cases.mjs`

- [ ] **Step 1: Write the KB type doc**

Create `knowledge/references/map/types/locator.md` (< 500 lines, mirror the structure/tone of
`types/proportional-symbol.md`): what a locator is (situate places, NOT magnitude — the distinction
from proportional-symbol), the marker model (label required, glyph dot/pin/icon, optional
category→CVD colour + legend, optional note), when to use it vs symbol vs choropleth (FT Visual
Vocabulary), the deterministic priority declutter (vs silent culling) and clustering (interactive
only), mapStyle capability, and that Slice A ships static + interactive (video = a following slice).
Credit conventions per the KB (data-to-viz, FT visual-vocabulary).

- [ ] **Step 2: Refresh the roadmap row in SKILL.md**

In the map-type roadmap table (`SKILL.md`), update the Locator row so it reflects **all formats**
(the standing principle) rather than S/I only, and mark it as built (Slice A: static + interactive;
video slice to follow). Do not restructure the table.

- [ ] **Step 3: Add a locator audit case**

In `skills/map-native/scripts/audit-cases.mjs`, add a locator case (mirror an existing type's case)
pointing at `assets/sample-data/locator-many.json` so `bun run audit` exercises the type.

- [ ] **Step 4: Run the audit + full test suite**

Run: `cd skills/map-native && bun test && bun run audit`
Expected: all tests pass; the audit runs the locator case without error.

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/locator.md skills/map-native/SKILL.md skills/map-native/scripts/audit-cases.mjs
git commit -m "docs(map-native): locator KB type doc + roadmap refresh + audit case"
```

---

## Self-Review

**Spec coverage (Slice A portion):** encoding model (marker/glyph/category/note) → Task 1 + 4;
declutter → Task 2 + 4; validation/conformance → Task 3; static + interactive + mapStyle → Task 4;
KB + roadmap + audit → Task 5. Slice B (video + scrolly-interactive + `deriveLocatorStory`) is
explicitly out of this plan.

**Placeholder scan:** Pure cores (Tasks 1-3) carry complete code + tests. Task 4 (the component)
references `SymbolMap.tsx` with enumerated deltas rather than repeating ~400 lines of harness — the
same complete-by-reference approach used for the scrolly renderers; the sample-data content is
described by required fields, not stubbed. No "TBD".

**Type consistency:** `LocatorMarker` defined in `locator-geo.ts` (Task 1) and imported by
`validate-config.ts` (Task 3); `locatorGeometry`, `placeLabels`, `labelRadialOffset`,
`validateLocatorConfig`, `checkLocatorConformance`, `LocatorMap` names match across tasks. `mapStyle`
uses `MAP_STYLES` from `route-geo` consistently. The `QUALITATIVE` export (Task 1) is consumed by
`locator-geo` and the test.

**Ambiguity:** `markerStyle: "icon"` with an uncategorized marker → the component falls back to a
default pin (Task 4 delta 3), matching the spec's decision. The declutter runs in screen space, so
`placeLabels` is a pure function of projected boxes the component builds — testable without a map.
