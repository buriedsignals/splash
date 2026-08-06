---
name: twin-chart-beat
description: Use to produce a chart beat — one visual with one thing to prove — by WRITING a bespoke component under doctrine, then rendering a still and looking at it. Carries the seed that teaches the anatomy (pure geometry, furniture derived from the ground, direct annotation, one accent), the static discipline, and the render ladder's first rung. SP1 covers the static genre only.
---

# twin-chart-beat — write the chart, render the still, look at it

## Overview

The chart craft skill. It does not hold a chart type and it does not fill a config: it holds the
**doctrine** a chart beat is written under (`references/static-discipline.md`), **one seed** that
demonstrates the wiring (`assets/ChartSeed.tsx`, marked `REPLACE ME. Do not parameterise me.`),
and the **render step** that turns a React element into an SVG and a PNG on disk
(`scripts/render-still.mjs`).

The PNG exists to be looked at. That is the point of the whole skill: the checklist in
`static-discipline.md` applies to pixels, and a beat is not finished because its tests are green.
Rendering the seed on a light ground and a dark ground is what caught this file's own first
defect — a gap note that shouted louder than its subject.

**SP1 scope: the static genre only.** Interactive and video chart beats are later sub-projects.
`renderStill` is the first rung of the render ladder; the rungs above it do not exist yet.

## When to use

- When a chosen candidate in a closed `STORYBOARD.md` has medium `chart` and genre `static`, and
  the beat's `BRIEF.md` has been written. No brief, no code.
- To write a **new** component for this story. Read the seed to learn the shape, then write the
  beat. Do not import the seed, extend it, or add a prop to it.
- To render and re-render a still while working, because every layout decision is settled by
  looking at the render, not by reasoning about the markup.
- **Not** for a Datawrapper chart (that is a different producer), and **not** for a map.

## The one gotcha that will waste your day (read first)

**A hex you can grep is not a colour anybody rendered, and a test that greps for one proves
nothing.** The two colour tests here look like duplicates and are not: `should not render a colour
that was hard-coded` is a blacklist (it only catches the two greys somebody typed last time), while
`should paint only with the ground, its derived furniture and the one accent` collects every hex in
the markup and refuses anything outside the derived set. Only the second one fails when a new
hard-coded colour appears. If you add a colour test, add it in the second shape.

The same trap one level up: contrast is measured against the **real ground**, never against an
assumed white, and the ink pole is chosen by **measuring both poles**, never by a luminance
threshold — `luminance > 0.5` picks white on `#808080`, where black measures 5.32:1 and white
measures 3.95:1. A mid-grey newsroom ground is exactly where the obvious rule is wrong.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/static-discipline.md` | The rules a static beat is written under — one accent, derived furniture, honest baseline, sparse ticks, measured gutters, gaps shown not bridged, no root `<title>` |
| Doctrine | `references/seed-anatomy.md` | What the seed teaches and what it refuses to become |
| Seed | `assets/ChartSeed.tsx` | One beat, written out: `lineGeometry` (pure), `yTickValues` (pure), and the component. Replaced per story |
| Sample | `assets/sample-data/rainfall.json` | Eleven readings, one of them genuinely missing, so the seed has to show how a hole is handled |
| Render | `scripts/render-still.mjs` | `deriveFurniture`, `contrast`, `measureText`, `renderStill` |

`scripts/render-still.mjs` is the twin's one script with dependencies — `react-dom/server` and
`@resvg/resvg-js`, both from the root's own `package.json` — and its header says so.

**Rasteriser: `@resvg/resvg-js`**, decided by running both candidates on the same SVG and looking
at the two PNGs. Both rendered text correctly with this machine's fonts; a headless browser needs a
Chrome that puppeteer could not find on a clean install, and only worked when pointed at the
system `/Applications/Google Chrome.app` — a prerequisite a journalist's laptop may not have, which
the preflight would then have to ask for. resvg installs with the root, renders in milliseconds,
and exposes `getBBox()`, which is what makes a **measured** gutter possible at all.

## How it works (the shape)

1. **The brief names the subject, the accent and the source.** The component is written from it.
2. **Geometry first, and pure.** Data to coordinates, nothing else — no colour, no font, no label.
   That boundary is testable and it is the part worth keeping when the drawing is rewritten.
3. **Furniture derived from the ground.** `deriveFurniture(ground)` gives ink, muted and grid. The
   component names the ground and the accent it was handed, and no other colour.
4. **Gutters measured.** `measureText` lays out the real string in the real font; the right gutter
   is the end label's width, the left gutter the widest tick label's. Never a constant.
5. **`renderStill`** writes `<name>.svg` and `<name>.png` at 2×. It refuses to rasterise at a size
   the element was not drawn at — scaling would keep every measured gutter correct and make every
   font size a lie.
6. **Look at the PNG**, on the ground the newsroom actually uses, and on a dark one. Then apply the
   checklist to what you see.

## Quick start

```js
import { createElement } from "react";
import { renderStill } from "./scripts/render-still.mjs";
import { ChartSeed } from "./assets/ChartSeed.tsx"; // in a real beat: this story's own component
import rainfall from "./assets/sample-data/rainfall.json";

const { svgPath, pngPath } = await renderStill({
  element: createElement(ChartSeed, {
    data: rainfall,
    title: "Rainfall over Annemasse fell by a third",   // the journalist's words
    source: "MeteoSwiss, as of 31 May 2026",            // their credit, their effective date
    alt: "A line falling from 912 mm in 2015 to 604 mm in 2025.",
    ground: "#FFFFFF",                                   // from NEWSROOM.md
    accent: "#0B7A75",                                   // from NEWSROOM.md
    subject: "Annemasse",                                // the subject the journalist named
  }),
  width: 900,
  height: 560,
  outDir: "stories/annemasse-rain/beats/1-rainfall/renders",
  name: "still",
});
// Now open pngPath and look at it.
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The contrast floor muted text must clear against the ground | `4.5` | `deriveFurniture`, `render-still.mjs` |
| How far muted starts from the ground, before escalation | `0.62` (steps of `1/50` up to the ink) | `deriveFurniture` |
| How loud the gridlines are | `0.18` of the way from ground to ink | `deriveFurniture` |
| How closely the still survives being looked at | `2` (raster scale) | `rasterise`, `render-still.mjs` |
| The frame the seed draws in | `900` × `560` | `FRAME`, `ChartSeed.tsx` |
| The margin around everything | `40` (`PAD`) | `ChartSeed.tsx` |
| Title size and line spacing | `26` / `34` | `TITLE`, `ChartSeed.tsx` |
| How many y ticks are read | `3` (floor, middle, top) | `yTickValues`, `ChartSeed.tsx` |
| The air between the end label and the plot | `10` px, on top of a measured gutter of `12` | `ChartSeed.tsx` |
| Readings below which the beat refuses to draw | `2` | `ChartSeed.tsx` |

## Files

- `references/static-discipline.md` — the rules, each one attached to the defect that produced it.
- `references/seed-anatomy.md` — what the seed teaches, and what adding a prop to it would cost.
- `assets/ChartSeed.tsx` — the seed. `lineGeometry` and `yTickValues` are pure and exported.
- `assets/sample-data/rainfall.json` — eleven readings, one missing.
- `scripts/render-still.mjs` — `deriveFurniture`, `contrast`, `measureText`, `renderStill`.
- `test/render-still.test.ts` — `bun:test` coverage: the ink pole on a mid grey, the muted contrast
  floor on six grounds, the gap that breaks the line, the honest zero, the closed palette, the
  measured gutter under a name long enough to break a constant, and the alt text as `<desc>`.
