---
name: chart-native
description: Use when you need a native (non-Datawrapper) chart that ships as ALL THREE formats from ONE component — a static PNG, a self-contained interactive HTML (hover + keyboard focus, responsive), and a Remotion mp4 motion build. The native chart engine; currently a LINE chart (change over time) and a BAR/column chart (magnitude & ranking). The premium path for stories that want a motion build or rich interactivity. Keywords line chart, bar chart, column, ranking, magnitude, time series, trend, reveal, animation, remotion, video, interactive, tooltip, responsive, d3, react, native chart.
---

# Chart Native — the native chart engine (one component per type → three formats)

> **Types so far:** `line` (change over time, `LineChart.tsx`), `bar` (magnitude & ranking,
> `BarChart.tsx`) and `scatter`/bubble (correlation, `ScatterChart.tsx`). Each is one React+D3
> component driven by a single `progress`, yielding static + interactive + video. They share the pure
> helpers (easings, `stagger`, `formatNumber`) and the conformance guard; the per-type knowledge is in
> `knowledge/references/chart/types/{line,bar,scatter}.md` and the per-format discipline in
> `knowledge/references/formats/{video,interactive}.md`. Build a specific chart by setting
> `CHART=line|bar|scatter` (web) or the `LineReveal`/`BarReveal`/`ScatterReveal` composition (video).
>
> **Shared layer** — `src/core/`: `math.ts` (formatNumber, clamp01, easings, stagger — decouples the
> geometry files), `tokens.ts` (Okabe-Ito + type scale), `conformance.ts` (the global L0 guard + WCAG
> math; per-type checks compose on top), `InteractiveChart.tsx` (the one ResizeObserver + rAF +
> reduced-motion wrapper, `render(width, progress)` — line/bar are thin bindings over it),
> `ChartFrame.tsx` (the title/subtitle/source shell), `format.ts` (`resolveFrame` — scales
> type/margins + centres the plot for square/portrait video), `labels.ts` (`placeLabels` — the
> collision-aware, in-bounds label placement, shared by every type).

## The recipe — adding a chart type (always these steps)

For each new FT type, in order:
1. **KB first** — write/extend `knowledge/references/chart/types/<type>.md` (sourced: FT vocab +
   data-to-viz) and reuse the format disciplines in `formats/`.
2. **Pure geometry** — `<type>-geometry.ts` + unit tests.
3. **Component** — `<Type>Chart.tsx` driven by one `progress`; wrap the SVG in `ChartFrame`; thread
   `scale` via `resolveFrame`; an `Interactive<Type>Chart` thin binding over `InteractiveChart`.
4. **Conformance rule** — a `check<Type>Conformance` composing on `checkGlobalConformance`.
5. **Classify global vs type-specific (do this EVERY time, in addition to the rest).** For each
   concern ask: *is this an invariant true for all charts, or specific to this type?*
   - **Global invariant** (label in-bounds, no overlap, contrast, palette, title=insight, source) →
     **reuse** the shared mechanism (`placeLabels`, `conformance`, `ChartFrame`, `resolveFrame`) and
     **enforce** it with a test (e.g. `tests/labels.test.ts`). Never re-solve a global invariant
     inside one component.
   - **Type-specific** (the geometry, the motion gesture, *where* labels naturally go, type data
     rules) → lives in the type module.
   If you find yourself re-coding a global invariant per type (as the label-overflow guard was), stop
   and lift it into `core/` + a guard.
6. **Pass the layout audit, then look** — the AUTOMATED gate comes first: add the type to
   `scripts/audit-cases.mjs` (its sample + ≥1 stress dataset: long labels, big/tiny/equal values,
   many/few categories) and run `bun run audit`. It renders every type × dataset × 6 viewports in a
   real browser and asserts NO two text labels overlap and ALL stay in bounds, nothing is drawn at
   progress 0, AND the interaction convention holds (focusing a data element opens a tooltip; the
   legend never does) — so correctness is proven for arbitrary newsroom data, not just the sample
   your eye happened to check. The audit MUST be green. Looking at static/interactive/video is the second gate (motion/reveal/colour), not the
   first. The eye missed real collisions on three shipped samples (histogram, waterfall, marimekko)
   that the audit caught — never rely on the eye alone again.
   - When a label sits in a fixed gutter/band, use `core/text` `truncate()` so it can never overflow.
   - When labels crowd at narrow widths, thin/stagger/rotate them (see heatmap, marimekko, pyramid).
   - Reveal grammar: nothing is drawn at progress 0; marks fade in from nothing and land at the right
     moment (the head/dots appear and disappear with the draw, not before or after). The audit
     ENFORCES this — it rasterises the plot at progress 0 (honouring clip/opacity/size) and requires
     it to be ~blank.

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
(`10.4k`), source cited (name + url, linked in the interactive build), `aria-label` = the insight. It is
**enforced**, not just hand-baked: `src/conformance.ts` (`checkConformance`) is the native equivalent of
dw-chart's `validateChartSpec` — `tests/conformance.test.ts` runs it on the shipped config + tokens
(Okabe-Ito membership, real WCAG contrast ≥ 4.5:1, insight-shaped title, source name+url, direct label).
Every new native chart must pass it. Interactive a11y: data points are keyboard-focusable
(`tabindex`, `role`, per-point `aria-label`) and show the tooltip on focus, not just hover. The
tooltip anchors on the DATA ELEMENT under cursor/focus (bar, dot, slice, cell, vertex) and shows
THAT element's value; a LEGEND hover only brings a series forward (dims the others) — it never opens
a tooltip. See `knowledge/references/formats/interactive.md`.

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
| Slower / faster reveal (video) | `durationInFrames` (240 = 8 s @30fps) | `remotion/src/Root.tsx` |
| Slower / faster reveal (interactive) | `durationMs` (2000) | `src/InteractiveLineChart.tsx` |
| Blank hold before the build / hold on the complete chart at the end | `HOLD_IN` (0.02) / `HOLD_OUT` (0.1) | `remotion/src/LineReveal.tsx` |
| Master timeline | LINEAR (each phase eases itself in `LineChart`) | `LineReveal.tsx` + `InteractiveLineChart.tsx` |
| Line colour | `COLORS.line` (`#0072B2`) | `src/tokens.ts` |
| Motion-build timing (axes wipe / line / label) | `stagger(...)` gridlines, `baseW` (p/0.18), line `easeInOutCubic` over [0.30, 0.95], x-labels swept by `head.x`, `labelOpacity` (0.92→1) | `LineChart.tsx` + `chart-geometry.ts` (`stagger`, `ease*`) |
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
- `output-proof/` — the real artifacts: `static.png`, `interactive.html` + `interactive-hover.png`, `responsive-{360,768,1100}.png` (re-layout proof) + `reveal-1-chrome.png` / `reveal-2-line.png` (motion build: gridlines wipe in staggered, the line draws and sweeps the x-labels in), `line-reveal.mp4` + 4 extracted frames + the validated still.
- `references/architecture.md` — reveal math + Remotion frame-determinism discipline.
