# map-native — SP2: storytelling video parity + camera-mode abstraction — design

**Date:** 2026-07-01
**Status:** approved (brainstorming)
**Scope:** second sub-project of the "complete the maps recipe" effort. Make the proportional-symbol
storytelling video a REAL beat-driven guided camera tour (today `SymbolStory` is a mislabelled beatless
reveal), and formalize a **camera-mode taxonomy** (`simple` / `guided-tour` / `route-reveal`) that the AI
selects per article. Ships the storytelling KB layer + a camera-modes reference. Each fix ships its four
coupled artifacts (code + conformance/harness + KB at the right layer + render verification on BOTH
types). Additive — composition ids are unchanged; `ChoroplethStory` and the SP1 reveal path are not
rewritten.

SP2 of 4. Order: SP1 simple-reveal ✅ → **SP2 storytelling parity + camera-modes** → SP3 Tom
route-reveal mode → SP4 scrolly-as-video. SP3 plugs `route-reveal` into the dispatch point SP2 lays down.

## Why

`deriveSymbolStory(points, meta) → Beat[]` already exists and emits the same `Beat` shape as
`deriveMapStory` (title → establish → reveal-per-city → takeaway), but `src/components/SymbolStory.tsx`
IGNORES it — it does a beatless radius ramp with a fixed camera, i.e. a simple reveal wearing the
"story" name. SP1 created the correctly-named `SymbolReveal` for that; SP2 now makes `SymbolStory` a
genuine guided camera tour, at parity with `ChoroplethStory`. The frame-deterministic camera engine
(`buildTimeline`, `cameraForFrame`, `CameraSolution`, `easeInOutCubic`) and the overlay components
(`TitleCard`, `CaptionCard`, `CountryLabel`) are all shared-ready — SP2 is mostly wiring plus the
camera-mode abstraction and its KB.

## A. Camera-mode taxonomy + selection

A storytelling video's motion is one of a small taxonomy of **camera modes**:

- **`simple`** — no camera movement; the data animates in place. This IS the `reveal` format (SP1).
- **`guided-tour`** — the camera flies between beats (establish → reveal points of interest → takeaway),
  with callouts. This is SP2.
- **`route-reveal`** — a line/route draws on while territories animate in (Tom's map-explainer
  aesthetic). SP3 (not implemented here; only the dispatch point is laid down).

**Where the mode lives / how the AI picks it:** a `cameraMode` field on the story config/meta, set by
the AI per article (default `"guided-tour"`). The `story` produce format reads it and dispatches on it.
In SP2 only `guided-tour` is implemented; the dispatch is a `switch`/`if` with a single real branch and a
clear extension point for SP3's `route-reveal`. The `reveal` produce format is the `simple` mode
intrinsically — `cameraMode` is a sub-choice WITHIN `story`, NOT a replacement for the SP1 produce
selector (`static|reveal|story|all`), which is unchanged.

**AI-controlled reveal count:** `deriveSymbolStory` gains an optional `maxReveals?: number` (the AI sets
it per article — one hero, top 3, or all if few points), bounded by a safety default cap
(`DEFAULT_MAX_REVEALS = 5`) so the video never runs long. It reveals the top-`maxReveals` cities by
value (descending). Choropleth keeps its existing max+min reveal pair.

## B. SymbolStory rewrite — a real guided tour (mirror ChoroplethStory)

Rewrite `src/components/SymbolStory.tsx` to consume the beat engine, mirroring `ChoroplethStory`:

- `const beats = deriveSymbolStory(points, meta, { maxReveals })` → `Beat[]`.
- `buildTimeline(beats.map(b => b.kind), fps)` → `{ phases, totalFrames }`.
- `cameraForBounds(beat.camera, canvasSize, padding)` per beat → `CameraSolution[]` (precomputed once).
- Per frame: `cameraForFrame(frame, phases, solutions)` → interpolated `{ camera, beatIndex, fillReveal }`
  → `map.jumpTo(camera)` inside the existing `delayRender → jumpTo → idle → continueRender` harness.
- Circles + labels use SP1's symbol layers (circle layer + `symbol-labels`); the circles are established
  during the `establish` beat (radius grows via `fillReveal`), then the camera tours. No dimming of
  non-highlighted symbols (consistent with `ChoroplethStory`'s "stable, no dimming" rule).
- Overlays: reuse `TitleCard` (title beat) and `CaptionCard` (lower-third caption per beat). For the
  per-city callout (name + value + unit, projected to screen at the highlighted city's `lon/lat`): reuse
  `CountryLabel` if it generalizes to an arbitrary `lon/lat` anchor; otherwise add a thin
  `src/components/SymbolCallout.tsx` beside it. The callout value MUST carry `config.valueUnit` (the SP1
  label-unit rule).
- Basemap stays the DEFAULT MapTiler basemap (symbol already does this; no water recolour) — consistent
  with the SP1 basemap policy.

**Duration:** the three `SymbolStory*` compositions in `remotion/src/Root.tsx` change
`durationInFrames` from the hard-coded `SYMBOL_FRAMES = 150` to a computed `SYMBOL_STORY_FRAMES`
(`buildTimeline(deriveSymbolStory(sampleSymbol, sampleMeta).map(b => b.kind), 30).totalFrames`), exactly
as `ChoroplethStory` derives `STORY_FRAMES`. Composition ids are unchanged (`SymbolStory`,
`SymbolStorySquare`, `SymbolStoryPortrait`).

## C. KB — storytelling layer + camera-modes reference

- **`knowledge/references/map/formats/video-storytelling.md` (NEW):** the storytelling best-practices —
  the beat structure (establish → reveal → takeaway), camera choreography (fly between beats, ease with
  `easeInOutCubic`, a minimum move duration so moves read as deliberate), callouts (name + value + unit,
  anchored on the feature), no dimming, and WHEN a guided tour beats a simple reveal (a spatial story
  that "walks the reader somewhere" vs "here is the distribution"). Sourced by name (FT Visual
  Vocabulary; Amini et al. 2015 on data-video beats — already cited in `video.md`; NN/g). References
  `video.md` for the cross-cutting video discipline; does not duplicate it.
- **`knowledge/references/map/camera-modes.md` (NEW, global map layer):** the taxonomy
  (`simple` / `guided-tour` / `route-reveal`) and the decision framework the AI uses to pick one per
  article — what each mode is for, its motion, and when it is the right editorial choice. `video-reveal.md`
  and `video-storytelling.md` both point to it. `route-reveal` is listed as SP3 (documented as the target,
  marked not-yet-implemented).

## D. Conformance + harness

- **Extend `scripts/audit-story.mjs`** (the existing render-free narrative gate — asserts beats open on
  `title`/`establish`, close on `takeaway`, every `reveal` carries a `highlight` + callout text, ≥2
  distinct cameras, and copy on the title + reveal beats) to run on the SYMBOL story
  (`deriveSymbolStory`) in addition to the choropleth story. Same assertions; a regression in either
  blocks.
- **Pure unit test** (`tests/symbol-story.test.ts`): `deriveSymbolStory` honours `maxReveals` — with
  `maxReveals = 3` it emits exactly 3 `reveal` beats (the top-3 by value, descending); with no cap it
  emits at most `DEFAULT_MAX_REVEALS`; each `reveal` beat carries a callout whose value includes the
  unit; the sequence still opens `title`/`establish` and closes `takeaway`.

## Testing / verification

- Pure: the `deriveSymbolStory` `maxReveals` unit test + the extended `audit-story` gate (render-free,
  both types).
- Render (BOTH types, SEQUENTIAL, `--gl=angle --concurrency=1`): produce the `story` video for symbol
  (all 3 sizes) and READ the mid-still of each — the camera is FRAMED on a city (not the whole extent),
  a callout shows `name value unit`, the title/takeaway cards render, circles are established. Render one
  choropleth `story` size to confirm no regression (it still tours max/min with country callouts, default
  basemap, no-data unpainted). `bun test` green.

## Task decomposition (for the plan)

1. **`deriveSymbolStory` reveal-count** — add `maxReveals?` + `DEFAULT_MAX_REVEALS` + the top-N selection;
   `tests/symbol-story.test.ts` for the cap + callout-unit + open/close beats.
2. **SymbolStory guided-tour rewrite** — consume beats + `buildTimeline`/`cameraForFrame` + per-beat
   `cameraForBounds` + `jumpTo`; overlays (`TitleCard`/`CaptionCard` + city callout, reusing
   `CountryLabel` or a new `SymbolCallout`); circles established via `fillReveal`; default basemap.
3. **Camera-mode field + dispatch** — `cameraMode` on the config/meta (default `guided-tour`); the `story`
   render path dispatches on it with a single real `guided-tour` branch and an explicit SP3 extension
   point; `SymbolStory*` durations switch to the computed `SYMBOL_STORY_FRAMES` in `Root.tsx`.
4. **Extend `audit-story.mjs`** to gate the symbol story too.
5. **KB** — `formats/video-storytelling.md` + `camera-modes.md`, grounded, sourced by name; cross-link
   from `video-reveal.md`.
6. **Render-verify** both story types across sizes (Task-3/2 acceptance): symbol tours cities with
   callouts; choropleth unchanged.

## Out of scope (deferred)

- **SP3** — the `route-reveal` camera mode (Tom's draw-on line + three-phase animate-in). SP2 lays the
  dispatch point only.
- **SP4** — scrolly-as-video.
- Wiring conformance into produce (audit-story stays a separate gate, as today).
- Any change to the SP1 `reveal` path or the produce `static|reveal|story|all` selector.

## Global constraints (binding)

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion ... --gl=angle
  --concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never
  hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO
  an authorship trailer naming an assistant.
- **English** throughout.
- **Additive** — `SymbolStory` internals are rewritten (fixing the misnomer) but its composition ids are
  unchanged; `ChoroplethStory`, the SP1 reveal components, and the produce format selector are untouched.
- **Every fix ships its four artifacts** (code + conformance/harness + KB at the right layer + render
  verification on BOTH types).
- **Grounded KB**, sourced by name (FT Visual Vocabulary, Amini et al. 2015, NN/g), no fabricated URLs.
- **Verify at render on BOTH story types, SEQUENTIALLY.**
- **Default basemap** (no water recolour); the SP1 no-data-unpainted / basemap policy holds.
