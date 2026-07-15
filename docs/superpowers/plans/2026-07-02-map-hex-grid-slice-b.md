# Map Hex-Grid — Slice B (video: reveal · storytelling · scrolly) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three video formats (reveal, storytelling, scrolly) + interactive scrolly to the
hex-grid map type, so it reaches full six-format parity.

**Architecture:** A pure `deriveHexGridStory` produces the shared `Beat[]` (title → establish → reveal
the highest cells → takeaway; the camera stays framed on the data zone). Video components port from the
dot-density siblings: `HexGridReveal` (cells fade in on a fixed camera, grid computed once),
`HexGridStory` (guided tour to the top cells, `__cellIdx` dim-emphasis), `HexGridScrolly` (dispatched by
MapScrolly). `deriveHexGridStory → mapStoryToChapters` feeds both the scrolly video and the interactive
scrolly.

**Tech Stack:** Bun, TypeScript, Remotion, MapTiler SDK, turf, `bun:test`.

**Prereq:** hex-grid Slice A (hex-grid-geo, HexGridMap static+interactive, validation, conformance)
merged to main.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`.
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `splash/.env` (gitignored). Render commands load it via
  `set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a`.
- **Frame-determinism:** the cell GeoJSON is built ONCE (deterministic `computeHexGrid`) and held; camera
  animates per frame; no `Date.now`/`Math.random`/argless `new Date()`; render `--gl=angle --concurrency=1`.
- **Uniform-cell invariant:** cell colour encodes magnitude, never cell size; no size legend.
- **Camera stays on the zone:** a reveal frames the cell expanded to ≥50% of the data extent — never a
  single tiny cell (the over-zoom lesson from the locator work).
- Reuse the dot-density Slice B pattern (`deriveDotDensityStory`/`DotDensityReveal`/`DotDensityStory`/
  `DotDensityScrolly`), the reveal/story/scrolly pipeline, `resolveScene`, `StoryCards`,
  `buildTimeline`/`cameraForFrame`, `mapStoryToChapters`, `computeHexGrid`, `resolveMapStyle`.
- After writing any `.tsx`, verify NUL-free: `grep -c $'\\x00' <file>` prints 0.

---

## File structure

**Create:** `src/hex-grid-story.ts`, `src/components/HexGridReveal.tsx`, `HexGridStory.tsx`,
`HexGridScrolly.tsx`, `tests/hex-grid-story.test.ts`.
**Modify:** `src/route-story.ts` (scrollyStepCount branch), `src/components/MapScrolly.tsx` (dispatch),
`remotion/src/Root.tsx`, `scripts/produce.mjs`, KB formats + `types/hex-grid.md`, `SKILL.md`.

---

## Task 1: `deriveHexGridStory` + scrolly step count

**Files:** Create `skills/map-native/src/hex-grid-story.ts`; Modify `skills/map-native/src/route-story.ts`;
Test `skills/map-native/tests/hex-grid-story.test.ts`.

**Interfaces:**
- Consumes: `Beat` (`./map-story`), `HexGridLayout`/`computeHexGrid` (`./hex-grid-geo`), `bbox` (turf),
  `mapStoryToChapters` (`../../scrolly/src/chapters`).
- Produces:
  - `interface HexGridStoryMeta { title: string; description?: string; insight?: string }`
  - `function deriveHexGridStory(layout: HexGridLayout, meta: HexGridStoryMeta, opts?: { maxReveals?: number }): Beat[]`

**Beat model** (`map-story.ts`, unchanged): `{ kind: "title"|"establish"|"reveal"|"takeaway"; camera: [number,number,number,number]; highlight: string[]; dim: boolean; callout: { region: string; name: string; value: string; text: string } | null; copy: string }`.

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/hex-grid-story.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { deriveHexGridStory } from "../src/hex-grid-story";
import type { HexGridLayout } from "../src/hex-grid-geo";

const cell = (id: number, value: number, count: number): HexGridLayout["cells"][number] => ({
  feature: {
    type: "Feature", properties: {},
    geometry: { type: "Polygon", coordinates: [[[id, 45], [id + 0.2, 45], [id + 0.2, 45.2], [id, 45.2], [id, 45]]] },
  },
  count, value, color: "#2171b5", binIdx: 0,
});
const layout: HexGridLayout = {
  cells: [cell(2, 5, 5), cell(4, 18, 18), cell(6, 11, 11)],
  bins: [], cellSizeKm: 20, bounds: [2, 45, 6.2, 45.2],
  aggregate: "count", binShape: "hex", aggregateLabel: "points per hexagon", capped: false,
};

describe("deriveHexGridStory", () => {
  const beats = deriveHexGridStory(layout, { title: "Where the incidents cluster" });
  it("emits title + establish + reveals + takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(3);
  });
  it("reveals the highest cell first with a value + rank caption", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].copy).toContain("18 points");
    expect(reveals[0].copy).toContain("densest");
    expect(reveals[0].highlight).toEqual(["1"]); // index of the value-18 cell
  });
  it("keeps the reveal camera framed on the zone (never a single tiny cell)", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    const [w, s, e, n] = reveals[0].camera;
    // the reveal span is >= 50% of the full extent span (2..6.2 = 4.2 wide → >= 2.1)
    expect(e - w).toBeGreaterThanOrEqual((6.2 - 2) * 0.5 - 1e-6);
  });
  it("caps reveals at maxReveals", () => {
    expect(deriveHexGridStory(layout, { title: "x-title here" }, { maxReveals: 1 }).filter((b) => b.kind === "reveal").length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/hex-grid-story.test.ts`
Expected: FAIL — `deriveHexGridStory` not exported.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/hex-grid-story.ts`:

```typescript
// Beat derivation for hex-grid videos — the sibling of deriveDotDensityStory. title → establish
// (all cells) → reveal the HIGHEST cells (by aggregate, descending, capped) → takeaway. Cells are
// anonymous grid cells, so a reveal caption is value + rank ("18 points — the densest hexagon"). The
// camera STAYS framed on the data zone: a reveal expands the cell bbox to >= 50% of the full extent so
// it never over-zooms to a single cell (the locator camera lesson).
import type { Beat } from "./map-story";
import type { HexGridLayout } from "./hex-grid-geo";
import { bbox } from "@turf/turf";

export interface HexGridStoryMeta {
  title: string;
  description?: string;
  insight?: string;
}

const DEFAULT_MAX_REVEALS = 5;

// Expand a cell bbox so its span is at least `minFrac` of the full extent (centred on the cell).
function frameCell(
  cell: [number, number, number, number],
  full: [number, number, number, number],
  minFrac = 0.5,
): [number, number, number, number] {
  const [cw, cs, ce, cn] = cell;
  const [fw, fs, fe, fn] = full;
  const cx = (cw + ce) / 2, cy = (cs + cn) / 2;
  const halfW = Math.max((ce - cw) / 2, ((fe - fw) * minFrac) / 2);
  const halfH = Math.max((cn - cs) / 2, ((fn - fs) * minFrac) / 2);
  return [cx - halfW, cy - halfH, cx + halfW, cy + halfH];
}

export function deriveHexGridStory(
  layout: HexGridLayout,
  meta: HexGridStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const full = layout.bounds;
  const shapeWord = layout.binShape === "hex" ? "hexagon" : "cell";
  const fmt = (v: number) =>
    layout.aggregate === "mean" ? `${v.toFixed(1)} avg` : layout.aggregate === "sum" ? `${Math.round(v)}` : `${Math.round(v)} points`;

  const beats: Beat[] = [];
  beats.push({ kind: "title", camera: full, highlight: [], dim: false, callout: null, copy: meta.title });
  beats.push({ kind: "establish", camera: full, highlight: [], dim: false, callout: null, copy: "" });

  // Rank cells by aggregate value, descending; ties broken by index for determinism.
  const ranked = layout.cells
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.value - a.c.value || a.i - b.i);

  ranked.slice(0, cap).forEach(({ c, i }, rank) => {
    const cellBbox = bbox(c.feature) as [number, number, number, number];
    const desc = rank === 0 ? "the densest" : rank === 1 ? "the 2nd densest" : `#${rank + 1}`;
    const value = fmt(c.value);
    const text = `${value} — ${desc} ${shapeWord}`;
    beats.push({
      kind: "reveal",
      camera: frameCell(cellBbox, full),
      highlight: [String(i)],
      dim: true,
      callout: { region: String(i), name: desc, value, text },
      copy: text,
    });
  });

  beats.push({
    kind: "takeaway",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/hex-grid-story.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `hex-grid` branch to `scrollyStepCount`**

In `skills/map-native/src/route-story.ts`, add a `hex-grid` branch BEFORE the symbol branch, and the
imports `computeHexGrid` (from `./hex-grid-geo`) and `deriveHexGridStory` (from `./hex-grid-story`):

```typescript
if (config.type === "hex-grid") {
  const layout = computeHexGrid(config);
  const beats = deriveHexGridStory(layout, {
    title: config.title ?? "",
    description: config.description,
    insight: config.insight ?? config.title ?? "",
  });
  return mapStoryToChapters(beats, {
    title: config.title ?? "",
    description: config.description,
    source: config.source,
    regionsWithData: layout.cells.length,
  }).steps.length;
}
```

(`computeHexGrid` takes the config directly — it uses `config.points`; the `world` arg of
`scrollyStepCount` is unused for hex-grid.)

- [ ] **Step 6: Full suite**

Run: `cd skills/map-native && bun test`
Expected: all pass (Slice A's 239 + the new hex-grid-story tests).

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/hex-grid-story.ts skills/map-native/src/route-story.ts skills/map-native/tests/hex-grid-story.test.ts
git commit -m "feat(map-native): deriveHexGridStory (highest-cell beats, camera stays on zone) + scrolly step count"
```

---

## Task 2: HexGridReveal + HexGridStory + Root + produce + render-verify

**Files:** Create `src/components/HexGridReveal.tsx`, `HexGridStory.tsx`; Modify `remotion/src/Root.tsx`,
`scripts/produce.mjs`.

**Interfaces:**
- Consumes: `deriveHexGridStory` (Task 1), `computeHexGrid` (Slice A), `resolveMapStyle` (route-geo),
  `easedRevealProgress`/`revealCameraPlan`/`REVEAL_FRAMES` (reveal), `resolveScene`/`TITLE_SCENE_FRAMES`,
  `buildTimeline`/`cameraForFrame` (story-timeline), `TitleCard`/`CaptionCard` (StoryCards),
  `MapFrame`/`resolveMapFrame`.
- Produces: `HexGridReveal`, `HexGridStory` React components `{ config: HexGridConfigShape }`.

### HexGridReveal — port `skills/map-native/src/components/DotDensityReveal.tsx` (read it fully). Deltas:
1. Build the CELL source like `HexGridMap` (Slice A): `computeHexGrid(config)` → a FeatureCollection of
   the cell polygons carrying `{ __color, __count, __value }` — ONCE on load. (Reuse the Slice A cell-build.)
2. Cell `fill` layer: `fill-color: ["get","__color"]`; **fill-opacity ramps 0→0.8 by the reveal
   `progress`** (the fade-in); thin cell outline. Never colour/scale by cell size.
3. mapStyle-adaptive via `resolveMapStyle`; fixed camera `revealCameraPlan(layout.bounds)`; sequential bin
   legend + aggregate label; title scene + MapFrame — like DotDensityReveal.

### HexGridStory — port `skills/map-native/src/components/DotDensityStory.tsx` (read it fully). Deltas:
1. Beats from `deriveHexGridStory(computeHexGrid(config), meta)`; meta from config.
2. Same cell-build, but **tag each cell feature with `__cellIdx` = its index (string)** so the story dims
   non-highlighted cells. On a `reveal` beat (highlight = [cellIdx]) set the cell layer `fill-opacity` via
   a data expression: full for `__cellIdx === highlightKey`, dimmed (~0.2) otherwise; on
   title/establish/takeaway (empty highlight) all cells full. Sync to the beat (as DotDensityStory syncs
   `__region`).
3. Camera flies to each beat's `camera` via `buildTimeline`/`cameraForFrame`; caption = `CaptionCard` with
   `beat.copy`; title scene via `resolveScene`; sequential bin legend. No on-map callout.

- [ ] **Step 1: Write `HexGridReveal.tsx`** per the deltas. Verify NUL-free.
- [ ] **Step 2: Write `HexGridStory.tsx`** per the deltas. Verify NUL-free.

- [ ] **Step 3: Register compositions in `Root.tsx`**

Mirror the DotDensity registrations. Add imports + a sample-derived story frame count:
```tsx
import { HexGridReveal } from "../../src/components/HexGridReveal";
import { HexGridStory } from "../../src/components/HexGridStory";
import { computeHexGrid } from "../../src/hex-grid-geo";
import { deriveHexGridStory } from "../../src/hex-grid-story";
import sampleHexGrid from "../../assets/sample-data/hex-grid-count.json";

const sampleHGLayout = computeHexGrid(sampleHexGrid as any);
const sampleHGBeats = deriveHexGridStory(sampleHGLayout, {
  title: sampleHexGrid.title ?? "",
  insight: (sampleHexGrid as any).insight ?? sampleHexGrid.title ?? "",
});
const HEX_GRID_STORY_FRAMES = buildTimeline(sampleHGBeats.map((b) => b.kind), 30).totalFrames;
const hexGridDefaultProps = { config: sampleHexGrid };
```
Register `HexGridReveal{,Square,Portrait}` (durationInFrames `REVEAL_FRAMES + TITLE_SCENE_FRAMES`) and
`HexGridStory{,Square,Portrait}` (durationInFrames `HEX_GRID_STORY_FRAMES`), 1280×720 / 1080×1080 /
1080×1350, `defaultProps={hexGridDefaultProps}`.

- [ ] **Step 4: Wire `produce.mjs`**

Replace Slice A's `isHexGrid ? []` so hex-grid gets reveal + story (+ scrolly in Task 3):
```js
const kinds = isHexGrid
  ? (format === "static" ? [] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["reveal", "story", "scrolly"] : [])
  : isDotDensity ? [] : isLocator ? [] : isRoute ? (/* unchanged */) : (/* unchanged */);
```
Add locator-style arms to `VIDEO_COMPS.reveal` (`HexGridReveal{,Square,Portrait}`) and `storyComps`
(guided-tour → `HexGridStory{,Square,Portrait}`) for `isHexGrid`.

- [ ] **Step 5: Typecheck + full suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean tsc (apart from pre-existing react-dom TS2688); all tests pass.

- [ ] **Step 6: Render-verify reveal + story, both regimes, landscape**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
for CFG in hex-grid-count hex-grid-mean; do
  node -e "const fs=require('fs');fs.writeFileSync('/tmp/hgb-$CFG.json',JSON.stringify({config:JSON.parse(fs.readFileSync('assets/sample-data/$CFG.json','utf8'))}))"
done
for C in HexGridReveal HexGridStory; do
  bunx remotion render remotion/src/index.ts $C /tmp/hgb/count-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/hgb-hex-grid-count.json
  bunx remotion render remotion/src/index.ts $C /tmp/hgb/mean-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/hgb-hex-grid-mean.json
done
```
COMMIT before rendering. Capture a mid still per composition: reveal = cells fade in on a fixed camera,
title scene, mapStyle correct; story = camera frames the top cell (still showing surrounding context —
NOT a single zoomed cell), that cell emphasised while others dim, caption "18 points — the densest
hexagon", sequential legend. If a render exceeds ~8 min, STOP and report DONE_WITH_CONCERNS with what completed.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/components/HexGridReveal.tsx skills/map-native/src/components/HexGridStory.tsx skills/map-native/remotion/src/Root.tsx skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): hex-grid video reveal + storytelling (highest-cell beats) + wiring"
```

---

## Task 3: HexGridScrolly + MapScrolly dispatch + render-verify

**Files:** Create `src/components/HexGridScrolly.tsx`; Modify `src/components/MapScrolly.tsx`.

**Interfaces:**
- Consumes: `deriveHexGridStory` + `mapStoryToChapters`, `scrollyStepCount` hex-grid branch (Task 1),
  `ScrollyPanel`/`stepSlide` (scrolly), `computeHexGrid`, `resolveMapStyle`, the flyTo scrolly pattern.
- Produces: `HexGridScrolly` React component `{ config }`.

### HexGridScrolly — port `skills/map-native/src/components/DotDensityScrolly.tsx` (read it + ChoroplethScrolly for `stepSlide`). Deltas:
1. Beats from `deriveHexGridStory(computeHexGrid(config), meta)`; `story = mapStoryToChapters(beats, {...})`;
   step timeline (step 0 = title, rest = reveal); camera per step = the beat's camera bbox via `cameraForFrame`.
2. Same cell-build as HexGridStory (cells tagged `__cellIdx`); per-step dim-emphasis dims non-highlighted
   cells (~0.2) synced to the panel slide-in (reuse DotDensityScrolly's synced approach + the `__cellIdx`
   expression).
3. `ScrollyPanel` per reveal step (prose = beat.copy); overview (establish) + takeaway render NO panel
   (visual only), matching the established scrolly convention. Sequential bin legend.

- [ ] **Step 1: Write `HexGridScrolly.tsx`** per the deltas. Verify NUL-free.

- [ ] **Step 2: Dispatch in `MapScrolly.tsx`**

Add before the choropleth fallback: `if (config?.type === "hex-grid") return <HexGridScrolly config={config} />;`
and the import.

- [ ] **Step 3: `calculateMetadata` already handles hex-grid**

`Root.tsx`'s `MapScrolly` compositions use `scrollyFrames(scrollyStepCount(props.config, world), 30)`;
Task 1 added the `hex-grid` branch to `scrollyStepCount`, so the existing `MapScrolly{,Square,Portrait}`
compositions size a hex-grid config correctly — NO new Root composition. Confirm by reading Root's
`scrollyMeta`; do not duplicate compositions.

- [ ] **Step 4: Typecheck + full suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean; all pass.

- [ ] **Step 5: Render-verify scrolly, both regimes, landscape**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bunx remotion render remotion/src/index.ts MapScrolly /tmp/hgb/count-MapScrolly.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/hgb-hex-grid-count.json
bunx remotion render remotion/src/index.ts MapScrolly /tmp/hgb/mean-MapScrolly.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/hgb-hex-grid-mean.json
```
COMMIT before rendering. Confirm the panel advances per top cell, the dim-emphasis is synced to the panel,
overview/takeaway are panel-free, mapStyle correct. Same slow-render stop rule.

- [ ] **Step 6: Note — interactive scrolly is now available**

`deriveHexGridStory → mapStoryToChapters` is the shared contract the sibling `scrolly` skill consumes, so
the interactive hex-grid scrolly works via that skill with no map-native change. Documented in Task 4.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/components/HexGridScrolly.tsx skills/map-native/src/components/MapScrolly.tsx
git commit -m "feat(map-native): hex-grid scrolly video via MapScrolly dispatch"
```

---

## Task 4: KB + SKILL roadmap + final matrix

**Files:** Modify `knowledge/references/map/types/hex-grid.md`, `knowledge/references/map/formats/*.md`,
`skills/map-native/SKILL.md`.

- [ ] **Step 1: Update the hex-grid KB type doc** — the Slice-A/B scope note now says video (reveal +
  storytelling + scrolly) and interactive scrolly are SHIPPED. Note the highest-cell story structure +
  that the camera stays framed on the zone. Remove any "video = Slice B / not yet built" caveat.

- [ ] **Step 2: Add hex-grid to the format KB docs** — in `formats/video-reveal.md`,
  `video-storytelling.md`, `video-scrolly.md`, add a hex-grid line where they enumerate types (one line
  each; do not restructure).

- [ ] **Step 3: Refresh SKILL.md roadmap** — set the Hex / grid row's V column back to `✓` and update the
  note to "all six formats built". Do not restructure the table.

- [ ] **Step 4: Final full suite + matrix confirmation**

Run: `cd skills/map-native && bun test` (all pass). Then confirm produce emits the hex-grid video blocks:
```bash
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bun scripts/produce.mjs assets/sample-data/hex-grid-count.json /tmp/hgb/prod all
```
Expected: `PRODUCE_RESULT` with `reveal`, `story`, `scrolly` blocks (each `{landscape,square,portrait}`)
plus static/interactive snaps.

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/hex-grid.md knowledge/references/map/formats/ skills/map-native/SKILL.md
git commit -m "docs(map-native): hex-grid video shipped — KB + roadmap (all six formats)"
```

---

## Self-Review

**Spec coverage (Slice B):** `deriveHexGridStory` (highest-cell beats, camera-on-zone) → Task 1; reveal +
storytelling → Task 2; scrolly video + interactive scrolly → Task 3; KB + roadmap → Task 4.
`calculateMetadata` duration via the `scrollyStepCount` hex-grid branch (Task 1) reused by the existing
MapScrolly comps (Task 3). All formats reach 3 sizes. Uniform-cell invariant + camera-on-zone restated.

**Placeholder scan:** Task 1 (pure story core) carries complete code + tests. Tasks 2-3 port named sibling
components (DotDensity*) with enumerated deltas — complete-by-reference to real in-repo code; the render
steps give exact commands. No "TBD".

**Type consistency:** `deriveHexGridStory(layout, meta, opts?)`, `HexGridStoryMeta`, `HexGridReveal`/
`HexGridStory`/`HexGridScrolly`, and the `scrollyStepCount` hex-grid branch names match across tasks.
`Beat` shape matches `map-story.ts`. Composition ids `HexGridReveal*`/`HexGridStory*` match between Root
(Task 2) and produce (Task 2); `MapScrolly*` (Task 3) reuse the existing scrolly comps. The cell-build
(computeHexGrid → cell FeatureCollection with `{__color,__count,__value}` [+ `__cellIdx` for story/scrolly])
is consistent across the reveal, story, and scrolly components and with Slice A's HexGridMap.
