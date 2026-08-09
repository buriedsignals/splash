---
name: twin-scrolly
description: Use to produce a scroll-driven interactive (scrollytelling) — a sticky graphic that fills the frame behind, with narrative prose stepping over it as the reader scrolls. A VEHICLE, not a fourth chart genre — it ASSEMBLES DIFFERENT MEDIA behind one narrative; its seed carries four tracks (a scene, a drawn diagram, a baked MAP and a real CHART). It does not invent a second drawing engine and it does not step a single chart through several states.
---

# twin-scrolly — the graphic is the ground, the prose is pinned in a lane over it, drive a real browser to check both

## Overview

The scroll-driven vehicle. It does not hold a chart type and it is not a scrollytelling framework:
it holds the **mechanism** — a sticky graphic that fills the frame behind the reader's own scroll,
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

**`position: sticky` with a `bottom` offset only ever shifts a box UP.** It clamps a box that would
otherwise sit BELOW the offset line; it can never push one down. So a prose panel placed at the TOP
of its step has nowhere to be shifted to and travels with the scroll exactly as if `position:
sticky` were not there — the CSS looks right, the panel is not pinned, and every collision the
pinning was meant to remove is still there. This was shipped and measured before it was caught: at
1600×900 the panel moved from y=768 to y=−32 across one step. **The panel must sit at the BOTTOM of
its step box (`align-items: flex-end`) for the offset to do anything at all.**

That matters because the pinned panel is what makes the vehicle's own deliberate overlap safe.
`.scrolly-graphic` sits sticky at the top of `.scrolly-track`, reserving a box `--graphic-h` tall,
and `.scrolly-steps` is given `margin-top: calc(-1 * var(--graphic-h))` to pull the prose column
back UP over that exact reserved box on purpose. Prose and graphic share the same screen coordinates
by design. What keeps that readable is not luck, it is a **lane**: `PROSE_LANE` reserves the bottom
28% of the graphic for the panel, and every frame keeps everything it annotates above it —
`safeBand()` for the frames that are COVER-cropped, `CONTENT_TOP` for the ones that are fitted. One
number, written into the CSS as `--prose-lane` and onto the root as `data-prose-lane`, read by the
frames, the scaffold and the interaction layer alike.

**Legibility is measured, not assumed from an opaque-looking panel.** Every panel is painted fully
OPAQUE with the render's own `ground` — never a translucent scrim, whose effective colour would
drift with whatever part of the graphic sits behind it — so ink-on-ground is exactly what a reader
sees. `renderScrolly` asserts that contrast at build time and the tests assert it again; on this
seed's own light ground it is **21.00:1**, confirmed a second way by reading `getComputedStyle` in a
driven browser.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/scrolly-discipline.md` | The sticky-reservation fact and how the shipped remedy uses it on purpose; the prose lane and the two halves that must agree; why scenery is cropped and evidence is fitted; a map track without a live map; what survives with JS off; reduced motion; what this genre does not attempt; verification |
| Seed | `assets/ScrollySeed.tsx` | `STEPS_META` (the beat's four-step arc: id, `frameKind`, prose-as-a-function), the four frame components (`ImageFrame`, `DrawnGraphicFrame`, `MapFrame`, `ChartFrame`), and the placement constants: `PROSE_LANE`, `ASPECT_ENVELOPE`, `safeBand`, `SAFE_AREA`, `CONTENT_TOP`, `FRAME`, `CHART_LAYOUT` |
| Seed data | `assets/gauge-data.ts` | `parseRdb`, `parseReadings`, `readStation`, `deriveFacts`, `group`, `dayAndMonth` — the beat's own reading layer. Nothing here draws; nothing that draws computes a fact |
| Interaction | `assets/interaction.mjs` | `pickActiveStep` (pure, unit-tested) + `initScrolly` (observes each pinned PANEL through the lane, toggles `.active` on the matching step and frame, and adds `scrolly--live` so the one-panel-at-a-time CSS only ever applies where a script runs). `initAll` runs it |
| Render | `scripts/render-scrolly.mjs` | **Above the CONFIG marker**: `renderScrolly({ steps, title, source, ground, outDir, name, proseLane })` — the genre's MEDIA-AGNOSTIC machinery. It SSRs each `frame`, wraps it generically, builds the overlap scaffold and the lane, measures panel contrast, inlines the interaction script. It never reads `frameKind` — `test/render-scrolly.test.ts` scans the function's own source to prove it. **Below the marker**: `SEED`, `DRAWN_VARIANT`, `buildFrame` (the ONE place that reads `frameKind`), `render` (this seed's own runner) |
| Bake | `scripts/bake-plate.mjs` | One camera, one basemap capture, one projected pixel — run once, committed; the delivered HTML carries no key and makes no request |
| Rasteriser | `scripts/render-still.mjs` | This skill's OWN copy of `deriveFurniture`/`contrast`/`measureText` — a skill never imports another skill's copy |
| Test | `test/render-scrolly.test.ts` | The generic scaffold: media-agnostic by source-scan, panel contrast, overlap markup, the pinned lane, one-panel-at-a-time, well-formed markup at 4/6/8 steps, and the drawn frame's own safe placement parsed out of the rendered SVG |
| Test | `test/seed-tracks.test.ts` | The four tracks: `safeBand` checked against real box aspect ratios, `CONTENT_TOP` against fitted boxes, `MapFrame`/`ChartFrame` SSR, the data layer, and every figure the rendered beat says out loud recomputed from the frozen CSV |
| Test | `test/canon.test.ts` | The canon's shape: `REPLACE ME` wording, the frozen files are real, the seed renders standalone into an empty directory, the seed still carries a map and a chart track, no registry/dispatcher, preview current |

**Why the title and source live in the HTML `<header>`, ahead of the track entirely.** The header is
the ONE piece of furniture that never sits over the graphic — plain document flow, scrolled past
once, before `.scrolly-track` begins. The beat's argument is stated in full, unconditional, before
any step's reveal.

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
8. **Render the HTML, then DRIVE A REAL BROWSER**, sampling scroll position across the FULL
   scrollable distance at several viewport sizes, and measure — do not eyeball:
   - the active frame settles at a clean `opacity: 1` (every other frame `0`) — never a blend;
   - **no annotation of the active frame overlaps any visible prose panel, at any sampled offset**
     — take the bounding boxes of both and test them for intersection, at the widest and narrowest
     aspects, not only the ones in between;
   - no annotation falls outside the viewport;
   - exactly ONE panel is painted at a time;
   - the sticky graphic spans the full viewport WIDTH (`left === 0`, `right === innerWidth`) AND
     HEIGHT (`height === innerHeight`) while pinned;
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
| The sticky graphic's own height (it fills the full viewport on both axes, cropped never stretched) | `100vh` | `--graphic-h`, `buildCss`, `render-scrolly.mjs` |
| How long a reader scrolls through one step — the same for every step, including the last | `115vh` | `.step` min-height, `buildCss`, `render-scrolly.mjs` |
| How far the pinned panel sits above the viewport's bottom edge | `clamp(16px, 4vh, 40px)` | `.step-panel` bottom, `buildCss`, `render-scrolly.mjs` |
| The prose panel's own max width | `min(46ch, 100%)` | `.step-panel`, `buildCss`, `render-scrolly.mjs` |
| The header's own reading measure (the graphic does NOT share it) | `640px` | `.scrolly-header` max-width, `buildCss`, `render-scrolly.mjs` |
| The header's and the step's own side gutter | `clamp(16px, 6vw, 56px)` | `buildCss`, `render-scrolly.mjs` |
| The step-boundary swap's transition — the ONLY animated property, and only at a boundary | `0.3s` | `buildCss`, `render-scrolly.mjs` |
| The band the IntersectionObserver watches — the lane itself, read off the markup | `data-prose-lane` | `initScrolly`, `interaction.mjs` |
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
  (pure, unit-tested) backs `initScrolly`, which observes each pinned panel through the lane and
  adds `scrolly--live`.
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
- `scripts/render-still.mjs` — this skill's OWN copy of `deriveFurniture`/`contrast`/`measureText`.
- `output-proof/preview.png` — the drawn frame, rendered from this skill's own data.
- `output-proof/track-1-image.png`, `output-proof/track-2-drawn.png`, `output-proof/track-3-map.png`,
  `output-proof/track-4-chart.png`, `output-proof/track-4-chart-375.png` — the four tracks as a real
  browser rendered them at 1600×900, plus the chart at 375px: the evidence that this vehicle carries
  different media, taken from a driven page rather than described.
- `test/render-scrolly.test.ts` — the generic scaffold, the pinned lane, and the drawn frame's own
  placement parsed out of the rendered SVG.
- `test/seed-tracks.test.ts` — the four tracks, both placement rules against real boxes, the data
  layer, and the rendered beat's own claims recomputed from the frozen file.
- `test/canon.test.ts` — the canon's shape, including that the seed still carries a map and a chart.
