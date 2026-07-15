# Map Dot-Density — Slice B (video: reveal · storytelling · scrolly) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three video formats (reveal, storytelling, scrolly) + interactive scrolly to the
dot-density map type, so it reaches full six-format parity.

**Architecture:** A pure `deriveDotDensityStory` produces the shared `Beat[]` (title → establish →
reveal the densest regions → takeaway). Video components port from the locator/symbol siblings:
`DotDensityReveal` (dots fade in on a fixed camera, scatter computed once), `DotDensityStory`
(guided tour to the dense regions, dimming non-highlighted regions), `DotDensityScrolly` (dispatched
by `MapScrolly`). `deriveDotDensityStory → mapStoryToChapters` feeds both the scrolly video and the
interactive scrolly.

**Tech Stack:** Bun, TypeScript, Remotion, MapTiler SDK, turf, `bun:test`.

**Prereq:** dot-density Slice A (dot-scatter, dot-density-geo, DotDensityMap static+interactive,
validation, conformance) is merged to main.

## Global Constraints

- Runtime **Bun** always — never npm/node. Tests: `bun test`.
- Code, comments, commits, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer anywhere.
- MapTiler key in `splash/.env` (gitignored). Render commands load it via
  `set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a`.
- **Frame-determinism:** the dot GeoJSON is built ONCE (seeded `scatterInPolygon`) and held; camera
  animates per frame; no `Date.now`/`Math.random`/argless `new Date()`; render `--gl=angle --concurrency=1`.
- **Uniform-dot invariant:** dot radius stays fixed (2px), never value-scaled, in the video too.
- Reuse existing blocks (`deriveLocatorStory`/`LocatorReveal`/`LocatorStory`/`LocatorScrolly` patterns,
  the reveal/story/scrolly pipeline, `resolveScene`, `StoryCards`, `buildTimeline`/`cameraForFrame`,
  `mapStoryToChapters`, `computeDotDensity`, `scatterInPolygon`, `resolveMapStyle`). Do not fork them.
- After writing any `.tsx`, verify NUL-free: `grep -c $'\\x00' <file>` prints 0.

---

## File structure

**Create:** `src/dot-density-story.ts`, `src/components/DotDensityReveal.tsx`,
`DotDensityStory.tsx`, `DotDensityScrolly.tsx`, `tests/dot-density-story.test.ts`.
**Modify:** `src/route-story.ts` (scrollyStepCount branch), `src/components/MapScrolly.tsx` (dispatch),
`remotion/src/Root.tsx`, `scripts/produce.mjs`, KB formats + `types/dot-density.md`, `SKILL.md`.

---

## Task 1: `deriveDotDensityStory` + scrolly step count

**Files:** Create `skills/map-native/src/dot-density-story.ts`; Modify `skills/map-native/src/route-story.ts`;
Test `skills/map-native/tests/dot-density-story.test.ts`.

**Interfaces:**
- Consumes: `Beat` (`./map-story`), `DotDensityLayout`/`computeDotDensity` (`./dot-density-geo`),
  `regionBounds` (`./choropleth-geo`), `area` (turf), `mapStoryToChapters` (`../../scrolly/src/chapters`).
- Produces:
  - `interface DotDensityStoryMeta { title: string; description?: string; insight?: string; unit?: string }`
  - `function deriveDotDensityStory(layout: DotDensityLayout, meta: DotDensityStoryMeta, opts?: { maxReveals?: number }): Beat[]`

**Beat model** (`map-story.ts`, unchanged): `{ kind: "title"|"establish"|"reveal"|"takeaway"; camera: [number,number,number,number]; highlight: string[]; dim: boolean; callout: { region: string; name: string; value: string; text: string } | null; copy: string }`.

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/dot-density-story.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { deriveDotDensityStory } from "../src/dot-density-story";
import type { DotDensityLayout } from "../src/dot-density-geo";

// Two square regions, same size; AAA has more dots (denser).
const feat = (id: string): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id, name: id === "AAA" ? "Alphaland" : "Betaville" },
  geometry: { type: "Polygon", coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] },
});
const layout: DotDensityLayout = {
  regions: [
    { key: "AAA", feature: feat("AAA"), groups: [{ category: null, color: "#2171b5", count: 40, seed: 1 }] },
    { key: "BBB", feature: feat("BBB"), groups: [{ category: null, color: "#2171b5", count: 5, seed: 2 }] },
  ],
  dotValue: 1000,
  categories: [],
  legend: [],
  bounds: [0, 0, 4, 4],
  hasCategories: false,
  capped: false,
  totalDots: 45,
  unmatched: [],
};

describe("deriveDotDensityStory", () => {
  const beats = deriveDotDensityStory(layout, { title: "Where the people are", unit: "people" });
  it("emits title + establish + reveals + takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(2);
  });
  it("reveals the densest region first (AAA before BBB), value compact-formatted", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].highlight).toEqual(["AAA"]);
    expect(reveals[0].copy).toContain("Alphaland");
    // 40 dots × dotValue 1000 = 40,000 → compact "40k"
    expect(reveals[0].callout?.value).toContain("40k");
    expect(reveals[0].copy).toContain("40k");
  });
  it("caps reveals at maxReveals", () => {
    const capped = deriveDotDensityStory(layout, { title: "Where the people are" }, { maxReveals: 1 });
    expect(capped.filter((b) => b.kind === "reveal").length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/dot-density-story.test.ts`
Expected: FAIL — `deriveDotDensityStory` not exported.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/dot-density-story.ts`:

```typescript
// Beat derivation for dot-density videos — the sibling of deriveLocatorStory. title → establish
// (all dots in view) → reveal the DENSEST regions (dots per area, descending, capped) → takeaway.
// Same Beat shape as the other types. The dot scatter is unchanged; the video just moves the camera.
import type { Beat } from "./map-story";
import type { DotDensityLayout } from "./dot-density-geo";
import { regionBounds } from "./choropleth-geo";
import { area } from "@turf/turf";

export interface DotDensityStoryMeta {
  title: string;
  description?: string;
  insight?: string;
  unit?: string;
}

const DEFAULT_MAX_REVEALS = 5;

function formatCompact(v: number): string {
  const abs = Math.abs(v);
  const trim = (s: string) => (s.endsWith(".0") ? s.slice(0, -2) : s);
  if (abs >= 1e9) return trim((v / 1e9).toFixed(1)) + "B";
  if (abs >= 1e6) return trim((v / 1e6).toFixed(1)) + "M";
  if (abs >= 1e3) return trim((v / 1e3).toFixed(1)) + "k";
  return String(Math.round(v));
}

export function deriveDotDensityStory(
  layout: DotDensityLayout,
  meta: DotDensityStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const unit = meta.unit ?? "";
  const allBounds = layout.bounds;

  const beats: Beat[] = [];
  beats.push({ kind: "title", camera: allBounds, highlight: [], dim: false, callout: null, copy: meta.title });
  beats.push({ kind: "establish", camera: allBounds, highlight: [], dim: false, callout: null, copy: "" });

  // Rank regions by dot density (total dots / area), descending. Ties broken by key for determinism.
  const ranked = layout.regions
    .map((r) => {
      const totalCount = r.groups.reduce((s, g) => s + g.count, 0);
      const a = Math.max(1e-9, area(r.feature));
      const name = String(r.feature.properties?.name ?? r.key);
      let dominant: string | null = null;
      if (layout.hasCategories && r.groups.length) {
        const top = r.groups.reduce((best, g) => (g.count > best.count ? g : best));
        dominant = layout.legend.find((l) => l.color === top.color)?.category ?? null;
      }
      return { r, name, totalCount, density: totalCount / a, dominant };
    })
    .filter((x) => x.totalCount > 0)
    .sort((a, b) => b.density - a.density || (a.r.key < b.r.key ? -1 : 1));

  for (const x of ranked.slice(0, cap)) {
    const valText = `${formatCompact(x.totalCount * layout.dotValue)}${unit ? " " + unit : ""}`;
    const text =
      layout.hasCategories && x.dominant
        ? `${x.name} — ${valText}, mostly ${x.dominant}`
        : `${x.name} — ${valText}`;
    beats.push({
      kind: "reveal",
      camera: regionBounds(x.r.feature),
      highlight: [x.r.key],
      dim: true,
      callout: { region: x.r.key, name: x.name, value: valText, text },
      copy: text,
    });
  }

  beats.push({
    kind: "takeaway",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/dot-density-story.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `dot-density` branch to `scrollyStepCount`**

In `skills/map-native/src/route-story.ts`, add a `dot-density` branch BEFORE the symbol branch, and
the imports `computeDotDensity` (from `./dot-density-geo`) and `deriveDotDensityStory` (from
`./dot-density-story`):

```typescript
if (config.type === "dot-density") {
  const layout = computeDotDensity(config, world, "iso_a3");
  const beats = deriveDotDensityStory(layout, {
    title: config.title ?? "",
    description: config.description,
    insight: config.insight ?? config.title ?? "",
    unit: config.valueUnit ?? "",
  });
  return mapStoryToChapters(beats, {
    title: config.title ?? "",
    description: config.description,
    source: config.source,
    regionsWithData: layout.regions.length,
  }).steps.length;
}
```

- [ ] **Step 6: Full suite**

Run: `cd skills/map-native && bun test`
Expected: all pass (Slice A's 222 + the new dot-density-story tests).

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/dot-density-story.ts skills/map-native/src/route-story.ts skills/map-native/tests/dot-density-story.test.ts
git commit -m "feat(map-native): deriveDotDensityStory (densest-region beats) + scrolly step count"
```

---

## Task 2: DotDensityReveal + DotDensityStory + Root + produce + render-verify

**Files:** Create `src/components/DotDensityReveal.tsx`, `DotDensityStory.tsx`; Modify
`remotion/src/Root.tsx`, `scripts/produce.mjs`.

**Interfaces:**
- Consumes: `deriveDotDensityStory` (Task 1), `computeDotDensity`/`scatterInPolygon` (Slice A),
  `resolveMapStyle` (route-geo), `easedRevealProgress`/`revealCameraPlan`/`REVEAL_FRAMES` (reveal),
  `resolveScene`/`TITLE_SCENE_FRAMES` (video-scene), `buildTimeline`/`cameraForFrame` (story-timeline),
  `TitleCard`/`CaptionCard` (StoryCards), `MapFrame`/`resolveMapFrame`, `regionBounds` (choropleth-geo).
- Produces: `DotDensityReveal`, `DotDensityStory` React components `{ config: DotDensityConfigShape }`.

### DotDensityReveal — port `skills/map-native/src/components/LocatorReveal.tsx` (read it fully). Deltas:
1. Build the DOT source exactly like `DotDensityMap` (Slice A): fetch world geojson, `computeDotDensity`,
   for each region+group `scatterInPolygon(feature, count, seed)` → one Point per dot with
   `{ color }` — ONCE on load. (Reuse the Slice A dot-build code verbatim.)
2. Dot layer: `circle-radius: 2` (fixed), `circle-color: ["get","color"]`; **opacity ramps 0→1 by the
   reveal `progress`** (the fade-in). Never value-scale the radius.
3. mapStyle-adaptive via `resolveMapStyle`; faint region outline; legend "1 dot = N" + category swatches;
   fixed camera via `revealCameraPlan(layout.bounds)`; title scene + MapFrame furniture — like LocatorReveal.

### DotDensityStory — port `skills/map-native/src/components/LocatorStory.tsx` (read it fully). Deltas:
1. Beats from `deriveDotDensityStory(computeDotDensity(config, world, "iso_a3"), meta)`; meta from config
   (`unit` = `config.valueUnit`).
2. Same dot-build as reveal, but **tag each dot Point feature with `__region` = its region key** so the
   story can dim non-highlighted regions. On a `reveal` beat (highlight = [regionKey]), set the dot layer
   `circle-opacity` via a data expression: full for `__region === highlightKey`, dimmed (~0.25) otherwise;
   on title/establish/takeaway (empty highlight) all dots full. Sync this emphasis to the beat.
3. Camera flies to each beat's `camera` via `buildTimeline`/`cameraForFrame`; caption = `CaptionCard`
   with `beat.copy`; title scene via `resolveScene`; legend as in reveal. No on-map name callout (the
   caption carries the region name — consistent with the locator callout-removal decision).

- [ ] **Step 1: Write `DotDensityReveal.tsx`** per the deltas. Verify NUL-free.
- [ ] **Step 2: Write `DotDensityStory.tsx`** per the deltas. Verify NUL-free.

- [ ] **Step 3: Register compositions in `Root.tsx`**

Mirror the Locator registrations. Add imports + a sample-derived story frame count:
```tsx
import { DotDensityReveal } from "../../src/components/DotDensityReveal";
import { DotDensityStory } from "../../src/components/DotDensityStory";
import { computeDotDensity } from "../../src/dot-density-geo";
import { deriveDotDensityStory } from "../../src/dot-density-story";
import sampleDotDensity from "../../assets/sample-data/dot-density-multi.json";

const sampleDDLayout = computeDotDensity(sampleDotDensity as any, world as any, "iso_a3");
const sampleDDBeats = deriveDotDensityStory(sampleDDLayout, {
  title: sampleDotDensity.title ?? "",
  insight: (sampleDotDensity as any).insight ?? sampleDotDensity.title ?? "",
  unit: (sampleDotDensity as any).valueUnit ?? "",
});
const DOT_DENSITY_STORY_FRAMES = buildTimeline(sampleDDBeats.map((b) => b.kind), 30).totalFrames;
const dotDensityDefaultProps = { config: sampleDotDensity };
```
Register `DotDensityReveal{,Square,Portrait}` (durationInFrames `REVEAL_FRAMES + TITLE_SCENE_FRAMES`) and
`DotDensityStory{,Square,Portrait}` (durationInFrames `DOT_DENSITY_STORY_FRAMES`), 1280×720 / 1080×1080 /
1080×1350, `defaultProps={dotDensityDefaultProps}`.

- [ ] **Step 4: Wire `produce.mjs`**

Replace Slice A's `isDotDensity ? []` so dot-density gets reveal + story (+ scrolly in Task 3):
```js
const kinds = isDotDensity
  ? (format === "static" ? [] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["reveal", "story", "scrolly"] : [])
  : isLocator ? [] : isRoute ? (/* unchanged */) : (/* unchanged */);
```
Add locator-style arms to `VIDEO_COMPS.reveal` (`DotDensityReveal{,Square,Portrait}`) and `storyComps`
(guided-tour → `DotDensityStory{,Square,Portrait}`) for `isDotDensity`.

- [ ] **Step 5: Typecheck + full suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean tsc (apart from pre-existing react-dom TS2688); all tests pass.

- [ ] **Step 6: Render-verify reveal + story, both regimes, landscape (+ note square/portrait)**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
for CFG in dot-density-uni dot-density-multi; do
  node -e "const fs=require('fs');fs.writeFileSync('/tmp/ddb-$CFG.json',JSON.stringify({config:JSON.parse(fs.readFileSync('assets/sample-data/$CFG.json','utf8'))}))"
done
for C in DotDensityReveal DotDensityStory; do
  bunx remotion render remotion/src/index.ts $C /tmp/ddb/uni-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/ddb-dot-density-uni.json
  bunx remotion render remotion/src/index.ts $C /tmp/ddb/multi-$C.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/ddb-dot-density-multi.json
done
```
COMMIT before rendering. Capture a mid still per composition: reveal = dots fade in on a fixed camera,
title scene, mapStyle correct; story = camera flies to the densest region, its dots emphasised while
others dim, caption shows region + value (+ dominant category for multi), legend present. If a render
exceeds ~8 min, STOP and report DONE_WITH_CONCERNS with what completed.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/components/DotDensityReveal.tsx skills/map-native/src/components/DotDensityStory.tsx skills/map-native/remotion/src/Root.tsx skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): dot-density video reveal + storytelling (densest-region beats) + wiring"
```

---

## Task 3: DotDensityScrolly + MapScrolly dispatch + render-verify

**Files:** Create `src/components/DotDensityScrolly.tsx`; Modify `src/components/MapScrolly.tsx`.

**Interfaces:**
- Consumes: `deriveDotDensityStory` + `mapStoryToChapters`, `scrollyStepCount` dot-density branch
  (Task 1), `ScrollyPanel`/`stepSlide` (scrolly), `computeDotDensity`/`scatterInPolygon`,
  `resolveMapStyle`, the flyTo scrolly pattern.
- Produces: `DotDensityScrolly` React component `{ config }`.

### DotDensityScrolly — port `skills/map-native/src/components/LocatorScrolly.tsx` (read it + ChoroplethScrolly for `stepSlide`). Deltas:
1. Beats from `deriveDotDensityStory(computeDotDensity(config, world, "iso_a3"), meta)`; `story =
   mapStoryToChapters(beats, {...})`; step timeline (step 0 = title, rest = reveal); camera per step =
   the beat's camera bbox via `cameraForFrame`.
2. Same dot-build as DotDensityStory (dots tagged with `__region`); per-step emphasis dims non-highlighted
   regions' dots, synced to the panel slide-in (reuse LocatorScrolly's synced approach).
3. `ScrollyPanel` per reveal step (prose = beat.copy); overview (establish) + takeaway render NO panel
   (visual only), matching the established scrolly convention. Category legend when multivariate.

- [ ] **Step 1: Write `DotDensityScrolly.tsx`** per the deltas. Verify NUL-free.

- [ ] **Step 2: Dispatch in `MapScrolly.tsx`**

Add before the choropleth fallback: `if (config?.type === "dot-density") return <DotDensityScrolly config={config} />;`
and the import.

- [ ] **Step 3: `calculateMetadata` already handles dot-density**

`Root.tsx`'s `MapScrolly` compositions use `scrollyFrames(scrollyStepCount(props.config, world), 30)`;
Task 1 added the `dot-density` branch to `scrollyStepCount`, so the existing `MapScrolly{,Square,Portrait}`
compositions size a dot-density config correctly — NO new Root composition. Confirm by reading Root's
`scrollyMeta`; do not duplicate compositions.

- [ ] **Step 4: Typecheck + full suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean; all pass.

- [ ] **Step 5: Render-verify scrolly, both regimes, landscape**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bunx remotion render remotion/src/index.ts MapScrolly /tmp/ddb/uni-MapScrolly.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/ddb-dot-density-uni.json
bunx remotion render remotion/src/index.ts MapScrolly /tmp/ddb/multi-MapScrolly.mp4 --gl=angle --concurrency=1 --timeout=120000 --props=/tmp/ddb-dot-density-multi.json
```
COMMIT before rendering. Confirm the panel advances per dense region, the emphasis dims other regions
synced to the panel, overview/takeaway are panel-free, mapStyle correct. Same slow-render stop rule.

- [ ] **Step 6: Note — interactive scrolly is now available**

`deriveDotDensityStory → mapStoryToChapters` is the shared contract the sibling `scrolly` skill consumes,
so the interactive dot-density scrolly works via that skill with no map-native change. Documented in Task 4.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/components/DotDensityScrolly.tsx skills/map-native/src/components/MapScrolly.tsx
git commit -m "feat(map-native): dot-density scrolly video via MapScrolly dispatch"
```

---

## Task 4: KB + SKILL roadmap + final matrix

**Files:** Modify `knowledge/references/map/types/dot-density.md`,
`knowledge/references/map/formats/*.md`, `skills/map-native/SKILL.md`.

- [ ] **Step 1: Update the dot-density KB type doc** — the Slice-A/B scope note now says video (reveal +
  storytelling + scrolly) and interactive scrolly are SHIPPED. Note the densest-region story structure.
  Remove any "video = Slice B / not yet built" caveat.

- [ ] **Step 2: Add dot-density to the format KB docs** — in `formats/video-reveal.md`,
  `video-storytelling.md`, `video-scrolly.md`, add a dot-density line where they enumerate types (one line
  each; do not restructure).

- [ ] **Step 3: Refresh SKILL.md roadmap** — set the dot-density row's V column back to `✓` and update the
  note to "all six formats built". Do not restructure the table.

- [ ] **Step 4: Final full suite + matrix confirmation**

Run: `cd skills/map-native && bun test` (all pass). Then confirm produce emits the dot-density video blocks:
```bash
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bun scripts/produce.mjs assets/sample-data/dot-density-multi.json /tmp/ddb/prod all
```
Expected: `PRODUCE_RESULT` with `reveal`, `story`, `scrolly` blocks (each `{landscape,square,portrait}`)
plus static/interactive snaps.

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/types/dot-density.md knowledge/references/map/formats/ skills/map-native/SKILL.md
git commit -m "docs(map-native): dot-density video shipped — KB + roadmap (all six formats)"
```

---

## Self-Review

**Spec coverage (Slice B):** `deriveDotDensityStory` (densest-region beats) → Task 1; reveal +
storytelling → Task 2; scrolly video + interactive scrolly (shared contract) → Task 3; KB + roadmap →
Task 4. `calculateMetadata` duration via the `scrollyStepCount` dot-density branch (Task 1) reused by the
existing MapScrolly comps (Task 3). All formats reach 3 sizes. Uniform-dot invariant restated for the video.

**Placeholder scan:** Task 1 (pure story core) carries complete code + tests. Tasks 2-3 port named
sibling components (Locator*) with enumerated deltas — complete-by-reference to real in-repo code, the
established pattern; the render steps give exact commands. No "TBD".

**Type consistency:** `deriveDotDensityStory(layout, meta, opts?)`, `DotDensityStoryMeta`,
`DotDensityReveal`/`DotDensityStory`/`DotDensityScrolly`, and the `scrollyStepCount` dot-density branch
names match across tasks. `Beat` shape matches `map-story.ts`. Composition ids `DotDensityReveal*` /
`DotDensityStory*` match between Root (Task 2) and produce (Task 2); `MapScrolly*` (Task 3) reuse the
existing scrolly comps. The dot-build (computeDotDensity → scatterInPolygon → `{color}` [+ `__region` for
story/scrolly]) is consistent across the reveal, story, and scrolly components and with Slice A's DotDensityMap.
