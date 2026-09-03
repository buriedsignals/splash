---
name: scrolly
description: Use to produce a scroll-driven interactive (scrollytelling) — a FIXED graphic that fills the frame, with an opaque prose card centred over it and travelling upward as the reader scrolls (the page itself does not scroll). The two scrollies that exist are the IMAGE scrolly (a sequence of the journalist's own photographs) and the MAP scrolly; each is ONE medium under a travelling prose card, and that is the ordinary case. Assembling several media behind one narrative is a documented extension the seed also demonstrates, not the thing to reach for first. It does not invent a second drawing engine and it does not step a single chart through several states — there is no chart scrolly.
---

# scrolly — the graphic is the fixed ground, the prose is pinned in a lane over it, drive a real browser through a CONTINUOUS scroll to check both

## Overview

The scroll-driven vehicle. It does not hold a chart type and it is not a scrollytelling framework:
it holds the **mechanism** — a FIXED graphic that fills the frame behind the reader's own scroll,
with a pinned panel of prose sitting OVER it as N narrative steps go by.

**START FROM THE SINGLE-MEDIUM CASE.** The two scrollies this toolchain produces are the **image
scrolly** — a sequence of the journalist's own photographs under travelling prose, which is what
most reporting actually wants — and the **map scrolly**. One medium, one fixed graphic, prose cards
over it. A journalist with fourteen photographs asked why an image scrolly had not been suggested,
and the reasons were structural rather than editorial (#38): the medium had no type sheet to
enumerate, and this skill's own headline example was the complicated one.

The data model was never in the way: `assemblyGap` returns `null` when `assembles` is empty, so a
slot with `medium: image, format: scrolly` and no assembly list is already legal and already
dispatches to one producer. Nothing had to be relaxed.

**The four-track assembly is an EXTENSION**, not the lesson. The seed carries it — an IMAGE, a drawn
diagram, a baked MAP and a real CHART — because the mechanism has to be shown surviving genuinely
different media, and that is worth having on disk. It is not the shape to reach for first, and
Splash does not aim to handle complex multi-track scrollies as its primary case.

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
  one format, cannot assemble on its own.
- **If every step would show the same chart, do not reach for this skill — animate the beat
  instead.** A scrolly that steps four states of one chart is not a vehicle carrying different
  media; it is a duplicate of a beat that already exists under `chart-web` or
  `chart-beat`, stepped by hand instead of animated.
- When the argument is stronger revealed in STEPS than shown all at once — never suspense for its
  own sake. The beat's overall claim is stated in full in the header, before any step's reveal.
- **Not** a place to invent a new drawing engine. Nothing under a skill may import out of it, so a
  frame component here is written here — but a real beat that already has a chart or a map component
  under another skill hands this scaffold ITS OWN rendered element as a step's `frame`, and the
  scaffold never asks what that element is.
- **Not** a moving camera. The map track shows one baked plate; a scroll-driven `flyTo` would mean
  either a live map in the delivered file or one plate per waypoint — see
  `references/scrolly-discipline.md`, "What this format does not attempt."
- **Not** a registry or a dispatcher. A scrolly carries beats; it is not a new kind of beat.

## The one gotcha that will waste your day (read first)

**A SCROLLY CHECKED BY JUMPING TO SCROLL POSITIONS IS NOT CHECKED.** This format shipped five rounds
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
cannot slide away), and inside row 2 the graphic and the card layer are two absolutely-positioned
layers filling the same box. **The only element in the document with scroll distance is
`.scrolly-steps`.** There is no `position: sticky` on the graphic, no `--graphic-h`, and no negative
margin: nothing is positioned from the scroll, so nothing can lag behind it — and the component
never steals its host article's scroll, which is what an embed must not do. The deliberate overlap
is unchanged; it is expressed as a stack rather than as a reservation being cancelled.

**THE CARD IS CENTRED OVER THE VISUAL, AND IT TRAVELS.** Two corrections landed here in order. The
first: a panel PINNED in a reserved band kept every guard green while the words stopped moving — *le
panel avec le texte ne bouge plus alors que l'effet c'est vraiment de les faire défiler au scroll
vers le haut* — measured at 42-78% of every scroll-advancing frame held at one offset. The second:
the un-pinned panel was given its own CELL of a two-cell grid so it could travel without ever
meeting the graphic, and that is a side column — *le panel avec le texte ne doit pas être sur le côté
mais centré et par dessus le contenu visuel.*

What ships is both corrections at once. `.scrolly-track` is ONE box; the card is an ordinary flow
box, `align-items: center` in a step **140%** of the frame, so it enters at the bottom edge, passes
the middle and leaves past the top, moving by the reader's own scroll on every animation frame.
Measured: 627/931/931/639px of travel per card on the seed at 1600x900, **0% held, in both scroll
directions**. The collision the cell avoided is answered instead by the card being OPAQUE and
MEASURED (below). **The card has exactly two widths and nothing between them** — at most 70% of the
frame (the reading measure, 409px) or the whole of it (below 600px) — because a label the card's own
vertical edge cuts down the middle is broken text for as long as the card is at that row, and that
is the *"flo…"* the owner reported the last time a card was centred. At 375px the in-between shape
sliced the seed's own y-axis labels for 48 consecutive frames; edge to edge it slices none.
**140% rather than 115%** because at 115% the visual is never once unobstructed (0 clear frames of
217, driven); at 140% it stands entirely clear on 26-35 of ~240 and two cards are never on screen at
once, while the step/progress drift stays at 0.58 against a 0.65 ceiling.

**AND THE CARD ENTERS NO MEASUREMENT OF THE VISUAL.** *"Le text panel du scrolly ne doit pas
impacter le déroulé de la map. C'est un élément au-dessus, il n'a pas d'incidence."* A visual's own
state, and every assertion about it, are independent of the prose layer travelling over it — no
guard, at any width, may report a defect whose cause is the card being in front of something. A
probe that reads composited pixels still has to know where the card is, or the card's fill reads as
missing subject; that is an INSTRUMENT concern, and a pixel behind the card is *unobservable* rather
than evidence of anything. The test for a new guard: would the same visual with the prose layer
deleted produce a different verdict? Then it is measuring the overlay. Full reasoning, and the beat
that got this wrong first, in `references/scrolly-discipline.md` (the tenth correction).

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

`pickLanePanel`, the `in-lane` class and `.scrolly--live` went with the pin and have not come back:
a card mid-fade is a TRANSLUCENT box over the visual, which is the one thing the contrast rule below
forbids, and a reader watching the words they are reading dissolve is the owner's own defect wearing
a different costume.

**Legibility is measured, not assumed from an opaque-looking card — and it is the whole reason a
card may sit over a visual at all.** A translucent card's effective colour is a blend with whatever
the graphic shows behind it at a given scroll position, which is not a value anyone can measure. An
opaque card painted with the render's own `ground` has no such ambiguity, so the only contrast
question left is ink-on-ground. `renderScrolly` asserts it at build time, the tests assert it again,
and `verify-scrolly.mjs`'s **F3** asserts it a third time off `getComputedStyle` in a driven browser
— what the browser painted, not what the stylesheet asked for. On this seed's own light ground:
**21.00:1**, read as `rgb(0, 0, 0)` on `rgb(255, 255, 255)`.

**WHAT THE CARD COVERS, stated because it cannot be reserved away.** Driven on a continuous scroll in
both directions at three widths, the card sits over one of the active frame's own labels on 44-175
animation frames of ~240, and the visual stands entirely clear on 12-35. No band can be kept for it:
the card crosses every row equally often, and at the one editorially load-bearing position —
`data-progress = i` — it is dead centre by the definition of that signal. So the seed **reclaimed**
the bottom 28% every frame used to reserve (`PROSE_LANE` and `CONTENT_TOP` are gone; the chart's plot
runs to 0.90 of the frame instead of 0.63, which is 230px of an 821px box given back), and what
replaces the reservation is a composition rule: *nothing whose only copy a reader needs may sit alone
in the card's stripe down the middle of the frame, and nothing may straddle its edge.* Four beats
still carry their own copy of the constant — two derive a camera from it — and that is the named
residue.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/scrolly-discipline.md` | What the card covers and the three things that follow from measuring it; why the card is an overlay that enters no measurement of the visual (the tenth correction); the fixed graphic and the page that does not scroll; why the active step is decided from every panel on every scroll and never from a delta; the sticky model and the two-cell split kept as history because nine rounds of corrections are only legible against them; why scenery is cropped and evidence is fitted; a map track without a live map; what survives with JS off; reduced motion; what this format does not attempt; verification |
| Seed | `assets/ScrollySeed.tsx` | `STEPS_META` (the beat's four-step arc: id, `frameKind`, prose-as-a-function), the four frame components (`ImageFrame`, `DrawnGraphicFrame`, `MapFrame`, `ChartFrame`), and the placement constants: `ASPECT_ENVELOPE`, `safeBand`, `SAFE_AREA`, `FRAME`, `CHART_LAYOUT` |
| Seed data | `assets/gauge-data.ts` | `parseRdb`, `parseReadings`, `readStation`, `deriveFacts`, `group`, `dayAndMonth` — the beat's own reading layer. Nothing here draws; nothing that draws computes a fact |
| Interaction | `assets/interaction.mjs` | `pickActiveStep` and `measureProgress` (both pure, both unit-tested) + `initScrolly` (on every scroll of the card layer, measures every panel against the lane — which IS that layer's own scrollport, covering the graphic edge to edge — toggles `.active` on the winning step and frame, and publishes `data-progress` — the continuous fractional index a consumer scrubs a visual against). Nothing hides a panel any more. No `IntersectionObserver` — see the file's own header. `initAll` runs it |
| Render | `scripts/render-scrolly.mjs` | **Above the CONFIG marker**: `renderScrolly({ steps, title, source, ground, outDir, name, proseLane })` — the format's MEDIA-AGNOSTIC machinery. It SSRs each `frame`, wraps it generically, builds the overlap scaffold and the lane, measures panel contrast, inlines the interaction script. It never reads `frameKind` — `test/render-scrolly.test.ts` scans the function's own source to prove it. **Below the marker**: `SEED`, `DRAWN_VARIANT`, `buildFrame` (the ONE place that reads `frameKind`), `render` (this seed's own runner) |
| Bake | `scripts/bake-plate.mjs` | One camera, one basemap capture, one projected pixel — run once, committed. Since the ruling of 2026-08-10 (`references/scrolly-discipline.md`, "A map on a scrolly is LIVE") the plate is the FALLBACK layer under live MapTiler tiles, not the whole map; the committed HTML carries the `__MAPTILER_KEY__` placeholder and `deliver` substitutes at delivery |
| Rasteriser | `scripts/render-still.mjs` | This skill's OWN copy of `deriveFurniture`/`contrast`/`measureText` — a skill never imports another skill's copy |
| Verify | `scripts/verify-scrolly.mjs` | The guard that watches a CONTINUOUS scroll: a `requestAnimationFrame` recorder installed before anything moves, then assertions A-G (the page never scrolls; the graphic and header never move; every step's frame is painted, in order; each step is handed `active` once; the graphic settles; at most two panels share the lane; **no panel is ever painted over the graphic**; **the prose TRAVELS** — a real sweep per panel and no held offset; and **the visual EVOLVES** — `data-progress` present, monotonic, spanning the piece, moving on the frames where the step does not, and in lock-step with it) plus reduced motion and JS-off. Runnable by hand on any rendered scrolly |
| Test | `test/scroll-integrity.test.ts` | Walks `verify-scrolly.mjs` over the seed and every scrolly on disk at three widths; names the three mutations that redden it — including which sub-assertions each one leaves green — and what it provably does not catch |
| Test | `test/render-scrolly.test.ts` | The generic scaffold: media-agnostic by source-scan, panel contrast, the card over the visual in one box, its two widths, the fixed graphic and the one scroller, the travelling (never pinned) panel, no rule that hides a word, well-formed markup at 4/6/8 steps, and the drawn frame's own safe placement parsed out of the rendered SVG. Every CSS assertion slices the RULE out first — a grep of the whole stylesheet passed for six builds on a doc-comment describing a deleted rule |
| Test | `test/seed-tracks.test.ts` | The four tracks: `safeBand` checked against real box aspect ratios, the reclaimed band and the strip the x-axis labels actually need, `MapFrame`/`ChartFrame` SSR, the data layer, and every figure the rendered beat says out loud recomputed from the frozen CSV |
| Test | `test/canon.test.ts` | The canon's shape: `REPLACE ME` wording, the frozen files are real, the seed renders standalone into an empty directory, the seed still carries a map and a chart track, no registry/dispatcher, preview current |

**Why the title and source occupy separate grid rows.** The title stays in the HTML `<header>` above
the visual; the source follows the track in DOM and layout order, at the visual's floor. Both remain
outside the element that scrolls, so they are unconditional page furniture rather than step content.

**Why every frame is `aria-hidden`, and why that wrapper lives in `renderScrolly`.** The argument is
carried by the unconditional title, source and every step's own prose, never exclusively by the graphic.
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
3. **Decide, per frame, whether it is scenery or evidence.** Scenery (a basemap, a drawn backdrop)
   is COVER-cropped and fills the frame; anything it annotates goes inside `safeBand()`. Evidence (a
   chart, and — since the owner's ruling of 2026-08-10 — a PHOTOGRAPH) is FITTED and never cropped:
   *"respecte le ratio mais remplis au max en largeur ou hauteur"*. A chart's type sits at a fixed
   pixel size over stretched geometry; a photograph is `object-fit: contain` and the letterbox is
   the render's own `ground`.
   **Then place its labels against the CARD's own stripe**, which is the composition rule a card
   travelling over the frame imposes: on a FITTED frame keep the axis furniture in the gutters,
   which are outside the stripe at every width; on a CROPPED frame no placement is outside the
   stripe at every width (the scale changes with the viewport), so put a label INSIDE it and let the
   card hide it whole rather than cut it in half.
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
   `bun skills/scrolly/scripts/verify-scrolly.mjs <file.html>` does it at all three widths.
   Measure — do not eyeball:
   - the active frame settles at a clean `opacity: 1` (every other frame `0`) — never a blend;
   - **THE ELEMENT EVOLVES BETWEEN BOUNDARIES.** Read `data-progress` off the root on every frame:
     it must change on the frames where the active step does not. A visual that only reads the step
     class can only ever catch up at the handover, which reads as a slideshow with a fade;
   - **EVERY CARD MOVES.** Its top must change on every scroll-advancing animation frame, and it
     must enter the frame at the bottom edge and leave past the top. A guard that only asks
     which step is showing stays green on a page whose words have stopped — that is exactly what
     shipped once, and the owner is who found it;
   - **the card is CENTRED on the graphic and OVER it** — its horizontal centre is the graphic's
     own at every frame, its box lies inside the graphic's, and it reaches the graphic's vertical
     middle at some point. A card that drifts to a side is a column in disguise;
   - **the card is ONE OF TWO WIDTHS** — at most 70% of the frame, or the whole of it. The shape
     between them puts a vertical edge where a frame keeps its axis furniture;
   - the graphic fills the frame and its box is IDENTICAL at every recorded frame;
   - the document itself has no scroll distance, and the card layer has all of it;
   - the card's own computed background and colour, read live: fully opaque, one colour for the
     whole pass, and at least 4.5:1 between them;
   - JavaScript disabled: the default frame and EVERY step's prose survive;
   - `prefers-reduced-motion: reduce`: every sampled opacity is exactly 0 or 1;
   - ~375px: nothing clips, the page never scrolls horizontally.
   Screenshot each step and LOOK at it. Driving this seed is what found the inert sticky offset, a
   tick label clipped by the frame's own left edge, and a dashed rule striking through the words of
   the label that names it — none of which any test noticed.

## Quick start

```sh
# the skill's own seed — the frozen data and the baked plate are committed, so nothing is fetched
bun skills/scrolly/scripts/render-scrolly.mjs /tmp/canon-scrolly

# re-bake the map plate only if the camera or the station changes (needs MAPTILER_KEY)
bun skills/scrolly/scripts/bake-plate.mjs

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
| The band a BEAT's frames keep clear at their own bottom. The seed keeps none (the card travels the whole frame and rests nowhere); a beat that derives a camera or a plot box from its own copy still passes one, and the scaffold records it without placing anything against it | `0` (seed) | `proseLane`, `renderScrolly` (emitted as `--prose-lane` / `data-prose-lane`) |
| How much of the FITTED chart frame's own height the plot uses, now that nothing is reserved below it | `0.90` | `CHART_LAYOUT.plot.bottom`, `ScrollySeed.tsx` |
| The frame width below which the card goes edge to edge instead of taking the reading measure — 410px stops being 70% of the frame at 586 | `600px` | the `min-width` media query, `buildCss`, `render-scrolly.mjs` |
| The box-aspect range a COVER-cropped frame's annotations are guaranteed to survive | `{ min: 0.42, max: 2.4 }` | `ASPECT_ENVELOPE`, `ScrollySeed.tsx` |
| How many narrative steps the seed carries | `4` | `STEPS_META`, `ScrollySeed.tsx` — any count ≥ 2 works, with at least three distinct `frameKind`s including a map and a chart (canon-enforced) |
| The drawn frame's own design canvas | `640 × 900` | `FRAME`, `ScrollySeed.tsx` |
| The chart's plot box and its geometry-only viewBox | `plot` / `viewBox` | `CHART_LAYOUT`, `ScrollySeed.tsx` |
| The map plate's size and camera | `--width 1000 --height 640`, zoom `9` | `CAMERA`, `bake-plate.mjs` |
| The frame the graphic fills — the component's own height, minus the fixed header's row | `100%` of `.scrolly`, `grid-template-rows: auto minmax(0, 1fr)` | `.scrolly`, `buildCss`, `render-scrolly.mjs` |
| How long a reader scrolls through one step — the same for every step, including the last, as a fraction of the TRACK (not the viewport). Raising it buys clear air between two cards and costs step/progress lock-step | `140%` | `.step` min-height, `buildCss`, `render-scrolly.mjs` |
| The card's own max width, above the regime change | `min(46ch, 100%)` — 409px rendered | `.step-panel` inside `@media (min-width: 600px)`, `buildCss`, `render-scrolly.mjs` |
| The card's own max width, below it | `100%` of the frame, edge to edge | `.step-panel`, `buildCss`, `render-scrolly.mjs` |
| The header's own reading measure (the graphic does NOT share it) | `640px` | `.scrolly-header` max-width, `buildCss`, `render-scrolly.mjs` |
| The header's own side gutter | `clamp(16px, 6vw, 56px)` | `.scrolly-header`, `buildCss`, `render-scrolly.mjs` |
| The card's own side gutter, on the viewports that have one | `clamp(16px, 6vw, 56px)` | `--prose-gutter`, `buildCss`, `render-scrolly.mjs` |
| The share of the frame's width above which a card must go edge to edge instead — frames keep their axis furniture in the outer ~15%, so a card's own vertical edge must land inside the middle 70% or nowhere | `0.70` | assertion F4, `verify-scrolly.mjs` |
| The step-boundary swap's transition — the ONLY animated property, and only at a boundary | `0.3s` | `buildCss`, `render-scrolly.mjs` |
| The band the interaction layer measures every panel against | the card layer's own scrollport rect, which covers the graphic edge to edge — nothing to configure, and nothing read off the markup | `initScrolly`, `interaction.mjs` |
| The continuous signal a consumer scrubs on, and where the reference line sits | the fractional index of the panel on the LANE's centre line, published as `data-progress` on the root | `measureProgress`, `interaction.mjs` |
| How far the active step may drift from the progress before the guard calls it a desync | `0.65` of a step (the crossover itself measures 0.50-0.54) | assertion H, `verify-scrolly.mjs` |
| How long a reader dwells on one step while the guard drives, in animation frames — derived from each beat's own step height so a phone and a desktop get the same dwell, never the same pixel rate | `60` | `FRAMES_PER_STEP`, `verify-scrolly.mjs` |
| The WCAG floor `renderScrolly`'s own panel-contrast tripwire enforces | `4.5` | `renderScrolly`, `render-scrolly.mjs` |
| The drawn step's own illustrated water level and day label (never a plotted value) | `{ waterLevelT, dayLabel }` | `DRAWN_VARIANT`, `render-scrolly.mjs` |

## Files

- `references/scrolly-discipline.md` — the doctrine: what the card covers, measured, and the three
  things that follow (no band can be reserved, the card has two widths, some frames must be composed
  differently); the step height and what raising it buys and costs; the sticky-reservation fact and
  the deliberate overlap; the `bottom`-sticky trap and the two-cell split, both kept as history;
  scenery cropped vs evidence fitted; a map track without a live map; the reading measure on the
  prose and never on `.scrolly`; how prose-over-graphic contrast is measured; what survives with JS
  off; reduced motion; what this format does not attempt; verification.
- `assets/ScrollySeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat. `STEPS_META` is its four-step arc; `ImageFrame`, `DrawnGraphicFrame`, `MapFrame`
  and `ChartFrame` are its four frame components; `ASPECT_ENVELOPE`, `safeBand`, `SAFE_AREA`, `FRAME`
  and `CHART_LAYOUT` are the placement constants every frame is built against.
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
- `assets/interaction.mjs` — the one script this format ships, inlined verbatim. `pickActiveStep`
  (pure, unit-tested) backs `initScrolly`, which measures every panel against the card layer's own
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
  scrolly: `bun skills/scrolly/scripts/verify-scrolly.mjs <file.html> [--width=1600]`.
- `scripts/render-still.mjs` — this skill's OWN copy of `deriveFurniture`/`contrast`/`measureText`.
- `output-proof/preview.png` — the drawn frame, rendered from this skill's own data.
- `output-proof/track-1-image.png`, `output-proof/track-2-drawn.png`, `output-proof/track-3-map.png`,
  `output-proof/track-4-chart.png`, `output-proof/track-4-chart-375.png` — the four tracks as a real
  browser rendered them at 1600×900, plus the chart at 375px, each captured at the scroll position
  where `data-progress` reaches that step: the evidence that this vehicle carries different media,
  and that the card sits centred and opaque over each of them — taken from a driven page rather than
  described.
- `test/render-scrolly.test.ts` — the generic scaffold, the fixed graphic, the card over the visual
  and its two widths, both pure decision functions, and the drawn frame's own placement parsed out
  of the rendered SVG.
- `test/scroll-integrity.test.ts` — the walking guard: `verify-scrolly.mjs` over the seed and every
  scrolly on disk, at three widths, with every mutation that reddens it pasted into its header and
  its blind spots named.
- `test/seed-tracks.test.ts` — the four tracks, `safeBand` against real boxes, the reclaimed band
  and what the x-axis strip actually needs, the data layer, and the rendered beat's own claims
  recomputed from the frozen file.
- `test/canon.test.ts` — the canon's shape, including that the seed still carries a map and a chart.
