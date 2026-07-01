# map-native — video scene model (title-card scene + callout-XOR-labels) — design

**Date:** 2026-07-01
**Status:** approved (brainstorming)
**Scope:** a cross-cutting map-video presentation improvement from Rémy's review, spanning ALL four
video components (the SP1 simple-reveals + the SP2 storytelling tours, both map types). Three coupled
changes: (1) every map video opens with a full-screen **title-card scene** — not just the storytelling
videos; (2) the title card is scene 1, visible **from frame 0**, and the `MapFrame` furniture (title
overlay + source) does NOT render over it — furniture belongs to scene 2 (the map), joined by a short
**crossfade**; (3) in the symbol **guided-tour**, the baked `symbol-labels` and the centred callout say
the same thing — **callout-XOR-labels**: drop the baked labels (the callout carries name+value). Each
change ships its four coupled artifacts (code at the right layer + conformance/harness + KB + render
verification on BOTH types).

This builds on merged SP1 (reveals) + SP2 (stories). Additive: shared components (`MapFrame`,
`StoryCards`) gain backward-compatible props (defaults preserve current behavior); the four video
components adopt the scene model.

## Why

Rémy's review of the SP2 videos:
1. The full title card only appears in the storytelling videos; the simple-reveal videos have no title
   scene. It should appear for ALL map videos.
2. The `TitleCard` currently fades IN from transparent (opacity 0 at frame 0 → 1 over the first 15% of
   the title beat), and `MapFrame` furniture is rendered THROUGHOUT — so at frame 0 the reader sees the
   map + furniture (not the title), and during the fade the furniture overlaps the title card. The title
   card must be a distinct scene from frame 0, with no furniture over it.
3. In the symbol guided-tour, each city carries a baked `symbol-labels` label (name+value) AND, when the
   camera visits it, a centred `CountryLabel` callout (name+value) — the same information twice.

## A. The shared two-scene model

Every map video is **scene 1 (title card) → short crossfade → scene 2 (map + furniture)**.

- **New pure helper `src/video-scene.ts`:**
  `resolveScene(frame: number, opts: { titleSceneEndFrame: number; crossfadeFrames: number }):
  { titleOpacity: number; furnitureOpacity: number }`.
  - `titleOpacity`: `1` from frame 0 through the title hold, then ramps `1 → 0` over the crossfade
    window `[titleSceneEndFrame - crossfadeFrames, titleSceneEndFrame]` (eased). No fade-IN — it is 1 at
    frame 0.
  - `furnitureOpacity`: `0` through the title hold, then ramps `0 → 1` over the same crossfade window.
  - After `titleSceneEndFrame`: `titleOpacity = 0`, `furnitureOpacity = 1`.
  - `CROSSFADE_FRAMES = 12` (~0.4 s @ 30 fps) exported as the default.
  Pure and unit-tested (values at frame 0, mid-hold, and after the crossfade).
- **`TitleCard` (`src/components/StoryCards.tsx`):** replace its internal fade-in/out math with an
  explicit `opacity` prop (the caller passes `titleOpacity`). It renders the full-screen `#1c1c1c` card
  at the supplied opacity — `1` from frame 0 (no fade-in), fading out only at the crossfade. (The
  `phase`/`frame` props are dropped in favour of `opacity`; callers compute it via `resolveScene`.)
- **`MapFrame` (`src/core/MapFrame.tsx`):** add `furnitureOpacity?: number` (default `1`, so existing
  callers are unchanged). Apply it to the title-band and source-band overlay `div`s (multiply their
  opacity), so the furniture is invisible during the title scene and fades in across the crossfade.

## B. Apply the scene model to the four video components

- **Simple reveals (`SymbolReveal`, `ChoroplethReveal`):** they gain a title scene. A shared
  `TITLE_SCENE_FRAMES = 75` (~2.5 s, matching the storytelling title hold) is prepended. The reveal
  composition duration becomes `TITLE_SCENE_FRAMES + REVEAL_FRAMES`. The data-reveal ramp starts AFTER
  the title scene: the eased progress is computed over `[titleSceneEnd, total]` (i.e.
  `easedRevealProgress(frame - TITLE_SCENE_FRAMES, REVEAL_FRAMES)`, clamped to 0 before that). The
  `TitleCard` shows during the title scene; `MapFrame` gets `furnitureOpacity` from `resolveScene` with
  `titleSceneEndFrame = TITLE_SCENE_FRAMES`. The three `*Reveal*` composition durations in
  `remotion/src/Root.tsx` are bumped accordingly.
- **Storytelling tours (`SymbolStory`, `ChoroplethStory`):** the `title` beat (beatIndex 0) IS the
  title scene; `titleSceneEndFrame` = the end of phase 0's hold (`phases[0].startFrame +
  phases[0].moveFrames + phases[0].holdFrames`). Feed that into `resolveScene`. Replace the current
  `TitleCard` fade-in (it renders only during beatIndex 0 and fades in) with `titleOpacity` from
  `resolveScene` (1 from frame 0). Pass `furnitureOpacity` from `resolveScene` to `MapFrame` — so the
  furniture is hidden during the title beat and crossfades in at the title→establish transition (today
  it is always on). The existing beat/camera machinery is otherwise unchanged.

## C. Callout-XOR-labels (symbol guided-tour) + KB + conformance

- **`SymbolStory`:** do NOT add the `symbol-labels` layer (the guided-tour callout carries the visited
  city's name + value). Only the circle layer + the per-beat `CountryLabel` callout render. `SymbolReveal`
  KEEPS the `symbol-labels` layer (it has no callout — the baked labels ARE its data encoding). So labels
  and callout never coexist. This is the video analogue of SP1's interactive tooltip-XOR-labels rule.
- **KB:**
  - `knowledge/references/map/formats/video.md` (cross-cutting, global-ish) — a new rule: "every map
    video opens with a full-screen title-card scene from frame 0; the `MapFrame` furniture belongs to the
    map scene, not the title scene; a short crossfade (~0.4 s) joins them." Sourced by name (the
    toolkit's MapFrame convention; Amini et al. 2015 on the establish beat; broadcast/lower-third
    convention that a title card and running furniture are distinct scenes).
  - `video-reveal.md` + `video-storytelling.md` — one line each pointing at the shared title-scene rule
    in `video.md`.
  - `video-storytelling.md` — the callout-XOR-labels rule: "a guided tour shows a city's name+value as a
    callout on the visited feature OR as a baked label, never both (the reveal format uses baked labels;
    the tour uses callouts)."
- **Conformance / harness:**
  - Pure unit test (`tests/video-scene.test.ts`): `resolveScene` — `titleOpacity(0) === 1` &&
    `furnitureOpacity(0) === 0`; mid-hold same; after `titleSceneEnd`, `titleOpacity === 0` &&
    `furnitureOpacity === 1`; both monotonic across the crossfade; never NaN.
  - Render verification (BOTH types, reveal + story): READ frame 0 (title card full, NO furniture), a
    map-scene frame (furniture + map, NO title card), and — for the symbol story — a reveal-beat frame
    (callout present, NO baked label on the visited city). The render is the gate for the visual scene
    separation (opacity choreography is not asserted pixel-wise).

## Testing / verification

- Pure: `video-scene.test.ts` (the `resolveScene` boundary + monotonicity).
- Render (BOTH types × reveal + story, SEQUENTIAL, `--gl=angle --concurrency=1`): produce/render and READ
  stills — frame 0 = title card, no furniture; a mid map-scene frame = furniture + data, no title card;
  the symbol story reveal beat = callout only (no baked label duplication). `bun test` green;
  `audit-story` still passes.

## Task decomposition (for the plan)

1. **`resolveScene` helper + `TITLE_SCENE_FRAMES`/`CROSSFADE_FRAMES`** (`src/video-scene.ts`) +
   `tests/video-scene.test.ts`.
2. **`TitleCard` opacity prop + `MapFrame` `furnitureOpacity` prop** (backward-compatible) — the shared
   presentational plumbing.
3. **Stories adopt the scene model** (`SymbolStory` + `ChoroplethStory`): `resolveScene` from the title
   beat; title card from frame 0; furniture crossfade. Render-verify both.
4. **Reveals adopt the scene model** (`SymbolReveal` + `ChoroplethReveal`): prepend `TITLE_SCENE_FRAMES`,
   shift the reveal ramp, title card + furniture crossfade; bump `*Reveal*` durations in `Root.tsx`.
   Render-verify both.
5. **Callout-XOR-labels** (`SymbolStory` drops `symbol-labels`) + KB (`video.md` title-scene rule,
   `video-storytelling.md` callout-XOR-labels, reveal/storytelling cross-links) + final render-verify.

## Out of scope (deferred)

- **SP3** (route-reveal mode) / **SP4** (scrolly-as-video) — unchanged.
- Pixel-wise opacity assertions (render eyeball + the pure `resolveScene` test are the gate).
- Any change to the produce `static|reveal|story|all` selector, the `cameraMode` dispatch, or the
  default-basemap/no-data-unpainted policy.

## Global constraints (binding)

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion ... --gl=angle
  --concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never
  hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO
  `Co-Authored-By: Claude`.
- **English** throughout.
- **Additive / backward-compatible** — `MapFrame.furnitureOpacity` and the `TitleCard` opacity default to
  the current behavior for any non-video caller; the interactive/static `MapFrame` usage is unchanged.
- **Every change ships its four artifacts** (code + conformance/harness + KB at the right layer + render
  verification on BOTH types).
- **Grounded KB**, sourced by name (MapFrame convention, Amini et al. 2015, broadcast lower-third
  convention), no fabricated URLs.
- **Verify at render on BOTH types (reveal + story), SEQUENTIALLY.**
- **Default basemap**; the SP1 no-data-unpainted policy holds.
