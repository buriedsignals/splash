# map-native Narrative Video (slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the choropleth's meaningless global opacity fade with a narrated video — establish → reveal max → reveal min → takeaway — driven by a shared, pure `mapStory` spine that slice 3 will reuse.

**Architecture:** A new framework-free `src/map-story.ts` derives an ordered `Beat[]` from a `ChoroplethLayout` + features (camera, highlight, dim, callout, copy). A pure `src/story-timeline.ts` maps frames → active beat + eased camera interpolation. A new Remotion component `ChoroplethStory.tsx` consumes both on Tom's per-frame `delayRender`/idle harness: deterministic `jumpTo` camera, data-driven dim, HTML callouts (`CountryLabel`) + a beat caption. `produce.mjs` swaps the produced video to `ChoroplethStory{,Square,Portrait}`.

**Tech Stack:** Bun, TypeScript, bun:test, React 19, MapTiler SDK 3.6, Remotion 4, @turf/turf 7.

## Global Constraints

- **Runtime:** Bun only — `bun`, `bunx`, `bun test`. Never `npm`/`npx`/`node`.
- **Language:** all code, comments, commit messages, branch names in English.
- **No attribution:** never mention Claude/Anthropic in any file, commit, or doc. No `Co-Authored-By`.
- **Remotion determinism:** the animation MUST be a pure function of `frame` — never `Date.now()`, `Math.random()`, or `new Date()` in the Remotion path (they also throw in the workflow runtime). Camera is set with `map.jumpTo(...)` per frame, never async `flyTo`.
- **Remotion flags:** render videos with `--gl=angle --concurrency=1` (a second worker racing the shared map instance corrupts frames).
- **Key hygiene:** the MapTiler key comes from `REMOTION_MAPTILER_KEY` (Remotion) / `VITE_MAPTILER_KEY` (web), both gitignored in `/splash/.env`. Never hard-code, commit, or log the key value.
- **Determinism in derivation:** ties resolve by ascending region-key order — no clock/random.
- **Reveal-from-nothing:** the video is blank (fill-opacity 0) at `frame 0` (existing audit guard).

---

### Task 1: Export mainland framing helpers from `choropleth-geo.ts`

`map-story.ts` needs each region's mainland bbox (slice-1b's largest-polygon rule, applied per region) to frame reveal beats. The helper exists privately as `mainlandFeature`; export it and add `regionBounds`.

**Files:**
- Modify: `skills/map-native/src/choropleth-geo.ts`
- Test: `skills/map-native/tests/choropleth-geo.test.ts`

**Interfaces:**
- Consumes: existing `mainlandFeature(f: GeoJSON.Feature): GeoJSON.Feature` (private), `bbox` from turf.
- Produces:
  - `export function mainlandFeature(f: GeoJSON.Feature): GeoJSON.Feature`
  - `export function regionBounds(f: GeoJSON.Feature): [number, number, number, number]` — `bbox(mainlandFeature(f))`.

- [ ] **Step 1: Write the failing test**

Add to `tests/choropleth-geo.test.ts` (the `withTerritory` MultiPolygon feature shape already exists in the file from slice 1b — reuse that same shape inline here):

```ts
import { regionBounds } from "../src/choropleth-geo";

describe("regionBounds", () => {
  it("frames a region by its mainland polygon, ignoring far-flung territory", () => {
    const fra = {
      type: "Feature",
      properties: { iso_a3: "FRA" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [[[2, 48], [4, 48], [4, 50], [2, 50], [2, 48]]],
          [[[-53, 4], [-52.9, 4], [-52.9, 4.1], [-53, 4.1], [-53, 4]]],
        ],
      },
    } as any;
    const b = regionBounds(fra);
    expect(b[0]).toBeGreaterThan(-10); // west = mainland ~2°E, not -53°W
    expect(b[1]).toBeGreaterThan(40);  // south = mainland ~48°N, not 4°N
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/choropleth-geo.test.ts`
Expected: FAIL — `regionBounds` is not exported.

- [ ] **Step 3: Implement**

In `src/choropleth-geo.ts`, change `function mainlandFeature` to `export function mainlandFeature`, and add after it:

```ts
// Mainland bbox of a single region — slice-1b's largest-polygon framing, per region.
export function regionBounds(
  f: GeoJSON.Feature,
): [number, number, number, number] {
  return bbox(mainlandFeature(f)) as [number, number, number, number];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/choropleth-geo.test.ts`
Expected: PASS (12/12 in this file).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/choropleth-geo.ts skills/map-native/tests/choropleth-geo.test.ts
git commit -m "feat(map-native): export mainlandFeature + regionBounds for per-beat framing"
```

---

### Task 2: The `mapStory` spine — `src/map-story.ts`

The pure heart of slices 2 and 3: derive an ordered `Beat[]` from a `ChoroplethLayout` + features.

**Files:**
- Create: `skills/map-native/src/map-story.ts`
- Test: `skills/map-native/tests/map-story.test.ts`

**Interfaces:**
- Consumes: `ChoroplethLayout` (from `choropleth-geo.ts`: `joined:{key,value:number|null}[]`, `bounds`), `regionBounds` (Task 1).
- Produces:
  - `export interface Beat { kind: "establish"|"reveal"|"takeaway"; camera: [number,number,number,number]; highlight: string[]; dim: boolean; callout: { region: string; text: string } | null; copy: string }`
  - `export interface MapStoryMeta { title: string; insight: string; unit: string; valueLabel?: (v: number) => string }`
  - `export function deriveMapStory(layout: ChoroplethLayout, features: GeoJSON.FeatureCollection, joinKey: string, meta: MapStoryMeta): Beat[]`

- [ ] **Step 1: Write the failing tests**

Create `tests/map-story.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { computeChoropleth, type ChoroplethData } from "../src/choropleth-geo";
import { deriveMapStory } from "../src/map-story";

function feat(iso: string, name: string, x: number, y: number) {
  return {
    type: "Feature",
    properties: { iso_a3: iso, name },
    geometry: {
      type: "Polygon",
      coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]],
    },
  };
}
const features = {
  type: "FeatureCollection",
  features: [
    feat("NOR", "Norway", 8, 60),
    feat("DEU", "Germany", 10, 50),
    feat("POL", "Poland", 19, 52),
  ],
} as any;
const data: ChoroplethData = {
  regionKey: "code",
  valueField: "share",
  rows: [
    { code: "NOR", share: 99 },
    { code: "DEU", share: 59 },
    { code: "POL", share: 21 },
  ],
};
const meta = { title: "Renewables across Europe", insight: "North high, south low", unit: "%" };

describe("deriveMapStory", () => {
  it("returns establish → reveal(max) → reveal(min) → takeaway", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual([
      "establish",
      "reveal",
      "reveal",
      "takeaway",
    ]);
    expect(beats[1].highlight).toEqual(["NOR"]); // max
    expect(beats[2].highlight).toEqual(["POL"]); // min
  });
  it("establish uses the full data bounds and the title; no dim, no callout", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const [establish] = deriveMapStory(layout, features, "iso_a3", meta);
    expect(establish.camera).toEqual(layout.bounds);
    expect(establish.copy).toBe(meta.title);
    expect(establish.dim).toBe(false);
    expect(establish.callout).toBeNull();
  });
  it("reveal beats carry a name — value callout and dim the rest", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats[1].callout).toEqual({ region: "NOR", text: "Norway — 99%" });
    expect(beats[1].dim).toBe(true);
    expect(beats[1].copy).toBe("Norway — 99%");
  });
  it("takeaway returns to full bounds with the insight copy", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    const last = beats[beats.length - 1];
    expect(last.kind).toBe("takeaway");
    expect(last.camera).toEqual(layout.bounds);
    expect(last.copy).toBe(meta.insight);
  });
  it("consecutive beats have distinct cameras (the camera moves)", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    for (let i = 1; i < beats.length; i++)
      expect(beats[i].camera).not.toEqual(beats[i - 1].camera);
  });
  it("emits a single reveal when only one region has data", () => {
    const one: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [{ code: "DEU", share: 59 }],
    };
    const layout = computeChoropleth(one, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual(["establish", "reveal", "takeaway"]);
  });
  it("breaks max/min ties by ascending region key (deterministic)", () => {
    const tie: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [
        { code: "POL", share: 50 },
        { code: "NOR", share: 50 },
        { code: "DEU", share: 10 },
      ],
    };
    const layout = computeChoropleth(tie, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats[1].highlight).toEqual(["NOR"]); // first by key among the tied maxima
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd skills/map-native && bun test tests/map-story.test.ts`
Expected: FAIL — `../src/map-story` cannot be resolved.

- [ ] **Step 3: Implement `src/map-story.ts`**

```ts
import type { ChoroplethLayout } from "./choropleth-geo";
import { regionBounds } from "./choropleth-geo";

export interface Beat {
  kind: "establish" | "reveal" | "takeaway";
  camera: [number, number, number, number]; // [w,s,e,n] mainland-framed bbox
  highlight: string[];
  dim: boolean;
  callout: { region: string; text: string } | null;
  copy: string;
}

export interface MapStoryMeta {
  title: string;
  insight: string;
  unit: string;
  valueLabel?: (v: number) => string;
}

export function deriveMapStory(
  layout: ChoroplethLayout,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
  meta: MapStoryMeta,
): Beat[] {
  const fmt =
    meta.valueLabel ??
    ((v: number) => `${Math.round(v)}${meta.unit ? meta.unit : ""}`);

  // Regions that actually have a value, sorted by ascending key for tie-stability.
  const withData = layout.joined
    .filter((j): j is { key: string; value: number } => j.value !== null)
    .sort((a, b) => a.key.localeCompare(b.key));

  // Pick the extremes deterministically: max value (first by key among ties), min value likewise.
  const maxRow = withData.reduce((best, j) => (j.value > best.value ? j : best));
  const minRow = withData.reduce((best, j) => (j.value < best.value ? j : best));

  const featByKey = new Map<string, GeoJSON.Feature>();
  for (const f of features.features) {
    const k = String(f.properties?.[joinKey]);
    if (!featByKey.has(k)) featByKey.set(k, f);
  }
  const nameOf = (key: string) =>
    String(featByKey.get(key)?.properties?.name ?? key);
  const cameraOf = (key: string) => {
    const f = featByKey.get(key);
    return f ? regionBounds(f) : layout.bounds;
  };
  const calloutText = (key: string, value: number) =>
    `${nameOf(key)} — ${fmt(value)}`;

  const beats: Beat[] = [];
  beats.push({
    kind: "establish",
    camera: layout.bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });

  const revealKeys =
    maxRow.key === minRow.key ? [maxRow.key] : [maxRow.key, minRow.key];
  for (const key of revealKeys) {
    const value = withData.find((j) => j.key === key)!.value;
    beats.push({
      kind: "reveal",
      camera: cameraOf(key),
      highlight: [key],
      dim: true,
      callout: { region: key, text: calloutText(key, value) },
      copy: calloutText(key, value),
    });
  }

  beats.push({
    kind: "takeaway",
    camera: layout.bounds,
    highlight: [],
    dim: true,
    callout: null,
    copy: meta.insight,
  });

  return beats;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/map-story.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/map-story.ts skills/map-native/tests/map-story.test.ts
git commit -m "feat(map-native): deriveMapStory — the shared narrative spine (establish/reveal/takeaway)"
```

---

### Task 3: Pure timeline + camera interpolation — `src/story-timeline.ts`

The component needs, per frame: which beat is active, and the eased camera between two beats. The MapTiler `cameraForBounds` (bbox → `{center, zoom}`) needs a map instance, so the component precomputes each beat's `{center, zoom}` at init; THIS module is the pure frame→state math over those precomputed solutions.

**Files:**
- Create: `skills/map-native/src/story-timeline.ts`
- Test: `skills/map-native/tests/story-timeline.test.ts`

**Interfaces:**
- Consumes: `Beat[]` length only (for counts), `fps`, durations.
- Produces:
  - `export interface CameraSolution { center: [number, number]; zoom: number }`
  - `export interface Phase { beatIndex: number; startFrame: number; holdFrames: number; moveFrames: number }`
  - `export function buildTimeline(beatCount: number, fps: number, opts?: { establishHold?: number; revealHold?: number; takeawayHold?: number; move?: number }): { phases: Phase[]; totalFrames: number }` — seconds → frames; phase 0 has `moveFrames: 0` (nothing to move from).
  - `export function cameraForFrame(frame: number, phases: Phase[], solutions: CameraSolution[]): { camera: CameraSolution; beatIndex: number; fillReveal: number }` — `fillReveal` is 0→1 across the establish hold (blank at frame 0), 1 thereafter. During a move, interpolate `center`/`zoom` from the previous beat's solution to the current with `easeInOutCubic`; during a hold, the current solution.
  - `export function easeInOutCubic(t: number): number`

- [ ] **Step 1: Write the failing tests**

Create `tests/story-timeline.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import {
  buildTimeline,
  cameraForFrame,
  easeInOutCubic,
  type CameraSolution,
} from "../src/story-timeline";

describe("buildTimeline", () => {
  it("lays out establish/reveal/takeaway holds with moves between, first move 0", () => {
    const { phases, totalFrames } = buildTimeline(4, 30, {
      establishHold: 2,
      revealHold: 3,
      takeawayHold: 3,
      move: 1,
    });
    expect(phases).toHaveLength(4);
    expect(phases[0].moveFrames).toBe(0);
    expect(phases[0].startFrame).toBe(0);
    expect(phases[0].holdFrames).toBe(60); // 2s @30
    expect(phases[1].moveFrames).toBe(30); // 1s
    // total = 2 + (1+3) + (1+3) + (1+3) = 14s -> 420 frames
    expect(totalFrames).toBe(420);
  });
});

describe("cameraForFrame", () => {
  const sols: CameraSolution[] = [
    { center: [0, 0], zoom: 3 },
    { center: [10, 10], zoom: 5 },
    { center: [20, 0], zoom: 5 },
    { center: [0, 0], zoom: 3 },
  ];
  const { phases } = buildTimeline(4, 30, {
    establishHold: 2,
    revealHold: 3,
    takeawayHold: 3,
    move: 1,
  });
  it("is blank (fillReveal 0) at frame 0 and full after establish", () => {
    expect(cameraForFrame(0, phases, sols).fillReveal).toBe(0);
    expect(cameraForFrame(59, phases, sols).fillReveal).toBeCloseTo(1, 1);
  });
  it("sits on the establish camera during its hold", () => {
    const r = cameraForFrame(30, phases, sols);
    expect(r.beatIndex).toBe(0);
    expect(r.camera.center).toEqual([0, 0]);
  });
  it("interpolates center/zoom during a move between beats", () => {
    // beat 1 move spans frames 60..89 (1s). Midpoint ~frame 75 → between sol[0] and sol[1].
    const r = cameraForFrame(75, phases, sols);
    expect(r.beatIndex).toBe(1);
    expect(r.camera.center[0]).toBeGreaterThan(0);
    expect(r.camera.center[0]).toBeLessThan(10);
  });
  it("lands exactly on the target camera once the move completes", () => {
    const r = cameraForFrame(95, phases, sols); // into beat 1 hold
    expect(r.camera.center).toEqual([10, 10]);
    expect(r.camera.zoom).toBe(5);
  });
});

describe("easeInOutCubic", () => {
  it("is 0 at 0, 1 at 1, 0.5 at 0.5", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd skills/map-native && bun test tests/story-timeline.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/story-timeline.ts`**

```ts
export interface CameraSolution {
  center: [number, number];
  zoom: number;
}
export interface Phase {
  beatIndex: number;
  startFrame: number; // first frame of this phase's MOVE (or hold, for beat 0)
  holdFrames: number;
  moveFrames: number;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function buildTimeline(
  beatCount: number,
  fps: number,
  opts: {
    establishHold?: number;
    revealHold?: number;
    takeawayHold?: number;
    move?: number;
  } = {},
): { phases: Phase[]; totalFrames: number } {
  const establishHold = Math.round((opts.establishHold ?? 2.5) * fps);
  const revealHold = Math.round((opts.revealHold ?? 3) * fps);
  const takeawayHold = Math.round((opts.takeawayHold ?? 3) * fps);
  const move = Math.round((opts.move ?? 1.2) * fps);

  const phases: Phase[] = [];
  let cursor = 0;
  for (let i = 0; i < beatCount; i++) {
    const isFirst = i === 0;
    const isLast = i === beatCount - 1;
    const moveFrames = isFirst ? 0 : move;
    const holdFrames = isFirst
      ? establishHold
      : isLast
        ? takeawayHold
        : revealHold;
    phases.push({ beatIndex: i, startFrame: cursor, holdFrames, moveFrames });
    cursor += moveFrames + holdFrames;
  }
  return { phases, totalFrames: cursor };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function cameraForFrame(
  frame: number,
  phases: Phase[],
  solutions: CameraSolution[],
): { camera: CameraSolution; beatIndex: number; fillReveal: number } {
  // Find the active phase (last phase whose startFrame <= frame).
  let p = phases[0];
  for (const phase of phases) if (frame >= phase.startFrame) p = phase;

  const i = p.beatIndex;
  const moveEnd = p.startFrame + p.moveFrames;

  // fillReveal: 0 -> 1 across beat 0's hold (the blank-to-visible reveal), 1 after.
  const establish = phases[0];
  const fillReveal =
    frame <= establish.startFrame
      ? 0
      : Math.min(1, (frame - establish.startFrame) / Math.max(1, establish.holdFrames));

  if (p.moveFrames > 0 && frame < moveEnd) {
    const t = easeInOutCubic((frame - p.startFrame) / p.moveFrames);
    const from = solutions[i - 1];
    const to = solutions[i];
    return {
      beatIndex: i,
      fillReveal,
      camera: {
        center: [
          lerp(from.center[0], to.center[0], t),
          lerp(from.center[1], to.center[1], t),
        ],
        zoom: lerp(from.zoom, to.zoom, t),
      },
    };
  }
  return { beatIndex: i, fillReveal, camera: solutions[i] };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/story-timeline.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/story-timeline.ts skills/map-native/tests/story-timeline.test.ts
git commit -m "feat(map-native): pure story timeline + eased camera interpolation"
```

---

### Task 4: The narrative component — `src/components/ChoroplethStory.tsx`

Consumes `deriveMapStory` + the timeline on Tom's per-frame harness. Replaces `ChoroplethReveal` as the produced video. No unit test (render-bound); verified by the audit story-check (Task 6) and the produce smoke.

**Files:**
- Create: `skills/map-native/src/components/ChoroplethStory.tsx`
- Reference (copy the harness pattern verbatim): `skills/map-native/src/components/ChoroplethReveal.tsx`
- Reference (callout): `skills/map-native/src/components/CountryLabel.tsx` — `CountryLabel({ name, color, reveal, x, y })`.

**Interfaces:**
- Consumes: `deriveMapStory` (Task 2), `buildTimeline`/`cameraForFrame` (Task 3), `computeChoropleth` + `regionBounds` (existing), `CountryLabel`.
- Produces: `export const ChoroplethStory: React.FC<{ config: ChoroplethData & { title?: string; unit?: string; insight?: string; source?: { name: string; url: string } } }>`.

**Implementation notes (build from the `ChoroplethReveal` skeleton — same init-once map, same `delayRender`/idle gate; these are the deltas):**

1. **At init (`on('load')` → after `fetch(staticFile("geo/world.geojson"))` resolves and the source/layers are added):**
   - Run `computeChoropleth(config, world, "iso_a3", { bins: 5, scaleType: "sequential" })`.
   - Build `meta = { title: config.title ?? "", insight: config.insight ?? config.title ?? "", unit: config.unit ?? "" }` and `const beats = deriveMapStory(layout, world, "iso_a3", meta)`.
   - Precompute camera solutions: `const solutions = beats.map((b) => m.cameraForBounds(b.camera as maptilersdk.LngLatBoundsLike, { padding: 48 }))` then map each to `{ center: [c.center.lng, c.center.lat], zoom: c.zoom }`.
   - `const { phases } = buildTimeline(beats.length, fps)` (fps from `useVideoConfig`).
   - **Emphasis model (two layers of control):** give each feature two boolean properties, `__highlight` (in `beat.highlight`) and `__dimmed` (`beat.dim` true AND not highlighted). These change only on beat change → update them via `source.setData(enrichedWorld)` only when the active beat index changes (track in a ref), NOT every frame. The reveal scalar `fillReveal` (0→1, blank at frame 0) is applied every frame via `setPaintProperty("choropleth-fill","fill-opacity", expr)` where:
     ```js
     const expr = [
       "case",
       ["==", ["get", "__highlight"], 1], 1.0 * fillReveal,
       ["==", ["get", "__dimmed"], 1], 0.25 * fillReveal,
       0.85 * fillReveal,
     ];
     ```
     So: highlighted region = full, dimmed regions = 0.25, normal = 0.85, all scaled by the reveal (frame 0 → all 0 → blank). The expression is rebuilt each frame because `fillReveal` is a JS scalar baked into it.
   - Precompute each region's centroid for callouts: `centroidByKey: Map<string,[number,number]>` = turf `centroid(mainlandFeature(feature))` per matched feature.
   - Store `{ map: m, beats, phases, solutions, centroidByKey, sortedBins }` in state and `continueRender(handle)` on idle.

2. **Per frame (`useEffect([mapState, frame])`):**
   - `const h = delayRender(\`story-frame-${frame}\`)`.
   - `const { camera, beatIndex, fillReveal } = cameraForFrame(frame, phases, solutions)`.
   - `map.jumpTo({ center: camera.center, zoom: camera.zoom })` (deterministic — never `flyTo`).
   - If `beatIndex` changed since the last rendered frame (compare a ref): rebuild the source features with `__highlight`/`__dimmed` from `beats[beatIndex]` and call `map.getSource("choropleth-world").setData(enrichedWorld)`.
   - Every frame: `map.setPaintProperty("choropleth-fill","fill-opacity", expr)` with the `fillReveal`-scaled `["case", …]` expression from note 1 (frame 0 → blank).
   - `map.once('idle', () => continueRender(h)); map.triggerRepaint();`

3. **HTML overlays (rendered in JSX, not on the map):**
   - **Callout:** when `beats[beatIndex].callout` is set, project its region centroid each frame: compute the centroid once per region (turf `centroid` of `mainlandFeature`) at init, store a `Map<key, [lng,lat]>`; per frame `const pt = map.project(centroidByKey.get(key))` and render `<CountryLabel name={callout.text} color={highlightColor} reveal={calloutReveal} x={pt.x} y={pt.y} />`. `calloutReveal` = eased 0→1 over the first ~0.5s of the beat's hold (use `cameraForFrame`'s phase math or a local interpolate on `frame - (phase.startFrame+phase.moveFrames)`).
   - **Caption:** render `beats[beatIndex].copy` as a lower-third overlay (engine tokens; semi-opaque card, WCAG-contrasting text). Fade in with the beat.
   - Keep the existing label-strip CSS that hides MapTiler controls.

4. **Determinism:** all timing derives from `frame`; no `Date`/`random`. `jumpTo` (not `flyTo`). `preserveDrawingBuffer: true` already in the constructor copy.

- [ ] **Step 1: Implement `ChoroplethStory.tsx`** per the notes above, starting from a copy of `ChoroplethReveal.tsx`.

- [ ] **Step 2: Typecheck**

Run: `cd skills/map-native && bunx tsc --noEmit 2>&1 | grep ChoroplethStory || echo "no ChoroplethStory type errors"`
Expected: no errors referencing `ChoroplethStory` (the pre-existing `react-dom` TS2688 in the repo is unrelated).

- [ ] **Step 3: Commit**

```bash
git add skills/map-native/src/components/ChoroplethStory.tsx
git commit -m "feat(map-native): ChoroplethStory — narrated video component (beats + camera + callouts + caption)"
```

---

### Task 5: Register the story compositions — `remotion/src/Root.tsx`

Swap the produced video from `ChoroplethReveal` to `ChoroplethStory`, with durations from the timeline.

**Files:**
- Modify: `skills/map-native/remotion/src/Root.tsx`

**Interfaces:**
- Consumes: `ChoroplethStory` (Task 4), `buildTimeline` (Task 3), `deriveMapStory` (Task 2), `computeChoropleth`, `sampleConfig`.

- [ ] **Step 1: Compute the sample duration and register compositions**

In `Root.tsx`: import `ChoroplethStory`, `computeChoropleth`, `deriveMapStory`, `buildTimeline`, and the world geojson (`import world from "../../assets/geo/world.geojson"` — already bundled). Compute the default duration ONCE at module load (pure, deterministic):

```tsx
const sampleLayout = computeChoropleth(sampleConfig, world as any, "iso_a3", { bins: 5, scaleType: "sequential" });
const sampleBeats = deriveMapStory(sampleLayout, world as any, "iso_a3", {
  title: sampleConfig.title, insight: sampleConfig.insight ?? sampleConfig.title, unit: sampleConfig.unit,
});
const STORY_FRAMES = buildTimeline(sampleBeats.length, 30).totalFrames;
```

Replace the three `Choropleth{Reveal,Square,Portrait}` `<Composition>` entries with `ChoroplethStory{,Square,Portrait}` (ids `ChoroplethStory`, `ChoroplethStorySquare`, `ChoroplethStoryPortrait`), `component={ChoroplethStory}`, `durationInFrames={STORY_FRAMES}`, fps 30, sizes 1280×720 / 1080×1080 / 1080×1350, `defaultProps={{ config: sampleConfig }}`. Keep `MapExplainer` and `HarnessCheck` as-is. Keep the old `ChoroplethReveal` import removed only if no longer referenced.

- [ ] **Step 2: Verify Remotion can list the compositions**

Run: `cd skills/map-native && REMOTION_MAPTILER_KEY=dummy bunx remotion compositions remotion/src/index.ts 2>&1 | grep -E "ChoroplethStory|ChoroplethStorySquare|ChoroplethStoryPortrait"`
Expected: all three ids listed (composition registration is metadata-only; it does not render, so a dummy key is fine).

- [ ] **Step 3: Commit**

```bash
git add skills/map-native/remotion/src/Root.tsx
git commit -m "feat(map-native): register ChoroplethStory compositions with timeline-derived duration"
```

---

### Task 6: Swap produce + audit story-check + conformance

Point `produce.mjs` at the story compositions, add the deterministic "tells a story" audit, and extend conformance.

**Files:**
- Modify: `skills/map-native/scripts/produce.mjs`
- Create: `skills/map-native/scripts/audit-story.mjs`
- Modify: `skills/map-native/src/conformance.ts`
- Test: `skills/map-native/tests/conformance.test.ts`

**Interfaces:**
- Consumes: `deriveMapStory` (Task 2), `checkChoroplethConformance` (existing).
- Produces: `audit-story.mjs` (a runnable assertion script, exit 1 on failure); `checkChoroplethConformance` gains a `storyBeats?: number` input + a `hasStory` check.

- [ ] **Step 1: Point produce.mjs at the story compositions**

In `scripts/produce.mjs`, change the composition loop from `ChoroplethReveal/Square/Portrait` to:

```js
for (const [comp, name] of [
  ["ChoroplethStory", "landscape"],
  ["ChoroplethStorySquare", "square"],
  ["ChoroplethStoryPortrait", "portrait"],
]) {
```

(Leave the rest of the produce flow — `--props` injection, still + mp4 render, tmpdir cleanup — unchanged.)

- [ ] **Step 2: Write the failing conformance test**

Add to `tests/conformance.test.ts`:

```ts
it("flags a map with no derivable story (fewer than 3 beats)", () => {
  const r = checkChoroplethConformance({
    title: "Renewables power Europe's north",
    source: { name: "Ember", url: "https://example.org" },
    scaleColors: ["#deebf7", "#9ecae1", "#4292c6"],
    scaleType: "sequential",
    hasLegend: true,
    regionsWithData: 8,
    regionsTotal: 200,
    boundsNonEmpty: true,
    storyBeats: 2,
  }, ["#1a1a1a"]);
  expect(r.ok).toBe(false);
  expect(r.failures.some((f) => /story/i.test(f))).toBe(true);
});
it("passes when a story has at least 3 beats", () => {
  const r = checkChoroplethConformance({
    title: "Renewables power Europe's north",
    source: { name: "Ember", url: "https://example.org" },
    scaleColors: ["#deebf7", "#9ecae1", "#4292c6"],
    scaleType: "sequential",
    hasLegend: true,
    regionsWithData: 8,
    regionsTotal: 200,
    boundsNonEmpty: true,
    storyBeats: 4,
  }, ["#1a1a1a"]);
  expect(r.ok).toBe(true);
});
```

(Match the exact `ConformanceInput` field names already in `conformance.ts`; if the existing object differs, mirror it and only add `storyBeats`.)

- [ ] **Step 3: Run it to verify it fails**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: FAIL — `storyBeats` not handled; no story failure produced.

- [ ] **Step 4: Implement the conformance check**

In `src/conformance.ts`, add `storyBeats?: number` to the input type and, where other checks push failures, add:

```ts
if (input.storyBeats !== undefined && input.storyBeats < 3) {
  failures.push(
    `story: only ${input.storyBeats} beats — a narrated map needs at least establish + reveal + takeaway (3)`,
  );
}
```

(Keep `ok = failures.length === 0` as the existing code computes it.)

- [ ] **Step 5: Run conformance tests**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: PASS (8/8).

- [ ] **Step 6: Write `scripts/audit-story.mjs`**

A deterministic story audit (no render) — runs `deriveMapStory` on the sample and asserts the narrative invariants from the spec:

```js
// Deterministic "the video tells a story" audit. Runs deriveMapStory on the sample
// config and asserts the narrative invariants — distinct cameras (camera moves),
// callouts with text, establish→takeaway envelope, non-empty copy. No render.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeChoropleth } from "../src/choropleth-geo.ts";
import { deriveMapStory } from "../src/map-story.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const config = JSON.parse(readFileSync(join(root, "assets/sample-data/choropleth.json"), "utf8"));
const world = JSON.parse(readFileSync(join(root, "assets/geo/world.geojson"), "utf8"));

const layout = computeChoropleth(config, world, "iso_a3", { bins: 5, scaleType: "sequential" });
const beats = deriveMapStory(layout, world, "iso_a3", {
  title: config.title, insight: config.insight ?? config.title, unit: config.unit,
});

const problems = [];
if (beats.length < 3) problems.push(`only ${beats.length} beats`);
if (beats[0].kind !== "establish") problems.push("does not open on establish");
if (beats[beats.length - 1].kind !== "takeaway") problems.push("does not close on takeaway");
const reveals = beats.filter((b) => b.kind === "reveal");
if (!reveals.length) problems.push("no reveal beats");
for (const r of reveals) {
  if (!r.highlight.length) problems.push("a reveal has no highlight");
  if (!r.callout || !r.callout.text) problems.push("a reveal has no callout text");
}
for (let i = 1; i < beats.length; i++)
  if (JSON.stringify(beats[i].camera) === JSON.stringify(beats[i - 1].camera))
    problems.push(`beats ${i - 1}->${i} share a camera (no movement)`);
if (beats.some((b) => !b.copy)) problems.push("a beat has empty copy");

if (problems.length) {
  console.error("✗ story audit FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ story audit GREEN — ${beats.length} beats, ${reveals.length} reveals, cameras move, callouts present.`);
```

Add a `package.json` script: `"audit:story": "bun scripts/audit-story.mjs"`.

- [ ] **Step 7: Run the story audit**

Run: `cd skills/map-native && bun run audit:story`
Expected: `✓ story audit GREEN — 4 beats, 2 reveals, cameras move, callouts present.`

- [ ] **Step 8: Commit**

```bash
git add skills/map-native/scripts/produce.mjs skills/map-native/scripts/audit-story.mjs skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts skills/map-native/package.json
git commit -m "feat(map-native): produce the story video + deterministic story audit + conformance story gate"
```

---

### Task 7: Produce the narrative video and verify it tells the story

Render the real outputs and eyeball that the video now narrates (the operator's acceptance test).

**Files:**
- Output: `skills/map-native/output-proof/choropleth/` (overwrite the reveal mp4s with story mp4s + stills)

**Interfaces:**
- Consumes: the full pipeline (Tasks 1–6).

- [ ] **Step 1: Run produce on the sample (all formats)**

Run (the key must be present in the environment; sourced from `/splash/.env`, never logged):
```bash
cd skills/map-native && set -a && . ../../.env && set +a \
  && bun scripts/produce.mjs assets/sample-data/choropleth.json output-proof/choropleth all
```
Expected: writes `static.png`, `interactive.png`, and `video-landscape.mp4` / `video-square.mp4` / `video-portrait.mp4` (plus stills). No errors; renders use `--gl=angle --concurrency=1` (already in produce.mjs).

- [ ] **Step 2: Extract a mid-reveal frame and confirm the callout + dim**

The produce path already renders a `video-*-still.png`. Open the landscape still (mid-timeline) and confirm: the highlighted region is full-colour, the rest dimmed, and the callout text (`Norway — 99%`) is visible. If produce's still lands on frame 0 (blank), render an explicit mid-frame:
```bash
cd skills/map-native && set -a && . ../../.env && set +a \
  && bunx remotion still remotion/src/index.ts ChoroplethStory output-proof/choropleth/story-midframe.png --frame=150 --gl=angle --props=<(echo '{"config":'"$(cat assets/sample-data/choropleth.json)"'}')
```
Expected: a frame showing a zoomed reveal with the callout. (Eyeball — this is the "ça raconte rien" acceptance gate.)

- [ ] **Step 3: Run the full test suite + the story audit**

Run: `cd skills/map-native && bun test && bun run audit:story`
Expected: all tests pass (choropleth-geo 12, map-story 7, story-timeline 6, conformance 8) and the story audit is GREEN.

- [ ] **Step 4: Commit the proof outputs**

```bash
git add skills/map-native/output-proof/choropleth
git commit -m "chore(map-native): narrative video proof outputs (story replaces opacity fade)"
```

## Notes for the executor

- Build from the existing `ChoroplethReveal.tsx` — it already solves map-init, the world fetch via `staticFile`, the symbol-layer strip, and the `delayRender`/idle gate. The story component changes only what the spec's deltas describe (beats, camera, dim, overlays).
- The `react-dom` `TS2688` typecheck error is pre-existing and unrelated — do not chase it; only ensure your new files add no NEW type errors.
- Do not run the full browser `audit` (the live-tile basemap-fit audit) more than necessary — repeated back-to-back full runs hit MapTiler tile rate limits and produce flaky idle timeouts (a known minor). The story audit (`audit:story`) is render-free and deterministic; prefer it for the narrative gate.
- Never commit or log the MapTiler key. Source `/splash/.env` only in the shell, not into any file.
