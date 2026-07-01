# Map Video Scene Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every map video opens with a full-screen title-card scene (from frame 0, no furniture over it), crossfading to the map scene; and the symbol guided-tour drops its baked labels so the callout is the only name+value (no duplication).

**Architecture:** A shared pure `resolveScene(frame, {titleSceneEndFrame, crossfadeFrames})` returns `{titleOpacity, furnitureOpacity}` (title 1→0, furniture 0→1 across a short crossfade). `TitleCard` takes an explicit `opacity`; `MapFrame` takes a backward-compatible `furnitureOpacity`. The four video components adopt the scene model (reveals prepend a title scene; stories use the title beat). `SymbolStory` stops adding the `symbol-labels` layer.

**Tech Stack:** Bun, TypeScript, bun:test, React, Remotion 4, `@maptiler/sdk` (MapLibre), Playwright.

## Global Constraints

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion ... --gl=angle --concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`; Remotion reads `REMOTION_MAPTILER_KEY`) — never hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO `Co-Authored-By: Claude`.
- **English** throughout.
- **Additive / backward-compatible:** `MapFrame.furnitureOpacity` defaults to `1`; the interactive/static `MapFrame` callers are unchanged. Only the `TitleCard` API changes (its two callers — both stories — are updated in the same task).
- **Every change ships four artifacts** (code + conformance/harness + KB at the right layer + render verification on BOTH types).
- **Grounded KB**, sourced by name (MapFrame convention, Amini et al. 2015, broadcast lower-third convention), no fabricated URLs.
- **Verify at render on BOTH types (reveal + story), SEQUENTIALLY.**
- **Default basemap**; SP1 no-data-unpainted policy holds.
- Baseline before this plan: **135 tests passing** — keep them green.

All paths relative to `skills/map-native/` unless stated otherwise.

---

### Task 1: `resolveScene` pure helper + constants

**Files:**
- Create: `src/video-scene.ts`
- Test: `tests/video-scene.test.ts`

**Interfaces:**
- Produces: `resolveScene(frame: number, opts: { titleSceneEndFrame: number; crossfadeFrames?: number }): { titleOpacity: number; furnitureOpacity: number }`; `TITLE_SCENE_FRAMES = 75`; `CROSSFADE_FRAMES = 12`.

- [ ] **Step 1: Write the failing test**

Create `tests/video-scene.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { resolveScene, TITLE_SCENE_FRAMES, CROSSFADE_FRAMES } from "../src/video-scene";

describe("resolveScene", () => {
  const END = 75;
  it("title full, furniture hidden at frame 0", () => {
    const s = resolveScene(0, { titleSceneEndFrame: END });
    expect(s.titleOpacity).toBe(1);
    expect(s.furnitureOpacity).toBe(0);
  });
  it("holds title=1/furniture=0 before the crossfade window", () => {
    const s = resolveScene(END - CROSSFADE_FRAMES - 1, { titleSceneEndFrame: END });
    expect(s.titleOpacity).toBe(1);
    expect(s.furnitureOpacity).toBe(0);
  });
  it("furniture full, title gone at/after the title scene end", () => {
    const s = resolveScene(END, { titleSceneEndFrame: END });
    expect(s.titleOpacity).toBeCloseTo(0, 5);
    expect(s.furnitureOpacity).toBeCloseTo(1, 5);
    const after = resolveScene(END + 40, { titleSceneEndFrame: END });
    expect(after.titleOpacity).toBe(0);
    expect(after.furnitureOpacity).toBe(1);
  });
  it("crossfades monotonically (title down, furniture up = 1-title), never NaN", () => {
    let prev = 2;
    for (let f = END - CROSSFADE_FRAMES; f <= END; f++) {
      const s = resolveScene(f, { titleSceneEndFrame: END });
      expect(Number.isNaN(s.titleOpacity)).toBe(false);
      expect(s.titleOpacity).toBeLessThanOrEqual(prev);
      expect(s.furnitureOpacity).toBeCloseTo(1 - s.titleOpacity, 5);
      prev = s.titleOpacity;
    }
  });
  it("exports the scene constants", () => {
    expect(TITLE_SCENE_FRAMES).toBe(75);
    expect(CROSSFADE_FRAMES).toBe(12);
  });
});
```

- [ ] **Step 2: Run the test → FAIL**

Run: `cd skills/map-native && bun test tests/video-scene.test.ts`
Expected: FAIL — `Cannot find module '../src/video-scene'`.

- [ ] **Step 3: Implement `src/video-scene.ts`**

```ts
// video-scene.ts — the shared two-scene model for map videos. Every map video opens
// on a full-screen title-card scene (from frame 0), then crossfades to the map scene
// (map + MapFrame furniture). resolveScene returns the complementary opacities so the
// title card fades out exactly as the furniture fades in. Pure, frame-deterministic.
import { interpolate, Easing } from "remotion";

export const TITLE_SCENE_FRAMES = 75; // ~2.5s @ 30fps — matches the storytelling title hold
export const CROSSFADE_FRAMES = 12; // ~0.4s @ 30fps

export function resolveScene(
  frame: number,
  opts: { titleSceneEndFrame: number; crossfadeFrames?: number },
): { titleOpacity: number; furnitureOpacity: number } {
  const cf = opts.crossfadeFrames ?? CROSSFADE_FRAMES;
  const start = opts.titleSceneEndFrame - cf;
  const titleOpacity = interpolate(
    frame,
    [start, opts.titleSceneEndFrame],
    [1, 0],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return { titleOpacity, furnitureOpacity: 1 - titleOpacity };
}
```

- [ ] **Step 4: Run the test → PASS**

Run: `cd skills/map-native && bun test tests/video-scene.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/video-scene.ts skills/map-native/tests/video-scene.test.ts
git commit -m "feat(map-native): resolveScene — shared title/furniture crossfade for map videos"
```
(NO Claude-Session trailer.)

---

### Task 2: `TitleCard` opacity prop + `MapFrame` `furnitureOpacity` prop

**Files:**
- Modify: `src/components/StoryCards.tsx` (`TitleCard`)
- Modify: `src/core/MapFrame.tsx`

**Interfaces:**
- Produces: `TitleCard` now takes `{ text: string; description?: string; opacity: number }` (drops `phase`/`frame`); `MapFrame` gains `furnitureOpacity?: number` (default `1`).
- Consumed by: Task 3 (stories) and Task 4 (reveals).

- [ ] **Step 1: `TitleCard` takes an explicit `opacity`**

In `src/components/StoryCards.tsx`, replace the `TitleCard` prop type + body so it takes `opacity` directly instead of computing a fade from `phase`/`frame`:

```tsx
// Title card — full-screen scene-1 overlay. Opacity is supplied by the caller
// (via resolveScene): 1 from frame 0 through the title hold, fading out only at the
// crossfade to the map scene.
export const TitleCard: React.FC<{
  text: string;
  description?: string;
  opacity: number;
}> = ({ text, description, opacity }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20, // above the MapFrame furniture (zIndex 10) — title scene sits on top during the crossfade
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c1c1c",
        opacity,
        pointerEvents: "none",
      }}
    >
      {/* keep the existing inner <div> with the title <p> + description <p> exactly as-is */}
    </div>
  );
};
```

Keep the inner title/description JSX (the two `<p>` elements + their styles) EXACTLY as they currently are. Remove the now-unused `holdStart`/`holdEnd`/`fadeInEnd`/`fadeOutStart`/`interpolate` logic and the `Phase`/`interpolate` imports IF they are no longer used by `CaptionCard` (CaptionCard still uses `interpolate` — keep that import; `Phase` is likely now unused — remove it if so). `CaptionCard` is UNCHANGED.

- [ ] **Step 2: `MapFrame` gains `furnitureOpacity`**

In `src/core/MapFrame.tsx`: add `furnitureOpacity?: number` to `MapFrameProps`, default it to `1` in the destructure (`furnitureOpacity = 1`), and apply it to BOTH the title band (`data-testid="map-title"`, line ~76) and the source band (`data-testid="map-source"`, line ~113) by adding `opacity: furnitureOpacity` to each band's `style`. Do not change the measurement logic, the pill styling, or anything else.

```tsx
// in MapFrameProps:
  furnitureOpacity?: number;
// in the destructure:
  furnitureOpacity = 1,
// title band style: add
        opacity: furnitureOpacity,
// source band style: add
        opacity: furnitureOpacity,
```

- [ ] **Step 3: Verify it compiles + tests green**

Run: `cd skills/map-native && bun test`
Expected: 135 pass (no test change; the type change compiles). NOTE: the two story components still pass `phase`/`frame` to `TitleCard` — they will FAIL to type-check until Task 3. That is expected; Task 3 immediately follows. If your toolchain type-checks the whole project on `bun test` and this blocks, do Task 2 + Task 3 as one commit sequence (implement Task 3's TitleCard-call change before running the full suite). Prefer: run only `bun test tests/video-scene.test.ts` here, and the full suite after Task 3.

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/components/StoryCards.tsx skills/map-native/src/core/MapFrame.tsx
git commit -m "feat(map-native): TitleCard opacity prop + MapFrame furnitureOpacity (scene plumbing)"
```
(NO Claude-Session trailer.)

---

### Task 3: Stories adopt the scene model

**Files:**
- Modify: `src/components/SymbolStory.tsx`, `src/components/ChoroplethStory.tsx`

**Interfaces:**
- Consumes: `resolveScene` (Task 1); `TitleCard` opacity API + `MapFrame.furnitureOpacity` (Task 2).

Both stories currently render `MapFrame` (furniture always visible) + a `TitleCard` gated on `beatIndex === 0` that fades in via `phase`/`frame`. Change BOTH the same way:

- [ ] **Step 1: Compute the scene from the title beat**

In each component's render body (where `mapState`/`overlay`/`frame` are available), when `mapState` exists compute the title-scene end from phase 0 and the scene opacities:

```tsx
import { resolveScene } from "../video-scene";
// …
const p0 = mapState?.phases[0];
const titleSceneEndFrame = p0 ? p0.startFrame + p0.moveFrames + p0.holdFrames : 0;
const scene = mapState
  ? resolveScene(frame, { titleSceneEndFrame })
  : { titleOpacity: 1, furnitureOpacity: 0 };
```

- [ ] **Step 2: Furniture crossfade + title card from frame 0**

- Pass `furnitureOpacity={scene.furnitureOpacity}` to `<MapFrame …>` (SymbolStory ~line 284, ChoroplethStory ~line 402).
- Replace the `TitleCard` render (currently gated on `overlay?.beatIndex === 0`, passing `phase`/`frame`) with a scene-driven one:

```tsx
{scene.titleOpacity > 0 && mapState.beats[0].copy && (
  <TitleCard
    text={mapState.beats[0].copy}
    description={config.description}
    opacity={scene.titleOpacity}
  />
)}
```

(`mapState.beats[0].copy` is the title text, as before.) Remove any now-unused `phase`/`frame` references at the TitleCard call site.

- [ ] **Step 3: Verify at render (both stories)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
mkdir -p /tmp/scene && for T in symbol choropleth; do python3 -c "import json;c=json.load(open('assets/sample-data/$T.json'));open('/tmp/scene/$T.json','w').write(json.dumps({'config':c}))"; done
bunx remotion still remotion/src/index.ts SymbolStory     /tmp/scene/sym-story-f0.png   --frame=0   --gl=angle --props=/tmp/scene/symbol.json
bunx remotion still remotion/src/index.ts SymbolStory     /tmp/scene/sym-story-map.png  --frame=120 --gl=angle --props=/tmp/scene/symbol.json
bunx remotion still remotion/src/index.ts ChoroplethStory /tmp/scene/cho-story-f0.png   --frame=0   --gl=angle --props=/tmp/scene/choropleth.json
bunx remotion still remotion/src/index.ts ChoroplethStory /tmp/scene/cho-story-map.png  --frame=120 --gl=angle --props=/tmp/scene/choropleth.json
```

READ all four: the `-f0` stills show the full-screen title card with NO MapFrame title-overlay pill and NO source line over it (scene 1); the `-map` stills show the map with the MapFrame title + source furniture and NO title card (scene 2). `bun test` → 135 green (full suite now type-checks again).

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/components/SymbolStory.tsx skills/map-native/src/components/ChoroplethStory.tsx
git commit -m "feat(map-native): stories use the scene model — title card from frame 0, furniture in scene 2"
```
(NO Claude-Session trailer.)

---

### Task 4: Reveals adopt the scene model (+ Root durations)

**Files:**
- Modify: `src/components/SymbolReveal.tsx`, `src/components/ChoroplethReveal.tsx`
- Modify: `remotion/src/Root.tsx`

**Interfaces:**
- Consumes: `resolveScene`, `TITLE_SCENE_FRAMES` (Task 1); `TitleCard` (Task 2); `MapFrame.furnitureOpacity` (Task 2).

- [ ] **Step 1: Prepend the title scene + shift the reveal ramp**

In BOTH `SymbolReveal.tsx` and `ChoroplethReveal.tsx`:
- Import `import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";` and `import { TitleCard } from "./StoryCards";`.
- Shift the reveal ramp to start AFTER the title scene. Change the progress line (SymbolReveal ~line 56, ChoroplethReveal ~line 175) from `easedRevealProgress(frame, durationInFrames)` to:
  ```ts
  const progress = easedRevealProgress(frame - TITLE_SCENE_FRAMES, durationInFrames - TITLE_SCENE_FRAMES);
  ```
  (For `frame < TITLE_SCENE_FRAMES` the negative frame clamps `progress` to 0 — the data stays blank during the title scene.)
- Compute the scene: `const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });`

- [ ] **Step 2: Title card + furniture crossfade in the return JSX**

- Pass `furnitureOpacity={scene.furnitureOpacity}` to `<MapFrame …>` (SymbolReveal ~line 170, ChoroplethReveal ~line 193).
- Add the title card overlay INSIDE the returned `<AbsoluteFill>` (after `</MapFrame>` or as a sibling — it must overlay everything):
  ```tsx
  {scene.titleOpacity > 0 && (config as any).title && (
    <TitleCard
      text={(config as any).title}
      description={(config as any).description}
      opacity={scene.titleOpacity}
    />
  )}
  ```
  (SymbolReveal reads `config.title`; ChoroplethReveal reads `(config as any).title` — match each file's existing access pattern.)

- [ ] **Step 3: Bump the reveal composition durations in `Root.tsx`**

In `remotion/src/Root.tsx`, the three `SymbolReveal*` and three `ChoroplethReveal*` compositions use `durationInFrames={REVEAL_FRAMES}`. Import `TITLE_SCENE_FRAMES` (`import { TITLE_SCENE_FRAMES } from "../../src/video-scene";`) and change all six to `durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}`. Leave the `*Story*` durations and the `REVEAL_FRAMES` import unchanged.

- [ ] **Step 4: Verify at render (both reveals)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bunx remotion still remotion/src/index.ts SymbolReveal     /tmp/scene/sym-rev-f0.png  --frame=0   --gl=angle --props=/tmp/scene/symbol.json
bunx remotion still remotion/src/index.ts SymbolReveal     /tmp/scene/sym-rev-map.png --frame=200 --gl=angle --props=/tmp/scene/symbol.json
bunx remotion still remotion/src/index.ts ChoroplethReveal /tmp/scene/cho-rev-f0.png  --frame=0   --gl=angle --props=/tmp/scene/choropleth.json
bunx remotion still remotion/src/index.ts ChoroplethReveal /tmp/scene/cho-rev-map.png --frame=200 --gl=angle --props=/tmp/scene/choropleth.json
```

READ all four: `-f0` = full-screen title card, NO furniture over it; `-map` (frame 200, well past the 75-frame title scene) = the reveal mid-animation WITH MapFrame furniture and NO title card. `bun test` → 135 green.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/components/SymbolReveal.tsx skills/map-native/src/components/ChoroplethReveal.tsx skills/map-native/remotion/src/Root.tsx
git commit -m "feat(map-native): reveals open with a title-card scene (crossfade to the reveal)"
```
(NO Claude-Session trailer.)

---

### Task 5: Callout-XOR-labels (symbol guided-tour) + KB + final render verify

**Files:**
- Modify: `src/components/SymbolStory.tsx`
- Modify/Create: `knowledge/references/map/formats/video.md`, `knowledge/references/map/formats/video-storytelling.md`, `knowledge/references/map/formats/video-reveal.md`

- [ ] **Step 1: `SymbolStory` drops the baked labels (callout-only)**

In `src/components/SymbolStory.tsx`: remove the `symbol-labels` `addLayer` block (~line 136-137) so ONLY the circle layer is added, and remove the per-frame `if (map.getLayer("symbol-labels")) map.setPaintProperty("symbol-labels", "text-opacity", fillReveal)` block (~line 231-232). The guided-tour callout (`CountryLabel`, per reveal beat) is now the ONLY name+value shown. If `symbolLabels`/`labelRadialOffset` (imported line ~18) become unused after this, remove the import. Do NOT touch `SymbolReveal` — it KEEPS its `symbol-labels` layer (baked labels are its data encoding; it has no callout).

- [ ] **Step 2: Verify the dedup at render (symbol story reveal beat)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bunx remotion still remotion/src/index.ts SymbolStory /tmp/scene/sym-story-reveal.png --frame=300 --gl=angle --props=/tmp/scene/symbol.json
```

READ it: the camera is framed on a city, the centred `CountryLabel` callout shows `City — value` — and there is NO baked label pinned beside the circle (no duplication). (If frame 300 is not in a reveal beat for this sample, pick a frame inside one.) Confirm `SymbolReveal` STILL shows baked labels: `bunx remotion still … SymbolReveal … --frame=200 …` shows labels beside circles.

- [ ] **Step 3: KB — the title-scene rule + callout-XOR-labels + cross-links**

- **`knowledge/references/map/formats/video.md`** — add a "Title scene" rule (cross-cutting, applies to every map video): every map video opens with a full-screen title-card scene from frame 0; the `MapFrame` furniture (title overlay + source) belongs to the map scene, NOT the title scene; a short crossfade (~0.4s / `CROSSFADE_FRAMES`) joins them; `resolveScene` (`src/video-scene.ts`) supplies the complementary title/furniture opacities. Source by name: the toolkit's MapFrame convention; Amini et al. 2015 (the establish beat / titled opening of a data video); broadcast lower-third convention (a title card and running furniture are distinct scenes). NO fabricated URLs.
- **`knowledge/references/map/formats/video-storytelling.md`** — add the **callout-XOR-labels** rule: a guided tour shows a feature's name+value as a callout on the visited feature OR as a baked label, never both; the tour uses callouts, the simple reveal uses baked labels. (Consistent with SP1's interactive tooltip-XOR-labels.) Add a one-line pointer to `video.md`'s title-scene rule.
- **`knowledge/references/map/formats/video-reveal.md`** — add a one-line pointer to `video.md`'s title-scene rule (the reveal now also opens with a title scene).

- [ ] **Step 4: Full render verification (BOTH types × reveal + story, sequential)**

Produce the story + reveal videos for both types ONE AT A TIME (shared dist; `--concurrency=1`):
```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json     /tmp/scene/symbol all
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/scene/choro  all
```
For each type, READ the `reveal-landscape-still.png` and `story-landscape-still.png` proofs (and, if needed, extract frame-0 stills from the mp4s) to confirm: every video opens on a title card (no furniture over it), the map scene has furniture and no title card, and the symbol story reveal beats show the callout with no baked-label duplication. `bun test` → 135 green; `bun scripts/audit-story.mjs` still passes both types.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/components/SymbolStory.tsx knowledge/references/map/formats/video.md knowledge/references/map/formats/video-storytelling.md knowledge/references/map/formats/video-reveal.md
git commit -m "feat(map-native): symbol guided-tour is callout-XOR-labels + KB title-scene/dedup rules"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Task 2 changes the `TitleCard` API; the two story callers are fixed in Task 3 — run only the `video-scene` test between Task 2 and Task 3 if the full suite type-checks the whole project (see Task 2 Step 3), then the full suite after Task 3.
- Reveal ramp: `easedRevealProgress(frame - TITLE_SCENE_FRAMES, durationInFrames - TITLE_SCENE_FRAMES)` — the negative-frame clamp keeps the data blank during the title scene.
- Run `produce`/`remotion` ONE composition at a time; always `--gl=angle --concurrency=1`.
- NEVER print or log the MapTiler key.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages or files.
- After all tasks: `bun test` 135 green; `audit-story` passes; every map video (reveal + story, both types) opens on a title-card scene with no furniture over it, crossfading to the map; the symbol story shows callouts with no baked-label duplication.
