# Areal Reveal Choreography — Plan 1 (Foundation + Choropleth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract RouteReveal's proven staged-entrance vocabulary into a shared pure core, prove it by making RouteReveal consume it byte-identically, and apply it to ChoroplethStory with a `revealMode: "context" | "sequential"` knob — the render-proven milestone before fanning out to the other areal comps.

**Architecture:** Three new pure `core/` modules (staged-reveal timing, border-slice geometry, pole label-anchor). RouteReveal refactors to import them (parity = extraction correctness). ChoroplethStory gains a `triggerFrameByRegion` map (from each reveal beat's `startFrame` + `highlight`), per-subject emphasis border + bloom fill layers driven by `stagedEntrance`, a pole-of-inaccessibility callout anchor, and admin-1 clutter stripping. `revealMode` flows spec → schema → suggester default.

**Tech Stack:** Bun, TypeScript, `bun:test`, Remotion (`interpolate`/`Easing`), `@maptiler/sdk` (MapLibre), `@turf/turf`.

**Spec:** `docs/superpowers/specs/2026-07-20-areal-reveal-choreography-design.md`. Read it first.

## Global Constraints

- Runtime **Bun** (never npm/node). TypeScript. `bun:test`. TDD.
- Code, comments, identifiers, commit messages, branch names in **English**. No Claude/Anthropic mention in any committed artifact (no `Co-Authored-By`, no "Generated with").
- **No `any` introduced.** Core modules are **pure**: no clock, no `Math.random`, no `Date.now()`.
- **Byte-identical default output** where a change is meant to be invisible: RouteReveal after refactor (Task 4) and CountryLabel default (Task 5) must render identically to before. The choreography itself (Tasks 7-9) is a deliberate visual change, render-proved not asserted.
- **`revealMode` default is `"context"`** when unset.
- Staged timing constants are **exact**: `BORDER_S = 2.5`, `FILL_S = 1.0`, `LABEL_S = 0.7`; fill overshoot maps `[0, 0.6, 1] → [0, target*1.25, target]`.
- Reuse existing engine helpers (`continueWhenMapSettles`, `MapFrame`, `cameraForFrame`) — do not reinvent.
- Feedback → system: fix at the shared-core / SKILL / reference level, never patch only the example.

**Working directory:** `/Users/rmdms/Sites/Professional/splash-merge`, branch `feat/areal-reveal-choreography`. All paths below are under `skills/map-native/` unless stated.

**Test/gate commands:**
- Unit: `cd skills/map-native && bun test src/core/<file>.test.ts`
- Full skill suite: `cd skills/map-native && bun test`
- Render proof (NOT in gate — network + slow): `cd skills/map-native && bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/<out> video` then inspect `/tmp/<out>/landscape.mp4` + `video-landscape-still.png`.

---

## File Structure

**New**
- `src/core/staged-reveal.ts` — pure staged-entrance timing envelope (+ `.test.ts`).
- `src/core/border-slice.ts` — `buildDraw` + `sliceBorder` multi-segment length slicing (+ `.test.ts`).
- `src/core/label-anchor.ts` — `poleOfInaccessibility` grid-search interior anchor (+ `.test.ts`).
- `src/story-triggers.ts` — `triggerFrameByRegion` pure builder (+ `.test.ts`).

**Modified**
- `src/components/RouteReveal.tsx` — consume the three core modules (parity).
- `src/components/CountryLabel.tsx` — CSS-var typography indirection.
- `src/components/ChoroplethStory.tsx` — trigger map, per-subject emphasis layers, both modes, pole anchor, admin-1 strip.
- `src/map-story.ts` — carry `revealMode` on the story model.
- Config schema/validation (`src/` config type + validate) — accept `revealMode`.
- Suggester map path (`skills/suggest-chart/…`) — emit `revealMode` default `context`.

---

### Task 1: `core/staged-reveal.ts` — pure timing envelope

**Files:**
- Create: `skills/map-native/src/core/staged-reveal.ts`
- Test: `skills/map-native/src/core/staged-reveal.test.ts`

**Interfaces:**
- Produces:
  - `STAGED_BORDER_S = 2.5`, `STAGED_FILL_S = 1.0`, `STAGED_LABEL_S = 0.7` (exported consts)
  - `interface StagedEntrance { borderProgress: number; fillOpacity: number; labelReveal: number }`
  - `stagedEntrance(localSeconds: number, opts: { fillOpacity: number; borderS?: number; fillS?: number; labelS?: number }): StagedEntrance`

- [ ] **Step 1: Write the failing test**

```ts
// skills/map-native/src/core/staged-reveal.test.ts
import { describe, it, expect } from "bun:test";
import {
  stagedEntrance,
  STAGED_BORDER_S,
  STAGED_FILL_S,
  STAGED_LABEL_S,
} from "./staged-reveal.ts";

describe("stagedEntrance", () => {
  const T = STAGED_BORDER_S + STAGED_FILL_S + STAGED_LABEL_S;

  it("is fully empty before the trigger", () => {
    const r = stagedEntrance(-0.5, { fillOpacity: 0.9 });
    expect(r.borderProgress).toBe(0);
    expect(r.fillOpacity).toBe(0);
    expect(r.labelReveal).toBe(0);
  });

  it("draws the border first, before any fill", () => {
    const mid = stagedEntrance(STAGED_BORDER_S / 2, { fillOpacity: 0.9 });
    expect(mid.borderProgress).toBeGreaterThan(0);
    expect(mid.borderProgress).toBeLessThan(1);
    expect(mid.fillOpacity).toBe(0); // fill has not started
    expect(mid.labelReveal).toBe(0);
  });

  it("completes the border by BORDER_S, then blooms fill with an overshoot above target", () => {
    const atBorderDone = stagedEntrance(STAGED_BORDER_S, { fillOpacity: 0.9 });
    expect(atBorderDone.borderProgress).toBeCloseTo(1, 5);
    // 60% through the fill window = the overshoot peak (target*1.25)
    const peak = stagedEntrance(STAGED_BORDER_S + STAGED_FILL_S * 0.6, { fillOpacity: 0.9 });
    expect(peak.fillOpacity).toBeCloseTo(0.9 * 1.25, 5);
  });

  it("settles fill to the target and finishes the label by the end", () => {
    const end = stagedEntrance(T, { fillOpacity: 0.9 });
    expect(end.fillOpacity).toBeCloseTo(0.9, 5);
    expect(end.labelReveal).toBeCloseTo(1, 5);
  });

  it("clamps everything to its final state well past the end", () => {
    const late = stagedEntrance(T + 10, { fillOpacity: 0.9 });
    expect(late.borderProgress).toBeCloseTo(1, 5);
    expect(late.fillOpacity).toBeCloseTo(0.9, 5);
    expect(late.labelReveal).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test src/core/staged-reveal.test.ts`
Expected: FAIL — `Cannot find module './staged-reveal.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// skills/map-native/src/core/staged-reveal.ts
import { Easing, interpolate } from "remotion";

// The per-feature entrance envelope, lifted verbatim from RouteReveal (RouteReveal.tsx:441-467):
// border draws on, then fill blooms with an overshoot, then the label rises — each phase a
// CONSTANT number of seconds from the feature's own trigger (never a fraction of a global
// progress). Pure: no clock, no randomness.
export const STAGED_BORDER_S = 2.5;
export const STAGED_FILL_S = 1.0;
export const STAGED_LABEL_S = 0.7;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export interface StagedEntrance {
  /** 0..1 eased — fraction of the border drawn. */
  borderProgress: number;
  /** eased 0 → overshoot(target*1.25) → target. 0 until the border completes. */
  fillOpacity: number;
  /** 0..1 eased — label rise/fade progress. */
  labelReveal: number;
}

/**
 * @param localSeconds seconds since this feature's trigger: (frame - triggerFrame) / fps.
 * @param opts.fillOpacity the settle target the fill blooms to (the feature's base fill).
 */
export function stagedEntrance(
  localSeconds: number,
  opts: { fillOpacity: number; borderS?: number; fillS?: number; labelS?: number },
): StagedEntrance {
  const borderS = opts.borderS ?? STAGED_BORDER_S;
  const fillS = opts.fillS ?? STAGED_FILL_S;
  const labelS = opts.labelS ?? STAGED_LABEL_S;
  const ls = localSeconds;

  const borderProgress = interpolate(clamp01(ls / borderS), [0, 1], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
  });

  const fp = clamp01((ls - borderS) / fillS);
  const fillOpacity =
    fp <= 0
      ? 0
      : interpolate(fp, [0, 0.6, 1], [0, opts.fillOpacity * 1.25, opts.fillOpacity], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

  const labelReveal = clamp01((ls - borderS - fillS) / labelS);

  return { borderProgress, fillOpacity, labelReveal };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/map-native && bun test src/core/staged-reveal.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/staged-reveal.ts skills/map-native/src/core/staged-reveal.test.ts
git commit -m "feat(map-native): extract stagedEntrance timing envelope into shared core"
```

---

### Task 2: `core/border-slice.ts` — multi-segment length slicing

**Files:**
- Create: `skills/map-native/src/core/border-slice.ts`
- Test: `skills/map-native/src/core/border-slice.test.ts`

**Interfaces:**
- Produces:
  - `interface DrawEntry { segLines: ReturnType<typeof turf.lineString>[]; segLen: number[]; cum: number[]; total: number }`
  - `buildDraw(segments: number[][][]): DrawEntry` — segments = array of coordinate rings/lines (`[[ [lng,lat], … ], …]`).
  - `sliceBorder(d: DrawEntry, fromKm: number, toKm: number): Feature<MultiLineString>`
  - `EMPTY_FEATURE` — a `Feature<MultiLineString>` with empty coordinates.
- Note: extracted verbatim from `RouteReveal.tsx:73-119`, with `buildDraw` decoupled from `RouteRevealTerritory` — it now takes the raw `segments` array, so any comp can feed a region's exterior rings.

- [ ] **Step 1: Write the failing test**

```ts
// skills/map-native/src/core/border-slice.test.ts
import { describe, it, expect } from "bun:test";
import { buildDraw, sliceBorder, EMPTY_FEATURE } from "./border-slice.ts";

// A single 2-segment border: a 1°-ish horizontal line then a vertical one.
const segments: number[][][] = [
  [ [0, 0], [1, 0] ],
  [ [1, 0], [1, 1] ],
];

describe("buildDraw / sliceBorder", () => {
  it("accumulates per-segment lengths and a running total", () => {
    const d = buildDraw(segments);
    expect(d.segLines.length).toBe(2);
    expect(d.cum[0]).toBe(0);
    expect(d.cum[1]).toBeCloseTo(d.segLen[0], 6);
    expect(d.total).toBeCloseTo(d.segLen[0] + d.segLen[1], 6);
  });

  it("returns empty geometry when the window has no length", () => {
    const d = buildDraw(segments);
    const f = sliceBorder(d, 0, 0);
    expect(f.geometry.coordinates.length).toBe(0);
  });

  it("reveals only the first segment when toKm sits inside it", () => {
    const d = buildDraw(segments);
    const half = d.segLen[0] / 2;
    const f = sliceBorder(d, 0, half);
    // Only the first segment contributes.
    expect(f.geometry.coordinates.length).toBe(1);
  });

  it("reveals both segments when toKm passes the join", () => {
    const d = buildDraw(segments);
    const f = sliceBorder(d, 0, d.total);
    expect(f.geometry.coordinates.length).toBe(2);
  });

  it("EMPTY_FEATURE is an empty MultiLineString feature", () => {
    expect(EMPTY_FEATURE.geometry.type).toBe("MultiLineString");
    expect(EMPTY_FEATURE.geometry.coordinates.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test src/core/border-slice.test.ts`
Expected: FAIL — `Cannot find module './border-slice.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// skills/map-native/src/core/border-slice.ts
import * as turf from "@turf/turf";

// Reveal a portion of a multi-segment border between fromKm and toKm, slicing each segment by
// cumulative length — no joins across gaps, no viewport crop. Extracted verbatim from RouteReveal
// (RouteReveal.tsx:73-119); buildDraw now takes the raw segment array so any comp can feed a
// region's exterior rings, not just a RouteRevealTerritory.

export interface DrawEntry {
  segLines: ReturnType<typeof turf.lineString>[];
  segLen: number[];
  cum: number[];
  total: number;
}

export const EMPTY_FEATURE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "MultiLineString" as const,
    coordinates: [] as number[][][],
  },
};

export function buildDraw(segments: number[][][]): DrawEntry {
  const segLines = segments.map((s) => turf.lineString(s));
  const segLen = segLines.map((l) => turf.length(l));
  const cum: number[] = [];
  let acc = 0;
  for (const L of segLen) {
    cum.push(acc);
    acc += L;
  }
  return { segLines, segLen, cum, total: acc };
}

export function sliceBorder(d: DrawEntry, fromKm: number, toKm: number) {
  const out: number[][][] = [];
  for (let i = 0; i < d.segLines.length; i++) {
    const start = d.cum[i];
    const end = start + d.segLen[i];
    const a = Math.max(fromKm, start);
    const b = Math.min(toKm, end);
    if (b - a <= 0.0008) continue;
    out.push(
      turf.lineSliceAlong(d.segLines[i], a - start, b - start).geometry
        .coordinates,
    );
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "MultiLineString" as const, coordinates: out },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/map-native && bun test src/core/border-slice.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/border-slice.ts skills/map-native/src/core/border-slice.test.ts
git commit -m "feat(map-native): extract buildDraw/sliceBorder into shared core (decoupled from territory)"
```

---

### Task 3: `core/label-anchor.ts` — pole of inaccessibility

**Files:**
- Create: `skills/map-native/src/core/label-anchor.ts`
- Test: `skills/map-native/src/core/label-anchor.test.ts`

**Interfaces:**
- Produces: `poleOfInaccessibility(feature: Feature<Polygon | MultiPolygon>, opts?: { samples?: number; nudge?: [number, number] }): [number, number]` — a `[lng, lat]` guaranteed inside the polygon (grid-search maximizing distance to the boundary; falls back to `turf.pointOnFeature` for degenerate polygons; adds an optional operator nudge).

- [ ] **Step 1: Write the failing test**

```ts
// skills/map-native/src/core/label-anchor.test.ts
import { describe, it, expect } from "bun:test";
import * as turf from "@turf/turf";
import { poleOfInaccessibility } from "./label-anchor.ts";

// A C-shaped (concave) polygon whose centroid falls OUTSIDE the polygon — the regression a
// centroid anchor causes (a callout dot landing off the region). Pole must land inside.
const cShape = turf.polygon([[
  [0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [4, 3], [4, 4], [0, 4], [0, 0],
]]);

describe("poleOfInaccessibility", () => {
  it("returns a point strictly inside a concave polygon (where centroid is outside)", () => {
    const centroid = turf.centroid(cShape).geometry.coordinates;
    expect(turf.booleanPointInPolygon(turf.point(centroid), cShape)).toBe(false); // centroid escapes

    const pole = poleOfInaccessibility(cShape);
    expect(turf.booleanPointInPolygon(turf.point(pole), cShape)).toBe(true); // pole stays inside
  });

  it("applies the operator nudge", () => {
    const base = poleOfInaccessibility(cShape);
    const nudged = poleOfInaccessibility(cShape, { nudge: [0.5, -0.25] });
    expect(nudged[0]).toBeCloseTo(base[0] + 0.5, 6);
    expect(nudged[1]).toBeCloseTo(base[1] - 0.25, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test src/core/label-anchor.test.ts`
Expected: FAIL — `Cannot find module './label-anchor.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// skills/map-native/src/core/label-anchor.ts
import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";

// Pole of inaccessibility — the most-interior point of a polygon (grid-sample, keep the point with
// the greatest distance to the boundary). Centroids get pulled toward edges on concave/crescent
// shapes and can fall outside the polygon; the pole never does. Ported from Tom's prep-geo.mjs to
// a runtime turf call. Pure.
export function poleOfInaccessibility(
  feature: Feature<Polygon | MultiPolygon>,
  opts: { samples?: number; nudge?: [number, number] } = {},
): [number, number] {
  const N = opts.samples ?? 46;
  const bb = turf.bbox(feature);
  // Boundary as line(s). polygonToLine → LineString (Polygon) or FeatureCollection (MultiPolygon);
  // pointToLineDistance needs a single (Multi)LineString feature, so normalize to a MultiLineString.
  const boundary = toBoundaryMultiLine(feature);

  let best: [number, number] | null = null;
  let bestD = -1;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const lng = bb[0] + ((bb[2] - bb[0]) * i) / N;
      const lat = bb[1] + ((bb[3] - bb[1]) * j) / N;
      const p = turf.point([lng, lat]);
      if (!turf.booleanPointInPolygon(p, feature)) continue;
      const d = turf.pointToLineDistance(p, boundary);
      if (d > bestD) {
        bestD = d;
        best = [lng, lat];
      }
    }
  }

  // Degenerate polygon (too thin for the grid to catch an interior sample): fall back to
  // pointOnFeature, which is still guaranteed on the feature.
  if (!best) {
    const p = turf.pointOnFeature(feature);
    best = [p.geometry.coordinates[0], p.geometry.coordinates[1]];
  }

  const nudge = opts.nudge ?? [0, 0];
  return [best[0] + nudge[0], best[1] + nudge[1]];
}

function toBoundaryMultiLine(
  feature: Feature<Polygon | MultiPolygon>,
): Feature<import("geojson").MultiLineString> {
  const coords: number[][][] = [];
  const g = feature.geometry;
  const rings = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of rings) for (const ring of poly) coords.push(ring);
  return turf.multiLineString(coords);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/map-native && bun test src/core/label-anchor.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/label-anchor.ts skills/map-native/src/core/label-anchor.test.ts
git commit -m "feat(map-native): add poleOfInaccessibility interior label anchor"
```

---

### Task 4: Refactor RouteReveal to consume the core (parity)

**Files:**
- Modify: `skills/map-native/src/components/RouteReveal.tsx` (remove local `DrawEntry`/`EMPTY_FEATURE`/`buildDraw`/`sliceBorder` at `:73-119`; replace the inline `bp`/`fo`/`lp` block at `:438-469`).
- Test: `skills/map-native/src/components/RouteReveal.parity.test.ts`

**Interfaces:**
- Consumes: `stagedEntrance`, `STAGED_BORDER_S/FILL_S/LABEL_S` (Task 1); `buildDraw`, `sliceBorder`, `EMPTY_FEATURE`, `DrawEntry` (Task 2).
- Produces: nothing new — RouteReveal's rendered output must be **unchanged**.

**Context for the implementer:** RouteReveal currently defines its own `BORDER_S = 2.5`, `FILL_S = 1.0`, `LABEL_S = 0.7` (`RouteReveal.tsx:145-147`), a local `buildDraw(t)` that reads `t.border` (`:89`, called `buildDraw(t)` at `:206`), a local `sliceBorder`/`EMPTY_FEATURE`/`DrawEntry` (`:73-119`), and the inline per-territory block (`:438-469`). `FILL_OPACITY` is the territory fill target constant already in the file.

- [ ] **Step 1: Write the parity test (unit-level, no render)**

```ts
// skills/map-native/src/components/RouteReveal.parity.test.ts
// Locks that the extracted stagedEntrance reproduces RouteReveal's original inline math exactly,
// so the refactor is provably byte-identical. This test encodes the OLD inline formulas and
// asserts the core matches them at sampled local-seconds.
import { describe, it, expect } from "bun:test";
import { Easing, interpolate } from "remotion";
import { stagedEntrance } from "../core/staged-reveal.ts";

const BORDER_S = 2.5, FILL_S = 1.0, LABEL_S = 0.7, FILL_OPACITY = 0.55;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// The ORIGINAL inline expressions from RouteReveal.tsx:441-467 (pre-refactor), verbatim.
function original(lt: number) {
  const bp = interpolate(clamp01(lt / BORDER_S), [0, 1], [0, 1], { easing: Easing.inOut(Easing.cubic) });
  const fp = clamp01((lt - BORDER_S) / FILL_S);
  const fo = interpolate(fp, [0, 0.6, 1], [0, FILL_OPACITY * 1.25, FILL_OPACITY], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const lp = clamp01((lt - BORDER_S - FILL_S) / LABEL_S);
  return { bp, fill: fp <= 0 ? 0 : fo, lp };
}

describe("RouteReveal staged parity", () => {
  it("stagedEntrance equals the original inline math across the whole envelope", () => {
    for (const lt of [-1, 0, 0.5, 1.25, 2.5, 3.0, 3.5, 4.2, 10]) {
      const o = original(lt);
      const s = stagedEntrance(lt, { fillOpacity: FILL_OPACITY });
      expect(s.borderProgress).toBeCloseTo(o.bp, 9);
      expect(s.fillOpacity).toBeCloseTo(o.fill, 9);
      expect(s.labelReveal).toBeCloseTo(o.lp, 9);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes already** (it locks the core, which exists)

Run: `cd skills/map-native && bun test src/components/RouteReveal.parity.test.ts`
Expected: PASS. (This is a lock, not a red-first test — it guards the refactor you are about to do.)

- [ ] **Step 3: Refactor RouteReveal to import the core**

In `RouteReveal.tsx`:
1. Add imports near the top:
   ```ts
   import { stagedEntrance } from "../core/staged-reveal.ts";
   import { buildDraw, sliceBorder, EMPTY_FEATURE, type DrawEntry } from "../core/border-slice.ts";
   ```
2. Delete the local `interface DrawEntry` + `EMPTY_FEATURE` + `buildDraw` + `sliceBorder` (`:73-119`). Keep `BORDER_S`/`FILL_S`/`LABEL_S` **only if** other code reads them; otherwise delete and rely on the core defaults. (`FILL_OPACITY` stays.)
3. Change the `buildDraw` call site (`:206`) from `buildDraw(t)` to `buildDraw(t.border)`.
4. Replace the inline per-territory block (`:438-469`) so it reads from the core:
   ```ts
   const lt = t - trigger(terr); // local seconds since this territory triggered
   const staged = stagedEntrance(lt, { fillOpacity: FILL_OPACITY });

   (map.getSource(`trail-${terr.key}`) as any)?.setData(
     staged.borderProgress <= 0 ? EMPTY_FEATURE : sliceBorder(d, 0, d.total * staged.borderProgress),
   );
   map.setPaintProperty(`fill-${terr.key}`, "fill-opacity", staged.fillOpacity);

   const p = map.project(terr.anchor as [number, number]);
   pos[terr.key] = { x: p.x, y: p.y, reveal: staged.labelReveal };
   ```
   (`staged.fillOpacity` already returns `0` before the fill window, matching the old `fp <= 0 ? 0 : fo`.)

- [ ] **Step 4: Run the full map-native suite + typecheck**

Run: `cd skills/map-native && bun test && bunx tsc --noEmit -p .`
Expected: PASS, no type errors. The parity test still passes; nothing else changed behavior.

- [ ] **Step 5: Render-prove RouteReveal is unchanged**

Run: `cd skills/map-native && bun scripts/produce.mjs assets/sample-data/route.json /tmp/route-parity video` (use the repo's route sample; if the filename differs, `ls assets/sample-data | grep -i route`).
Expected: `video-verify.json` has `"violations": []`; the still + MP4 look identical to a pre-refactor render (spot-check the electric head + a territory border draw). Report the still.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/components/RouteReveal.tsx skills/map-native/src/components/RouteReveal.parity.test.ts
git commit -m "refactor(map-native): RouteReveal consumes shared staged-reveal + border-slice core (parity)"
```

---

### Task 5: CountryLabel typography-agnostic (CSS vars)

**Files:**
- Modify: `skills/map-native/src/components/CountryLabel.tsx`
- Test: `skills/map-native/src/components/CountryLabel.test.tsx`

**Interfaces:**
- Produces: unchanged component API. Default rendered typography **byte-identical** (fallbacks = today's literals). A newsroom can later set `--map-label-*` CSS vars to override; that threading is out of scope.

**Context:** `CountryLabel.tsx` loads Space Grotesk (`loadFont()` from `@remotion/google-fonts/SpaceGrotesk`, `:3-5`) and hardcodes `fontFamily`, `fontWeight: 600`, `fontSize: 34`, `letterSpacing: "0.22em"`, `color: "#F5F2ED"`, and a text-shadow on the name (`:57-67`) and value (`:74-81`).

- [ ] **Step 1: Write the failing test**

```tsx
// skills/map-native/src/components/CountryLabel.test.tsx
import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { CountryLabel } from "./CountryLabel.tsx";

describe("CountryLabel typography", () => {
  it("uses --map-label-font with the Space Grotesk fallback (default unchanged)", () => {
    const html = renderToStaticMarkup(
      <CountryLabel name="Berlin" color="#e0b" reveal={1} x={0} y={0} value="88" />,
    );
    // The var indirection is present with a fallback (default output still Space Grotesk).
    expect(html).toContain("var(--map-label-font");
    expect(html).toContain("Space Grotesk");
  });

  it("uses --map-label-color with the default ink fallback", () => {
    const html = renderToStaticMarkup(
      <CountryLabel name="Berlin" color="#e0b" reveal={1} x={0} y={0} />,
    );
    expect(html).toContain("var(--map-label-color");
    expect(html).toContain("#F5F2ED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test src/components/CountryLabel.test.tsx`
Expected: FAIL — output does not contain `var(--map-label-font`.

- [ ] **Step 3: Implement the CSS-var indirection**

In `CountryLabel.tsx`, keep `loadFont()` (Space Grotesk stays the default/fallback font). Replace the hardcoded style values with `var(--name, <fallback>)`:
- `fontFamily` → `` `var(--map-label-font, ${fontFamily})` `` (both name and value blocks)
- `fontWeight: 600` → `"var(--map-label-weight, 600)" as unknown as number` (or set via a CSS var string — keep the fallback `600`)
- `fontSize: 34` → keep numeric, wrap as `` `var(--map-label-size, 34px)` `` on a `fontSize` string
- `letterSpacing: "0.22em"` → `"var(--map-label-tracking, 0.22em)"`
- `color: "#F5F2ED"` → `"var(--map-label-color, #F5F2ED)"` (both blocks)
- `textShadow: "0 2px 18px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7)"` → `"var(--map-label-shadow, 0 2px 18px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7))"`

Keep the value block's distinct `fontWeight: 700`/`fontSize: 40`/`letterSpacing: "0.02em"` as their own vars (`--map-label-value-weight` etc.) with those literals as fallbacks. The accent-rule and layout are unchanged.

- [ ] **Step 4: Run test to verify it passes + full suite**

Run: `cd skills/map-native && bun test src/components/CountryLabel.test.tsx && bun test`
Expected: PASS. (If `react-dom/server` is not already a dev dependency, use the render-proof from Task 4/8 to confirm the label is visually unchanged instead, and assert on the source string via a simple `readFileSync` contains-check test.)

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/components/CountryLabel.tsx skills/map-native/src/components/CountryLabel.test.tsx
git commit -m "feat(map-native): CountryLabel typography via CSS vars (default byte-identical)"
```

---

### Task 6: `revealMode` — model, schema, suggester default

**Files:**
- Modify: `skills/map-native/src/map-story.ts` (add `revealMode` to the story options/model; default `"context"`).
- Modify: the map-native config type + its validate function (accept `revealMode?: "context" | "sequential"`; reject any other string).
- Modify: suggester map path under `skills/suggest-chart/` (emit `revealMode` on a map story spec; default `"context"`).
- Test: `skills/map-native/src/map-story.test.ts` (or the existing map-story test file — extend it).

**Interfaces:**
- Produces: `RevealMode = "context" | "sequential"` (exported from `map-story.ts`); `deriveMapStory(...)` (and the Cartogram/HexGrid derivers, unchanged here) carry it through; `resolveRevealMode(config): RevealMode` returning `"context"` when unset/invalid-guarded.

**Context for the implementer:** find where map-native reads its config (grep `interface .*Config`/`validateConfig` in `skills/map-native/src`). `revealMode` is a top-level optional config field. The suggester emits map specs on the `suggest-chart` map path (grep `mapStyle` / `map-native` there — `revealMode` sits beside `mapStyle`).

- [ ] **Step 1: Write the failing test**

```ts
// extend skills/map-native/src/map-story.test.ts (create if absent)
import { describe, it, expect } from "bun:test";
import { resolveRevealMode } from "./map-story.ts";

describe("resolveRevealMode", () => {
  it("defaults to context when unset", () => {
    expect(resolveRevealMode({})).toBe("context");
  });
  it("passes through a valid sequential", () => {
    expect(resolveRevealMode({ revealMode: "sequential" })).toBe("sequential");
  });
  it("falls back to context on an unknown value (fail-safe)", () => {
    expect(resolveRevealMode({ revealMode: "wat" as never })).toBe("context");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test src/map-story.test.ts`
Expected: FAIL — `resolveRevealMode` not exported.

- [ ] **Step 3: Implement**

In `map-story.ts`:
```ts
export type RevealMode = "context" | "sequential";

export function resolveRevealMode(config: { revealMode?: string }): RevealMode {
  return config.revealMode === "sequential" ? "sequential" : "context";
}
```
Add `revealMode?: RevealMode` to the map-native config type and, in its validator, reject a present-but-not-`context|sequential` value with a clear `throw` (matching the skill's fail-loud convention for unknown fields — mirror how `mapStyle` is validated). In the suggester map path, set `revealMode: "context"` on the emitted spec (leave a `// journey/progression narratives may set "sequential"` comment); do not infer `sequential` heuristically in this plan — that is a suggester-quality follow-up.

- [ ] **Step 4: Run tests + typecheck**

Run: `cd skills/map-native && bun test src/map-story.test.ts && bunx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src skills/suggest-chart
git commit -m "feat(map-native): revealMode config (context|sequential), default context, suggester emits it"
```

---

### Task 7: `story-triggers.ts` + Choropleth emphasis layers (border-draw phase)

**Files:**
- Create: `skills/map-native/src/story-triggers.ts` (+ `.test.ts`)
- Modify: `skills/map-native/src/components/ChoroplethStory.tsx`

**Interfaces:**
- Produces: `triggerFrameByRegion(beats: Beat[], phases: Phase[]): Map<string, number>` — maps each reveal beat's subject region key (`beat.highlight[0]`, skip beats with none) to that beat's `phases[i].startFrame`.
- Consumes: `buildDraw`/`sliceBorder`/`EMPTY_FEATURE` (Task 2), `stagedEntrance` (Task 1), `resolveRevealMode` (Task 6).

**Context for the implementer:** `Beat` has `kind`, `camera`, `highlight: string[]`, `dim`, `callout` (`map-story.ts:10-14`). `Phase` (from `story-timeline.ts`) carries `startFrame`. `ChoroplethStory` builds `beats`, `phases`, `solutions`, `sortedBins`, `centroidByKey`, `worldGeoJson`, `joined` into `mapState` (`ChoroplethStory.tsx:299-311`); its layers are `choropleth-fill` (fill, opacity `fillReveal*0.9` via a `case __hasData` expression, `:362-367`), `choropleth-stroke` (thin base border), `choropleth-highlight-stroke` (data-driven 2.5px on `__highlight`, `:280-294`). Per-frame it does `map.jumpTo` + re-`setData` on beat change (`:342-358`). The subject regions (those with a reveal beat) are FEW (reveal count, ~≤5), so a per-subject source+layer pair is bounded — mirror RouteReveal's `trail-${key}` pattern.

- [ ] **Step 1: Write the failing test for the trigger builder**

```ts
// skills/map-native/src/story-triggers.test.ts
import { describe, it, expect } from "bun:test";
import { triggerFrameByRegion } from "./story-triggers.ts";

const beats = [
  { kind: "title", highlight: [] },
  { kind: "establish", highlight: [] },
  { kind: "reveal", highlight: ["NOR"] },
  { kind: "reveal", highlight: ["SWE"] },
  { kind: "takeaway", highlight: [] },
] as any;
const phases = [
  { startFrame: 0 }, { startFrame: 75 }, { startFrame: 135 }, { startFrame: 225 }, { startFrame: 315 },
] as any;

describe("triggerFrameByRegion", () => {
  it("maps each reveal beat's subject key to its phase startFrame", () => {
    const m = triggerFrameByRegion(beats, phases);
    expect(m.get("NOR")).toBe(135);
    expect(m.get("SWE")).toBe(225);
  });
  it("ignores non-reveal beats and empty highlights", () => {
    const m = triggerFrameByRegion(beats, phases);
    expect(m.has("")).toBe(false);
    expect(m.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test src/story-triggers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the trigger builder**

```ts
// skills/map-native/src/story-triggers.ts
import type { Beat } from "./map-story.ts";
import type { Phase } from "./story-timeline.ts";

/** Map each reveal beat's subject region (beat.highlight[0]) to that beat's start frame. */
export function triggerFrameByRegion(beats: Beat[], phases: Phase[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].kind !== "reveal") continue;
    const key = beats[i].highlight[0];
    if (!key) continue;
    if (!m.has(key)) m.set(key, phases[i].startFrame);
  }
  return m;
}
```
(If `Beat`/`Phase` are not exported, export them.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd skills/map-native && bun test src/story-triggers.test.ts`
Expected: PASS.

- [ ] **Step 5: Add per-subject emphasis layers + wire the border-draw phase in ChoroplethStory**

In `ChoroplethStory.tsx`:
1. Build once (in the load `.then`, alongside `centroidByKey`): `triggers = triggerFrameByRegion(beats, phases)` and `borderByRegion: Map<string, DrawEntry>` — for each subject key, extract that feature's exterior rings from `worldGeoJson` as `number[][][]` and `buildDraw(rings)`. Carry both on `mapState`.
2. For each subject key, add a dedicated emphasis **line** source+layer after the existing strokes:
   ```ts
   m.addSource(`choro-trail-${key}`, { type: "geojson", data: EMPTY_FEATURE });
   m.addLayer({
     id: `choro-trail-${key}`, type: "line", source: `choro-trail-${key}`,
     paint: { "line-color": dark ? "#f4f4f5" : "#1a1a1a", "line-width": 2.5, "line-opacity": 0.95 },
   });
   ```
3. Remove the static `choropleth-highlight-stroke` layer (`:280-294`) — the animated trail replaces it.
4. In the per-frame effect, after the camera jump, drive the border draw for every subject:
   ```ts
   const fps30 = fps; // Remotion useVideoConfig fps
   for (const [key, triggerFrame] of triggers) {
     const ls = (frame - triggerFrame) / fps30;
     const staged = stagedEntrance(ls, { fillOpacity: 0.9 });
     const d = borderByRegion.get(key)!;
     (map.getSource(`choro-trail-${key}`) as maptilersdk.GeoJSONSource).setData(
       staged.borderProgress <= 0 ? EMPTY_FEATURE : sliceBorder(d, 0, d.total * staged.borderProgress),
     );
   }
   ```
   (Fill compositing and label anchor come in Tasks 8-9; this task lands the border-draw only.)

- [ ] **Step 6: Full suite + typecheck**

Run: `cd skills/map-native && bun test && bunx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 7: Render-prove the border draws on the subject region**

Run: `cd skills/map-native && bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/choro-t7 video`
Expected: `violations: []`. Extract a frame ~1s into a reveal beat and confirm the subject region's border is mid-draw (partial outline). Report the still.

- [ ] **Step 8: Commit**

```bash
git add skills/map-native/src/story-triggers.ts skills/map-native/src/story-triggers.test.ts skills/map-native/src/components/ChoroplethStory.tsx
git commit -m "feat(map-native): choropleth per-subject emphasis border-draw via staged core"
```

---

### Task 8: Choropleth `context` mode — fill pulse + pole anchor + admin-1 strip

**Files:**
- Modify: `skills/map-native/src/components/ChoroplethStory.tsx`

**Interfaces:**
- Consumes: `stagedEntrance` (Task 1), `poleOfInaccessibility` (Task 3), `resolveRevealMode` (Task 6), `triggers`/`borderByRegion` (Task 7).

**Context:** In `context` mode the base fill stays as today (`fillReveal*0.9` establish ramp, then base) so the whole distribution is visible; the subject region gets a transient overshoot **delta** on top (never dropping below base), plus the Task-7 border and a rising label. This task also swaps the callout centroid for the pole and completes clutter stripping.

- [ ] **Step 1: Add a per-subject bloom fill layer**

For each subject key, after the base `choropleth-fill` layer, add a bloom fill filtered to that region:
```ts
m.addSource(`choro-bloom-${key}`, { type: "geojson", data: singleRegionFeature(worldGeoJson, key) });
m.addLayer({
  id: `choro-bloom-${key}`, type: "fill", source: `choro-bloom-${key}`,
  paint: { "fill-color": binColorForKey(key), "fill-opacity": 0 },
});
```
`singleRegionFeature` = the region's feature by join key; `binColorForKey` = its bin color (reuse the same `sortedBins` lookup used for `colorExpr`). Bloom layers sit above the base fill so their opacity is additive-looking.

- [ ] **Step 2: Drive the fill pulse per frame (context)**

In the per-subject per-frame loop (extend Task 7's loop), compute the base for the region and apply the overshoot **delta** only:
```ts
const base = 0.9; // matches the base fill target
const delta = Math.max(0, staged.fillOpacity - base); // ≥0 only around the bloom peak
map.setPaintProperty(`choro-bloom-${key}`, "fill-opacity", delta);
```
Leave the base `choropleth-fill` opacity expression exactly as today (`fillReveal*0.9`). Non-subject regions are untouched → full distribution stays visible.

- [ ] **Step 3: Swap the callout anchor centroid → pole**

At `ChoroplethStory.tsx:222`, replace:
```ts
const c = centroid(mainlandFeature(f));
```
with:
```ts
const c = poleOfInaccessibility(mainlandFeature(f)) as [number, number];
```
Adjust the surrounding `centroidByKey` set to consume the `[lng, lat]` tuple directly (it already stores `[number, number]`). Rename `centroidByKey` → `anchorByKey` throughout for honesty (optional but preferred). Import `poleOfInaccessibility` from `../core/label-anchor.ts`; drop the now-unused `centroid` import if nothing else uses it.

- [ ] **Step 4: Complete clutter stripping (admin-1)**

In the `load` handler where symbols are stripped (`ChoroplethStory.tsx:171`), extend the condition to also drop inner admin borders, matching RouteReveal (`RouteReveal.tsx:270-271`):
```ts
if (layer.type === "symbol" || /other border/i.test(layer.id)) m.removeLayer(layer.id);
```

- [ ] **Step 5: Wire the label to the staged rise**

The subject callout `CountryLabel`'s `reveal` prop should be driven by `staged.labelReveal` for the active subject (instead of the current `calloutReveal` 0.5s ease). Keep the projection from `anchorByKey.get(key)`. Non-subject callouts unaffected.

- [ ] **Step 6: Full suite + typecheck**

Run: `cd skills/map-native && bun test && bunx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 7: Render-prove context mode (MP4 + still, both eyes)**

Run: `cd skills/map-native && bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/choro-context video`
Expected: `violations: []`. On the MP4: whole map colored throughout (context preserved); each visited region shows border-draw → a brief fill brightening that settles back to base → label rising; callout dot sits **inside** each region (pole anchor). Report the MP4 + a mid-reveal still. **This is a human-judgment gate, not just the pixel-blind check.**

- [ ] **Step 8: Commit**

```bash
git add skills/map-native/src/components/ChoroplethStory.tsx
git commit -m "feat(map-native): choropleth context-mode entrance (fill pulse + pole anchor + admin-1 strip)"
```

---

### Task 9: Choropleth `sequential` mode + adjacency checkpoint decision

**Files:**
- Modify: `skills/map-native/src/components/ChoroplethStory.tsx`

**Interfaces:**
- Consumes: `resolveRevealMode` (Task 6), everything from Tasks 7-8.

**Context:** In `sequential` mode regions start unlit and light up from zero when their beat arrives. The base fill is 0 for all data regions; each subject's bloom layer carries the full `stagedEntrance.fillOpacity` (0 → overshoot → 0.9, then holds). This task also resolves the spec's **adjacency validation checkpoint**.

- [ ] **Step 1: Branch the fill compositing on `revealMode`**

Compute `const mode = resolveRevealMode(config);` once, and branch **in JS** (not inside a paint
expression). Base `choropleth-fill` opacity:
- `context`: leave exactly as Task 8 (the `["case", __hasData==false → 0, fillReveal*0.9]` expression). Do not touch it.
- `sequential`: set base fill to `0` everywhere (nothing lit from establish; the per-subject bloom layers carry all fill):
  ```ts
  if (mode === "sequential") {
    map.setPaintProperty("choropleth-fill", "fill-opacity", 0);
  }
  ```
  Guard so the context branch's expression is set only when `mode === "context"` and the sequential
  `0` only when `mode === "sequential"` — never both in one frame.

Per-subject bloom opacity:
- `context`: `Math.max(0, staged.fillOpacity - base)` (Task 8).
- `sequential`: `staged.fillOpacity` directly (0 → overshoot → 0.9, holds at 0.9 after settle so the region stays lit).

- [ ] **Step 2: Full suite + typecheck**

Run: `cd skills/map-native && bun test && bunx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 3: Render-prove sequential mode**

Add a temporary sequential config: copy `assets/sample-data/choropleth.json` to `/tmp/choro-seq.json` and add `"revealMode": "sequential"`.
Run: `cd skills/map-native && bun scripts/produce.mjs /tmp/choro-seq.json /tmp/choro-seq video`
Expected: `violations: []`. On the MP4: map starts empty; each region lights up from zero (border → fill 0→base → label) only when visited; unvisited regions stay unlit. Report the MP4.

- [ ] **Step 4: RESOLVE the adjacency checkpoint (spec §Per-comp application)**

Judge both MP4s (context from Task 8, sequential from Step 3): does the per-region **border-draw** read cleanly on adjacent choropleth regions, or is the emphasis outline crawling over neighbors noisy? Decide:
- **If clean:** keep border-draw. Note the decision in the commit body and in the spec's checkpoint line.
- **If noisy:** disable the border-draw phase for Choropleth — stop feeding `choro-trail-${key}` (remove the trail layers) and keep only fill-bloom + label-rise. The staged core is untouched (this is a per-comp phase toggle). Record the decision + reasoning, and update the spec so Plan 2 (Cartogram/HexGrid) inherits the same call: border-draw only where geometries are separated.

This decision is a required output of this task — it directly shapes Plan 2.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/components/ChoroplethStory.tsx docs/superpowers/specs/2026-07-20-areal-reveal-choreography-design.md
git commit -m "feat(map-native): choropleth sequential mode + adjacency checkpoint resolved (<clean|border-draw dropped>)"
```

---

## Self-Review

**Spec coverage (Plan 1 scope = foundation + Choropleth):**
- Shared core (staged-reveal, border-slice, pole label-anchor) → Tasks 1-3. ✓
- RouteReveal parity → Task 4. ✓
- `revealMode` context/sequential + default context → Task 6, applied Tasks 8-9. ✓
- Choropleth both modes → Tasks 7-9. ✓
- Pole anchor (centroid bug) → Task 8 Step 3. ✓
- Admin-1 clutter strip (Choropleth) → Task 8 Step 4. ✓
- Typography-agnostic labels → Task 5. ✓
- Adjacency checkpoint → Task 9 Step 4. ✓
- Render-proof discipline per comp → Tasks 4/7/8/9. ✓
- Deferred to Plan 2 (correctly out of this plan): Cartogram, HexGrid, Symbol/Locator strip-only. Deferred elsewhere: point-comp choreography, fixed-plate/satellite, newsroom→CSS-var threading.

**Placeholder scan:** no TBD/TODO; every code step carries real code; the one genuinely-open decision (adjacency) is an explicit render-judged task output, not a placeholder.

**Type consistency:** `stagedEntrance(localSeconds, {fillOpacity})→{borderProgress,fillOpacity,labelReveal}`, `buildDraw(number[][][])→DrawEntry`, `sliceBorder(DrawEntry,number,number)`, `poleOfInaccessibility(Feature)→[number,number]`, `triggerFrameByRegion(Beat[],Phase[])→Map<string,number>`, `resolveRevealMode(config)→RevealMode` — names and signatures consistent across Tasks 1-9. RouteReveal `buildDraw(t.border)` matches the decoupled signature. `choro-trail-${key}` / `choro-bloom-${key}` layer ids consistent between Tasks 7-9.

**Note for the executor:** map-native video produce is slow/flaky under network contention — run render-proofs in isolation, never inside the gate; the gate (`bun test`) covers the pure-unit tasks only.
