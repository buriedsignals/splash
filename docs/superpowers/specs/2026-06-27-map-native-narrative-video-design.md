# map-native — narrative video (slice 2) — design

**Date:** 2026-06-27
**Status:** approved (brainstorming)
**Scope:** the shared `mapStory` spine (`src/map-story.ts`, pure + unit-tested) and the **narrative
video** that consumes it — a `ChoroplethStory` Remotion composition that replaces the meaningless
global opacity fade with a sequenced, legible reveal. Slice 3 (interactive scrollytelling) reuses the
same spine and is a separate spec.

## Goal

The slice-1 video "tells no story — you can't understand it" (operator feedback). It is a single
global fill-opacity fade: every region appears at once, no order, no emphasis, no words. This slice
gives the choropleth a **narrative grammar**: establish the zone → reveal the extremes in order →
land the takeaway, with on-map callouts and a beat caption — the way a newsroom motion explainer
reads. The grammar is encoded once as a pure `mapStory` and consumed by the video here (slice 2) and
the interactive scrolly later (slice 3), so both narrate the **same** story.

## The shared spine — `mapStory` (built here, reused by slice 3)

A new framework-free module `src/map-story.ts` (no MapTiler, no React import), unit-tested like
`choropleth-geo.ts`. It turns a computed `ChoroplethLayout` + story metadata into an ordered list of
**map states** (beats):

```ts
export interface Beat {
  kind: "establish" | "reveal" | "takeaway";
  camera: [number, number, number, number]; // [w,s,e,n] mainland-framed bbox to fit/fly to
  highlight: string[];                       // region keys popped to full colour
  dim: boolean;                              // non-highlighted regions recede (muted + lower opacity)
  callout: { region: string; text: string } | null; // HTML overlay anchor (name — value)
  copy: string;                              // beat caption (title / "NOR — 99%" / the insight)
}

export interface MapStoryMeta {
  title: string;        // establish-beat copy
  insight: string;      // takeaway-beat copy (the conformance insight title)
  unit: string;         // appended to callout values, e.g. "%"
  valueLabel: (v: number) => string; // formats a region value for a callout (default: round + unit)
}

// Takes the matched features + joinKey too (mirrors computeChoropleth) because per-region
// cameras and names need the geometry. See "Derivation rules" below.
export function deriveMapStory(
  layout: ChoroplethLayout,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
  meta: MapStoryMeta,
): Beat[];
```

### Derivation rules (deterministic, extensible to top-N)

Given `layout.joined` (region key + value|null) and `layout.bounds` (the full mainland frame from
slice 1b):

1. **establish** — `camera = layout.bounds`, `highlight = []`, `dim = false`, `callout = null`,
   `copy = meta.title`.
2. **reveal max** — pick the region with the **highest** value; `camera` = that region's mainland
   bbox (reuse slice-1b's largest-polygon framing on the single feature, padded); `highlight = [key]`;
   `dim = true`; `callout = { region: key, text: "<name> — <valueLabel(value)>" }`;
   `copy = same text`.
3. **reveal min** — same for the region with the **lowest** value.
4. **takeaway** — `camera = layout.bounds`, `highlight = []`, `dim = true`, `callout = null`,
   `copy = meta.insight`.

Edge cases (all unit-tested):
- **Ties** — `max`/`min` pick the first by ascending region-key order (stable, deterministic — no
  `Date`/random, which the Remotion path forbids).
- **One region with data** — emit `establish` + a single `reveal` + `takeaway` (max and min coincide;
  do not emit two identical reveal beats).
- **Region name** — resolved from the feature's `name` property via a key→name map passed in
  (the geo features carry `name`); falls back to the region key when absent.
- Beats always begin with `establish` and end with `takeaway`; `deriveMapStory` never returns `[]`
  (slice-1b's core already throws when zero regions match).

`deriveMapStory` needs region geometry to compute per-region cameras and names, so its signature
takes the matched features too:
`deriveMapStory(layout, features, joinKey, meta) → Beat[]` (mirrors `computeChoropleth`'s shape).
The per-region camera reuses the **same** `mainlandFeature` largest-polygon bbox helper from
`choropleth-geo.ts` (exported for reuse) so a region's overseas territories never blow up its beat
framing — the slice-1b rule, applied per beat.

## Slice 2 — the narrative video

A new Remotion composition `ChoroplethStory` (landscape) + `ChoroplethStorySquare` +
`ChoroplethStoryPortrait`, replacing `ChoroplethReveal/Square/Portrait` as the produced video. It
consumes `Beat[]` from `deriveMapStory` and animates through them on Tom's per-frame harness.

### Timing

Time-based, frame-deterministic (pure function of `frame`):

- Each beat gets a fixed **hold** duration; transitions between beats get a fixed **move** duration.
  Defaults: `establish` hold 2.5s, each `reveal` hold 3s, `takeaway` hold 3s, `move` 1.2s. Total for
  the 4-beat sample ≈ 2.5 + 1.2 + 3 + 1.2 + 3 + 1.2 + 3 ≈ 15.1s (fps 30 → ~453 frames).
- The current frame maps to (a) the active beat and (b) the eased interpolation factor `0→1` of any
  in-progress camera move. Camera = `interpolate(prevBeat.camera → beat.camera)` via an eased
  `flyTo`-equivalent. Because the harness re-derives the map state every frame, the camera is set
  with `map.jumpTo(cameraForFrame(frame))` (deterministic) — NOT an async `flyTo` animation (which is
  wall-clock-driven and would desync from Remotion frames).
- `cameraForFrame` converts a `[w,s,e,n]` bbox to a `{center, zoom}` via the MapTiler
  `cameraForBounds` helper, then interpolates center (lng/lat) and zoom between the two beats' camera
  solutions with an ease (e.g. `easeInOutCubic`). This keeps the move smooth and reproducible.

### Per-frame render (Tom's gate — unchanged mechanism)

```
const h = delayRender(`frame-${frame}`)
map.jumpTo(cameraForFrame(frame))                       // deterministic camera
map.setPaintProperty("choropleth-fill", "fill-opacity", opacityForFrame(frame))  // dim/emphasis
map.once('idle', () => continueRender(h))
map.triggerRepaint()
```

- **Dim / emphasis** — in a `reveal` beat, highlighted regions keep full fill-opacity while
  non-highlighted regions drop to a muted opacity (e.g. 0.25) via a data-driven paint expression
  keyed on `__highlight` (a feature property set per beat from `beat.highlight`). `establish` shows
  all at full; `takeaway` dims all uniformly to recede behind the insight caption.
- **Reveal-from-nothing** — at `frame 0` the map is blank (fill-opacity 0), matching the existing
  audit's blank-at-progress-0 guard; the first beat fades fills in over the establish hold.

### HTML overlay — callouts + caption (Tom's `CountryLabel` pattern)

- **Callout** — for a `reveal` beat, an HTML label positioned each frame via `map.project(centroid)`
  of the highlighted region, showing `beat.callout.text` (`name — value`). Reuses the
  `CountryLabel.tsx` seed (anchor + leader behaviour) already in the engine.
- **Caption** — `beat.copy` rendered as a lower-third / title overlay (the beat's words), so the
  video carries language, not just motion. Styled with the engine tokens; fades with the beat.
- The legend (from slice 1) stays pinned; the title overlay is replaced by the moving beat caption.

### Formats & flags

Landscape (1280×720), square (1080²), portrait (1080×1350), all at the engine's overlay scale.
Rendered `--gl=angle --concurrency=1` (a second worker racing the shared map instance corrupts
frames — already an engine rule).

## produce

`produce.mjs` swaps the three `Choropleth{Reveal,Square,Portrait}` compositions for
`ChoroplethStory{,Square,Portrait}`. Same config-injection path (Remotion `--props` carrying the
choropleth config); `deriveMapStory` runs inside the composition from the injected config. The 5
outputs are unchanged in shape (static PNG + interactive HTML + 3 mp4s); only the video content
becomes narrative.

## Audit — "the video tells a story" gate

The slice-1 audit checks layout + basemap-fit on the interactive build. Add a **story check** on the
video path (a lightweight, deterministic assertion on `deriveMapStory`, not a full render):

- `deriveMapStory` returns ≥ 3 beats for the sample, beginning `establish` and ending `takeaway`.
- The reveal beats carry distinct, non-empty `highlight` sets and non-empty `callout.text`.
- Consecutive beats have **distinct cameras** (the camera actually moves — proving it is not a static
  fade; this is the direct encoding of the "ça raconte rien" complaint).
- `copy` is non-empty for every beat.

These are unit-tested in `tests/map-story.test.ts`. A separate frame-level smoke (extract one frame
mid-reveal and assert the callout text is present in the HTML overlay) extends `snap-proof` style,
reusing the existing single-frame still the produce path already renders.

## Conformance

Extend `checkChoroplethConformance` (or a sibling `checkMapStoryConformance`) so a narrated map must
have: a non-empty `title` and `insight` (already required), and a derivable story (≥ 3 beats). The
WCAG/contrast checks on caption + callout text reuse the existing `relativeLuminance`/`contrastRatio`
helpers (callout/caption text on its overlay background must clear 4.5:1).

## Reused from slices 1 / 1b

`mainlandFeature` (per-beat framing), `ChoroplethLayout` + `computeChoropleth`, the BLUES/DIVERGING
scales, the per-frame `delayRender`/idle harness (`HarnessCheck`/`ChoroplethReveal` mechanism),
`CountryLabel`, the tokens, the `produce` config-injection, the conformance L0 + WCAG helpers, the
real-browser audit harness.

## Testing

| Case | Expectation |
| --- | --- |
| `deriveMapStory` on sample (8 regions) | establish + reveal(max=NOR) + reveal(min=POL) + takeaway; 4 beats; cameras distinct |
| Tie on max/min | first by ascending key (deterministic) |
| One region with data | establish + single reveal + takeaway (no duplicate reveal) |
| Per-beat camera | a region with an overseas territory frames to its mainland (slice-1b rule per beat) |
| Callout text | `name — value` with unit; name resolved from feature `name`, falls back to key |
| Video still (mid-reveal) | callout text present in overlay; non-highlighted regions dimmed; blank at frame 0 |
| Conformance | missing insight, or < 3 derivable beats → flagged |

## Out of scope (this slice)

- Interactive scrollytelling (slice 3 — separate spec, consumes the same `deriveMapStory`).
- Reader-driven **filters** (need multi-dimensional data; a later slice).
- Top-N reveal beats beyond the two extremes (the grammar is extensible — `deriveMapStory` can later
  take a `revealCount`; slice 2 ships the establish/max/min/takeaway grammar).
- Authored per-beat overrides (the `/viznews-revise` editing path; this slice auto-derives only).
- Bearing/pitch camera moves and 3D (the 2D engine fits/centers; flyover is the separate Cesium engine).
