# Map-Story Choreography Fan-out — Design

> Extend the fluid, interwoven per-feature entrance choreography (built for ChoroplethStory)
> to the other 5 map-native story comps: Cartogram, HexGrid, DotDensity (areal) and
> Symbol, Locator (point-based).

**Status:** design approved 2026-07-20. Branch `feat/areal-reveal-choreography` (continues the Choropleth work).
**Predecessor:** `2026-07-20-areal-reveal-choreography-design.md` (Choropleth = the render-proven reference). Read it first.

---

## Context — what already exists

The choreography and its infra are built and render-proven for **ChoroplethStory**:
- **Shared core (already geometry-agnostic):** `core/staged-reveal.ts` `stagedEntrance(localSeconds, {fillOpacity, borderS?, fillS?, labelS?, fillStart?, labelStart?}) → {borderProgress, fillOpacity, labelReveal}` (phases OVERLAP via `fillStart`/`labelStart`; defaults = strict-sequential → RouteReveal byte-identical). `core/border-slice.ts` `buildDraw(rings)`/`sliceBorder`. `core/label-anchor.ts` `poleOfInaccessibility`. `story-triggers.ts` `triggerFrameByRegion(beats, phases)`. `map-story.ts` `resolveRevealMode` + `beatsForMode` (drops the establish beat in `sequential`).
- **Choropleth-only wiring (to be shared):** the pacing knobs `AREAL_*_S` + `AREAL_TIMELINE_OPTS`, the per-subject emphasis-layer pattern (`choro-bloom-${key}` + `choro-trail-${key}`), the per-frame trigger loop, and the mode-aware `calculateMetadata` (`storyMeta`) in `remotion/src/Root.tsx`.

**The 5 other comps today** each use a *global fill/opacity ramp + camera-tour dim/highlight*, call `buildTimeline(kinds, fps)` with **no opts** (so default pacing, not the tuned `AREAL_TIMELINE_OPTS`), and pass a **static `durationInFrames`** computed from *sample* beats (a latent length-mismatch bug for any injected config whose beat count differs). None import the staged machinery.

### Locked design decisions (with the user)
- **All areal comps get a projected on-map label** ("NAME value", like Choropleth's "NORWAY 99%"), even though Cartogram/HexGrid/DotDensity are caption-only today. The CaptionCard stays as complement.
- **Symbol and Locator support BOTH `revealMode`s** (context + sequential).

---

## Architecture

### 1. Promote shared infra → `src/story-choreography.ts` (new)

A new module (sibling to `story-timeline.ts`/`story-triggers.ts` — it is Remotion-story infra, not generic map core) exports:

- **Pacing knobs** (moved verbatim from `ChoroplethStory.tsx`): `AREAL_BORDER_S`, `AREAL_FILL_S`, `AREAL_FILL_START_S`, `AREAL_LABEL_S`, `AREAL_LABEL_START_S`, `AREAL_REVEAL_HOLD_S`, `AREAL_MOVE_S`, and `AREAL_TIMELINE_OPTS = { revealHold, move }`. Single source of truth for all 6 comps + Root.
- **`stagedByKey(triggers: Map<string, number>, frame: number, fps: number, fillTarget: number): Map<string, StagedEntrance>`** — pure; for each subject key, `stagedEntrance((frame - triggerFrame)/fps, { fillOpacity: fillTarget, borderS: AREAL_BORDER_S, fillS: AREAL_FILL_S, labelS: AREAL_LABEL_S, fillStart: AREAL_FILL_START_S, labelStart: AREAL_LABEL_START_S })`. `fillTarget` is the comp's settle opacity (choropleth 0.9, cartogram 0.85, hex 0.8, point marks 1.0). Each comp then applies the 3 returned channels to its own layers/expressions.
- **`addSubjectEmphasisLayers(map, keys, opts)`** for the AREAL comps — creates one `${idPrefix}-bloom-${key}` fill layer (filtered to the subject, its colour) + one `${idPrefix}-trail-${key}` line layer per subject key, given `{ idPrefix, featureFor(key), colorFor(key), dark }`. Choropleth/Cartogram/HexGrid/DotDensity use it; Symbol/Locator do not (they use per-feature expressions, below).
- **`makeStoryMeta(computeFramesForConfig)`** — a factory returning a Remotion `calculateMetadata` fn `({props}) => ({ durationInFrames: computeFramesForConfig(props.config) })`. Each comp supplies a `computeFramesForConfig` that mirrors its own layout+`deriveXStory`+`beatsForMode`+`buildTimeline(…, AREAL_TIMELINE_OPTS)`.

**ChoroplethStory + Root refactor to import from this module** (delete their local copies). Choropleth's rendered output stays **byte-identical** (parity = the promotion's correctness proof; verify with a render still-match + the existing suite).

### 2. Two entrance families

**Areal family — Cartogram, HexGrid, DotDensity.** Direct reuse of the choropleth mechanism:
- `beats = beatsForMode(deriveXStory(...), mode)`; `buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS)`; `triggers = triggerFrameByRegion(beats, phases)`.
- `addSubjectEmphasisLayers` keyed on the comp's feature id (`__id` cartogram, `__cellIdx` hex, `__region` dot-density).
- Per frame: `stagedByKey(...)` → for each subject, `sliceBorder(buildDraw(rings), 0, total*borderProgress)` on the trail (cell/hex/region outline draw-on), and the fill/opacity channel:
  - Cartogram/HexGrid: bloom the cell/hex fill (target `FULL_OPACITY` 0.85/0.8), context = overshoot-delta-over-base, sequential = 0→target.
  - **DotDensity**: the "fill" channel drives the region's **dots' opacity** (stipple-in 0→1), optionally staggered by dot seed for a stipple feel; it has real region polygon rings so the border-draw (region outline) is genuine.
- **Projected label** (`CountryLabel`) at the subject anchor — convex cartogram/hex cells → centroid (no pole cost); DotDensity regions are country polygons → `poleOfInaccessibility`. Label driven by `staged.labelReveal`. CaptionCard stays.
- `revealMode` context/sequential + per-comp `calculateMetadata` via `makeStoryMeta`.

**Point family — Symbol, Locator.** Reinterpret the 3 `stagedEntrance` channels for a point mark, applied via **per-feature data-driven properties** (a `__triggerFrame` prop per mark + per-frame computed values), NOT per-key layers:
- `borderProgress` → **circle radius grow** (0 → the mark's target radius). Symbol's radius is value-scaled (`radius` prop); Locator's is uniform (`DOT_RADIUS_PX`).
- `fillOpacity` → **circle opacity** bloom (to the mark's fill).
- `labelReveal` → the mark's **symbol-layer label** text-opacity rise (both already have `symbol-labels`).
- Mechanism: compute `stagedByKey` (keyed on the mark's id) in JS per frame, apply via `setFeatureState` + `["feature-state", …]` expressions, or per-frame `setData` with computed props (implementer picks the cleaner; Symbol already re-derives per frame). No `border-slice` (no rings).
- Both modes: **context** = marks establish (staged from the establish beat) then dim/highlight tour; **sequential** = marks appear one-by-one from their reveal trigger (establish dropped via `beatsForMode`). Locator's "dim-the-rest" tour is preserved in context; sequential is render-judged (validation checkpoint below).
- `AREAL_TIMELINE_OPTS` threaded + per-comp `calculateMetadata`.

### 3. Pacing + duration for all 5

Thread `AREAL_TIMELINE_OPTS` into **both** each comp's `buildTimeline` call AND its `*_FRAMES` in Root; give each a `calculateMetadata={makeStoryMeta(...)}` (mirrors ChoroplethStory) — which also fixes the pre-existing static-`*_FRAMES` length-mismatch bug (sample beats vs injected config).

---

## Validation checkpoints (decide at render, not in theory)
- **Areal projected labels:** on dense cartogram/hex grids a label per visited cell may crowd; render-judge. If it crowds, fall back to caption-only for that comp (label channel is per-comp switchable).
- **Locator sequential:** Locator is a dim-the-rest tour, not accumulation — render-judge whether "marks appear one-by-one" reads well; if not, keep Locator context-only (documented), Symbol keeps both.
- **DotDensity stipple:** render-judge staggered vs uniform dot fade-in.

## Testing & proof discipline
- **ChoroplethStory parity** after the infra promotion: still renders byte-identical (suite + a render still-match).
- **Per-comp render-proof** (real MP4 + still, our "verify the delivered artifact" rule): each of the 5 in **both modes** — entrance timing interwoven, label rise, fast sequential open + clean end (mode-aware duration), no frozen tail.
- **Unit**: `stagedByKey` (pure, phase values); `makeStoryMeta` (duration matches beat count per mode). Core `staged-reveal`/`border-slice`/`label-anchor` already covered.
- **Gate**: tests in existing `TEST_DIRS`; render-proofs run in isolation (map-native video produce is slow/flaky under contention).

## Global Constraints
- Bun, TypeScript, `bun:test`, TDD. No `any`. English only; no Claude/Anthropic in any commit.
- ChoroplethStory + RouteReveal default output **byte-identical** after the promotion (RouteReveal untouched; Choropleth re-imports the same values).
- Pacing = the single `AREAL_TIMELINE_OPTS` shared by all 6 comps + Root — component and Root must never diverge (frozen-tail hazard).
- Feedback → system: promote to the shared module so all 6 inherit; never patch one comp in isolation.

## Non-goals / deferred
- Newsroom-profile → CSS-var typography threading. Context-bloom lightness-shift. Sequential overshoot clamp (`fillOpacity` peaks at target*1.25 > 1.0 for opacity channels — clamp where it maps to an opacity). These are recorded follow-ups from the Choropleth work; apply the clamp fix in the shared helper so all comps inherit it.
- map-dw / scrolly comps (different engines).

## Suggested build order (for the plan)
1. Promote infra → `story-choreography.ts` + ChoroplethStory/Root refactor (parity). **Foundation.**
2. Areal: Cartogram → HexGrid → DotDensity (each: choreography + projected label + pacing + calculateMetadata + render-proof both modes).
3. Point: Symbol → Locator (each: data-driven staged grow/opacity/label + both modes + pacing + calculateMetadata + render-proof; resolve Locator-sequential checkpoint).
