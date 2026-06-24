# Chart Native — architecture reference

Deep detail behind `SKILL.md`: the deterministic reveal math and the Remotion frame-determinism
discipline (Tom's bug-free rules). The runnable code is `../src/chart-geometry.ts`,
`../src/LineChart.tsx`, and `../remotion/src/LineReveal.tsx`.

## 1. The geometry core (D3 = math, framework-free)

`computeChartLayout(data, dims)` builds the scales (`scaleTime`/`scaleLinear` for x, `scaleLinear`
for y, `.nice()`), projects every point to screen px, and pre-computes the **cumulative polyline
length** `cumLength[i]` = sum of segment lengths up to point i. `totalLength` is the last entry.
This array is what makes the reveal a closed-form pure function — no SVG DOM, no `getTotalLength()`.

## 2. The deterministic reveal (the heart)

`revealLine(layout, progress)` returns the SVG path drawn up to `progress ∈ [0,1]`:

```
target = progress * totalLength
walk points: while cumLength[i] <= target, emit point i fully
when target falls inside segment (i-1 → i):
    frac = (target - cumLength[i-1]) / segLen
    emit the interpolated head  a + (b-a)*frac
    stop
```

So the draw-head moves **smoothly within a segment**, not vertex-to-vertex. `revealHead` returns just
that tip (used for the glowing head circle). Both are pure functions of `(layout, progress)`:
identical inputs → identical output, every time. That is the whole basis of reproducible video frames.

Tested in `../tests/chart-geometry.test.ts` (monotonic vertex count, head within bbox, p=0→empty,
p=1→full path, clamping) and `../tests/reveal-contract.test.ts` (static p=1 ≡ video final frame; frame N
reproducible; no NaN across all 180 frames).

## 3. One component, three callers

`LineChart` takes `progress` (default 1) and `interactive` (default false). It is agnostic to who calls it:

- **static**: `mount.tsx` renders `<LineChart progress={1} />`; Playwright screenshots the node.
- **interactive**: same mount with `interactive={true}` (Vite `__INTERACTIVE__` define); the hit-circles
  + HTML tooltip activate. Verified by hovering in a real browser — a static PNG cannot show a hover.
- **video**: the Remotion composition computes `progress` from the frame and passes it down.

The direct label (`Central branch` + value) fades in only over the last 15% of the reveal
(`interpolateLabel`) so it doesn't float over empty space while the line is still drawing.

## 4. Remotion frame-determinism (Tom's discipline)

`LineReveal.tsx`:

```ts
const frame = useCurrentFrame();
const { durationInFrames } = useVideoConfig();
const t = frame / (durationInFrames - 1);            // 0..1, pure function of frame
const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
  easing: Easing.inOut(Easing.cubic),                // Disney ease-in/out (Chang & Ungar)
});
```

Non-negotiables (why the 4 classic invisible bugs don't happen here):

- **No `Date.now` / `Math.random` / wall-clock.** Progress is `f(frame)` only → frame N is reproducible.
- **`HOLD_IN` / `HOLD_OUT`** give readable first/last stills (the last frame == the static PNG exactly).
- **Render `--gl=angle`** — Chromium's GL backend Remotion expects headless.
- **Validate ONE still before the mp4** (`render-video.mjs` renders frame 90 first). A half-reveal still
  catches framing, easing, and draw-head bugs that a green unit test cannot — you must LOOK at it.
- This is a pure SVG/DOM chart (no WebGL canvas), so `preserveDrawingBuffer` and the Cesium headless
  dead-end don't apply; the still-before-mp4 and frame-purity disciplines still do.

## 5. The web-build file:// trap

Vite emits module scripts with `crossorigin`, which the browser refuses to load over `file://` (CORS).
Two fixes used: the **interactive** build inlines everything via `vite-plugin-singlefile` (one HTML file,
no external assets → opens anywhere); the **static** build keeps a separate JS chunk, so its snapshot
script serves `dist/static/` over a throwaway `localhost` http server before screenshotting. Both builds
set `base:"./"` for relative asset URLs.
