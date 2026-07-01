# map-native — SP3b: route-reveal video (Tom's draw-on) — design

**Date:** 2026-07-01
**Status:** approved (brainstorming)
**Scope:** the VIDEO format of the route type — the `route-reveal` camera mode: the route line draws
itself across the map (electric draw-head) while each crossed territory animates in over three phases
(border draws → fill blooms with overshoot → label rises), a gentle camera push-in, on the AI-selected
basemap. Generalizes the hardcoded pilot `RiverReveal.tsx` (Yarlung/China-India-Bangladesh) into a
config-driven `RouteReveal`, wires the `cameraMode = "route-reveal"` dispatch point SP2 laid down (produce
throws for it today), adds the title-card scene, three aspect ratios, and removes the pilot. Ships the
four coupled artifacts (code + conformance/harness + KB + render verification on 3 sizes × dark and light).

SP3b completes the route type (SP3a: static + interactive; SP3b: video). It is the last of the maps-video
storytelling modes (`simple` = SP1 reveal, `guided-tour` = SP2 story, `route-reveal` = SP3b).

## Why

The route type's signature output is a motion explainer — a line drawing across the map. Tom Vaillant's
`RiverReveal.tsx` proves the aesthetic but is hardcoded to one example (imports `geo/yarlung-flow.json`,
`geo/country-meta.json`, a fixed `ORDER`/`META`/`START`/`END`, `theme/tokens` river colours). SP3a built
the reusable foundation (`route-geo` `computeRoute` → auto-detected, ordered, coloured, anchored
territories + bounds; the `route` config type; `mapStyle` capability; the scene model; the `cameraMode`
dispatch). SP3b reuses all of it to make `RouteReveal` config-driven and plug it into the pipeline.

## A. `computeRouteReveal` — geometry for the draw-on (runtime, extends `route-geo`)

`computeRouteReveal(config, boundaries) → RouteRevealLayout` builds ON `computeRoute` (SP3a) and adds, per
crossed territory:
- **`stop`** — the arc-length fraction (0→1) at which the route FIRST enters the territory. Reuses SP3a's
  `firstInsideAlong` (the entry arc-length) ÷ the route's total length. This is the trigger timing Tom bakes
  as `country-meta.json.stop`, computed here at runtime.
- **`border`** — the territory's boundary as `LineString` segment(s) (turf `polygonToLine`), for the
  border draw-on. (Full boundary in v1; frame-clipping is a later optimisation.)
Returns the SP3a `territories` (`{key,label,color,order,anchor}`) each extended with `{stop, border}`, plus
`route`, `bounds`, and the route's `totalLengthKm`. Framework-free (turf only) → unit-tested headless. This
**replaces** Tom's build-time `prep-geo.mjs` + `country-meta.json` bake — consistent with `computeChoropleth`
/ `deriveMapStory` computing at render.

## B. `RouteReveal.tsx` — the config-driven draw-on (generalize `RiverReveal`)

A Remotion composition, config-driven, reproducing `RiverReveal`'s proven animation with parameterised
inputs:
- **Basemap:** `resolveMapStyle(config.mapStyle)` → `DATAVIZ.DARK`/`.LIGHT` (mapStyle-driven, honouring the
  SP3a capability). Strip basemap symbol layers + inner admin borders (as the pilot does).
- **Electric draw-on — mapStyle-adaptive colours:** a themed colour set with a DARK variant (icy blue
  core `#E8F7FF` + glow `#49C6FF` — Tom's signature) and a LIGHT variant (a deeper blue that reads on a
  light base). The multi-layer head (soft glow → icy core → white-hot leading head with its own glow) and
  the trailing line are kept; the leading head is the last ~3 % of drawn length, fading out at completion.
- **Per territory:** a `trail-<key>` border line that draws on over a constant ~2.5 s (settling to a darker
  shade of the territory colour), then the fill blooms in with the overshoot ramp
  `[0, FILL_OPACITY×1.25, FILL_OPACITY]` over ~1 s, then the label rises in over ~0.7 s (reusing
  `CountryLabel` with the accent rule, at the territory `anchor`). Colours come from `computeRouteReveal`
  (the SP3a palette); the darker border shade is derived programmatically.
- **Camera:** `START`/`END` DERIVED from the route ∪ territories bbox — fit the extent, then a gentle
  push-in (small zoom increase + slight pitch), lerped across the clip. No hardcoded camera.
- **Timing:** the route draws over a window; each territory triggers at `stop × drawWindow` and runs
  border→fill→label. The last territory's animation must complete before the clip ends.
- **Scene model:** opens with the full-screen **title-card scene** (`resolveScene` + `TitleCard`), the
  `MapFrame` furniture theme-aware (dark furniture on a dark base, via SP3a's `dark` prop) crossfading in as
  the draw-on scene begins. So route-reveal = title scene → the draw-on.

## C. Dispatch, duration, three sizes, cleanup, KB

- **Dispatch:** `scripts/produce.mjs` — REMOVE the SP3a route-video throw (`if (isRoute) throw …ships in
  SP3b`); a `route` config's video (`story`/`all`, `cameraMode = "route-reveal"` — the route type's default)
  renders the `RouteReveal*` compositions. The `route-reveal` branch in `storyComps` resolves to
  `RouteReveal` instead of throwing.
- **Duration:** `routeRevealFrames(territoryCount, fps)` — the draw window + per-territory
  border+fill+label (~4.2 s) staggered by `stop`, bounded (min/max), PLUS the prepended `TITLE_SCENE_FRAMES`.
  Set per-composition in `remotion/src/Root.tsx`.
- **Three sizes:** `RouteReveal` / `RouteRevealSquare` / `RouteRevealPortrait` (1280×720 / 1080×1080 /
  1080×1350) — one component parameterised by canvas size (line widths + label sizes scale).
- **Cleanup (the pilot is superseded):** remove `src/components/RiverReveal.tsx`, the `MapExplainer`
  composition in `Root.tsx`, `assets/geo/yarlung-flow.json`, `assets/geo/country-meta.json`, and
  `scripts/prep-geo.mjs`. Remove `src/theme/tokens.ts` ONLY if nothing else imports it after RiverReveal is
  gone (grep first; keep if shared).
- **KB:** `knowledge/references/map/camera-modes.md` — mark `route-reveal` IMPLEMENTED (was "SP3, not yet").
  `knowledge/references/map/types/route.md` — the video section: shipped (remove "SP3b not yet"), describing
  the draw-on + 3-phase + electric head. `knowledge/references/map/formats/video-storytelling.md` — a
  route-reveal choreography note (or confirm camera-modes covers it). Grounded, sourced by name (Tom
  Vaillant's map-explainer discipline; Disney overshoot / ease; Amini et al. 2015), no fabricated URLs.

## Testing / verification

- Pure: `computeRouteReveal` unit test — `stop` values are in `[0,1]`, monotonic in territory order (a
  territory later along the route has a larger `stop`), and each territory has a non-empty `border`.
- Frame-determinism: `RouteReveal` is a pure function of frame (no `Date.now()`/`Math.random()` — same as
  the pilot; the per-frame state is `setData`/`jumpTo` derived from `frame/fps`).
- Render (3 sizes × dark AND light, SEQUENTIAL, `--gl=angle --concurrency=1`): produce the route video for a
  sample route config; READ, per size, the frame-0 still (title-card scene, no furniture over it), a mid-draw
  still (the route line PARTIALLY drawn with the electric leading head visible, at least one territory
  mid-animate — border drawing or fill blooming), and a near-final still (line complete, territories filled +
  labelled). Verify the dark sample uses the icy-blue signature and a `dataviz-light` sample uses the light
  draw-on variant.

## Task decomposition (for the plan)

1. **`computeRouteReveal`** (route-geo extension: `stop` + `border`) + `routeRevealFrames` + `route-geo`/
   route-reveal tests.
2. **`RouteReveal.tsx`** — generalize `RiverReveal`: config-driven inputs (route/territories/stops/borders
   from `computeRouteReveal`), mapStyle-adaptive electric colours, derived camera, the 3-phase animate-in.
   Render-verify the draw-on (mid-draw still).
3. **Scene model + three compositions** — the title-card scene (`resolveScene`/`TitleCard`, theme-aware
   furniture) + register `RouteReveal*` (3 sizes) in `Root.tsx` with `routeRevealFrames` durations.
4. **Dispatch + cleanup** — produce route video → `RouteReveal` (remove the SP3a throw; wire the
   `route-reveal` branch); remove the pilot (`RiverReveal`/`MapExplainer`/`yarlung-flow.json`/
   `country-meta.json`/`prep-geo.mjs`; `theme/tokens.ts` if dead). Render-verify both story kinds route.
5. **KB** (`camera-modes.md` implemented, `types/route.md` video shipped, `video-storytelling.md` note) +
   final render verification (3 sizes × dark and light).

## Out of scope (deferred)

- **SP4** — scrolly-as-video.
- Branching routes / `MultiLineString` / road networks; directional arrows / flow-width (per the SP3a
  route.md limits) — future capabilities.
- Frame-clipping the territory borders (full-boundary draw in v1).

## Global constraints (binding)

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion ... --gl=angle
  --concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never
  hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO
  `Co-Authored-By: Claude`.
- **English** throughout.
- **Additive except the deliberate pilot removal** — `RouteReveal` is new; the SP3a route static/interactive
  + all other types + the produce selector are unchanged; the pilot (`RiverReveal`/`MapExplainer`/its geo +
  `prep-geo.mjs`) is removed as superseded.
- **Every fix ships four artifacts** (code + conformance/harness + KB at the right layer + render verification
  on 3 sizes × dark and light).
- **Grounded KB**, sourced by name (Tom Vaillant's map-explainer; Amini et al. 2015; Disney ease/overshoot),
  no fabricated URLs.
- **mapStyle AI-selected** — the route-reveal honours it (dark and light both verified).
- **Frame-deterministic** (pure function of frame; no `Date.now()`/`Math.random()`).
