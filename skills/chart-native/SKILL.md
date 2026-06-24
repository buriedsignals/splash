---
name: chart-native
description: Use when you need a native (non-Datawrapper) line chart that ships as ALL THREE formats from ONE component — a static PNG, a self-contained interactive HTML (hover tooltip), and a Remotion mp4 line-reveal. The premium path for change-over-time stories that want a motion build or rich interactivity. Keywords line chart, time series, trend, reveal, animation, remotion, video, interactive, tooltip, d3, react, native chart.
---

# Chart Native — one component, three formats

## Overview

**D3 does the math; React renders the DOM; a single `progress` value drives the animation.** One
framework-free geometry core (`chart-geometry.ts`) computes scales, points and a deterministic
line-reveal. One React component (`LineChart.tsx`) renders that geometry, parameterised only by a
`progress` (0→1) prop. From that one component three formats derive: a **static** PNG (render at
progress=1, screenshot), a self-contained **interactive** HTML (hover tooltip), and a **video** mp4
(a Remotion composition drives `progress` per frame — the line draws on, Disney-eased). Proven on a
generic small-newsroom time series; all three artifacts in `output-proof/`.

This is the native premium path. Datawrapper (`dw-chart`) stays the no-code fallback — do not touch it.

## When to use

- A change-over-time line chart where the story wants a **motion reveal** (video) or **rich hover**, not just a static image.
- You want one owned artifact per format (PNG / HTML / mp4) the newsroom keeps — no SaaS dependency.
- **Not** for: standard static charts with no motion/interaction need (→ `dw-chart`); maps (→ `map-dw`); part-to-whole, scatter, bars (this is a line chart only — extend the same pattern for others).

## The one gotcha that will waste your day (read first)

The animation MUST be a **pure function of `frame`** — never `Date.now()`, `Math.random()`, or a
wall-clock. The reveal is computed analytically in the geometry core (cumulative polyline length →
interpolate the draw-head), so frame N always produces the identical image and the mp4 is reproducible.
Two more plumbing musts for the video: render with **`--gl=angle`** and **validate ONE still frame
before the full mp4** (a half-reveal still catches framing/easing bugs the tests can't). The static and
interactive web builds need relative asset paths (`base:"./"`); the static page is served over a tiny
local http server for the screenshot because module scripts get `crossorigin` and won't load over
`file://` — the interactive single-file build inlines everything so it has no such constraint.

## Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Geometry | **D3 in `src/chart-geometry.ts`** — framework-free | Scales/points/reveal are pure math, unit-tested with `bun:test`, reused by every format. No React coupling. |
| Render | **React `src/LineChart.tsx`** (one component) | Remotion is React-only (Svelte does not work with Remotion). `progress` prop is the single animation input. |
| Static | **Vite build + Playwright** (`scripts/snap-static.mjs`) | Render at progress=1, screenshot the chart node → PNG. |
| Interactive | **Vite + `vite-plugin-singlefile`** (`INTERACTIVE=1`) | One embeddable HTML file. Wrapped in `InteractiveLineChart` (browser-only): responsive re-layout (ResizeObserver) + an intro reveal (rAF, same easing as the video) + hover tooltip. Verified by driving the browser at several widths, not a static PNG. |
| Video | **Remotion** (`remotion/`) wrapping the SAME component | `useCurrentFrame` → eased `progress` → `LineChart`. `npx remotion render --gl=angle`. |

Design conformance (`knowledge/references/design-conformance.md`) is baked into the component: insight
title (sentence case), Okabe-Ito `#0072B2` single colour, direct label (no legend), abbreviated numbers
(`10.4k`), source cited, `aria-label` = the insight.

## How it works (the shape)

1. **Geometry** — `computeChartLayout(data, dims)` → screen points + cumulative polyline length.
   `revealLine(layout, progress)` returns the SVG path drawn up to `progress`, interpolating within the
   final segment so the draw-head moves smoothly. Pure, deterministic, framework-free.
2. **Component** — `LineChart` renders axes/grid/line/direct-label from the layout. At `progress<1` it
   shows a glowing draw-head; the direct label fades in over the last 15% so it never floats over empty
   space. `interactive` prop adds invisible hit-circles + an HTML tooltip.
3. **Static** — `scripts/build-all.mjs` (plain Vite build) → `scripts/snap-static.mjs` screenshots it.
4. **Interactive** — `INTERACTIVE=1` Vite build (single file) → `scripts/snap-interactive.mjs` loads it,
   hovers a point, asserts the tooltip, screenshots.
5. **Video** — `remotion/src/LineReveal.tsx` maps `frame/(N-1)` → `Easing.inOut(Easing.cubic)` →
   `progress` → `LineChart`. `scripts/render-video.mjs` renders a still (frame 90) first, then the mp4.

Full reveal math + the Remotion frame-determinism rules → `references/architecture.md`.

## Quick start

```bash
cd skills/chart-native
bun install
# all three from the one sample dataset:
node scripts/build-all.mjs                                   # web bundles
node scripts/snap-static.mjs        /tmp/native-static.png   # static PNG
node scripts/snap-interactive.mjs   /tmp/native-interactive.png  # hover proof
node scripts/render-video.mjs /tmp/native-still.png /tmp/native-line-reveal.mp4  # still THEN mp4
bun test                                                     # geometry + reveal contract
```

Swap `assets/sample-data/series.json` for your own (insight `title`, `source`, `unit`, `directLabel`,
`xType`, and `points` as `{date,value}` rows).

## Tuning knobs (each is one number)

| Want | Knob | Where |
| --- | --- | --- |
| Slower / faster reveal | `durationInFrames` (180 = 6 s @30fps) | `remotion/src/Root.tsx` |
| Hold before the line starts | `HOLD_IN` (0.08) | `remotion/src/LineReveal.tsx` |
| Hold on the full chart at the end | `HOLD_OUT` (0.12) | `remotion/src/LineReveal.tsx` |
| Easing curve | `Easing.inOut(Easing.cubic)` | `remotion/src/LineReveal.tsx` |
| Line colour | `COLORS.line` (`#0072B2`) | `src/tokens.ts` |
| When the direct label fades in | `0.85` threshold | `LineChart.tsx` `interpolateLabel` |
| Chart size (video/static) | `width`/`height` (840×480) | `Root.tsx` + snapshot scripts |
| When the interactive reveal plays | `ANIMATE_ON` (`"scroll"` \| `"load"` \| `"none"`) | `src/mount.tsx` |
| Interactive reveal duration | `durationMs` (1200) | `src/InteractiveLineChart.tsx` |
| Interactive chart height / min width | `height` (480) / `minWidth` (280) | `src/InteractiveLineChart.tsx` |

## Files

- `src/chart-geometry.ts` — the framework-free geometry core (scales, path, deterministic reveal). Unit-tested.
- `src/LineChart.tsx` — THE one React component, frame-driven by `progress`. `responsive` prop switches between the fixed absolute layout (video/static) and a flow layout with width-aware ticks (interactive); geometry is identical.
- `src/InteractiveLineChart.tsx` — browser-only wrapper: ResizeObserver re-layout + rAF intro reveal (`animateOn`, respects `prefers-reduced-motion`). The ONLY place a wall-clock lives; never imported by the video.
- `src/tokens.ts` — Okabe-Ito palette + type scale.
- `src/mount.tsx` — browser entry for the static + interactive builds.
- `remotion/src/{Root,LineReveal}.tsx` + `remotion/index.ts` — the Remotion composition (video).
- `scripts/{build-all,snap-static,snap-interactive,render-video}.mjs` — the three renderers.
- `scripts/snap-responsive.mjs` — proof harness: screenshots the interactive build at 360/768/1100px (responsive) + an early frame (reveal from 0).
- `assets/sample-data/series.json` — runnable sample (generic small-newsroom time series).
- `tests/{chart-geometry,reveal-contract}.test.ts` — `bun:test` (geometry + the 3-format determinism contract).
- `output-proof/` — the real artifacts: `static.png`, `interactive.html` + `interactive-hover.png`, `responsive-{360,768,1100}.png` (re-layout proof) + `reveal-early.png` (animates from 0), `line-reveal.mp4` + 4 extracted frames + the validated still.
- `references/architecture.md` — reveal math + Remotion frame-determinism discipline.
