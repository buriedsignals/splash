# Map-Story Choreography Fan-out — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend the fluid interwoven entrance choreography from ChoroplethStory to the 5 other map-native story comps (Cartogram, HexGrid, DotDensity, Symbol, Locator), sharing one infra module.

**Architecture:** Promote the choropleth-local choreography wiring into `src/story-choreography.ts`, then apply it per comp — areal comps (Cartogram/HexGrid/DotDensity) reuse the border-draw→fill-bloom→label mechanism directly; point comps (Symbol/Locator) reinterpret the 3 `stagedEntrance` channels as radius-grow/opacity/label via per-feature data-driven properties. All get projected labels, threaded pacing, and per-comp mode-aware `calculateMetadata`.

**Tech Stack:** Bun, TypeScript, `bun:test`, Remotion, `@maptiler/sdk` (MapLibre), `@turf/turf`.

**Spec:** `docs/superpowers/specs/2026-07-20-map-story-choreography-fanout-design.md`. **Reference implementation:** `skills/map-native/src/components/ChoroplethStory.tsx` (committed, render-proven) — every comp task mirrors its structure.

## Global Constraints
- Bun (never npm/node). TypeScript. `bun:test`. TDD. **No `any`.** English only; **no Claude/Anthropic in any commit**.
- ChoroplethStory + RouteReveal default render **byte-identical** after Task 1 (parity).
- Pacing = the single `AREAL_TIMELINE_OPTS` shared by all 6 comps + Root; component `buildTimeline` and Root `*_FRAMES`/`calculateMetadata` must use it (never diverge → frozen-tail hazard).
- Each comp: `revealMode` context+sequential, `beatsForMode` to drop establish in sequential, per-comp `calculateMetadata` (mode-aware duration).
- Reuse existing helpers (`stagedEntrance`, `buildDraw`/`sliceBorder`, `triggerFrameByRegion`, `beatsForMode`, `poleOfInaccessibility`, `CountryLabel`, `continueWhenMapSettles`) — do not reinvent.
- Feedback→system: fix at the shared module so all comps inherit.

**Working dir:** `/Users/rmdms/Sites/Professional/splash-merge`, branch `feat/areal-reveal-choreography`. Render-proof (controller-run, NOT in gate): `cd skills/map-native && bun scripts/produce.mjs <config> <out> video` then inspect `<out>/landscape.mp4` + `video-landscape-still.png`. Sequential config = copy the sample + add `"revealMode":"sequential"`. Typecheck `bunx tsc --noEmit -p .` has pre-existing `bun:test` module errors in test files — ignore. Full suite `bun test` (~2min).

---

### Task 1: Promote shared infra → `story-choreography.ts` (+ ChoroplethStory/Root refactor, parity)

**Files:**
- Create: `skills/map-native/src/story-choreography.ts` (+ `.test.ts`)
- Modify: `skills/map-native/src/components/ChoroplethStory.tsx` (import from the new module; delete local copies)
- Modify: `skills/map-native/remotion/src/Root.tsx` (import `AREAL_TIMELINE_OPTS` + `makeStoryMeta` from the module; keep `storyMeta` behavior)

**Interfaces — Produces:**
- Constants (moved verbatim from `ChoroplethStory.tsx`): `AREAL_BORDER_S=1.3`, `AREAL_FILL_S=0.8`, `AREAL_FILL_START_S=0.5`, `AREAL_LABEL_S=1.1`, `AREAL_LABEL_START_S=1.0`, `AREAL_REVEAL_HOLD_S=3.0`, `AREAL_MOVE_S=1.3`, `AREAL_TIMELINE_OPTS = { revealHold: AREAL_REVEAL_HOLD_S, move: AREAL_MOVE_S } as const`.
- `stagedByKey(triggers: Map<string,number>, frame: number, fps: number, fillTarget: number): Map<string, StagedEntrance>` — pure; per key: `stagedEntrance((frame - triggerFrame)/fps, { fillOpacity: fillTarget, borderS: AREAL_BORDER_S, fillS: AREAL_FILL_S, labelS: AREAL_LABEL_S, fillStart: AREAL_FILL_START_S, labelStart: AREAL_LABEL_START_S })`.
- `makeStoryMeta(computeFrames: (config: any) => number)` → `({ props }: { props: { config: any } }) => ({ durationInFrames: computeFrames(props.config) })`.

**Context:** These currently live in `ChoroplethStory.tsx` module scope (`AREAL_*` at ~`:66-88`) and `Root.tsx` (`storyMeta` ~`:96-122`). Moving them changes NO values → Choropleth renders identically.

- [ ] **Step 1: Write the failing test**

```ts
// skills/map-native/src/story-choreography.test.ts
import { describe, it, expect } from "bun:test";
import { stagedByKey, AREAL_TIMELINE_OPTS, makeStoryMeta } from "./story-choreography.ts";

describe("stagedByKey", () => {
  it("returns a staged entrance per key, keyed by trigger frame", () => {
    const triggers = new Map([["A", 30], ["B", 120]]);
    const m = stagedByKey(triggers, 30, 30, 0.9); // frame 30: A just triggered (ls=0), B not yet
    expect(m.get("A")!.borderProgress).toBe(0);   // ls=0 → border not started
    expect(m.get("B")!.borderProgress).toBe(0);   // ls<0 → clamped 0
    const later = stagedByKey(triggers, 30 + 30 * 5, 30, 0.9); // A at ls=5s → fully entered
    expect(later.get("A")!.borderProgress).toBeCloseTo(1, 5);
    expect(later.get("A")!.fillOpacity).toBeCloseTo(0.9, 5);
    expect(later.get("A")!.labelReveal).toBeCloseTo(1, 5);
  });
});

describe("AREAL_TIMELINE_OPTS", () => {
  it("carries the tuned revealHold + move", () => {
    expect(AREAL_TIMELINE_OPTS.revealHold).toBe(3.0);
    expect(AREAL_TIMELINE_OPTS.move).toBe(1.3);
  });
});

describe("makeStoryMeta", () => {
  it("builds a calculateMetadata fn from a frame computer", () => {
    const meta = makeStoryMeta(() => 456);
    expect(meta({ props: { config: {} } })).toEqual({ durationInFrames: 456 });
  });
});
```

- [ ] **Step 2: Run test → fails** (`Cannot find module './story-choreography.ts'`). `cd skills/map-native && bun test src/story-choreography.test.ts`

- [ ] **Step 3: Create `story-choreography.ts`** with the constants (copy exact values from `ChoroplethStory.tsx`), `stagedByKey`, `makeStoryMeta`, and the comment block explaining the single-source-of-truth pacing + the interweave (move the comments too). `addSubjectEmphasisLayers` is added in Step 3b.

- [ ] **Step 3b: Add `addSubjectEmphasisLayers`** to the module — extract the choropleth per-subject `bloom`+`trail` source/layer creation into:
```ts
export function addSubjectEmphasisLayers(
  map: maptilersdk.Map,
  keys: string[],
  opts: { idPrefix: string; featureFor: (k: string) => GeoJSON.Feature; colorFor: (k: string) => string; dark: boolean },
): void
```
mirroring `ChoroplethStory.tsx`'s current `choro-bloom-${key}`/`choro-trail-${key}` add-source/add-layer block, parameterized by `idPrefix` (choropleth passes `"choro"`).

- [ ] **Step 4: Refactor ChoroplethStory** to `import { AREAL_TIMELINE_OPTS, stagedByKey, addSubjectEmphasisLayers } from "../story-choreography"` (and the `AREAL_*_S` if referenced directly); delete the local constant block and inline emphasis-layer creation; replace the per-frame `stagedEntrance` loop with `stagedByKey(triggers, frame, fps, BLOOM_BASE)`. Keep `BLOOM_BASE=0.9`, the context/sequential fill branch, pole anchor, and everything else unchanged.

- [ ] **Step 5: Refactor Root.tsx** — import `AREAL_TIMELINE_OPTS` + `makeStoryMeta` from `../../src/story-choreography` (instead of from ChoroplethStory); rewrite `storyMeta` as `makeStoryMeta((cfg) => { …existing body returning totalFrames… })`. No behavior change.

- [ ] **Step 6: Run suite + typecheck.** `cd skills/map-native && bun test && bunx tsc --noEmit -p .` Expected: PASS (727+ tests incl. new story-choreography tests), no new type errors.

- [ ] **Step 7 (CONTROLLER render-proof):** Choropleth context + sequential render byte-identical to pre-refactor (spot-check stills). Implementer SKIPS; controller runs.

- [ ] **Step 8: Commit.** `git commit -m "refactor(map-native): promote areal choreography infra to story-choreography.ts (choropleth parity)"`

---

### Task 2: Cartogram story choreography

**Files:** Modify `skills/map-native/src/components/CartogramStory.tsx`; Modify `remotion/src/Root.tsx` (CARTOGRAM_FRAMES + calculateMetadata).

**Interfaces — Consumes:** `AREAL_TIMELINE_OPTS`, `stagedByKey`, `addSubjectEmphasisLayers`, `makeStoryMeta` (Task 1); `buildDraw`/`sliceBorder`, `triggerFrameByRegion`, `beatsForMode`, `resolveRevealMode`, `CountryLabel`.

**Context (from grounding):** `CartogramStory.tsx` renders polygon cells (`cartogram-cells` fill + `cartogram-outline` line, ~`:163-183`), `FULL_OPACITY=0.85` from load, per-beat dim/highlight `["case",["==",["get","__id"],highlightKey],FULL_OPACITY,DIM_OPACITY]` (~`:250-265`), NO on-map label (CaptionCard ~`:355-360`), keyed on `__id`, `deriveCartogramStory` (~`:194`), `buildTimeline(kinds,fps)` (~`:211`). Cells are convex → **centroid anchor is safe (no pole needed)**.

- [ ] **Step 1:** Mirror ChoroplethStory. Derive beats → `beatsForMode(deriveCartogramStory(...), mode)`; `buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS)`; `triggers = triggerFrameByRegion(beats, phases)`; build `borderByKey` (each subject cell's exterior ring `[coordinates[0]]` → `buildDraw`) + `anchorByKey` (cell `turf.centroid`); `addSubjectEmphasisLayers(m, [...triggers.keys()], { idPrefix: "cartogram", featureFor: singleCellFeature, colorFor: cellColor, dark })`.

- [ ] **Step 2:** Per-frame loop = ChoroplethStory's: `stagedByKey(triggers, frame, fps, FULL_OPACITY)` → per subject feed `cartogram-trail-${key}` via `sliceBorder`, set `cartogram-bloom-${key}` opacity (context `max(0, fillOpacity - FULL_OPACITY)`, sequential `fillOpacity`), base `cartogram-cells` opacity (context = existing highlight expr, sequential = 0). Projected `CountryLabel` at `anchorByKey.get(subject)` driven by `staged.labelReveal` (NEW — this comp had no on-map label).

- [ ] **Step 3:** Root.tsx — thread `AREAL_TIMELINE_OPTS` into `CARTOGRAM_FRAMES` `buildTimeline` (~`:196-199`) and add `calculateMetadata={makeStoryMeta((cfg) => …cartogram layout+deriveCartogramStory+beatsForMode+buildTimeline(…,AREAL_TIMELINE_OPTS).totalFrames)}` to the 3 Cartogram compositions.

- [ ] **Step 4:** Suite + typecheck PASS.

- [ ] **Step 5 (CONTROLLER render-proof):** Cartogram context + sequential — interwoven entrance, projected label rises inside the cell, fast sequential open + clean end. **Checkpoint:** if per-cell labels crowd a dense cartogram, fall back to caption-only (record decision). Controller runs.

- [ ] **Step 6: Commit.** `git commit -m "feat(map-native): cartogram story entrance choreography (both modes, projected label)"`

---

### Task 3: HexGrid story choreography

**Files:** Modify `skills/map-native/src/components/HexGridStory.tsx`; Modify `remotion/src/Root.tsx` (HEX_GRID_STORY_FRAMES + calculateMetadata).

**Context (from grounding):** Structurally near-identical to Cartogram — hexagon cells (`hex-grid-cells`/`hex-grid-outline` ~`:159-179`), `FULL_OPACITY=0.8`, dim/highlight keyed `__cellIdx` (~`:241-256`), NO on-map label (caption ~`:346-352`), `buildTimeline(kinds,fps)` (~`:207`). Convex hexes → centroid anchor.

- [ ] **Step 1-2:** Apply the Task-2 pattern with `idPrefix:"hex"`, key `__cellIdx`, `fillTarget=0.8`, 6-vertex ring for `buildDraw`, centroid anchor, projected `CountryLabel`.

- [ ] **Step 3:** Root.tsx — thread `AREAL_TIMELINE_OPTS` into `HEX_GRID_STORY_FRAMES` + `calculateMetadata` on the 3 HexGrid compositions.

- [ ] **Step 4:** Suite + typecheck PASS.

- [ ] **Step 5 (CONTROLLER render-proof):** HexGrid context + sequential; label-crowding checkpoint (hex grids can be dense → most likely caption-only fallback candidate — judge at render).

- [ ] **Step 6: Commit.** `git commit -m "feat(map-native): hexgrid story entrance choreography (both modes, projected label)"`

---

### Task 4: DotDensity story choreography (stipple-in + region border-draw)

**Files:** Modify `skills/map-native/src/components/DotDensityStory.tsx`; Modify `remotion/src/Root.tsx` (DOT_DENSITY_STORY_FRAMES + calculateMetadata).

**Context (from grounding):** Many uniform dots scattered in region polygons (`dot-density-dots` + `dot-density-outline` ~`:176-202`), `circle-opacity:1` dim-the-rest keyed `__region` (~`:271-292`), NO label (caption ~`:385-391`), `buildTimeline` (~`:232`). **Has real region polygon rings** (`dot-density-region-src`) → genuine border-draw; regions are country polygons → `poleOfInaccessibility` anchor.

- [ ] **Step 1:** Derive beats → `beatsForMode`; `buildTimeline(…, AREAL_TIMELINE_OPTS)`; triggers; `borderByKey` (region feature rings → `buildDraw`); `anchorByKey` (`poleOfInaccessibility(region feature)`); `addSubjectEmphasisLayers` with `idPrefix:"dotdensity"` for the **trail** (region outline draw-on). The **fill channel drives the dots' opacity**, not a bloom fill layer.

- [ ] **Step 2:** Per-frame: `stagedByKey(triggers, frame, fps, 1)`. Trail = region outline via `sliceBorder`. Dots opacity per `__region`: context = the existing dim/highlight expression, sequential = `["case",["==",["get","__region"], key], staged.fillOpacity, 0]` composited across subjects (dots stipple-in 0→1 per region as it enters). Projected `CountryLabel` at pole anchor, `staged.labelReveal`.

- [ ] **Step 3:** Root.tsx — `AREAL_TIMELINE_OPTS` into `DOT_DENSITY_STORY_FRAMES` + `calculateMetadata` on the 3 DotDensity compositions.

- [ ] **Step 4:** Suite + typecheck PASS.

- [ ] **Step 5 (CONTROLLER render-proof):** DotDensity context + sequential — region outline draws on, dots stipple-in per region, label rises. **Checkpoint:** staggered-by-seed vs uniform dot fade (judge at render).

- [ ] **Step 6: Commit.** `git commit -m "feat(map-native): dotdensity story entrance (region border-draw + dot stipple-in, both modes)"`

---

### Task 5: Symbol story choreography (per-mark staged, both modes)

**Files:** Modify `skills/map-native/src/components/SymbolStory.tsx`; Modify `remotion/src/Root.tsx` (SYMBOL_FRAMES + calculateMetadata).

**Context (from grounding):** Proportional circles (`symbol-circles` ~`:149-160`), radius grow via GLOBAL `fillReveal` `["*",["get","radius"],fillReveal]` (~`:291-297`), symbol-layer labels `symbol-labels` with per-frame text-opacity ramp (~`:320-328`), projected `CountryLabel` callout for top-N (~`:386-398`), `buildTimeline` (~`:217`). Point marks → **no rings, no per-key layers** → per-feature data-driven properties.

- [ ] **Step 1:** Derive beats → `beatsForMode`; `buildTimeline(…, AREAL_TIMELINE_OPTS)`; triggers keyed on the mark id. Tag each mark feature with `__triggerFrame` (its reveal-beat startFrame from `triggers`, or the establish-beat start in context so all marks establish together). No emphasis layers.

- [ ] **Step 2:** Per frame compute `stagedByKey(triggers, frame, fps, 1)` in JS; apply per mark via `setFeatureState`/per-frame `setData`: `circle-radius = radius * borderProgress` (grow), `circle-opacity = fillOpacity`, `symbol-labels text-opacity = labelReveal`. Context = marks staged from establish + existing dim/highlight; sequential = marks appear one-by-one from their reveal trigger (establish dropped). Keep the existing per-frame label-anchor declutter.

- [ ] **Step 3:** Root.tsx — `AREAL_TIMELINE_OPTS` into `SYMBOL_FRAMES` + `calculateMetadata` on the 3 Symbol compositions.

- [ ] **Step 4:** Suite + typecheck PASS.

- [ ] **Step 5 (CONTROLLER render-proof):** Symbol context + sequential — circles grow in staged (not all-at-once), labels rise, sequential marks appear one-by-one, clean end.

- [ ] **Step 6: Commit.** `git commit -m "feat(map-native): symbol story per-mark staged entrance (radius grow + label, both modes)"`

---

### Task 6: Locator story choreography (both modes, resolve sequential checkpoint)

**Files:** Modify `skills/map-native/src/components/LocatorStory.tsx`; Modify `remotion/src/Root.tsx` (LOCATOR_STORY_FRAMES + calculateMetadata).

**Context (from grounding):** Uniform dots (`locator-glyphs` fixed radius ~`:148-170`), dim-the-rest via `__highlight`, per-beat `setData` rebuild (~`:256-309`), symbol-layer labels `locator-labels` decluttered (~`:173-201`), `buildTimeline` (~`:229`). Dim-the-rest tour → sequential is a validation checkpoint.

- [ ] **Step 1:** Derive beats → `beatsForMode`; `buildTimeline(…, AREAL_TIMELINE_OPTS)`; triggers. Tag markers `__triggerFrame`. Per-feature data-driven (no per-key layers).

- [ ] **Step 2:** Per frame `stagedByKey(triggers, frame, fps, 1)`: `circle-radius = DOT_RADIUS_PX * borderProgress` (stipple grow), `circle-opacity = fillOpacity` (fade-in), `locator-labels text-opacity = labelReveal`. Context = markers establish (staged) + existing dim/highlight declutter; sequential = markers appear one-by-one. Preserve the declutter/`placeLabels` logic.

- [ ] **Step 3:** Root.tsx — `AREAL_TIMELINE_OPTS` into `LOCATOR_STORY_FRAMES` + `calculateMetadata` on the 3 Locator compositions.

- [ ] **Step 4:** Suite + typecheck PASS.

- [ ] **Step 5 (CONTROLLER render-proof + CHECKPOINT):** Locator context + sequential. **Resolve the spec's Locator-sequential checkpoint:** if one-by-one appearance reads poorly for a dim-the-rest tour, keep Locator **context-only** (guard `resolveRevealMode` → force context for locator, documented); Symbol keeps both. Record the decision in the spec + commit body.

- [ ] **Step 6: Commit.** `git commit -m "feat(map-native): locator story staged entrance (both modes | context-only per checkpoint)"`

---

## Self-Review
- **Spec coverage:** infra promotion (T1) ✓ · Cartogram (T2) ✓ · HexGrid (T3) ✓ · DotDensity stipple+border (T4) ✓ · Symbol both modes (T5) ✓ · Locator both modes + checkpoint (T6) ✓ · projected labels on all areal (T2/T3/T4) ✓ · threaded pacing + per-comp calculateMetadata (each task Step 3) ✓ · both-mode render-proof (each Step 5) ✓. The 3 spec checkpoints (areal label crowding, Locator sequential, dot stipple) are explicit render-judged task outputs.
- **Placeholder scan:** no TBD; each task gives exact anchors + the shared-helper API + mirrors the committed ChoroplethStory reference; the genuinely-open items are render-judged checkpoints, not placeholders.
- **Type consistency:** `stagedByKey(triggers, frame, fps, fillTarget)→Map<string,StagedEntrance>`, `addSubjectEmphasisLayers(map, keys, {idPrefix,featureFor,colorFor,dark})`, `makeStoryMeta(computeFrames)` — consistent across T1-T6. `idPrefix` per comp: choro/cartogram/hex/dotdensity. Point comps (Symbol/Locator) use no emphasis layers (data-driven), consistent with the spec.
- **Note:** map-native video produce is slow/flaky under contention — render-proofs run in isolation, controller-run; gate = `bun test` (unit) only.
