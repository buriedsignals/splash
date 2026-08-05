# map-native — SP1: simple-reveal video (×3 sizes, both types) — design

**Date:** 2026-06-30
**Status:** approved (brainstorming)
**Scope:** first sub-project of the "complete the maps recipe" effort — add the **simple-reveal video**
format (3 aspect ratios) for BOTH existing map types (choropleth + proportional-symbol), mirroring the
chart-native video recipe exactly. Establishes the produce **type×format matrix** selector (the recipe
skeleton later sub-projects extend) and the per-format KB layer for reveal. Each fix ships its four
coupled artifacts (code + conformance/harness + KB at the right layer + render verification on BOTH
types). Purely **additive** — the existing storytelling-video path is left untouched.

This is SP1 of 4. Order: **SP1 simple-reveal → SP2 storytelling parity + camera-modes → SP3 Tom
route-reveal mode → SP4 scrolly-as-video.** Each sub-project gets its own spec → plan → implementation
and merges independently.

## Why

The target maps matrix is, per map type, six format families — static, interactive free-nav,
interactive scrolly, video simple-reveal (×3 sizes), video scrolly (×3), video storytelling (×3).
Today the first three are done; the video column is incomplete and inconsistent:

- **Choropleth simple-reveal** exists as `src/components/ChoroplethReveal.tsx` (an opacity ramp, no
  camera) but is **orphaned** — not registered in `remotion/src/Root.tsx`, never called by
  `scripts/produce.mjs`. Dead code awaiting wiring.
- **Symbol simple-reveal** has no component, yet the registered `SymbolStory` is *functionally* a
  simple reveal already (circles grow radius 0→target over the clip, no camera, no beat loop) — it is
  a misnamed reveal occupying the "storytelling" slot.

SP1 makes the simple-reveal format real and correctly named for both types, mirroring how chart-native
ships video (one component per type, parameterized by `scale` + canvas dimensions, three registered
compositions). It also introduces the `produce` format selector that the remaining video sub-formats
plug into.

## What a "simple reveal" is (the editorial definition)

A simple reveal is the quick social clip: **fixed framing on the full data extent, no camera
movement**; the data animates into place over ~8s / 240 frames @ 30fps on a single eased `progress`
0→1 (Disney `easeInOutCubic`) with short blank holds at both ends. Furniture = the **MapFrame shell
only** (title overlay top, source bottom) — NO title card, NO lower-third captions, NO callouts.
Visually it is the static render, animated. (This mirrors chart-native's `<Type>Reveal`, which uses
`ChartFrame` with no story cards.)

Per type:
- **Choropleth:** region fill opacity ramps 0→1 (regions bloom in). Camera is a fixed `fitBounds` on
  the full clamped extent, identical on every frame.
- **Symbol:** circle radius grows 0→target (eased), labels fade 0→1. Camera fixed on the full extent.

## A. Components (additive — do not touch the storytelling path)

- **Choropleth:** wire the existing `src/components/ChoroplethReveal.tsx` into the engine. Verify it
  matches the editorial definition (fixed camera, opacity ramp, MapFrame furniture, no cards); adjust
  only as needed to conform. Register three compositions.
- **Symbol:** create `src/components/SymbolReveal.tsx` — circles grow radius 0→target on eased
  `progress`, labels fade in, fixed full-extent camera, MapFrame furniture. (Its reveal logic mirrors
  what the current mislabeled `SymbolStory` already does; SymbolReveal is the correctly-named home.)
  Register three compositions.
- **Multi-aspect:** ONE component per type, parameterized by `scale` + canvas dimensions, exactly like
  charts. Three registered `<Composition>` entries per type in `remotion/src/Root.tsx`:
  `{Choropleth,Symbol}Reveal{Landscape,Square,Portrait}` — landscape 1280×720 (`scale` 1), square
  1080×1080 and portrait 1080×1350 (`scale` ≈ 1.7, the established map video scale). `resolveMapFrame`
  already scales typography by `clamp(min(w,h)/720, 0.85, 1.6)`; the component threads `scale` through
  MapFrame as the existing story compositions do.
- **Naming-cleanup boundary:** SP1 leaves the existing `*Story` registrations and `SymbolStory`
  misnomer **intact**. SP2 corrects the symbol-story misnomer by giving symbol a real camera tour.
  SP1 is strictly additive so nothing currently produced breaks.

## B. Produce — the type×format matrix selector

`scripts/produce.mjs` gains an explicit positional **format** argument (it currently takes
`<config> <outDir> [all|static]` and dispatches video on `config.type`):

```
produce.mjs <config> <outDir> <format>
  format ∈ { static | reveal | story | all }
```

- `static` — static.png + interactive.png proofs (current `static` behavior; unchanged — it already
  emits BOTH the static and interactive proofs, so no separate `interactive` format is added in SP1).
- `reveal` (NEW) — the three simple-reveal videos (landscape/square/portrait) for the config's type.
- `story` — the three storytelling videos (today's `all` video portion; unchanged behavior, now named).
- `all` — everything, **reveal included** (natural extension; produce is an internal tool, callers are
  ours — the broadened `all` is acceptable and documented).

Remaining video sub-formats (scrolly-video in SP4) plug into this SAME selector later; SP1 establishes
the selector, it does not rewrite the whole pipeline.

**Output JSON contract — nested by sub-format** to avoid key collision between reveal and story videos:

```json
{ "static": "...", "interactive": "...",
  "reveal": { "landscape": "...", "square": "...", "portrait": "..." },
  "story":  { "landscape": "...", "square": "...", "portrait": "..." } }
```

(Keys present only for the formats actually produced by the chosen `format`.) This is a change to the
internal produce JSON shape; update the snap/proof scripts and any caller that reads it.

**Config injection:** unchanged from the existing mechanism — Vite `__CONFIG__` for web builds,
Remotion `--props` (`{ config: ... }`) for video builds.

## C. KB layer (grounded, sourced by name)

- **`knowledge/references/map/formats/video.md` (exists — keep as the cross-cutting video discipline):**
  frame-determinism (pure function of frame, `delayRender → idle → continueRender`), `--gl=angle`,
  still-before-mp4, the 3 aspect ratios + furniture-per-ratio. This is the global-ish video layer.
- **`knowledge/references/map/formats/video-reveal.md` (NEW — reveal-specific):** the simple-reveal
  best practices — fixed framing / **zero camera movement**, data animates in place, blank-start, ~8s
  single eased progress, MapFrame furniture only (no cards), and *when* a simple reveal is the right
  editorial choice versus a storytelling tour. Sourced by name (FT Visual Vocabulary, Datawrapper
  Academy, and the Remotion frame-determinism discipline). No fabricated URLs.

## D. Conformance + harness (test-only, mirroring the rest of map-native)

- **`checkRevealConformance`** (in `src/conformance.ts`): asserts a reveal composition has **no camera
  movement** (the resolved camera is identical across frames — a fixed full-extent fit), full-extent
  framing, and MapFrame furniture present. Test-only (not wired into produce, consistent with the
  existing conformance debt).
- **Reveal contract** (`tests/reveal-contract.test.ts`, mirroring chart-native's contract): the reveal
  is a **pure function of frame** (frame N reproducible, no NaN across all frames); **blank-start** =
  no *data* is encoded at `progress=0` (choropleth fill opacity 0 / symbol radius 0 — the basemap may
  still show; "no data ink", not a black screen); and `progress=1` equals the static render's data
  state.
- **Pure unit tests:** the reveal ramp is monotonic — symbol `revealRadius(progress, target)` rises
  0→target, choropleth fill opacity 0→1, both empty at `progress=0`, full at `progress=1`.

## Testing / verification

- Pure: the ramp unit tests + the reveal-contract test (determinism, blank-start, p=1≡static).
- Render (BOTH types, all 3 sizes, SEQUENTIAL — Remotion `--concurrency=1`, shared dist): run
  `produce.mjs <config> <outDir> reveal` for choropleth then symbol; READ the frame-0 / mid / final
  still of each of the 3 mp4s per type and confirm: zero camera movement (extent identical across
  stills), data animates in (blank data at frame 0 → full at final), and the MapFrame furniture is
  correct for each ratio (title not clipped, source present). `bun test` green.

## Task decomposition (for the plan)

1. **Symbol reveal component + 3 compositions** — `SymbolReveal.tsx` (radius ramp, fixed camera,
   MapFrame) + register Landscape/Square/Portrait in `Root.tsx` + the ramp pure unit test.
2. **Wire choropleth reveal + 3 compositions** — register `ChoroplethReveal` (adjust to the editorial
   definition if needed) Landscape/Square/Portrait in `Root.tsx` + its ramp unit test.
3. **Produce format selector + nested JSON** — add the `format` arg (`static|interactive|reveal|story|
   all`), the `reveal` render path (3 sizes per type), the nested output JSON, and update the snap/
   proof scripts that read produce output.
4. **KB `video-reveal.md`** — the reveal-specific best-practice doc, grounded, sourced by name.
5. **Conformance + reveal-contract** — `checkRevealConformance` + `tests/reveal-contract.test.ts` +
   render-verify both types at all 3 sizes (frame 0/mid/final stills eyeballed).

(Each task verifies BOTH types where applicable; a regression in either blocks.)

## Out of scope (deferred)

- **SP2** — real symbol storytelling camera tour + camera-mode abstraction (fixes the SymbolStory
  misnomer).
- **SP3** — Tom's route-reveal / draw-on storytelling mode.
- **SP4** — scrolly-as-video.
- The exhaustive sweep of all prior feedback into the shared layer + a full produce-pipeline rewrite
  (SP1 establishes the format selector; it does not rewrite the pipeline).
- Wiring conformance into produce (test-only remains, consistent with existing debt).

## Global constraints (binding)

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion` with `--gl=angle`
  `--concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never
  hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO
  an authorship trailer naming an assistant.
- **English** throughout.
- **Every format ships its four artifacts** (code + conformance/harness + KB at the right layer +
  render verification on BOTH types).
- **Grounded KB**, sourced by name (FT Visual Vocabulary, Datawrapper Academy, Remotion determinism
  discipline), no fabricated URLs.
- **Verify at render on BOTH types, all 3 sizes, SEQUENTIALLY** (Remotion concurrency 1; shared dist).
- **Additive** — the existing storytelling-video path and the `SymbolStory` misnomer are untouched in
  SP1; SP2 corrects the misnomer.
