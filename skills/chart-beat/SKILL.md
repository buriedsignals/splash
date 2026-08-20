---
name: chart-beat
description: Use to produce a chart beat — one visual with one thing to prove — by WRITING a bespoke component under doctrine, then rendering a still and looking at it. Carries the seed that teaches the anatomy (pure geometry, furniture derived from the ground, direct annotation, one accent), the static discipline, and the render ladder's first rung. SP1 covers the static format only.
---

# chart-beat — write the chart, render the still, look at it

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

**SP1 scope: the static format only.** Interactive and video chart beats are later sub-projects.
`renderStill` is the first rung of the render ladder; the rungs above it do not exist yet.

## When to use

- When a chosen candidate in a closed `STORYBOARD.md` has medium `chart` and format `static`, and
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
| Doctrine | `references/static-discipline.md` | The rules a static beat is written under — one accent, derived furniture, an honest scale (zero is a rule about bars, not about lines), sparse ticks, measured gutters, gaps shown not bridged, no root `<title>` |
| Doctrine | `references/seed-anatomy.md` | What the seed teaches and what it refuses to become |
| Seed | `assets/ChartSeed.tsx` | One beat, written out: `lineGeometry` (pure), `yTickValues` (pure), and the component. Replaced per story |
| Sample | `assets/sample-data/rainfall.json` | Eleven readings, one of them genuinely missing, so the seed has to show how a hole is handled |
| Preview | `assets/preview.png` | The seed rendered on a light ground at landscape — what this skill produces, without running it |
| Sizes | `scripts/sizes.mjs` | `SIZES` + `sizeFor` — the three export sizes R2 names, carried not imported, walked by `splash/test/size-table-parity.test.ts` |
| Render | `scripts/render-still.mjs` | `deriveFurniture`, `contrast`, `measureText`, `renderStill` |
| Annotation | `scripts/annotation-ink.mjs` | `marksUnder`, `inkThatReadsOver`, `assertAnnotationReadsOverMarks` — an annotation's ink measured against the MARKS it is drawn over, not against the page |

`scripts/render-still.mjs` is the twin's one script with dependencies — `react-dom/server` and
`@resvg/resvg-js`, both from the root's own `package.json` — and its header says so.

The seed itself imports three more from that same `package.json`: `d3-scale`, `d3-array` and
`d3-shape`. They are primitives, not a chart library — a scale, a tick generator and a path
generator, none of which knows a colour, a label or a chart type. Fitting a scale and choosing
ticks by hand is how this skill shipped an axis running -45 to 105 on data spanning -3,4 to 84
(`references/static-discipline.md`). A beat writes its own component, and it writes it on these.

**A beat does not import this file from here.** `render-still.mjs` and `inspect-render.mjs` are the
*mechanism* — nobody rewrites them per story — so `splash`'s root template vendors a physical
copy of both into every fresh Splash root, at `<root>/shared/chart-beat/`, checked in so the
plain `cp -r root-template/` install already carries them (`docs`: `splash/SKILL.md`
Architecture). A beat component, however deep under `stories/<slug>/beats/<n>-<name>/`, imports the
installed copy by the root's own `#shared/*` subpath import, never a path into this or any other
repository — see Quick start below. `splash`'s preflight fails loud, naming the missing file,
if a root's packages resolve but its vendored `shared/` copy does not exist (a gap reproduced by
three independent trial agents). The **seed**
(`assets/ChartSeed.tsx`) is not part of this vendoring: it stays here, read as documentation, never
copied into a root and never imported by a beat — see "How it works" step 1 and
`references/seed-anatomy.md`.

**Rasteriser: `@resvg/resvg-js`**, decided by running both candidates on the same SVG and looking
at the two PNGs. Both rendered text correctly with this machine's fonts; a headless browser needs a
Chrome that puppeteer could not find on a clean install, and only worked when pointed at the
system `/Applications/Google Chrome.app` — a prerequisite a journalist's laptop may not have, which
the preflight would then have to ask for. resvg installs with the root, renders in milliseconds,
and exposes `getBBox()`, which is what makes a **measured** gutter possible at all.

## A dash is drawn in the path's own units

**The rule.** A `stroke-dasharray` in a static frame is a decorative pattern — a reference rule, a
median line, a projection break. It must not also MEASURE the path it is on: no authored
`stroke-dashoffset`, no declared `pathLength`, and no `vector-effect: non-scaling-stroke` under either.

**Why.** `vector-effect: non-scaling-stroke` takes the stroke, and with it the dash pattern, out of
the path's own user units. A pattern that measures the path then repeats against a length the path
does not have, and the line draws as head, hole and tail instead of a rule. It cost a map beat six
hours and five wrong diagnoses before anything measured it, and a static frame shows the same defect
with nothing moving to make it obvious.

**What refuses it.** `scripts/verify-static.mjs` exports `revealDashInScreenSpace`, a byte copy of the
decision `scrolly` earned and `splash/test/guard-copies-parity.test.ts` walks; `test/verify-static.test.ts`
reads every static chart component on disk. Measured 2026-08-19: **18 components (17 beats declaring
`chart / static` plus this skill's seed), 9 dashed marks — `T.REFERENCE_DASH`, `MEDIAN_RULE.dash`,
`T.AVERAGE_DASH`, `"3 3"`, `"2 2"` — and not one `strokeDashoffset` or `vectorEffect` among them.**
A ratchet, not a repair.

## How it works (the shape)

1. **The brief names the subject, the accent and the source.** The component is written from it.
2. **Geometry first, and pure.** Data to coordinates, nothing else — no colour, no font, no label.
   That boundary is testable and it is the part worth keeping when the drawing is rewritten.
3. **Furniture derived from the ground.** `deriveFurniture(ground)` gives ink, muted and grid. The
   component names the ground and the accent it was handed, and no other colour.
4. **Gutters measured.** `measureText` lays out the real string in the real font; the right gutter
   is the end label's width, the left gutter the widest tick label's. Never a constant.
5. **The size is read, never assumed.** `sizeFor(size)` (`scripts/sizes.mjs`) returns the frame and
   the type scale for one of the three export sizes ruling R2 names — landscape, square, portrait —
   and **throws naming all three** when handed anything else, the same way `readPalette` throws
   rather than defaulting. The size is chosen at gate 2c and recorded on the slot. Everything the
   component spaces, not only what it types, is that scale times its `BASE` value.
6. **`renderStill`** writes `<name>.svg` and `<name>.png` at 2×. It refuses to rasterise at a size
   the element was not drawn at — scaling would keep every measured gutter correct and make every
   font size a lie. *(The 2× is on its way out — `references/static-discipline.md`, "the frame IS
   the delivered pixel size", records the measurement that settled it. It retires in the same step
   that moves the seventeen written beats onto `sizeFor`, because removing it while their frames are
   still 900×560 would ship 900px stills. The seed's own preview already renders 1:1.)*
7. **Look at the PNG**, on the ground the newsroom actually uses, on a dark one, **and at the size
   it will actually ship at**. `output-proof/sizes/` is the seed at all three, and producing them is
   what caught a gap note whose `fontSize` stayed at 12 while everything around it grew — nothing
   collided, nothing clipped, and it was obvious the moment the file was opened.

## Quick start

This is what a real beat, written into an installed Splash root, actually imports —
`stories/annemasse-rain/beats/1-rainfall/RainfallLine.tsx`:

```js
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import rainfall from "./data.json";

// The two colours the journalist chose, read back from the `PALETTE.md` that `palette`
// proposed and they answered. Never hex literals here: a beat that names its own colours is a
// beat that ignores the newsroom's charter, however carefully the charter was collected. If no
// `PALETTE.md` exists at or above this beat, this THROWS, names the exact next action — call
// `proposePalette`/`formatProposal`, show the journalist the proposal, record their answer — and
// names what to do when nobody is there to answer right now: record the proposal's own
// recommended option — never inventing a colour, never one that failed the 3:1 floor — with
// `origin` naming its source and the file's own prose saying no journalist answered; a
// proposal with no passing option still ends the turn there. That is `palette-names-its-source`,
// `skills/palette/SKILL.md`.
const { ground, accent } = readPalette(import.meta.dirname, { stopAt: process.cwd() });

// RainfallAnnemasse is THIS beat's own component, written from the seed's shape — not imported
// from it. See "How it works" step 1: read `assets/ChartSeed.tsx`, then write this file fresh.
const { svgPath, pngPath } = await renderStill({
  element: createElement(RainfallAnnemasse, {
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
  outDir: "renders",
  name: "still",
});
// Now open pngPath and look at it.
```

`#shared/chart-beat/render-still.mjs` resolves through the root's own `package.json`
(`"imports": {"#shared/*": "./shared/*"}`) to `<root>/shared/chart-beat/render-still.mjs` —
the same specifier no matter how deep the beat sits, and never a path that reaches outside the
root. Inside *this* repository, `assets/ChartSeed.tsx` still imports `../scripts/render-still.mjs`
by an ordinary relative path — that import is for this skill's own tests
(`test/render-still.test.ts`) and is never what a beat in a Splash root writes.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The contrast floor muted text must clear against the ground | `4.5` | `deriveFurniture`, `render-still.mjs` |
| The floor a dashed rule, leader or other NON-text annotation must clear against every mark it crosses (SC 1.4.11) | `3` (`NON_TEXT_CONTRAST_FLOOR`) | `annotation-ink.mjs` |
| The floor an annotation's TEXT must clear against every mark it sits on (SC 1.4.3) | `4.5` (`TEXT_CONTRAST_FLOOR`), relaxed to `3` (`LARGE_TEXT_CONTRAST_FLOOR`) at `24` px, or `18.66` px bold | `annotation-ink.mjs` |
| How far muted starts from the ground, before escalation | `0.62` (steps of `1/50` up to the ink) | `deriveFurniture` |
| How loud the gridlines are | `0.18` of the way from ground to ink | `deriveFurniture` |
| How closely the still survives being looked at | `2` (raster scale) | `rasterise`, `render-still.mjs` | 
| The three export sizes, and the type/spacing scale each one draws at | `SIZES` (landscape 1920×1080, square 1080×1080, portrait 1080×1920) | `sizes.mjs` |
| The 900×560 tokens a size multiplies — type AND every spacing number | `BASE` (`PAD 40`, `TITLE 26/34`, `X_TICK_DROP 24`, …) | `BASE`, `ChartSeed.tsx` |
| The margin around everything, at typeScale 1 | `40` (`PAD`) | `BASE`, `ChartSeed.tsx` |
| Title size and line spacing, at typeScale 1 | `26` / `34` | `TITLE`, `ChartSeed.tsx` |
| How many y gridlines a static frame asks for (d3 treats it as a hint) | `5` (`Y_TICK_HINT`) | `yTickValues`, `ChartSeed.tsx` |
| How many x ticks `tickStep` derives a round interval from (decade on a 75-year span, 5-year on a 35-year one) | `6` (`X_TICK_HINT`) | `xTickValues`, `ChartSeed.tsx` |
| Decimal places kept in the traced path | `1` (`line.digits`) | `lineGeometry`, `ChartSeed.tsx` |
| The air between the end label and the plot | `10` px, on top of a measured gutter of `12` | `ChartSeed.tsx` |
| Readings below which the beat refuses to draw | `2` | `ChartSeed.tsx` |

## Files

- `references/static-discipline.md` — the rules, each one attached to the defect that produced it.
- `references/types/` — sixteen prose sheets, one per chart type, harvested from the sibling parameterised engine and read before writing that type's beat; see its own `README.md` for what is covered and what is not.
- `references/seed-anatomy.md` — what the seed teaches, and what adding a prop to it would cost.
- `references/svg-xmlns-requirement.md` — the SVG namespace declaration required by the rasteriser; without it, rendering fails with a misleading error about document structure.
- `assets/ChartSeed.tsx` — the seed. `lineGeometry` and `yTickValues` are pure and exported. Read
  here, in this repository, to learn the shape — **not vendored into a Splash root and never
  imported by a beat**; a beat writes its own component from scratch, in this shape.
- `assets/sample-data/rainfall.json` — eleven readings, one missing — the seed's data.
- `assets/preview.png` — the seed rendered on a light ground, so a reader of this skill sees what
  it produces without running anything. Regenerate with `bun scripts/render-preview.mjs` whenever the seed changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — written by the SAME `bun scripts/render-preview.mjs` run that regenerates `assets/preview.png`
  (no `--out`), from the same buffer, never a second render or a second command.
- `output-proof/sizes/` — the same seed at all three export sizes, produced by
  `bun scripts/render-preview.mjs --size <name>` and **opened**. Kept because the three-size claim is
  the one a suite cannot make: the run that produced these is what caught the gap note's bare
  `fontSize={12}` staying at 12 while everything around it grew — a defect that collided with
  nothing, was clipped by nothing, and was visible immediately.
- `scripts/sizes.mjs` — `SIZES` and `sizeFor`. The three export sizes ruling R2 names, carried (not
  imported) by each craft skill that needs them, mirrored at `shared/chart-beat/sizes.mjs`
  because `proof/` beats reach craft helpers through `#shared/*`. Kept in step by
  `splash/test/size-table-parity.test.ts`, which walks the tree rather than taking a list, and
  which deliberately does NOT compare `typeScale` — see its header for why, and for the mutation it
  records as green on purpose.
- `scripts/render-still.mjs` — `deriveFurniture`, `contrast`, `measureText`, `renderStill`. The
  canonical copy. **Vendored** (physical copy, not a symlink or a workspace dependency) by
  `splash`'s root template at `assets/root-template/shared/chart-beat/render-still.mjs`
  — that vendored copy, not this one, is what an installed beat actually imports, via
  `#shared/chart-beat/render-still.mjs`. `splash/test/root-template-shared.test.ts`
  guards the two copies from drifting apart.
- `scripts/annotation-ink.mjs` — `NON_TEXT_CONTRAST_FLOOR`, `TEXT_CONTRAST_FLOOR`,
  `textContrastFloor`, `inkBox`, `overlaps`, `marksUnder`, `worstContrast`,
  `assertAnnotationReadsOverMarks`, `inkThatReadsOver`. `deriveFurniture` answers "what ink reads on
  this newsroom's GROUND"; this answers the other question, the one an annotation actually poses —
  what ink reads on the MARK it is drawn over. Measured before it existed: the carbon histogram's
  median rule at **1.20:1** against the bar it spends 97 % of its length inside, the Swiss pyramid's
  peak callout at **4.05:1** with 57 % of its ink box on a `#0072B2` band, and 21 of the 32 dashed
  rules in the corpus that cross a mark at all under the 3:1 floor. Vendored the same way as
  `render-still.mjs`, at `shared/chart-beat/` and
  `assets/root-template/shared/chart-beat/`; `splash/test/annotation-ink-parity.test.ts`
  WALKS the tree for the basename rather than taking a list, so a fourth copy is guarded the day it
  lands. What reads the ARTIFACT rather than the arithmetic is
  `splash/test/annotation-reads-over-what-it-crosses.test.ts`, which parses every committed
  static SVG and measures what is really under each dashed rule and each line of text — by sampling
  at pixel centres strictly inside the mark, never at its endpoints, because a waterfall's connector
  meets the bars it joins at a point of zero width and an endpoint-sampling guard reports four
  defects that are not there.
- `scripts/render-preview.mjs` — renders the seed to PNG; accepts `--out <dir>` to write the proof
  to that directory instead of `assets/preview.png`.
- `scripts/verify-static.mjs` — `revealDashInScreenSpace` and the `marksFromSource` reader that feeds
  it, both byte copies walked by `splash/test/guard-copies-parity.test.ts`. Reads a component's own
  text; the limit is in its header.
- `scripts/compare-png.mjs` — `decodePng`/`comparePngBuffers`: is a fresh render the same PICTURE as
  the committed `assets/preview.png`, decided on decoded pixels rather than on bytes. A byte-identical
  COPY of `skills/splash/scripts/compare-png.mjs`, carried rather than imported and walked by
  `splash/test/compare-png-parity.test.ts`; read its header for what it measurably cannot do.
- `scripts/inspect-render.mjs` — `inspectSvg`: contrast against the real ground, alt-text
  presence, root `<title>` leakage. Vendored the same way, alongside `render-still.mjs`, at
  `assets/root-template/shared/chart-beat/inspect-render.mjs`.
- `test/annotation-ink.test.ts` — the arithmetic above, on real pairs out of this corpus, with the
  two mutations that redden it printed in its header.
- `test/render-still.test.ts` — `bun:test` coverage: the ink pole on a mid grey, the muted contrast
  floor on six grounds, the gap that breaks the line, the fitted scale and its zero floors, the
  gap note centred between the readings it separates, the closed palette, the
  measured gutter under a name long enough to break a constant, and the alt text as `<desc>`.
