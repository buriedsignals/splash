---
name: chart-native
description: Use when you need a native (non-Datawrapper) chart that ships ALL THREE formats from ONE React+D3 component — a static PNG, a self-contained interactive HTML (hover + keyboard focus, responsive), and a Remotion mp4 motion build. The native chart engine — 41 chart types covering the FT Visual Vocabulary. The premium path for stories that want a motion build or rich interactivity. Keywords line, bar, column, grouped/stacked bar, scatter, bubble, pie, area, slope, dumbbell, lollipop, bullet, radar, marimekko, waterfall, histogram, boxplot, beeswarm, dot strip, violin, population pyramid, diverging bar, heatmap, parallel coordinates, treemap, sunburst, waffle, lorenz, candlestick, sankey, chord, arc diagram, streamgraph, gantt, calendar, bump, fan, radial bar, line+column combo, pictogram, isotype, ranking, magnitude, distribution, part-to-whole, flow, time series, trend, reveal, animation, remotion, video, interactive, tooltip, responsive, d3, react, native chart.
---

# Chart Native — the native chart engine (one component per type → three formats)

> **41 types** (one React+D3 component each, `<Type>Chart.tsx`, driven by a single `progress` → static
> + interactive + video), grouped by FT Visual Vocabulary family:
> - **Change over time** — line, slope, fan, candlestick, streamgraph, connected-scatter, combo (line+column)
> - **Magnitude / ranking** — bar, grouped-bar, lollipop, bullet, dumbbell, radar, marimekko, radial-bar, pictogram
> - **Part-to-whole** — pie, stacked-bar, stacked-area, waffle, treemap, sunburst, waterfall
> - **Distribution** — histogram, boxplot, beeswarm, dot-strip, violin, population-pyramid
> - **Deviation** — diverging-bar, diverging-stacked
> - **Correlation / multivariate** — scatter (+bubble), parallel, heatmap
> - **Inequality** — lorenz · **Flow / relationship** — sankey, chord, arc · **Time** — gantt, calendar, bump
>
> Every type shares the pure helpers (easings, `stagger`, `formatNumber`) and the conformance guard; the
> per-type knowledge lives in the component/geometry header comment + its `check<Type>Conformance` rule
> (there is no separate `knowledge/references/chart/types/` directory). The per-format discipline is in
> `knowledge/references/formats/{video,interactive}.md`. Build a specific chart by setting
> `CHART=<type>` (web, e.g. `CHART=violin`) or the `<Type>Reveal` composition (video, e.g. `ViolinReveal`).
> The full type registry is `AUDIT_REGISTRY` in `src/mount.tsx` and the `FILE` map in `scripts/audit-cases.mjs`.
>
> **Shared layer** — `src/core/`: `math.ts` (formatNumber, clamp01, easings, stagger — decouples the
> geometry files), `tokens.ts` (Okabe-Ito + type scale), `conformance.ts` (the global L0 guard + WCAG
> math; per-type checks compose on top), `InteractiveChart.tsx` (the one ResizeObserver + rAF +
> reduced-motion wrapper, `render(width, progress)` — line/bar are thin bindings over it),
> `ChartFrame.tsx` (the title/subtitle/source shell), `format.ts` (`resolveFrame` — scales
> type/margins + centres the plot for square/portrait video), `labels.ts` (`placeLabels` — the
> collision-aware, in-bounds label placement, shared by every type; a candidate marked
> `required: true` — an explicitly-requested highlight — is offset rather than dropped when crowded).

## The recipe — adding a chart type (always these steps)

For each new FT type, in order:
1. **KB first** — capture the type's knowledge (sourced: FT vocab + data-to-viz) as the header comment
   of `<type>-geometry.ts` + the encoding rule it enforces: what the type is for, its non-negotiable
   (e.g. bar/column → baseline-0; scatter/dumbbell → position, not length; pictogram → equal icons), and
   the reveal gesture. Reuse the format disciplines in `formats/{video,interactive}.md`.
2. **Pure geometry** — `<type>-geometry.ts` + unit tests.
3. **Component** — `<Type>Chart.tsx` driven by one `progress`; wrap the SVG in `ChartFrame`; thread
   `scale` via `resolveFrame`; an `Interactive<Type>Chart` thin binding over `InteractiveChart`.
4. **Conformance rule** — a `check<Type>Conformance` composing on `checkGlobalConformance`.
5. **Classify global vs type-specific (do this EVERY time, in addition to the rest).** For each
   concern ask: *is this an invariant true for all charts, or specific to this type?*
   - **Global invariant** (label in-bounds, no overlap, contrast, palette, title=insight, source) →
     **reuse** the shared mechanism (`placeLabels`, `conformance`, `ChartFrame`, `resolveFrame`) and
     **enforce** it with a test (e.g. `tests/labels.test.ts`). Never re-solve a global invariant
     inside one component. Label in-bounds is ALSO render-asserted at produce time on the journalist's
     REAL config (`scripts/snap-label-fit.mjs`, fail-hard on the static + interactive paths): the
     `core/text.ts` fitters only prevent clipping IF a renderer calls them, and a missed call shipped
     the stacked-area right-gutter clip green — the snap catches that class mechanically.
   - **Type-specific** (the geometry, the motion gesture, *where* labels naturally go, type data
     rules) → lives in the type module.
   If you find yourself re-coding a global invariant per type (as the label-overflow guard was), stop
   and lift it into `core/` + a guard.
6. **Pass the layout audit, then look** — the AUTOMATED gate comes first: add the type to
   `scripts/audit-cases.mjs` (its sample + ≥1 stress dataset: long labels, big/tiny/equal values,
   many/few categories) and run `bun run audit`. It renders every type × dataset × 7 viewports
   (responsive 340/520/760/1100, fixed-840, and the square + portrait VIDEO aspects at scale 1.7) in a
   real browser and asserts NO two text labels overlap and ALL stay in bounds, nothing is drawn at
   progress 0 (≤0.12% ink — a stray foot-dot or a mark whose size doesn't start at 0 trips it), AND the
   interaction convention holds (focusing a data element opens a tooltip; the legend never does) — so
   correctness is proven for arbitrary newsroom data AND for the video formats, not just the sample your
   eye happened to check. The audit MUST be green. Looking at static/interactive/video is the second
   gate (motion/reveal/colour), not the first. The eye missed real collisions on several shipped samples
   (histogram, waterfall, marimekko, and the arc/waterfall square-aspect collisions) that the audit
   caught — never rely on the eye alone again.
   - When a label sits in a fixed gutter/band, use `core/text` `truncate()` so it can never overflow.
   - When labels crowd at narrow widths, thin/stagger/rotate them (see heatmap, marimekko, pyramid).
   - A legend BELOW the plot wraps on a phone — reserve its bottom band by row count with
     `core/legend` `legendRowCount(labels, availWidth, charW, rowH)` BEFORE fixing padding, and keep
     the band clear of the source line. (Shared mechanism — don't re-derive it per type.)
   - **Bottom-band invariant (the source footer is reserved FOR you).** In static/video the
     cited source is an absolute band pinned to the bottom of the canvas (`ChartFrame`). A chart's
     `basePad.bottom` sizes only its OWN x-axis furniture, so `resolveFrameWithHeader` grows
     `padding.bottom` by `format.sourceFooterReserve()` — the x-axis TITLE (at `innerHeight + ~44`),
     a bottom legend, and rotated tick feet then float ABOVE the source instead of overprinting it
     (Bug M). This is the symmetric twin of the header reserve on `padding.top`. Do NOT bake source
     clearance into a type's `basePad.bottom` — it would DOUBLE-COUNT the shared reserve (a
     too-tall bottom gap; Issue #7). Every type's `basePad.bottom` now holds furniture ONLY; the
     source band is the reserve's job. The sole exception is a chart that self-manages the whole
     band (`WaterfallChart`, whose rotated-label descent budget derives from its own reservation),
     which opts OUT via the last `resolveFrameWithHeader` arg (`reserveSourceFooter=false`). Locked
     by `tests/footer-fit.test.ts` and the audit's scatter `long-source` case.
   - Reveal grammar: nothing is drawn at progress 0; marks fade in from nothing and land at the right
     moment (the head/dots appear and disappear with the draw, not before or after). The audit
     ENFORCES this — it rasterises the plot at progress 0 (honouring clip/opacity/size) and requires
     it to be ~blank.

## Overview

**D3 does the math; React renders the DOM; a single `progress` value drives the animation.** Every
type is one framework-free geometry core (`<type>-geometry.ts`) computing scales/points + a
deterministic reveal, and one React component (`<Type>Chart.tsx`) parameterised only by a `progress`
(0→1) prop. From that one component three formats derive: a **static** PNG (render at progress=1,
screenshot), a self-contained **interactive** HTML (hover + keyboard focus), and a **video** mp4 (a
Remotion composition drives `progress` per frame, Disney-eased). The `line` type below is the worked
exemplar; the other 40 follow the identical pattern (geometry + component + Interactive binding +
Reveal + conformance check). Per-type artifacts are in `output-proof/<type>/`.

This is the native premium path. Datawrapper (`dw-chart`) stays the no-code fallback — do not touch it.

## When to use

- Any of the 41 FT-vocabulary chart types where the story wants a **motion reveal** (video) or **rich hover/keyboard** interactivity, not just a static image.
- You want one owned artifact per format (PNG / HTML / mp4) the newsroom keeps — no SaaS dependency.
- **Not** for: standard static charts with no motion/interaction need (→ `dw-chart`); maps (→ `map-dw`). A type the engine doesn't have yet → add it with the recipe above.

## The one gotcha that will waste your day (read first)

The animation MUST be a **pure function of `frame`** — never `Date.now()`, `Math.random()`, or a
wall-clock. The reveal is computed analytically in the geometry core (cumulative polyline length →
interpolate the draw-head), so frame N always produces the identical image and the mp4 is reproducible.
Two more plumbing musts for the video: render with **`--gl=angle`** and **validate ONE still frame
before the full mp4** (a half-reveal still catches framing/easing bugs the tests can't). After the mp4,
`produce.mjs` runs **`scripts/snap-video.mjs` fail-hard**: it probes the ACTUAL mp4 (Remotion's bundled
ffprobe/ffmpeg), asserts container sanity (size / dims / registered duration ±1 frame), that the reveal
really animates (2%/50%/98%/final sampled frames: first≠final, midpoint≠both endpoints, none blank), that
the mp4 frame at the review-still's frame index **matches the approved still** within codec tolerance —
so the frame Gate-3 approves is the frame that ships — and that the mp4's **final frame matches a
separately-rendered final still** (`video-<aspect>-final.png`, `--frame=-1`): the end state is the
most-read frame, so "end-state value labels never appear" fails hard instead of shipping (measurements +
thresholds land in `video-verify.json`). The render itself is bounded by a **watchdog** (`src/video-watchdog.ts`, default
15 min, `ATELIER_VIDEO_TIMEOUT_MS` override) that kills a hung Remotion process tree — a clean fail-hard
instead of a burned run. The static and
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
   `progress` → `LineChart`. `scripts/render-video.mjs` renders a mid-reveal still (frame `STILL_FRAME`,
   default 140) and a final-frame still (`--frame=-1`) first, then the mp4 — all bounded by the render
   watchdog (`src/video-watchdog.ts`).

Full reveal math + the Remotion frame-determinism rules → `references/architecture.md`.

## Quick start

```bash
cd skills/chart-native
bun install
# all three from the one sample dataset:
node scripts/build-all.mjs                                   # web bundles
node scripts/snap-static.mjs        /tmp/native-static.png   # static PNG
node scripts/snap-interactive.mjs   /tmp/native-interactive.png  # hover proof
bun scripts/render-video.mjs /tmp/native-still.png /tmp/native-line-reveal.mp4 /tmp/native-final-still.png   # stills THEN mp4 (bun: imports src/video-watchdog.ts)
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
| Render watchdog ceiling | `DEFAULT_VIDEO_TIMEOUT_MS` (900000 = 15 min; env `ATELIER_VIDEO_TIMEOUT_MS`) | `src/video-watchdog.ts` |
| Video snap sensitivity | `REVEAL_MIN_MEAN_DIFF` (0.5) / `PROGRESSION_MIN_MEAN_DIFF` (0.15) / `MIN_LUMA_VARIANCE` (10) / `STILL_MATCH_CHANNEL_TOLERANCE` (40) / `STILL_MATCH_MAX_DIFF_RATIO` (0.01) | `src/core/video-verify.ts` |
| Label-fit slack (render guard) | `LABEL_FIT_TOLERANCE_PX` (4 — measured 3px healthy em-box ascent overhang at the responsive svg top edge + 1px sub-pixel) | `src/core/label-fit.ts` |

## Files

- `src/chart-geometry.ts` — the framework-free geometry core (scales, path, deterministic reveal). Unit-tested.
- `src/LineChart.tsx` — THE one React component, frame-driven by `progress`. `responsive` prop switches between the fixed absolute layout (video/static) and a flow layout with width-aware ticks (interactive); geometry is identical.
- `src/InteractiveLineChart.tsx` — browser-only wrapper: ResizeObserver re-layout + rAF intro reveal (`animateOn`, respects `prefers-reduced-motion`). The ONLY place a wall-clock lives; never imported by the video.
- `src/tokens.ts` — Okabe-Ito palette + type scale.
- `src/mount.tsx` — browser entry for the static + interactive builds.
- `remotion/src/{Root,LineReveal}.tsx` + `remotion/index.ts` — the Remotion composition (video).
- `scripts/{build-all,snap-static,snap-interactive,render-video}.mjs` — the three renderers.
- `scripts/snap-video.mjs` — video snap guard (fail-hard after the mp4 render): container sanity + reveal-animates + mp4-matches-reviewed-still + final-frame-matches-final-still, via the bundled ffmpeg (`scripts/lib/ffbin.mjs`); pure pixel math in `src/core/video-verify.ts`.
- `src/video-watchdog.ts` — bounds every Remotion render/still subprocess (default 15 min, `ATELIER_VIDEO_TIMEOUT_MS`); kills a hung process tree instead of burning the run.
- `scripts/snap-label-fit.mjs` — render-time label-fit guard (fail-hard in `produce.mjs`, static + interactive paths): every rendered text (svg labels — rotated included, the AABB is what must fit — plus the ChartFrame title/subtitle/source) must sit inside the chart card ∩ its svg viewport (svg overflow is hidden by default, so the svg rect IS the clip box) within `LABEL_FIT_TOLERANCE_PX`; ZERO text found = fail (vacuity guard). Pure containment math in `src/core/label-fit.ts` (unit-tested); box measurement in `scripts/lib/collect-text-boxes.mjs`. Out of scope v1: label-vs-label overlap (`bun run audit` covers it at test time), contrast (the contrast snaps own it), video frames + map-native GL canvas text (no built page / no DOM to measure — indirect coverage only).
- `scripts/snap-responsive.mjs` — proof harness: screenshots the interactive build at 360/768/1100px (responsive) + an early frame (reveal from 0).
- `assets/sample-data/series.json` — runnable sample (generic small-newsroom time series).
- `tests/{chart-geometry,reveal-contract}.test.ts` — `bun:test` (geometry + the 3-format determinism contract).
- `output-proof/` — the real artifacts: `static.png`, `interactive.html` + `interactive-hover.png`, `responsive-{360,768,1100}.png` (re-layout proof) + `reveal-1-chrome.png` / `reveal-2-line.png` (motion build: gridlines wipe in staggered, the line draws and sweeps the x-labels in), `line-reveal.mp4` + 4 extracted frames + the validated still.
- `references/architecture.md` — reveal math + Remotion frame-determinism discipline.
