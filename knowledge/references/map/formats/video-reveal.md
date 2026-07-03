# Video map — simple reveal sub-format

> Cross-cutting video discipline (frame-determinism, `--gl=angle`, 3 ratios, furniture-per-ratio)
> lives in `video.md`. This doc covers ONLY what is specific to the simple-reveal sub-format.

> For the title-scene rule (every map video opens with a full-screen title card, no furniture
> over it) see `video.md` § Title scene.

## What a simple reveal is

A simple reveal is a **fixed-framing video**: the camera locks on the full data extent from
frame 0 to the last frame, and data animates in place. No panning, no zooming, no camera
movement of any kind.

Use it when the story is "here is the distribution / here is the magnitude" — a single,
readable beat that works as a quick social clip. (FT Visual Vocabulary — magnitude and
distribution encodings are read at-a-glance; the reader needs one stable frame of reference,
not a guided tour. Datawrapper Academy — for chart-like maps, let the data carry the story,
not the camera.)

Do NOT use a simple reveal when the story requires walking the reader from place to place,
calling out individual regions, or following a route. Those are storytelling treatments —
see `video-storytelling.md` and `../camera-modes.md`.

## Zero camera movement — the defining rule

**The bounding extent is identical on every frame.**

`map.setCenter` and `map.setZoom` are called once, before the render loop begins, and never
again. No `flyTo`, no `easeTo`, no `fitBounds` inside the frame function.

If a reviewer can distinguish two frames by camera position, the clip is not a simple reveal.
Ship it to the storytelling pipeline instead.

## Blank-data start / settle-at-end

**Frame 0 carries zero data ink. The last ~10% of frames hold the full data state.**

Timing reference: 8 s / 240 frames at 30 fps.

```
Frames   0 –  24  (~10 %)  blank-in hold — basemap visible, data layer opacity 0
Frames  25 – 215  (~80 %)  single easeInOutCubic ramp (Disney ease-in/ease-out principle;
                            Chang & Ungar 1993 in-out cubic) drives all data properties
Frames 216 – 239  (~10 %)  full-data hold — final frame equals the static render's data state
                            (meets video.md § Ending hold floor of 24 frames / ≈0.8 s)
```

The blank-in hold prevents a jarring first frame in feeds where the poster is frame 0.
The full-data hold ensures the reader can read the completed state before the loop resets.
(Remotion frame-determinism discipline: every value is `f(frame)` — no `Date.now()`, no
`Math.random()`; see `video.md` § Frame-determinism. Chart-native reveal-contract: the last
frame is numerically identical to the static export.)

The easing ramp must be a **single arc** — do not break it into sub-beats. Sub-beats imply
editorial narrative; use the storytelling format for that.

## Furniture — MapFrame shell only

**Title overlay (top) + source line (bottom). Nothing else.**

- Title overlay: baked at render time, top of the frame, inside the safe gutter (≥ 16 px at 1×
  scaled by canvas size; see `video.md` § Furniture — baked and ratio-aware).
- Source line: mandatory, always cited. (Datawrapper Academy — always attribute the data source
  on published maps, including video exports.)
- Title card: the reveal opens on the same full-screen title-card scene as every map video
  (see `video.md` § Title scene). This furniture list describes the MAP scene only — during the
  title scene the furniture is hidden.
- NO lower-third (no subtitle band appearing mid-clip).
- NO callout annotations, NO region highlights, NO route labels.

Those elements belong to storytelling treatments (`video-storytelling.md`), not to a distribution-read clip.
(MapFrame convention: the MapFrame shell provides title + source as the complete furniture
contract for the simple-reveal sub-format.)

## Reveal animation per map type

### Choropleth

Animate `fill-opacity` from `0` to `~0.85` **for data-bearing regions only**.

`0.85` preserves basemap legibility underneath the fill layer; 1.0 occludes roads and labels.
The opacity is a pure function of the frame: `opacity = ease(t) * 0.85` where `t` is the
normalised ramp progress (0 at frame 25, 1 at frame 215).

Only data regions animate. **No-data regions are stable geographic CONTEXT — like the ocean —
and hold a constant opacity from frame 0; they must NOT ramp with the reveal.** Ramping every
feature's opacity makes the entire no-data landmass darken frame-by-frame, which reads as the
ocean/backdrop changing colour (a distraction the reader mistakes for a rendering fault). Drive
opacity with a per-feature expression: `["case", ["==", ["get","__hasData"], false], 0.85,
ease(t) * 0.85]`. (FT Visual Vocabulary — a stable frame of reference; the data, not the
context, carries the reveal.)

Do not animate `fill-color` — stable hue from frame 0 ensures the reader never sees the
choropleth "shift colour" as it fades in (consistent with FT Visual Vocabulary's guidance on
sequential and diverging scales).

### Dot density

Animate dot **opacity** from `0` to `1` on the uniform ramp — all dots fade in simultaneously
at the same rate. The camera is fixed on the full data extent from frame 0; no panning or
zooming. Dot radius is fixed at 2 px (uniform-dot invariant; never value-scaled). Category
legend (multivariate) fades in on the same ramp as the dots.

### Locator

Animate dot/pin marker **opacity** from `0` to `1` on the uniform ramp. All markers grow and
fade in simultaneously at the same rate — no per-marker stagger, no value-based sizing (the
uniform-marker invariant holds). The camera is fixed on the full data extent from frame 0; no
panning or zooming. Category legend (when categorized) fades in on the same ramp as the markers.

### Hex-grid

Animate cell `fill-opacity` from `0` to `~0.85` on the uniform ramp — all populated cells fade
in simultaneously. The camera is fixed on the full data extent from frame 0; no panning or
zooming. The BLUES legend fades in on the same ramp as the cells. Uniform-cell invariant: cell
size is constant (magnitude = colour, never size).

### Cartogram

Animate cell/region `fill-opacity` from `0` to target value on the uniform ramp — all
cells/scaled shapes fade in simultaneously. Camera is fixed on the full data extent from
frame 0. `grid` variant renders on a neutral background via `applyCartogramBasemap`;
`scaled` variant renders over the full MapTiler basemap.

### Proportional symbol

Animate circle `radius` from `0` to the target value computed from the data, and label
`text-opacity` from `0` to `1` on the same ramp.

Labels fade in on the same arc as the circles — they must never be visible before the
symbol is large enough to anchor them. (Datawrapper Academy — label placement for proportional
symbol maps: labels belong to the symbol, not the basemap.)

If a symbol's target radius is below the minimum legible size (< 4 px at 1×), its label is
suppressed entirely — fade-in of an invisible-anchor label creates visual noise.

## Sources (by name)

- **FT Visual Vocabulary** — magnitude/distribution framing; perceptual stability of sequential
  scales; furniture hierarchy
- **Datawrapper Academy** — simple map guidance (data carries the story, not the camera);
  source attribution requirement; proportional symbol label placement
- **Remotion frame-determinism discipline** (Tom Vaillant) — `f(frame)` render contract;
  non-deterministic renders fail frame-hash comparison
- **Disney twelve basic principles of animation** — ease-in / ease-out principle (single arc)
- **Chang & Ungar 1993** — in-out cubic easing for animated transitions
- **MapFrame convention** (this toolkit) — title + source as the complete furniture contract
  for the simple-reveal sub-format
- **Chart-native reveal-contract** (this toolkit) — last frame equals the static render's
  data state

## Enforcement

- `tests/reveal.test.ts` — eased-progress determinism, monotonic non-decrease, midpoint ≈ 0.5
  (guards the cubic in-out shape across all 240 frames).
- `checkRevealConformance` in `src/conformance.ts` — asserts fixed-camera plan, valid clamped
  bounds, title + source furniture present (added SP1 Task 5).
- Render gate `produce.mjs … reveal` — reads frame 0 / mid / final stills: blank-data start,
  full data at end equal to the static render.

---

For camera-driven explainers (tours, callouts), see `video-storytelling.md` (the guided-tour
format). For the full camera-mode taxonomy — including the forthcoming `route-reveal` mode
(Tom's route/line progressive-draw aesthetic, ships SP3) — see `../camera-modes.md`.
