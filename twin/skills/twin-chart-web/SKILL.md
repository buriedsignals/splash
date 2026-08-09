---
name: twin-chart-web
description: Use to produce a chart beat in the WEB genre — a self-contained interactive HTML page that fills its container edge to edge (geometry stretches continuously, type stays a fixed CSS size), adds hover/tap/keyboard detail on every reading the static frame had to omit, and degrades to that same static frame with JavaScript off. Carries the interaction script, one worked composition, and the render ladder's third rung.
---

# twin-chart-web — SSR the frame, inline the interaction, drive a real browser to check it

## Overview

The web genre of a chart beat. It does not hold a chart: it holds **the interaction** — the one
thing a static frame and a video build cannot have, a reader who can ask the chart a question and
get an exact answer back, without anything the static frame already states being gated behind that
ask.

**Fifteen beats ship through this skill** — `co2-suisse` plus the `web-*`, `webx-*` and `weby-*`
workspaces — and every one of them is on the fluid frame this skill now teaches. Each composition
(e.g. `proof/co2-suisse/EmissionsWeb.tsx`) lives with the rest of its story's own files, not inside
this skill's `assets/`, so this skill never hosts a particular story's numbers, only the genre's own
mechanics (`scripts/render-web.mjs`'s generic `renderWeb`, `assets/interaction.mjs`). A worked
example lives beside the skill the same replace-me way `twin-chart-beat`'s seed and
`twin-chart-video`'s compositions do — see "Quick start" for how to drive it.

**A cost worth knowing before you change `renderWeb`'s signature.** The second build dropped the
`layouts` argument without migrating the beats that passed it, and all fifteen stopped rendering
with the same `Cannot destructure property 'width'` — for an hour and a half, with a green suite,
because the only file that would have caught it (`test/render-web.test.ts`) imported the same
removed export and could not load either. The genre's machinery and the beats that call it move
together or not at all.

Its THIRD build closed three things the owner named after looking at the rendered output: the beat
now **fits the window it opens in** (it filled its container's width and then grew off the bottom of
the screen — 102px of x-axis, end label and source line below the fold at 1600 × 800), the filter's
controls got **a considered treatment** instead of three default radio dots reading as a
placeholder, and hover and the filter are now **verified by driving a real browser**
(`scripts/verify-web.mjs`) rather than asserted in prose.

There was no doctrine for this genre before this skill. `references/web-discipline.md` was written
against this beat's first real build, the way `static-discipline.md` was written against the first
static beat and `motion-grammar.md` against the first video build — read it before writing a second
web beat. It was rewritten again against this skill's SECOND build, when the owner's own read of the
first build's shipped output was that it did not fill its container (see "How it works").

## When to use

- When a closed `STORYBOARD.md` picks medium `chart` and genre **web**, and the beat's `BRIEF.md` is
  written. No brief, no code — same rule as the other two genres.
- When the argument is stronger with **every reading available on demand** than with the handful a
  static frame has room to label — a long series (here, eleven annual points) where the honest use
  of interaction is detail the static frame had to omit, never the same numbers repeated for effect.
  See `web-discipline.md`, "What hover reveals."
- **The filter test — most beats should not have one.** A filter earns its place only when ALL
  THREE hold:
  1. The series already carries a real dimension a reader would want to narrow, pick or isolate
     (a category, a year range, a sub-series) — not a control added because the mechanism exists.
  2. The DEFAULT, unfiltered view already shows everything the title/takeaway claims. If deleting
     the filter control entirely would leave the argument intact and only cost the reader a way to
     explore past it, add it; if the claim only becomes true once the reader operates the control,
     it fails this test outright — see `web-discipline.md`, "The filter obeys the same rule
     interaction does."
  3. Filtering can be expressed as DIMMING a subset the default view already draws (CSS only), not
     as hiding or fetching data the default view never rendered. This genre never ships a filter
     that removes an SSR'd reading from the no-JS page — see "What must not become interactive" in
     `web-discipline.md`.
  This seed's own filter (narrow to "2015–2019" or "2020–2025") passes all three: the split is a
  real property of the series, "All years" (the default) already shows the full fall the title
  claims, and the other two options only ever dim `.seg`/`.pt` elements already drawn.
- **Not** to re-draw a chart that already exists as a still or a video build. Import its geometry —
  a story's web composition imports its own `crossing-geometry.ts`-shaped module **from its own
  workspace**, exactly as its static sibling does (`proof/co2-suisse/EmissionsWeb.tsx` and
  `proof/co2-suisse/EmissionsLine.tsx` both import `proof/co2-suisse/crossing-geometry.ts`). That
  sharing is between story files. A SKILL's seed is the exception and not an oversight: it carries its
  own copy (`twin-chart-video/assets/EmissionsVideo.tsx` inlines the same arithmetic) because a skill
  directory has to build alone once copied into a journalist's root.
- **Not** for a map (a different engine) and **not** for a Datawrapper chart (a different producer).

## The one gotcha that will waste your day (read first)

**A static render can be checked with a PNG; an interactive one cannot.** Every rule in
`static-discipline.md` about looking at the pixels still applies to this genre's own furniture, but
the thing unique to this genre — does hovering point X show point X's own value, does Tab actually
reach it, does the frame genuinely fill a 1600px container without the type growing with it, does
nothing clip at 375px — is a *behaviour over a range of widths*, not a frame. `test/render-web.test.ts`
covers what a unit test can honestly prove (the geometry, the palette, the point count, the exact
formatted value per point, the pure `nearestIndex` helper) and stops there. The DOM wiring in
`assets/interaction.mjs`'s `initChart` and the fluid layout in `ChartWebSeed.tsx` are proven, or
not, by opening the rendered file in a real browser at several widths and using it — which is
exactly how this skill's own first build caught a real bug a unit test never would have: the narrow
layout's source line clipped clean off the right edge of the frame the first time it was actually
looked at, because nothing in the markup or the test suite says "clipped," only a screenshot does.
Its SECOND build was corrected the same way: a screenshot at 900px, not a computed-style reading,
is what showed the first build's frame stopping short of its container with empty space either
side — see `web-discipline.md`, "Verification."

**A beat FITS the window; it does not FILL it, and at phone width that is very visible.** Height
follows width through `aspect-ratio`, so a narrow viewport buys a short chart: measured across the
migrated beats, the tallest plot at 375×812 is 504px in an 812px window, and the seed's is 153px.
Nothing is clipped and nothing scrolls — the rule this genre settled is the fit — but the empty
ground below reads as unfinished the first time you see it. Three separate agents reported it
independently as a defect, which is the signal that saying it once in a doctrine file is not enough:
**it is expected, it is not a bug, and filling the window is an open question nobody has decided.**
If you want the chart to use that room, that is a change to the frame's own proportions and it needs
the owner, not a patch at the CSS.

**So run `scripts/verify-web.mjs`, and know exactly what it can and cannot tell you.** It dispatches
real pointer events at real coordinates and real clicks, which is the only way to catch the class of
defect that has actually bitten this genre: an HTML overlay with no `pointer-events: none` swallowed
every hover while keyboard focus kept working, because `.focus()` does not hit-test — so a test
using `.focus()`, `.click()` or a synthesised `MouseEvent` would have passed against a chart nobody
could hover. What it cannot do is look at the picture. Run it, then open the `--shots` frames and
look at them; each catches what the other is blind to.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/web-discipline.md` | What hover reveals that static could not, keyboard/touch parity, what survives with JS off, the fluid frame (geometry stretches, type stays fixed), the filter rule, what must never become interactive, the one box this genre allows |
| Geometry | the story's own `crossing-geometry.ts` (e.g. `proof/co2-suisse/crossing-geometry.ts`) | Shared with that story's own STILL beat — `crossingGeometry`, `fr`, `yTickValues`. Not reimplemented here. Not shared with the video SEED: that is a skill file and carries its own inlined copy |
| Composition | the story's own `EmissionsWeb.tsx`-shaped file, filed beside its story, not under this skill's `assets/` | A `ChartWebSeed`-shaped component: SVG geometry plus HTML/CSS furniture, called once — not two pre-rendered rungs |
| Interaction | `assets/interaction.mjs` | `nearestIndex` (pure, tested), `initChart`, `initAll` — hover/tap via one `.hit-area` overlay, keyboard via native `tabIndex={0}` on every point plus arrow-key shortcuts |
| Render | `scripts/render-web.mjs` | Exports the genre's generic `renderWeb({ component, props, outDir, name })` — SSRs the one component once, derives furniture/measures the y-axis gutter in node (this skill's OWN `scripts/render-still.mjs` copy — a skill never imports another skill), inlines the interaction script, writes one self-contained HTML file. It never imports a story's own numbers, and never a story's component; the caller hands both in |
| Preview | `scripts/render-preview.mjs` | Rasterises `ChartWebPreviewSvg` (SVG-only, baked text) to `assets/preview.png` — NOT what a real beat ships; see that component's own doc-comment in `assets/ChartWebSeed.tsx` |
| Verify | `scripts/verify-web.mjs` | The genre's evidence, not its documentation: drives Chrome over a rendered beat — `checkFit` (the window fit at seven `VIEWPORTS`), `checkHover` (real `page.mouse.move` over marks discovered by `[data-detail]`, at each of `POINTER_VIEWPORTS`), `checkFilter` (real `page.mouse.click` on every option, with scripting on and with JavaScript disabled), `checkControlAffordance` (Tab reach, focus ring measured in pixels, checked-pill contrast). Every check is conditional on the beat's own shape and every skip is announced; `probe` rounds each coordinate. 158 checks on the seed, 43–56 on a real beat. Exit 0 only when every check passed |
| Test | `test/render-web.test.ts` | CSV parsing, the CO₂ story component's own SSR output (palette, point count, exact per-point values, unconditional furniture), the pure `nearestIndex` helper, a direct cross-check against `crossingGeometry` |

**Where the furniture and the measurement live.** Same pattern `render-video.mjs` set:
`deriveFurniture`/`measureText` live beside a native rasteriser in this skill's own
`scripts/render-still.mjs` (a copy of `twin-chart-beat`'s, because a skill never imports another
skill) that no browser bundle can load, so `renderWeb` (node)
derives the furniture and measures the one gutter this genre still measures (the y-axis label
column — its width is content-dependent even at a fixed font size), and passes the results into
whichever component it was given as props (`measure`, `ink`/`muted`/`grid`). The composition itself
never imports the rasteriser.

**The fluid frame — the redesign this skill's SECOND build shipped.** Its FIRST build's own
`web-discipline.md` argued for two pre-rendered widths (900px/360px) swapped by a CSS media query,
reasoning that a client-side layout engine recomputing gutters and tick counts on every resize was
the same "one universal component" anti-pattern `twin-chart-beat` already rejects. That argument
never disputed the actual defect: the shipped 900px frame did not fill a wider container, and the
owner's own screenshot of it showed empty space either side rather than a chart that used the room
it was given. The fix is not "recompute on resize" — that anti-pattern stands rejected — it is a
DIFFERENT separation: `ChartWebSeed.tsx`'s `<svg>` now draws GEOMETRY ONLY (no `<text>` at all) and
is scaled by ordinary responsive SVG (`viewBox` + `preserveAspectRatio="none"`, CSS `aspect-ratio`
to grow height with width rather than capping width) — nothing about that stretch needs recomputing
per resize, the browser's own layout engine does it for free, continuously, the same "cheap" cost a
`width: 100%` image already has. Every WORD — title, caveat, source, axis labels, the
reference/peak/end labels — is plain HTML positioned by `%` over the same box the `<svg>` occupies,
styled from CSS with a FIXED pixel `font-size` that never tracks the `viewBox`. `web-discipline.md`'s
"Responsive behaviour" section argues this split in full.

**The window fit — the half the fluid redesign was missing.** Once width filled its container and
height followed from `aspect-ratio`, a wider viewport bought a TALLER chart, and past a certain
width the beat grew off the bottom of the screen: measured on the seed, 902px of figure in an 800px
window at 1600px wide, 1051px in a 950px window at 1920px, 1762px at 3440 × 900. The 102px missing
at 1600 × 800 were the x-axis row, the subject's own end label and the source line — a reader on a
16" laptop met a chart whose credit and whose final value were below the fold. A beat is one thing a
reader looks at, not a document they scroll through, so `.chart-figure` is now a flex column with
`max-height: 100dvh` (a `100vh` declaration first, as the fallback), header/filter/source pinned at
`flex: 0 0 auto`, and the plot alone shrinkable (`flex: 0 1 auto`) down to `PLOT_FLOOR_PX`. Words
are never squeezed to make a chart fit; the chart is. `max-height`, never `height`, so a figure that
already fits is untouched and reserves no empty space — verified: the plot's height is unchanged at
2560 × 1440, 1920 × 1080, 1728 × 1000 and 1024 × 768, while every overflowing case above now measures
0px. The cost is named in `web-discipline.md`, "The beat fits the visible window": a clamped plot is
flatter than its canonical ratio, which is the right side of the trade against an end label nobody
sees. **What this does not claim** is that the beat USES the window — at 375 × 812 the seed still
draws a 153px plot in an 812px window, because height follows width. Fitting and filling are two
rules and only the first is settled.

**The filter's own control.** The first shipped filter was three default radio dots with a bare word
beside each, which reads as an unfinished form under a finished chart. It is now a segmented control
— three options in one rounded track, the chosen one inverted to ink-on-ground — layered ON TOP of
working native radios rather than replacing them: same `<fieldset>`/`<legend>`/three
`<input type="radio">`, the input made transparent over its own pill (never `display: none`), the
focus ring moved to the pill, and the whole treatment inside `@supports selector(:has(*))` so an
engine without `:has()` falls back to the plain radios it already had. `web-discipline.md`, "The
filter obeys the same rule interaction does", carries the reasoning and the measured contrast on
three different grounds.

**Why `render-web.mjs` does not import a story's own numbers.** Its first build called `renderWeb`
`render`, and that function reached directly into `EmissionsWeb.tsx` for its two named layout
constants — the skill's own renderer importing a story's frame geometry, which is the dependency
running backwards: a second beat would have had to name its own layouts identically just to keep
the skill's code working. `renderWeb` takes `component` and `props` as arguments; a story hands it
its own props and its own `frame` (a `WebFrame`-shaped value, inside `props`). The genre's machinery
does not know, and does not need to know, what any one story calls its frame or how many pixels wide
its canonical geometry is.

## How it works (the shape)

1. **Read `web-discipline.md`**, then write the frame before the interaction script. Draw geometry
   into the `<svg>` — grid lines, the accent path (or, if a filter narrows a dimension, one `<path>`
   per segment — see `ChartWebSeed.tsx`'s `segments`), the points, the reference rule, the peak
   marker — and NOTHING that is a word. Every word goes into HTML, positioned by `%` over the same
   box, sized in CSS at a fixed pixel value.
2. **Import the geometry**; do not redraw it. `crossingGeometry`/`fr`/`yTickValues` are the same
   calls the static and video beats make.
3. **Bake every point's exact detail server-side.** `render-web.mjs` (node) computes each reading's
   `data-detail` string with the same `fr()` the other genres use — the browser script never formats
   a number, it only reads an attribute back.
4. **Wire the interaction layer**, not the layout. `assets/interaction.mjs`'s `initChart` only ever
   touches `.pt` circles' own class and the shared `#tooltip` — it has no code path that can hide or
   move the title, the reference rule, the peak's own label, or the subject's end label. See
   `web-discipline.md`, "What must not become interactive."
5. **If the beat earns a filter** (see "When to use" above), express it as native `<input
   type="radio">`/`<label>` controls plus a pure-CSS `:has()` dimming rule on `data-period`-tagged
   segments/points — never a script-only mechanism, and never one that removes an SSR'd reading.
6. **Render the HTML, then run `scripts/verify-web.mjs --file <your beat>.html`** — it drives Chrome
   over your own beat and measures the fit at seven viewport sizes, dispatches real pointer events
   over every reading, clicks every filter option with scripting on and with JavaScript disabled,
   and checks the control's keyboard reach, focus ring and contrast. A claim not driven is not
   evidence — the same rule `twin-doctrine`'s verification section states for every genre.
7. **Then look at the screenshots yourself** (`--shots --out <dir>`). The script reads text,
   geometry, opacity and colour; it cannot see a label colliding with a line, a clipped mark, or a
   plot that is technically fine and visually squat. Every defect this genre has shipped that a
   script could not have caught was caught by an eye on a frame.

## Quick start

```sh
# the skill's own seed, from the skill's own sample data — nothing else on disk is needed
bun skills/twin-chart-web/scripts/render-web.mjs /tmp/canon-web

# then DRIVE it — a static screenshot at ONE width cannot verify a fluid, interactive claim.
# With no --file it renders the seed itself first, so this one line is the whole check:
bun skills/twin-chart-web/scripts/verify-web.mjs --shots --out /tmp/canon-web-verify
#   FIT     — 7 viewports, 3440x900 down to 375x812: document height vs window height, and the
#             x-axis and source line both on screen
#   HOVER   — page.mouse.move over every reading, on its own mark AND anywhere in its column,
#             plus one probe on the peak LABEL (an .overlay child — the exact pixel where this
#             genre once shipped a dead hover); each must answer with that reading's own detail
#   FILTER  — page.mouse.click on every option, with scripting on and again with JavaScript
#             DISABLED: the default dims nothing, each option dims only the other period, and
#             the title/caveat/source/reference/peak/end label are fully drawn in every state
#   CONTROL — Tab reaches the group, ArrowRight moves it, the focus ring changes real pixels,
#             the checked pill's own text clears 4.5:1, the target is at least 24x24
# exit 0 only when every check passed.

# then OPEN THE SCREENSHOTS AND LOOK. The script cannot see a collision, a clipped mark, or a
# chart that is technically fine and visually squat. Both steps, every time — neither replaces
# the other.
open /tmp/canon-web-verify   # fit-*.png, hover-*.png, filter-late-*.png, nojs-filter.png, control-focus-*.png

# a real story's own runner, filed beside the story, not inside the skill:
bun proof/co2-suisse/render-web.mjs /tmp/web-twin --data /tmp/web-twin/data.csv   # → co2.html
```

The first command runs the SEED's runner (`render`, at the bottom of `scripts/render-web.mjs`), which
reads `assets/sample-data/rainfall.json` and hands the seed component and its `FRAME` to the
genre's generic `renderWeb`. A real beat writes its own runner in that same shape **beside its own
story** — `proof/co2-suisse/render-web.mjs` is exactly that, importing its own composition, its own
props and its own CSV reader. It is not filed under this skill, and that is not a filing preference:
until it was fixed, `render-web.mjs` imported `proof/co2-suisse/EmissionsWeb.tsx`, so copying this
skill into a journalist's root — the whole premise — did not build.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The plot's own canonical width/height (fixes proportions only — never a rendered pixel cap) | `820` × `380` | `FRAME.width`/`FRAME.height`, `ChartWebSeed.tsx` |
| The fixed CSS row height reserved below the plot for x-axis year labels | `28` | `FRAME.xAxisRowPx`, `ChartWebSeed.tsx` |
| How many y gridlines this frame asks for | `5` | `FRAME.yTickHint`, `ChartWebSeed.tsx` |
| How many x ticks `tickStep` derives a round interval from | `6` | `FRAME.xTickHint`, `ChartWebSeed.tsx` |
| A regular gridline this close to the reference is dropped | `20` | `FRAME.minGridlineGapPx`, `ChartWebSeed.tsx` |
| The fixed pixel type sizes for title/subtitle/source/axis/label/note/filter — never tracks the viewBox | `24`/`14`/`13`/`12`/`14`/`12`/`13` | `FRAME.title`/`subtitle`/`source`/`axis`/`label`/`note`/`filter`, `ChartWebSeed.tsx` |
| The reading-measure cap on the header block and the source line — the chart frame itself is never capped | `640px` | `.chart-header, .chart-source`, `render-web.mjs` |
| The frame's own fixed inner margin — content never touches the frame's edge, at any width | `24` | `FRAME_PAD_PX`, `render-web.mjs` |
| How much of the window a beat may fill before the plot starts giving height back | `100dvh` (with a `100vh` fallback first) | `.chart-figure`'s `max-height`, `render-web.mjs` |
| Where the plot stops shrinking — below it, a short window gets a scrollbar rather than a strip | `120` | `PLOT_FLOOR_PX`, `render-web.mjs` |
| The segmented filter pill's own padding and corner (the whole treatment sits behind `@supports selector(:has(*))`) | `5px 12px` / `999px` | `.chart-filter label`, `render-web.mjs` |
| The viewport sizes the verification drives, and the two it dispatches pointers at | 7 sizes / 2 sizes | `VIEWPORTS`, `POINTER_VIEWPORTS`, `verify-web.mjs` |
| How many marks a hover sweep probes before it starts sampling an even spread | `40` | `MAX_PROBES`, `verify-web.mjs` |
| The invisible hit target's radius per point (keyboard focus outline, not the touch target — see `web-discipline.md`) | `5` | `.pt` circle `r`, the story's own composition file |
| How the `#tooltip` is positioned relative to the pointer/focused point | `14px` above, clamped `8px` from the viewport edge | `show()`, `interaction.mjs` |
| The level the seed's reference rule holds against | `2015` | `REFERENCE_YEAR`, `ChartWebSeed.tsx` |
| The one year the seed's own peak marker names | `2020` | `PEAK_YEAR`, `ChartWebSeed.tsx` |
| The seed's own filter split | `2020` | `FILTER_SPLIT_YEAR`, `ChartWebSeed.tsx` |
| How much a filtered-out segment/point dims | `0.2` | `render-web.mjs` |

## Files

- `references/web-discipline.md` — the rules this genre is written under, each attached to the
  reasoning or the defect that produced it.
- `assets/ChartWebSeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat (rainfall over a sample town, fell by a third), not a stripped mechanics demo.
  `FRAME`, `ChartWebSeed`, `ChartWebPreviewSvg`, `chartGeometry`, `segments`, `xTickValues`,
  `yTickValues`, `periodOf`, `periodRangeLabel`, `wrap`. `WebFrame` is defined here too, describing
  this genre's own mechanics rather than any one story's numbers — a story's own composition (e.g.
  `proof/co2-suisse/EmissionsWeb.tsx`) does NOT import this type; it declares its own matching copy
  inline, the "duplicate, do not link" ruling this project applies to anything with no `#shared/*`
  vendoring path (see the seed's own doc-comment). Like `proof/co2-suisse/EmissionsWeb.tsx`, the
  component never imports the rasteriser — `ink`/`muted`/`grid`/`measure` are props, derived in node
  by whoever calls it (`scripts/render-preview.mjs` for this skill's own preview). `wrap` is kept,
  unchanged, only for `helper-parity.test.ts`'s own cross-skill guard — `ChartWebSeed` no longer
  calls it, since its furniture is plain HTML the browser wraps itself.
- `assets/sample-data/rainfall.json` — eleven annual readings for the seed's sample town
  (2015–2025, 912mm → 604mm), the seed's data. **Not** the same file as
  `twin-chart-beat/assets/sample-data/rainfall.json` — this file has no null values, and its 2019
  onwards differ from that file — the two are comparable only in shape, not in value.
- `assets/preview.png` — the seed rendered on a light ground, via `ChartWebPreviewSvg` (a
  documentation-only static rendering — see that component's own doc-comment for why it is not the
  shipped beat). Regenerate with `bun scripts/render-preview.mjs` whenever the seed changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `assets/interaction.mjs` — the one script this genre ships, inlined verbatim into the HTML.
  `nearestIndex` is pure and unit-tested; `initChart`/`initAll` are DOM wiring, verified by driving
  a real browser, not by a test.
- `scripts/render-web.mjs` — the genre's own machinery: `renderWeb({ component, props, outDir,
  name })` SSRs the component once, derives the furniture, inlines the interaction script, writes
  one self-contained HTML file. It knows no story's numbers. Beneath it, `SEED`, `render` and the
  CLI block are the runner for THIS SKILL'S OWN SEED, behind a labelled `CONFIG — edit for your
  story` seam. Nothing in this file imports out of this skill, which is what makes the directory
  copy-pasteable; a story's runner lives beside the story (`proof/co2-suisse/render-web.mjs`).
- `scripts/verify-web.mjs` — the genre's own evidence. Drives Chrome (`resolveChrome`, the same
  candidate-list shape every other script in this repository that drives a browser carries —
  duplicated, because nothing in a skill imports out of it) over a rendered beat and reports every
  measurement with its number: `checkFit` across `VIEWPORTS`, `checkHover` and `checkFilter` across
  `POINTER_VIEWPORTS`, `checkControlAffordance`. It dispatches ONLY `page.mouse.move` and
  `page.mouse.click` at real client coordinates — never `.focus()`, `.click()` or a synthesised
  `MouseEvent` — because this genre once shipped a hover that was completely dead while keyboard
  focus still worked, and every one of those three would have passed in that world. `--file` to
  verify an existing beat, `--shots --out <dir>` to write the frames a human then looks at. Its
  own checks were each proven against a deliberately broken copy of the rendered HTML in `/tmp`;
  the focus-ring check FAILED that exercise the first time (it accepted the user agent's outline on
  an `opacity: 0` input, which paints nothing) and was rewritten to compare rendered frames instead.
- `scripts/render-preview.mjs` — renders THIS skill's seed from THIS skill's sample data (never a
  story's render) to `assets/preview.png` or `--out <dir>` to write the proof to that directory
  instead, via `ChartWebPreviewSvg`. Derives `ink`/`muted`/`grid` with `deriveFurniture` and
  supplies `measureText` as `measure` — the same division `render-web.mjs`'s `renderWeb` uses for a
  real beat, so the seed components themselves never import the rasteriser. `--check` re-renders
  and fails non-zero if the committed PNG no longer matches a fresh render of the seed.
- `test/render-web.test.ts` — `bun:test` coverage of the genre's contract against a REAL shipped
  beat (the CO₂ story), rewritten against the fluid frame: CSV parsing; the words carried and the
  argument-bearing furniture drawn unconditionally; exactly one `svg.chart` with no `<text>` inside
  it and no root pixel size; nothing drawn outside the `viewBox`, with `POINT_INSET` keeping the
  end points' own circles off the side edges; the `aspect-ratio` DERIVED from the measured
  `--y-gutter` plus the real geometry rather than hand-picked (proven by re-rendering at a
  different canonical frame and watching every derived number follow); one focusable, labelled,
  `data-detail`-bearing mark per reading; a hit area covering the whole plot box and staying
  transparent; a closed palette with the accent never on a non-subject point; the pure
  `nearestIndex` helper; and a direct coordinate-for-coordinate cross-check against
  `crossingGeometry`, so this genre never carries a second implementation of data-to-coordinates.
  Its own header records what the two-rung version asserted, what was re-expressed and what was
  dropped outright — including one assertion that would now assert a BUG if it were kept.
- `test/canon.test.ts` — the canon's own shape, not a story's: no CO₂ story component under this
  skill's `assets/`, the seed carries the exact `REPLACE ME` wording and none of the CO₂ story's own
  copy, the sample data is real rows a seed can render standalone, and `preview.png` is a current
  render (`render-preview.mjs --check`).
- `test/seed-fluid-frame.test.ts` — the redesign's own shape: the `<svg>` this seed draws carries no
  `<text>` element at all, the frame's CSS never caps its own width, the figure clamps to the
  viewport height with the plot as the only shrinkable item and an explicit pixel floor, the filter's
  three options sit in one `.options` track inside a real `<fieldset>`/`<legend>` with the segmented
  treatment behind an `@supports selector(:has(*))` guard and no radio taken out of the focus order,
  the filter's default state shows every reading at full opacity,
  `periodOf`/`periodRangeLabel`/`segments` classify the series correctly, and `wrap` still agrees
  with the reference implementation this file's own doc-comment names. **None of it is the proof** —
  it is the structure, so the mechanism cannot be silently deleted; `scripts/verify-web.mjs` is what
  measures whether any of it actually works in a browser.
- **The CO₂ beat's own files live outside this skill, in `proof/co2-suisse/`**: `render-web.mjs`
  (the story's own runner — its `BEAT` constants, its OWID CSV reader, its CLI; it imports the
  genre's `renderWeb` from this skill, never the other way round), `EmissionsWeb.tsx`
  (composition — declares its own `WebLayout` type inline, not imported from this skill's seed, and
  predates this skill's fluid-frame redesign — see this file's own "Overview"),
  `crossing-geometry.ts` (the pure core, shared with the static and video beats), `EmissionsLine.tsx`
  (the static beat), `BRIEF.md`, `STORYBOARD.md`, `co2-suisse-still.png`. This skill's own `assets/`
  carries no story of its own beyond the seed — replace `proof/co2-suisse/` with the next story's own
  workspace, never edit those files in place expecting them to generalise.
