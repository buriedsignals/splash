---
name: twin-scrolly
description: Use to produce a scroll-driven interactive (scrollytelling) — a FIXED graphic that fills the frame behind, with narrative prose stepping over it as the reader scrolls the prose column (the page itself does not scroll). A VEHICLE, not a fourth chart genre — it ASSEMBLES DIFFERENT MEDIA behind one narrative; its seed carries four tracks (an IMAGE, a drawn diagram, a baked MAP and a real CHART). It does not invent a second drawing engine and it does not step a single chart through several states.
---

# twin-scrolly — the graphic is the fixed ground, the prose is pinned in a lane over it, drive a real browser through a CONTINUOUS scroll to check both

## Overview

The scroll-driven vehicle. It does not hold a chart type and it is not a scrollytelling framework:
it holds the **mechanism** — a FIXED graphic that fills the frame behind the reader's own scroll,
with a pinned panel of prose sitting OVER it as N narrative steps go by — and **one worked beat**
that carries that mechanism with **four genuinely different media**.

**The four tracks are the point of this skill, not decoration on it.** The seed steps through a
drawn scene of a river gauge, a schematic of the instrument, a **baked basemap** with the station
marked on it, and a **chart of that station's own 366 daily readings** — real data, frozen beside
the beat, from the USGS National Water Information System. A picture and a diagram alone
demonstrated the mechanism but never the point: a **map** and a **chart** are media other skills in
this project already produce on their own, and assembling BOTH behind one narrative is the thing
none of them can do. `test/canon.test.ts` refuses a seed that loses either track.

**This is the one vehicle Splash publicly promises.** Chart beats ship static, web and video; maps
ship the same three. Nothing scrolled, and nothing assembled two media at once.

`references/scrolly-discipline.md` carries the doctrine and the full account of what each round of
this element got wrong. Read it before writing a second scrolly beat.

## When to use

- When a closed `STORYBOARD.md` picks a scroll-driven interactive for a beat whose argument is
  genuinely told across **different kinds of evidence** — a scene, then a map, then a chart —
  narrated as one sequence. That is what this vehicle is FOR: assembling media a single beat, of any
  one genre, cannot assemble on its own.
- **If every step would show the same chart, do not reach for this skill — animate the beat
  instead.** A scrolly that steps four states of one chart is not a vehicle carrying different
  media; it is a duplicate of a beat that already exists under `twin-chart-web` or
  `twin-chart-beat`, stepped by hand instead of animated.
- When the argument is stronger revealed in STEPS than shown all at once — never suspense for its
  own sake. The beat's overall claim is stated in full in the header, before any step's reveal.
- **Not** a place to invent a new drawing engine. Nothing under a skill may import out of it, so a
  frame component here is written here — but a real beat that already has a chart or a map component
  under another skill hands this scaffold ITS OWN rendered element as a step's `frame`, and the
  scaffold never asks what that element is.
- **Not** a moving camera. The map track shows one baked plate; a scroll-driven `flyTo` would mean
  either a live map in the delivered file or one plate per waypoint — see
  `references/scrolly-discipline.md`, "What this genre does not attempt."
- **Not** a registry or a dispatcher. A scrolly carries beats; it is not a new kind of beat.

## The one gotcha that will waste your day (read first)

**A SCROLLY CHECKED BY JUMPING TO SCROLL POSITIONS IS NOT CHECKED.** This genre shipped five rounds
of corrections verified that way — teleport to 25 offsets, wait for the page to settle, read the
state — and every number came back perfect: one frame at opacity 1, every other at 0, one panel at a
time, all four steps in order, 25 out of 25, at three widths, on five beats. Driven CONTINUOUSLY
instead, **fourteen of those fifteen runs never painted at least one step's frame at all**, and the
graphic lagged the prose by up to 1,800px of a 3,300px track. The owner needed three words for it:
*le scrolly est buggé pour tous*. A teleport hands an `IntersectionObserver` every panel in one
callback, so a rule that decides from the delta set is accidentally right exactly under the
instrument that checks it. **Install a `requestAnimationFrame` recorder BEFORE you touch the scroll
position; `scripts/verify-scrolly.mjs` is that, and `test/scroll-integrity.test.ts` walks it over
every scrolly on disk.**

**THE GRAPHIC IS FIXED AND THE PAGE DOES NOT SCROLL.** `.scrolly` is a two-row grid exactly one
frame tall, `html, body` are `overflow: hidden`, the header is row 1 (outside the scroller, so it
cannot slide away), and inside row 2 the graphic and the prose column are two absolutely-positioned
layers filling the same box. **The only element in the document with scroll distance is
`.scrolly-steps`.** There is no `position: sticky` on the graphic, no `--graphic-h`, and no negative
margin: nothing is positioned from the scroll, so nothing can lag behind it — and the component
never steals its host article's scroll, which is what an embed must not do. The deliberate overlap
is unchanged; it is expressed as a stack rather than as a reservation being cancelled.

What keeps that overlap readable is not luck, it is a **lane**: `PROSE_LANE` reserves the bottom
28% of the track for the panel, and every frame keeps everything it annotates above it —
`safeBand()` for the frames that are COVER-cropped, `CONTENT_TOP` for the ones that are fitted. One
number, written into the CSS as `--prose-lane` and onto the root as `data-prose-lane`, read by the
frames, the scaffold and the interaction layer alike. **The panel still sits at the BOTTOM of its
step box (`align-items: flex-end`) and is pinned there with a `bottom` sticky offset** — that offset
only ever shifts a box UP, so a panel placed at the TOP of its step has nowhere to be shifted to and
travels with the scroll as if the rule were absent.

**Which frame is SHOWN and which panel is PAINTED are two decisions, not one.** A `bottom`-sticky
panel un-pins one panel-height before the next one parks and spends that gap climbing over the
graphic. So `active` (the frame) is held across the gap; `in-lane` (the panel) is not, and a panel
that has left the lane stops being painted immediately — leaving is a cut, arriving is a fade.

**Legibility is measured, not assumed from an opaque-looking panel.** Every panel is painted fully
OPAQUE with the render's own `ground` — never a translucent scrim, whose effective colour would
drift with whatever part of the graphic sits behind it — so ink-on-ground is exactly what a reader
sees. `renderScrolly` asserts that contrast at build time and the tests assert it again; on this
seed's own light ground it is **21.00:1**, confirmed a second way by reading `getComputedStyle` in a
driven browser.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/scrolly-discipline.md` | The fixed graphic and the page that does not scroll; why the active step is decided from every panel on every scroll and never from a delta; the prose lane and the two halves that must agree; the sticky model kept as history because five rounds of corrections are only legible against it; why scenery is cropped and evidence is fitted; a map track without a live map; what survives with JS off; reduced motion; what this genre does not attempt; verification |
| Seed | `assets/ScrollySeed.tsx` | `STEPS_META` (the beat's four-step arc: id, `frameKind`, prose-as-a-function), the four frame components (`ImageFrame`, `DrawnGraphicFrame`, `MapFrame`, `ChartFrame`), and the placement constants: `PROSE_LANE`, `ASPECT_ENVELOPE`, `safeBand`, `SAFE_AREA`, `CONTENT_TOP`, `FRAME`, `CHART_LAYOUT` |
| Seed data | `assets/gauge-data.ts` | `parseRdb`, `parseReadings`, `readStation`, `deriveFacts`, `group`, `dayAndMonth` — the beat's own reading layer. Nothing here draws; nothing that draws computes a fact |
| Interaction | `assets/interaction.mjs` | `pickActiveStep` and `pickLanePanel` (both pure, both unit-tested) + `initScrolly` (on every scroll of the prose column, measures every panel against the lane, toggles `.active` on the winning step and frame and `in-lane` on the one panel that may be painted, and adds `scrolly--live` so the one-panel-at-a-time CSS only ever applies where a script runs). No `IntersectionObserver` — see the file's own header. `initAll` runs it |
| Render | `scripts/render-scrolly.mjs` | **Above the CONFIG marker**: `renderScrolly({ steps, title, source, ground, outDir, name, proseLane })` — the genre's MEDIA-AGNOSTIC machinery. It SSRs each `frame`, wraps it generically, builds the overlap scaffold and the lane, measures panel contrast, inlines the interaction script. It never reads `frameKind` — `test/render-scrolly.test.ts` scans the function's own source to prove it. **Below the marker**: `SEED`, `DRAWN_VARIANT`, `buildFrame` (the ONE place that reads `frameKind`), `render` (this seed's own runner) |
| Bake | `scripts/bake-plate.mjs` | One camera, one basemap capture, one projected pixel — run once, committed; the delivered HTML carries no key and makes no request |
| Rasteriser | `scripts/render-still.mjs` | This skill's OWN copy of `deriveFurniture`/`contrast`/`measureText` — a skill never imports another skill's copy |
| Verify | `scripts/verify-scrolly.mjs` | The guard that watches a CONTINUOUS scroll: a `requestAnimationFrame` recorder installed before anything moves, then six assertions (the page never scrolls; the graphic and header never move; every step's frame is painted, in order; each step is handed `active` once; the graphic settles; one panel at a time, always inside the lane) plus reduced motion and JS-off. Runnable by hand on any rendered scrolly |
| Test | `test/scroll-integrity.test.ts` | Walks `verify-scrolly.mjs` over the seed and every scrolly on disk at three widths; names the three mutations that redden it and what it provably does not catch |
| Test | `test/render-scrolly.test.ts` | The generic scaffold: media-agnostic by source-scan, panel contrast, overlap markup, the fixed graphic and the one scroller, the pinned lane, one-panel-at-a-time, well-formed markup at 4/6/8 steps, and the drawn frame's own safe placement parsed out of the rendered SVG |
| Test | `test/seed-tracks.test.ts` | The four tracks: `safeBand` checked against real box aspect ratios, `CONTENT_TOP` against fitted boxes, `MapFrame`/`ChartFrame` SSR, the data layer, and every figure the rendered beat says out loud recomputed from the frozen CSV |
| Test | `test/canon.test.ts` | The canon's shape: `REPLACE ME` wording, the frozen files are real, the seed renders standalone into an empty directory, the seed still carries a map and a chart track, no registry/dispatcher, preview current |

**Why the title and source live in the HTML `<header>`, in their own grid row.** The header is the
ONE piece of furniture that never sits over the graphic, and — since the seventh correction — the
one that never moves either: it is row 1 of `.scrolly`'s grid, OUTSIDE the element that scrolls, so
the beat's argument stays on screen for the whole read instead of sliding away on the reader's first
gesture. It is stated in full, unconditional, before any step's reveal and for the whole of it.

**Why every frame is `aria-hidden`, and why that wrapper lives in `renderScrolly`.** The argument is
carried by the unconditional header and every step's own prose, never exclusively by the graphic.
Exposing only whichever ONE frame happens to be active at a scroll position a screen reader user has
no way to navigate to would be a worse reading than not exposing the graphic at all. The wrapper
lives in the generic scaffold, not the frame, because an `<img>`, an `<svg>` and a `<div>` need
identical treatment from the scaffold's point of view.

## How it works (the shape)

1. **Read `scrolly-discipline.md`**, then write the beat's own `STEPS_META` before touching any
   component. **Count the distinct `frameKind`s: if there is only one, this is not a scrolly.**
2. **Write one component per frame kind.** No frame component imports the rasteriser —
   `ink`/`muted`/`grid` are props, derived once in node by whoever calls it. No frame knows about
   `.step-frame`, `active` or `aria-hidden`; those belong to the scaffold.
3. **Decide, per frame, whether it is scenery or evidence.** Scenery (a photograph, a basemap) is
   COVER-cropped and fills the viewport; anything it annotates goes inside `safeBand()`. Evidence (a
   chart) is FITTED and never cropped, with its content inside `CONTENT_TOP` and its type at a fixed
   pixel size over stretched geometry. Both rules keep the prose lane clear.
4. **Freeze the data beside the beat and compute every figure from it.** `prose` is a function of
   derived facts, not a string with numbers typed into it — one beat in four in this project once
   carried a hand-typed figure its own data contradicted.
5. **Teach the CONFIG seam's `buildFrame` a case per `frameKind`.** That is the entire cost of a new
   medium; `renderScrolly` does not change.
6. **Bake the default state server-side.** Exactly one frame is wrapped `active` by `renderScrolly`,
   never assigned by the script after load. The script only ever MOVES that class.
7. **Write more than two steps** — two hides boundary bugs a middle step would catch.
8. **Render the HTML, then DRIVE A REAL BROWSER through a CONTINUOUS scroll** — not a series of
   jumps, which is what let a broken vehicle pass five rounds of review (see "The one gotcha").
   `bun skills/twin-scrolly/scripts/verify-scrolly.mjs <file.html>` does it at all three widths.
   Measure — do not eyeball:
   - the active frame settles at a clean `opacity: 1` (every other frame `0`) — never a blend;
   - **no annotation of the active frame overlaps any visible prose panel, at any sampled offset**
     — take the bounding boxes of both and test them for intersection, at the widest and narrowest
     aspects, not only the ones in between;
   - no annotation falls outside the viewport;
   - exactly ONE panel is painted at a time;
   - the graphic spans the full viewport WIDTH (`left === 0`, `right === innerWidth`) and the full
     height of its own track, and its box is IDENTICAL at every recorded frame;
   - the document itself has no scroll distance, and the prose column has all of it;
   - the panel's own computed background and colour, and the contrast between them;
   - JavaScript disabled: the default frame and EVERY step's prose survive;
   - `prefers-reduced-motion: reduce`: every sampled opacity is exactly 0 or 1;
   - ~375px: nothing clips, the page never scrolls horizontally.
   Screenshot each step and LOOK at it. Driving this seed is what found the inert sticky offset, a
   tick label clipped by the frame's own left edge, and a dashed rule striking through the words of
   the label that names it — none of which any test noticed.

## Quick start

```sh
# the skill's own seed — the frozen data and the baked plate are committed, so nothing is fetched
bun skills/twin-scrolly/scripts/render-scrolly.mjs /tmp/canon-scrolly

# re-bake the map plate only if the camera or the station changes (needs MAPTILER_KEY)
bun skills/twin-scrolly/scripts/bake-plate.mjs

# then drive it — a screenshot taken before scrolling proves nothing about a scrolly
python3 -m http.server 8931 --bind 127.0.0.1 --directory /tmp/canon-scrolly &
# open http://127.0.0.1:8931/gauge-scrolly.html in an automated browser and measure the list in
# "How it works", item 8, at 1600x900, 1280x800 and 375x812.
```

The seed's runner reads its own frozen files (`potomac-2024.csv`, `potomac-station.rdb`,
`potomac-plate.jpg`, `potomac-plate.json`, `basin-photo.png`), derives the beat's facts, embeds the
two rasters as data URIs, and hands `renderScrolly` four built frames plus their resolved prose. A
real beat writes its own runner in that same shape — never editing this skill's own runner in place.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The band at the bottom of the graphic reserved for the pinned prose panel — and that every frame keeps clear | `0.28` | `PROSE_LANE`, `ScrollySeed.tsx` (written into the CSS as `--prose-lane` by `render-scrolly.mjs`) |
| How much of a FITTED frame's own height its content may use, derived from the lane | `1 - PROSE_LANE` | `CONTENT_TOP`, `ScrollySeed.tsx` |
| The box-aspect range a COVER-cropped frame's annotations are guaranteed to survive | `{ min: 0.42, max: 2.4 }` | `ASPECT_ENVELOPE`, `ScrollySeed.tsx` |
| How many narrative steps the seed carries | `4` | `STEPS_META`, `ScrollySeed.tsx` — any count ≥ 2 works, with at least three distinct `frameKind`s including a map and a chart (canon-enforced) |
| The drawn frame's own design canvas | `640 × 900` | `FRAME`, `ScrollySeed.tsx` |
| The chart's plot box and its geometry-only viewBox | `plot` / `viewBox` | `CHART_LAYOUT`, `ScrollySeed.tsx` |
| The map plate's size and camera | `--width 1000 --height 640`, zoom `9` | `CAMERA`, `bake-plate.mjs` |
| The frame the graphic fills — the component's own height, minus the fixed header's row | `100%` of `.scrolly`, `grid-template-rows: auto minmax(0, 1fr)` | `.scrolly`, `buildCss`, `render-scrolly.mjs` |
| How long a reader scrolls through one step — the same for every step, including the last, as a fraction of the TRACK (not the viewport) | `115%` | `.step` min-height, `buildCss`, `render-scrolly.mjs` |
| How far the pinned panel sits above the viewport's bottom edge | `clamp(16px, 4vh, 40px)` | `.step-panel` bottom, `buildCss`, `render-scrolly.mjs` |
| The prose panel's own max width | `min(46ch, 100%)` | `.step-panel`, `buildCss`, `render-scrolly.mjs` |
| The header's own reading measure (the graphic does NOT share it) | `640px` | `.scrolly-header` max-width, `buildCss`, `render-scrolly.mjs` |
| The header's and the step's own side gutter | `clamp(16px, 6vw, 56px)` | `buildCss`, `render-scrolly.mjs` |
| The step-boundary swap's transition — the ONLY animated property, and only at a boundary | `0.3s` | `buildCss`, `render-scrolly.mjs` |
| The band the interaction layer measures every panel against — the lane itself, read off the markup, with the panel's own bottom offset taken off so "parked" is distinguishable from "already rising" | `data-prose-lane` | `initScrolly`, `interaction.mjs` |
| How long a reader dwells on one step while the guard drives, in animation frames — derived from each beat's own step height so a phone and a desktop get the same dwell, never the same pixel rate | `60` | `FRAMES_PER_STEP`, `verify-scrolly.mjs` |
| The WCAG floor `renderScrolly`'s own panel-contrast tripwire enforces | `4.5` | `renderScrolly`, `render-scrolly.mjs` |
| The drawn step's own illustrated water level and day label (never a plotted value) | `{ waterLevelT, dayLabel }` | `DRAWN_VARIANT`, `render-scrolly.mjs` |

## Files

- `references/scrolly-discipline.md` — the doctrine: the sticky-reservation fact and the deliberate
  overlap; the prose lane and the `bottom`-sticky trap; scenery cropped vs evidence fitted; a map
  track without a live map; the reading measure on the prose and never on `.scrolly`; how
  prose-over-graphic contrast is measured; what survives with JS off; reduced motion; what this
  genre does not attempt; verification.
- `assets/ScrollySeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat. `STEPS_META` is its four-step arc; `ImageFrame`, `DrawnGraphicFrame`, `MapFrame`
  and `ChartFrame` are its four frame components; `PROSE_LANE`, `ASPECT_ENVELOPE`, `safeBand`,
  `SAFE_AREA`, `CONTENT_TOP`, `FRAME` and `CHART_LAYOUT` are the placement constants every frame is
  built against.
- `assets/gauge-data.ts` — the beat's own reading layer: `parseRdb`, `parseReadings`, `readStation`,
  `deriveFacts`, `group`, `dayAndMonth`. Every figure the beat says out loud comes from here.
- `assets/sample-data/potomac-2024.csv` — 366 daily mean discharge readings, USGS site 01638500,
  2024, frozen beside the beat that credits them.
- `assets/sample-data/potomac-station.rdb` — the USGS site file the station's name, coordinates and
  drainage area are read from. The bake's camera centre is read from it too, so the marker cannot
  drift from the station the beat names.
- `assets/sample-data/potomac-plate.jpg` — the baked basemap, captured once and committed.
- `assets/sample-data/potomac-plate.json` — the plate's own size and the station's projected pixel.
- `assets/sample-data/basin-photo.png` — the seed's illustrated scene, authored by
  `scripts/build-sample-photo.mjs` from flat shapes (nothing fetched, nothing to credit).
- `assets/interaction.mjs` — the one script this genre ships, inlined verbatim. `pickActiveStep`
  and `pickLanePanel` (both pure, both unit-tested) back `initScrolly`, which measures every panel
  against the lane on every scroll of the prose column and adds `scrolly--live`. Its header carries
  the measurement that removed the `IntersectionObserver`.
- `assets/preview.png` — the seed's `DrawnGraphicFrame` rendered standalone: the one frame this
  skill needs nothing else on disk to show. Regenerate with `bun scripts/render-preview.mjs`.
- `scripts/render-scrolly.mjs` — `renderScrolly` (media-agnostic machinery) above the CONFIG marker;
  `SEED`, `DRAWN_VARIANT`, `buildFrame` and `render` below it.
- `scripts/bake-plate.mjs` — the map track's bake. Run once; re-run only if the camera or the
  station changes.
- `scripts/render-preview.mjs` — renders `DrawnGraphicFrame` standalone to `assets/preview.png` or
  `--out <dir>`; `--check` fails if the committed PNG has drifted from a fresh render.
- `scripts/build-sample-photo.mjs` — generates `basin-photo.png` deterministically. Re-run only if
  the scene itself should change.
- `scripts/verify-scrolly.mjs` — the continuous-scroll guard, runnable by hand on any rendered
  scrolly: `bun skills/twin-scrolly/scripts/verify-scrolly.mjs <file.html> [--width=1600]`.
- `scripts/render-still.mjs` — this skill's OWN copy of `deriveFurniture`/`contrast`/`measureText`.
- `output-proof/preview.png` — the drawn frame, rendered from this skill's own data.
- `output-proof/track-1-image.png`, `output-proof/track-2-drawn.png`, `output-proof/track-3-map.png`,
  `output-proof/track-4-chart.png`, `output-proof/track-4-chart-375.png` — the four tracks as a real
  browser rendered them at 1600×900, plus the chart at 375px: the evidence that this vehicle carries
  different media, taken from a driven page rather than described.
- `test/render-scrolly.test.ts` — the generic scaffold, the fixed graphic, the pinned lane, both
  pure decision functions, and the drawn frame's own placement parsed out of the rendered SVG.
- `test/scroll-integrity.test.ts` — the walking guard: `verify-scrolly.mjs` over the seed and every
  scrolly on disk, at three widths, with its three mutations and its blind spots named.
- `test/seed-tracks.test.ts` — the four tracks, both placement rules against real boxes, the data
  layer, and the rendered beat's own claims recomputed from the frozen file.
- `test/canon.test.ts` — the canon's shape, including that the seed still carries a map and a chart.
