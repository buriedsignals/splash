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

**THE PROSE HAS ITS OWN SPACE, AND THAT IS WHAT LETS IT TRAVEL.** The round before this one closed
the last prose-over-graphic collision by PINNING each panel in a reserved band, and every guard here
stayed green while the words stopped moving. The owner needed one sentence: *le panel avec le texte
ne bouge plus alors que l'effet c'est vraiment de les faire défiler au scroll vers le haut.* Measured
on the shipped artifacts, the middle panels held ONE screen offset for 42-45% of every
scroll-advancing animation frame and the last for 78%, sweeping 187px of an 821px track.

The fix is not to un-pin it back into a shared box — a travelling OPAQUE panel crosses every part of
a graphic it shares a box with, which is the defect the pin existed to close. `.scrolly-track` is a
**two-cell grid** and each cell clips its own content: the graphic in one, the prose column in the
other, side by side above 860px and stacked below it. `.step` is `align-items: center` and 15% taller
than the column it scrolls inside, so **the panel enters at the column's bottom edge, passes the
middle and leaves past the top, moving by the reader's own scroll on every animation frame** — and a
collision is impossible by construction rather than avoided by a reservation. Measured after: 544px,
992px, 992px and 553px of travel per panel on the same beat, held share 0%. The cost is that the
graphic spans the viewport minus the prose column, not the whole viewport.

**AND THE VEHICLE NOW PUBLISHES A CONTINUOUS SIGNAL, not only a step.** With the prose travelling
again the owner drove the two single-visual beats: *faut que ce soit fluide et que l'élément évolue
au fur et à mesure du temps.* Right, and structural: the vehicle published a step class and a 0.3s
transition that finishes exactly when that class moves, so between two boundaries a re-parented
visual had NOTHING to scrub against and could only catch up at the handover. `data-progress` is now
written on the root on every scroll — the FRACTIONAL INDEX of the panel on the lane's centre line,
`0 … steps - 1`, interpolated between the two card centres that bracket it. Measured over the CARDS,
never over the scroller's own `scrollTop`, so "the drawing reaches the moment this sentence names"
and "this sentence reaches the middle of its column" are one event; measured drift against the active
step, across the seed and six beats at three widths, is 0.50-0.54 — the crossover itself.
**The inlined scaffold is wrapped in an IIFE**: `inlineable()` makes every declaration a global, and
a beat that inlines a script of its own shares that scope — adding `measureProgress` silently
overwrote both single-visual beats' own function of that name until it was scoped.

`pickLanePanel`, the `in-lane` class and `.scrolly--live` went with the pin — with the prose clipped
inside its own cell there is nothing to withhold paint from, and fading a panel mid-travel would be
the owner's own defect wearing a different costume. **Two panels on screen through a boundary is what
a boundary looks like.** `PROSE_LANE` still reserves the bottom 28% of every FRAME (`safeBand()` /
`CONTENT_TOP`), for a panel that no longer goes there: dead space, named as residue in the doctrine,
and reclaiming it is a change to every beat's own frames.

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
| Interaction | `assets/interaction.mjs` | `pickActiveStep` and `measureProgress` (both pure, both unit-tested) + `initScrolly` (on every scroll of the prose column, measures every panel against the lane — which since the eighth correction IS the column's own scrollport — toggles `.active` on the winning step and frame, and publishes `data-progress` — the continuous fractional index a consumer scrubs a visual against). Nothing hides a panel any more. No `IntersectionObserver` — see the file's own header. `initAll` runs it |
| Render | `scripts/render-scrolly.mjs` | **Above the CONFIG marker**: `renderScrolly({ steps, title, source, ground, outDir, name, proseLane })` — the genre's MEDIA-AGNOSTIC machinery. It SSRs each `frame`, wraps it generically, builds the overlap scaffold and the lane, measures panel contrast, inlines the interaction script. It never reads `frameKind` — `test/render-scrolly.test.ts` scans the function's own source to prove it. **Below the marker**: `SEED`, `DRAWN_VARIANT`, `buildFrame` (the ONE place that reads `frameKind`), `render` (this seed's own runner) |
| Bake | `scripts/bake-plate.mjs` | One camera, one basemap capture, one projected pixel — run once, committed; the delivered HTML carries no key and makes no request |
| Rasteriser | `scripts/render-still.mjs` | This skill's OWN copy of `deriveFurniture`/`contrast`/`measureText` — a skill never imports another skill's copy |
| Verify | `scripts/verify-scrolly.mjs` | The guard that watches a CONTINUOUS scroll: a `requestAnimationFrame` recorder installed before anything moves, then assertions A-G (the page never scrolls; the graphic and header never move; every step's frame is painted, in order; each step is handed `active` once; the graphic settles; at most two panels share the lane; **no panel is ever painted over the graphic**; **the prose TRAVELS** — a real sweep per panel and no held offset; and **the visual EVOLVES** — `data-progress` present, monotonic, spanning the piece, moving on the frames where the step does not, and in lock-step with it) plus reduced motion and JS-off. Runnable by hand on any rendered scrolly |
| Test | `test/scroll-integrity.test.ts` | Walks `verify-scrolly.mjs` over the seed and every scrolly on disk at three widths; names the three mutations that redden it — including which sub-assertions each one leaves green — and what it provably does not catch |
| Test | `test/render-scrolly.test.ts` | The generic scaffold: media-agnostic by source-scan, panel contrast, the two-cell split, the fixed graphic and the one scroller, the travelling (never pinned) panel, no rule that hides a word, well-formed markup at 4/6/8 steps, and the drawn frame's own safe placement parsed out of the rendered SVG. Every CSS assertion slices the RULE out first — a grep of the whole stylesheet passed for six builds on a doc-comment describing a deleted rule |
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
   COVER-cropped and fills its own cell; anything it annotates goes inside `safeBand()`. Evidence (a
   chart) is FITTED and never cropped, with its content inside `CONTENT_TOP` and its type at a fixed
   pixel size over stretched geometry. The graphic's cell is narrower than the viewport on a desktop
   and shorter than the track on a phone — COVER crops LESS in a narrower box, not more, and
   `ASPECT_ENVELOPE` already spans every cell shape the split produces.
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
   - **THE ELEMENT EVOLVES BETWEEN BOUNDARIES.** Read `data-progress` off the root on every frame:
     it must change on the frames where the active step does not. A visual that only reads the step
     class can only ever catch up at the handover, which reads as a slideshow with a fade;
   - **EVERY PANEL MOVES.** Its top must change on every scroll-advancing animation frame, and it
     must enter the prose column at the bottom edge and leave past the top. A guard that only asks
     which step is showing stays green on a page whose words have stopped — that is exactly what
     shipped once, and the owner is who found it;
   - **no visible prose ever touches the graphic's box** — clip each panel by the column that
     scrolls it and each label by the cell that holds it, then test the two for intersection;
   - no annotation falls outside its own cell;
   - the graphic fills its own CELL (the viewport minus the prose column on a desktop, the track
     minus the prose band on a phone), and its box is IDENTICAL at every recorded frame;
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
| The band every FRAME keeps clear at its own bottom. Declared, no longer placed against: the prose moved into its own cell and nothing occupies this band now (residue — see the doctrine) | `0.28` | `PROSE_LANE`, `ScrollySeed.tsx` (emitted as `--prose-lane` / `data-prose-lane` by `render-scrolly.mjs`) |
| How much of a FITTED frame's own height its content may use, derived from the lane | `1 - PROSE_LANE` | `CONTENT_TOP`, `ScrollySeed.tsx` |
| The box-aspect range a COVER-cropped frame's annotations are guaranteed to survive | `{ min: 0.42, max: 2.4 }` | `ASPECT_ENVELOPE`, `ScrollySeed.tsx` |
| How many narrative steps the seed carries | `4` | `STEPS_META`, `ScrollySeed.tsx` — any count ≥ 2 works, with at least three distinct `frameKind`s including a map and a chart (canon-enforced) |
| The drawn frame's own design canvas | `640 × 900` | `FRAME`, `ScrollySeed.tsx` |
| The chart's plot box and its geometry-only viewBox | `plot` / `viewBox` | `CHART_LAYOUT`, `ScrollySeed.tsx` |
| The map plate's size and camera | `--width 1000 --height 640`, zoom `9` | `CAMERA`, `bake-plate.mjs` |
| The frame the graphic fills — the component's own height, minus the fixed header's row | `100%` of `.scrolly`, `grid-template-rows: auto minmax(0, 1fr)` | `.scrolly`, `buildCss`, `render-scrolly.mjs` |
| How long a reader scrolls through one step — the same for every step, including the last, as a fraction of the TRACK (not the viewport) | `115%` | `.step` min-height, `buildCss`, `render-scrolly.mjs` |
| The prose COLUMN's own width, side by side with the graphic | `clamp(300px, 30%, 440px)` | `--prose-col`, `buildCss`, `render-scrolly.mjs` |
| The prose BAND's own height when the two stack | `clamp(150px, 42%, 340px)` | `--prose-band`, `buildCss`, `render-scrolly.mjs` |
| Where the two stop sitting side by side and stack instead — the prose column's 300px floor plus the 477px a FITTED chart frame's `max(62px, 13%)` gutter needs before it stops scaling | `860px` | the one `@media` in `buildCss`, `render-scrolly.mjs` |
| The prose panel's own max width | `min(46ch, 100%)` | `.step-panel`, `buildCss`, `render-scrolly.mjs` |
| The header's own reading measure (the graphic does NOT share it) | `640px` | `.scrolly-header` max-width, `buildCss`, `render-scrolly.mjs` |
| The header's own side gutter | `clamp(16px, 6vw, 56px)` | `.scrolly-header`, `buildCss`, `render-scrolly.mjs` |
| The step's own side gutter inside the prose column | `clamp(16px, 6vw, 32px)` | `--prose-gutter`, `buildCss`, `render-scrolly.mjs` |
| The step-boundary swap's transition — the ONLY animated property, and only at a boundary | `0.3s` | `buildCss`, `render-scrolly.mjs` |
| The band the interaction layer measures every panel against | the prose column's own scrollport rect — nothing to configure, and nothing read off the markup | `initScrolly`, `interaction.mjs` |
| The continuous signal a consumer scrubs on, and where the reference line sits | the fractional index of the panel on the LANE's centre line, published as `data-progress` on the root | `measureProgress`, `interaction.mjs` |
| How far the active step may drift from the progress before the guard calls it a desync | `0.65` of a step (the crossover itself measures 0.50-0.54) | assertion H, `verify-scrolly.mjs` |
| How long a reader dwells on one step while the guard drives, in animation frames — derived from each beat's own step height so a phone and a desktop get the same dwell, never the same pixel rate | `60` | `FRAMES_PER_STEP`, `verify-scrolly.mjs` |
| The WCAG floor `renderScrolly`'s own panel-contrast tripwire enforces | `4.5` | `renderScrolly`, `render-scrolly.mjs` |
| The drawn step's own illustrated water level and day label (never a plotted value) | `{ waterLevelT, dayLabel }` | `DRAWN_VARIANT`, `render-scrolly.mjs` |

## Files

- `references/scrolly-discipline.md` — the doctrine: the prose's own space and the two measured
  numbers that decide the split; the sticky-reservation fact and the deliberate
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
  (pure, unit-tested) backs `initScrolly`, which measures every panel against the prose column's own
  scrollport on every scroll of it. Its header carries the measurement that removed the
  `IntersectionObserver`, and the one that removed the second decision.
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
