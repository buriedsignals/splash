# Video / motion — per-format discipline (cross-cutting ⟂)

> Sources: Tom Vaillant's production skills `cesium-flyover` and `map-explainer` (the bug-free
> Remotion discipline, operator-signed-off) · WCAG 2.3.3 Animation from Interactions · credited.
> Applies to ANY element rendered to video (chart OR map). Composes with the element's own motion
> grammar (e.g. `chart/types/bar.md` "a bar grows", `line.md` "a line draws").

Video is not "a static chart that moves". It is its own craft: a deterministic timeline, a readable
build, and a clean export. Get the discipline wrong and you get flicker, dropped frames, or a chart
that's unreadable in motion — none of which a passing unit test catches.

## The two-layer harness (the load-bearing pattern)

**Something draws; Remotion drives the timeline and captures the frames.** Neither alone:
- the renderer (D3 for charts, Cesium/MapTiler for maps) produces pixels;
- **Remotion** steps frame-by-frame, and **gates each frame** until the content is fully drawn
  before capturing it.

For a D3 chart this is simple (synchronous SVG, nothing async to wait for). For a WebGL renderer
(maps, terrain) you MUST gate: `delayRender()` → update imperatively → wait for readiness
(`map.once('idle')` / `globe.tilesLoaded`) → `continueRender()`. Render with **`--gl=angle`** and
**`preserveDrawingBuffer: true`**; drive each frame yourself (no default render loop). (Tom,
cesium-flyover & map-explainer.)

## Frame-determinism — the one rule that makes video reproducible

The image at frame N must be a **pure function of N**. No `Date.now()`, no `Math.random()`, no
wall-clock, no animation that depends on real elapsed time. Same frame → same pixels, every render.
This is what lets you validate one still and trust the whole mp4, and what prevents flicker.

- Key motion off **time = frame / fps** (Tom keys everything off seconds), or off a normalized
  master `progress` derived from the frame — both are pure in the frame.
- Verify it: a contract test asserting `static(p=1) ≡ final video frame` and "frame N rendered twice
  is identical" and "no NaN across the whole timeline" (see `chart-native` `reveal-contract.test.ts`).

## Timing & easing (how it should FEEL)

- **Ease, don't lerp.** Draws/reveals use `Easing.inOut(Easing.cubic)` (soft start, soft stop);
  entrances use `Easing.out(Easing.cubic)`. A linear reveal feels mechanical.
- **Constant per-element durations beat slices of the master.** Drive each element's animation by
  *time since its own trigger* (e.g. a border draw is always ~2.5 s), NOT by a fixed slice of the
  global progress — otherwise elements speed up/slow down with the sequence and read inconsistently.
  (Tom, map-explainer: "constant durations matter".) For a chart: a bar's grow or a label's rise
  should take a fixed, readable time, regardless of how many bars precede it.
- **Overshoot for life.** A fill/scale that lands with a slight overshoot then settles
  (`[0, 0.6, 1] → [0, ×1.25, ×1]`) reads as alive, not robotic. Use sparingly on blooms/landings.
- **A leading draw-head.** A line/path reveal led by a bright head (the last few %, brighter + a
  glow), faded out when it arrives, gives the eye something to follow. (Tom, map-explainer.)
- **Sequence, don't dump.** Build the frame in stages — chrome in → data marks in (staggered) →
  labels/annotations last. Each beat earns the next.
- **Pace deliberately, lean slow.** Motion that feels slightly too slow reads as confident; too fast
  reads as nervous and is unreadable. Cesium flyover: a deliberate ~0.5 km/s glide. For a chart:
  give the data mark the bulk of the timeline, hold the complete chart on the final frames.

## Readability in motion (NOT the same as a static chart)

- **First and last frames are stills.** The last frame must be the complete, readable chart (a short
  end-hold). The first can be near-empty (build-from-0) — fine, but know the player shows it as the
  poster (use an autoplay+loop preview, not a paused frame).
- **Validate ONE still before the full mp4.** Render a mid frame, look at it, fix framing/easing
  bugs — THEN render the 180–240 frames. (Tom's discipline; cheap insurance.)
- **Look at extracted frames, never trust "it encoded".** A green render ≠ a correct video; pull
  frames with ffmpeg and look (early/mid/late), or watch the autoplay-loop preview.

## Accessibility (WCAG)

- `prefers-reduced-motion` is a *web/interactive* concern, not the mp4 itself — but if the video is
  embedded with an autoplay loop, honour it (offer a static poster / pause). The mp4 must also work
  muted (no information conveyed by sound alone).
- The motion must not *replace* the static reading: anyone who can't see the animation still gets the
  full chart from the final frame + the alt text (= the insight).

## Export

- `--gl=angle` is mandatory for WebGL renderers (maps); harmless for SVG charts — keep it.
- Bundled ffmpeg encodes; for social, 1:1 (1080×1080) is the safe default. Loop-friendly if the last
  frame rests on the complete chart.
- Duration is the speed knob (`durationInFrames` / fps): longer = slower, smoother (more frames per
  pixel of motion).
