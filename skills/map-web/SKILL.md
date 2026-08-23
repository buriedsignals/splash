---
name: map-web
description: Use to produce a map beat in the WEB format — a self-contained interactive HTML page that fits the reader's window, where focusing a region gives its exact value and hovering does too for every region this camera draws larger than a pixel, a size legend stays readable, and an accessible table (on by default; not optional on a camera that draws marks under a pixel, since it is then those marks' only complete reading) carries the same facts for a reader with no spatial access to the map. Fills the missing cell in this toolchain's matrix — charts ship static/web/video, maps shipped only static/video until this skill.
---

# map-web — bake the plate once, draw circles a reader can interrogate, and answer for the reader who cannot see the shape

## Overview

The web format of a map beat. It does not hold a map type and it does not fill a config: it holds
**the interaction**, the same missing piece `chart-web` is for the chart engine — a reader who
can ask "what is this one worth?" and get an exact answer, without anything the legend or the title
already states being gated behind that ask. Before this skill, a map beat could ship static
(`map-beat`'s still) or video (`map-beat`'s mp4), never a genuinely interactive one — the
cell this skill closes.

The one seed proven through this skill, a proportional-symbol map of a sample of thirteen European
metro-area populations (`assets/MapWebSeed.tsx`), draws from the SAME baked-plate approach
`map-beat` ships for its own two formats — the `cartographic-rules`
(`doctrine/references/geo-discipline.md`) rules 1,
2, 4, 6, 7, 9, 12: `scripts/bake-plate.mjs` spends the camera once, and the component draws an
`<image>` and some `<circle>`s. **Since ruling R1 (2026-08-10) that render is the FALLBACK layer,
not the beat**: the page ships a live MapTiler map over it (`assets/live-map.mjs` — MapTiler's own
zoom and pan, leashed to the subject's area after the runtime fit, one `setFilter` vocabulary shared
with the CSS), and the baked plate is what a reader gets offline, with JavaScript off, or on the day
a key is rotated. The sentence that used to stand here — *"never a live map"* — was left behind by
the ruling for a whole chantier while every committed page really was a picture; it is corrected
rather than deleted, because a doctrine file that leads the code is what that cost.
Nothing under this skill imports `map-beat`'s
own files, though — a skill has to build after being copied alone into a journalist's root, so this
skill carries its OWN copies of everything it needs (`assets/geo-symbol.ts`,
`scripts/render-still.mjs`, `scripts/bake-plate.mjs`), trimmed to what a proportional-symbol beat
actually uses (no polygon join — see the gotcha in `map-beat`'s own `SKILL.md`, "a data join
fails silently" — a point has no shape to join).

There was no doctrine for this format before this skill. `references/map-web-discipline.md` was
written against this beat's first real build, the way `chart-web/references/web-discipline.md`
was written against the chart engine's own first web build — read it before writing a second map-web
beat, especially its first section: a map is a spatial medium, and a hover tooltip alone is not an
accessible answer to that fact.

## When to use

- When a closed `STORYBOARD.md` picks medium **map** and format **web**, and the beat's `BRIEF.md` is
  written. No brief, no code — same rule every format in this twin follows.
- When the argument is stronger with **every region's exact value available on demand** than with
  the handful a static legend has room to label. The linear table for a reader with no spatial
  access ships beside it by default (`regionTable`, opt-out per beat) — read
  `references/map-web-discipline.md`, "The accessibility question", which states plainly what
  turning it off costs that reader, before deciding either way. A choropleth (regions shaded by value) or a proportional-symbol map
  (circles sized by value) both qualify — this seed is the symbol case, and the choropleth case is
  written: `assets/geo-choropleth.ts` is this skill's own copy of the polygon core (the join, the
  classes, the ramp, the two surfaces that are not the data, the ring arithmetic), and
  `proof/mapgen-choropleth-web/` is the complete worked beat to copy. Read "Producing a choropleth"
  below before starting one.
- **Not** to re-draw a map that already exists as a still or a video build — bake once, reuse the
  plate the same way `map-beat` reuses one camera across its own two formats.
- **Not for a route or flow map, and this is a producer fact rather than a taste one.** What this
  skill can draw is what it has machinery for: proportional symbols, choropleths, dot density, hex
  grids and locators. There is no flow path here — no seed, no pure core, no live-plan builder and
  no interaction model — so a route asked for as an interactive page is a route somebody writes
  from nothing, off doctrine, inside a story. Measured once, in round six: 29 defects, the highest
  of any beat in six rounds, and five silent failures every one of which was found by driving the
  page and none by a test. A route belongs on `map-beat`'s still or its video, where the journey is
  revealed rather than interrogated; an origin-destination table is not a route map at all and is
  carried by one of the readings above (`map-beat/references/types/flow-map.md`). The format gate
  refuses the cell rather than offering it (`storyboard/scripts/format-gate.mjs`,
  `TREATMENT_FORMAT_GAPS`).
- **REVERSED 2026-08-10 (ruling R1).** This bullet used to read *"Not for pan/zoom on a LIVE tile
  source… the shipped HTML makes zero external request once the plate is inlined as a data URI."*
  The owner overturned it: *a web map you cannot move through is a picture.* The map IS a live
  MapTiler map now, constrained to the subject's area, and the delivered file DOES make a request to
  `api.maptiler.com`. The baked plate is still shipped, as the FALLBACK layer — so the page still
  renders complete with JavaScript off, offline, and after a key is rotated. The reversal, and what
  it costs (payload, a ground that is no longer frozen, reader IP addresses, CSP, quota), is written
  out in `references/map-web-discipline.md`, "Pan and zoom". Old text, kept: bounded pan/zoom
  OVER that same baked plate is a different question — see the next bullet.

**Add a filter only when the test passes — most beats do not need one.** A filter (`references/map-web-discipline.md`, "Filters") is warranted when the study set has a natural, orthogonal
subsetting dimension a reader would plausibly want to isolate — enough distinct groups, and enough
points per group, that narrowing to one is a genuinely different, useful reading. It is NOT
warranted to declutter a busy map, hide outliers, or work around a legend/table with "too many
rows" — that moves argument-bearing content behind an interaction under a different name, which this
format forbids regardless of motive. The unfiltered default must always already show the whole claim
the title makes. This seed's own thirteen points across three regions is close to the honest floor
for the test to pass — it demonstrates the mechanism, not evidence every beat needs one; a beat with
one group renders no filter at all (`groupsOf(points).length <= 1`).

**The filter is pure CSS and stays that way** — `:has()` + `:checked`, so it narrows the labels, the
hit targets and the accessible table with JavaScript off. The live layer ADDITIONALLY calls
`setFilter` on the same slug, because CSS cannot address a MapLibre layer: without it a reader who
picks a region gets a narrowed label set over an unnarrowed map. With JavaScript off the fallback
plate shows every circle under a filtered label set, which is a deliberate degraded state —
`references/map-web-discipline.md`, "The class: one mark, two halves, two mechanisms", states it and
states what the size legend and the subject sentence do NOT follow, and why.

**Pan and zoom are no longer a per-beat decision** (ruling R1): every map × web beat is a live map a
reader can move through. What IS per beat is `SEED.live` — set it `false` for a beat that must stay
request-free (an offline archive, a CMS whose Content-Security-Policy refuses `api.maptiler.com`),
and the page ships as the fallback layer alone, exactly as this format worked before the ruling.

The reader's leash is derived, never picked: `minZoom` is the zoom the camera fitted to at the
reader's own container size, so the claim the title makes is always fully on screen; `maxBounds` is
**the view that fit actually produced**, set after it rather than before — set to the square plate's
own corners instead, it raised MapLibre's minimum zoom and cropped six of thirteen points out of a
beat whose title claims all of them; `maxZoom` comes from `maxZoomForStudySet` — for a
proportional symbol, the zoom at which the study set stops filling the frame. A camera already tight
on its subject therefore gets a short leash (measured on this seed: half a zoom level), which is the
intended behaviour and not a defect. The accessible table reads no camera state at all, so panning
never regresses the one channel that serves a screen-reader user.

## The one gotcha that will waste your day (read first)

**A static render can be checked with a PNG; an interactive one cannot — and a map's own
accessibility question is not the same question a chart's web format already answered.** Every rule
in `geo-discipline.md` about the pixels still applies to this format's own furniture (the legend, the
labels, the water tint), the same way `static-discipline.md` (`chart-beat/references/static-discipline.md`)
applies to any format that draws its own geometry, but the thing unique to THIS format — does hovering point X show point X's
own exact value, does Tab reach every one of the points AND every control (filter radios, the zoom
checkbox), does the accessible table read correctly, do the map and its legend survive JavaScript
being off — is a *behaviour over time*, provable only by driving a real browser and using it. See
`references/map-web-discipline.md`, "The accessibility question," before assuming a hover tooltip is
enough: it is not, because it requires spatial access to find in the first place, which is exactly
what a screen-reader user does not have. The second trap this skill's own bake avoids by construction
rather than by discipline: MapTiler's `dataviz-light` basemap paints water a near-grey (`hsl(240, 2%,
88%)`), and a point-based beat leaves nearly the whole plate exposed as basemap —
`scripts/bake-plate.mjs` overrides the `Water`/`Water shadow` layers to a genuine blue tint before
capture, the fix `geo-discipline.md` rule 7 requires and that another beat in this same project only
found by looking at a rendered symbol map, not by reading the style. **The tint is DERIVED, not
fixed** (`basemapWaterFor`, 2026-08-23): it was the literal `#aac9e0` for a year, and on a dark
newsroom ground that literal measured 10.22:1 against the ground where the beat's own accent measured
8.02:1 — the sea was the loudest thing on a map about land, and an accent circle over it measured
1.27:1 against a 3:1 floor. The derivation reads this beat's own `PALETTE.md`, places the sea in the
band between the ground and the nearest thing that carries data, and bounds it by the contrast a mark
needs against what it is drawn on; the bake then decodes its own capture and refuses it rather than
writing it (`plateSurfacesYieldToInk`).

**The third trap: a hover you never dispatched at a real pixel is a hover you never tested.** An
HTML overlay with no `pointer-events: none` once swallowed every hover on this format's own map while
keyboard focus kept working — because `.focus()` does not hit-test, which is exactly why no test
caught it. `scripts/verify-interaction.mjs` exists for this: it asks the browser what is at each
point's own centre (`document.elementFromPoint`) and then moves a real pointer there, and it was
proven to go red against four mutated copies of the rendered page. Run it; a green unit suite says
nothing about any of it.

**The fourth trap: a beat can fill its width and still not be readable, because it does not fit the
SCREEN.** Measured before this was fixed: at 1600×900 the page was 2275px tall and the title's own
claim sat 800px below the fold. Width is only half the question — see
`references/map-web-discipline.md`, "Fit the window".

**The fifth trap, specific to this format's own rewrite for genuine responsiveness: a COMPUTED style
value can disagree with what the screen actually shows, and the value is what's wrong.** Verify by
screenshotting the beat at real widths (this skill's own proof: 1600/1024/768/375), not by reading
`getBoundingClientRect()` or a CSS custom property off some element and trusting the number — a
value can be measuring the wrong box (a wrapper that has already been overridden by a later rule, a
percentage resolved against the wrong ancestor) and report a "pass" while the picture itself clips,
letterboxes, or leaves a gutter. Trust the picture.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/map-web-discipline.md` | Full width genuinely (one fluid render, `aspect-ratio` not `max-width`), the plate strategy, text-in-HTML-not-SVG, the accessibility answer, two channels not one, shared touch/hover targets, progressive enhancement via native `title`, filters, live tiles and the reversal that brought them, what must never become interactive |
| Pure core (polygons) | `assets/geo-choropleth.ts` | `joinValues`/`unmatchedValues` (the join that fails loud), `binIndexLowerInclusive`/`scalePosition` (the classes), `sequentialRamp`/`dataRampEnd`/`assertRampReads` (the ramp), `noDataFor`/`waterFor`/`assertSurfacesRead` (the two surfaces that are NOT the data, derived from the same palette and measured against the ramp), `collidingPointerTargets` and `marksWithNoPointerPath` (whose 28px button a neighbour buries, and which marks this camera draws smaller than a pixel — the second is the larger fact and the one a journalist can act on), `pathFromRings`/`simplifyRing`/`keepRing`. This skill's OWN copy, byte-shared with the worked beat |
| Pure core (points) | `assets/geo-symbol.ts` | `radiusScale` (equal-area, sqrt), `niceReferenceValues`, `drawOrder`/`readingOrder`, `labelPlacement`, `keepPoint`, `groupsOf`/`slugOf` (the filter's own shared vocabulary), `fr`. No browser, no rasteriser — this skill's OWN copy, trimmed to what a symbol map needs (no polygon join) |
| Bake | `scripts/bake-plate.mjs` | One camera, one plate PNG (baked generously — `1000`px, see the discipline file's "The plate strategy"), one `geometry.json` of projected points — this skill's OWN copy of the bake, no shapes/join (a point has neither) |
| Live map | `assets/live-map.mjs` | The second layer: boots MapLibre on MapTiler tiles, re-applies the beat's own water and label rules to the live style, fits the camera to the study set at runtime, sets the reader's leash from that fit, sizes every mark from the CAMERA's ground scale rather than from the plate's box (`cameraScale`), and makes the live layer obey the same filter selection the CSS obeys (`selectedGroup`, `applyFilter`) |
| Live-map proof | `scripts/verify-live-map.mjs` | Drives the live map at two container aspects and clicks every filter chip for real. Asserts what can come apart: mark size against an independent camera derivation, nothing cropped, a real pointer reaching a mark's whole disc, and BOTH halves of every mark obeying one filter — plus an anti-vacuity pin, because with the filter broken in both halves at once every count agrees. Also REPORTS, over every mark rather than over its hover sample, how many the camera gives no pixel to at all — 91 of 241 on the world beat at 1600×900 |
| Marks with no pointer path | `scripts/detect-stranded-marks.mjs` | `marksStrandedWithNoChannel` — reads the delivered page's own frame, rings, marks, keyboard targets and table, and REFUSES a beat that draws a mark smaller than a pixel and then leaves it without a table row or without a keyboard target. Those two are that mark's only remaining paths; a mark missing one of them is a fact nobody can reach |
| Composition | `assets/MapWebSeed.tsx` | `MapWebSeed` — ONE fluid render: an SVG carrying only geometry (plate + decorative circles) plus an HTML overlay carrying every piece of furniture and every control (filter chips, point labels, hit-target buttons, legend, and, as a third layer that is a sibling of both map layers, the point labels and hit targets), inside a `.mw-stage` that bounds it to the window's leftover height — and `RegionTable` (the accessible table, carried by default) |
| Interaction | `assets/interaction.mjs` | `initPoints`/`initAll` — hover/tap/keyboard per point, direct listeners on the HTML `.pt` buttons (no proximity resolver needed: each point is already a discrete, fixed-size target) |
| Verify | `scripts/verify-interaction.mjs` | Drives the rendered beat in a real browser with REAL input: fit at four viewport sizes, `elementFromPoint` + a real pointer move per point checked against the sample data, a real click per filter chip, keyboard, and the no-JS pass. Mutation-proven to fail when the hover is swallowed, the filter selector is wrong, the fit is removed or the plate is stretched |
| Render | `scripts/render-web.mjs` | `renderMapWeb({ component, table, props, outDir, name, regionTable })` — SSRs the one fluid map render, plus the table only when the beat opted in, inlines the interaction script, writes one self-contained HTML file. `assertDistinctSlugs` refuses a filter vocabulary that cannot work. Also this skill's own seed runner (`ensurePlate`, `render`) behind a labelled CONFIG seam |
| Preview | `scripts/render-preview.mjs` | The seed rendered from sample data, screenshotted through headless Chrome at one fixed viewport width — no longer a pure-SVG Resvg rasterise, since the furniture is now HTML |
| Compare | `scripts/compare-png.mjs` | `comparePngBuffers` — tolerant, decoded-pixel PNG comparison through a real `<canvas>`; two Chrome launches of identical HTML are not always byte-identical (anti-aliasing jitter), so `--check`/the standalone test compare pictures, not bytes |
| Rasteriser | `scripts/render-still.mjs` | `deriveFurniture`/`measureText` — a byte-identical copy of `chart-beat`'s, kept in step by hand (a skill never imports another skill); only `deriveFurniture` (the colour maths) is used by this format now |
| Sample | `assets/sample-data/regions.json` | Thirteen European metro areas, sample population figures, each tagged with a `group` (the filter's own dimension), the seed's own data |

**Why a symbol map, not a choropleth, for this skill's own seed.** A symbol map has no data JOIN
(`map-beat/references/types/proportional-symbol.md`: "there is no data JOIN for this type") and
no polygon geometry to bake, cull or thin — the bake is a handful of `map.project()` calls, not a
Natural-Earth GeoJSON join against declared study-set keys. That made it the faster, lower-risk format
to prove the web mechanics AND the accessibility answer on first.

**CORRECTED 2026-08-22, and corrected rather than deleted, because what it cost is the point.** The
sentence that stood here said *"a choropleth's own web beat is the next one to write, importing this
skill's OWN copy of `map-beat/assets/geo.ts`'s join/ramp logic"*. There was no `geo.ts` under
`assets/` to import — only `geo-symbol.ts`, which says in its own header that a symbol map has no
polygon join — while `proof/mapgen-choropleth-web/` had been a complete, shipped, worked choropleth
web beat for weeks. So the documented path for **the cell a journalist actually asks for** (shade the
countries by a rate) pointed at a file that did not exist, and the one person who needed it built
their beat by copying out of `proof/` instead, which is not what this file told them to do. Measured
on a real story, 2026-08-22. The cell is written; "Producing a choropleth" below is how.

**Why the accessible table ships by default, and what opting out costs.**
`renderMapWeb`'s `regionTable` defaults to TRUE (2026-08-20) — a capability the catalogue says this
format CARRIES cannot depend on a beat's author remembering to turn it on. It takes no width/layout
prop either: the same thirteen facts do not read differently at 375px than at 1600px, and this
format ships one layout. The table is SSR'd after the map, inside the same `.map-web-page` wrapper
the filter's own `:has()` CSS is scoped to, so one filter narrows both. When a beat opts OUT, a
reader with no spatial access to the map has the `.pt` buttons' own `aria-label`s and nothing else,
and `references/map-web-discipline.md`'s "The accessibility question" states exactly what is lost by
that: the complete set of readings, the comparison the beat is about, and a reading that does not
cost thirteen separate interactions. Read it before opting out; do not opt out by not deciding.

**And on a dense camera it is not an option at all.** A mark the camera draws smaller than a pixel
has no pointer path — measured live on the 241-region world beat, 63 marks get no pixel from the map
whatever at 1600×900 and 82 at 375×667 — so the table and the keyboard are the only two paths those
marks have. `renderMapWeb` therefore REFUSES to write a page that strands a mark and drops either
(`marksStrandedWithNoChannel`, `scripts/detect-stranded-marks.mjs`). Opting out of the table on a
beat like that would delete one of two remaining channels, not one of three.

## Four guards, two substrates

**From the shipped page**, read as a file and needing no browser:

- **every asset inlined exactly once.** A map plate is the heaviest single asset this tree produces,
  so a second copy is the most expensive mistake available here. A scrolly earned this guard at
  **1.33 MB of a 1.80 MB page** — the same 340 KiB plate five times.
- **every dash drawn in the path's own units.** This format's five pages carry **zero** dashed
  elements today (the `stroke-dashoffset:0` a text search finds in them is URL-encoded inside a
  `data:image/svg+xml,` attribution icon, not markup), so this is a pure ratchet. The reader that
  feeds it is proved live in `chart-web`'s own walk — 23 artifacts, 29 marks — against a
  byte-identical copy.

**From the bake's own files**, exact and instant:

- **the plate describes the frame its marks were projected into.** `bake-plate.mjs` writes
  `plate/plate.png` and `plate/geometry.json` side by side, and the geometry records that frame. A
  plate whose aspect ratio is not the frame's is letterboxed by the default
  `preserveAspectRatio="xMidYMid meet"`, so the basemap shifts while the marks do not. Measured:
  **all five beats agree to 0.000 %, at exactly 2.00×.**
- **the plate is on the side of the ground the beat declares.** Measured: **all five**, plates 0.661
  to 0.840 under `#FFFFFF`.

**Not `projectionDisagreements`.** That decision compares an `<img>`'s CSS `object-fit` against the
`preserveAspectRatio` of the SVG over it, and `object-fit` appears in **none** of the 23 web artifacts
on disk — in exactly two files in this whole tree, both scrolly IMAGE beats. This format composites
its plate as an `<image>` inside the marks' own SVG, in the marks' own coordinate system; there are
not two projections that could disagree. Same defect, other mechanism, second catalogue row.

All four live in `scripts/verify-guards.mjs` rather than in `verify-interaction.mjs`, because
importing the driver RUNS it. The driver imports the two page-side ones and prints a `CARGO` section
before it drives anything; `test/verify-guards.test.ts` runs all four over every `map / web` beat.

## How it works (the shape)

1. **Read `references/map-web-discipline.md`** in full before writing a second beat — "Full width,
   genuinely", "Fit the window" and "The accessibility question" all matter from the first line of a
   new beat.
2. **Bake the plate once, generously.** `scripts/bake-plate.mjs` projects every point, records which
   ones missed the frame (`keepPoint`), and overrides the basemap's water colour before capture. Size
   it for the widest container the beat will actually sit in (see "The plate strategy") — never for
   one fixed layout, because there is no longer one to tune it for.
3. **Draw the circles in the SVG, sized by value, largest-first** (`drawOrder`) so smaller circles
   stay paintable on top rather than buried — geometry only, no text (`references/map-web-discipline.md`, "Text is HTML, not SVG"). **Draw everything else — point labels, the per-point hit
   target, the legend, the title/source/caveat, the filter, the optional zoom toggle — as HTML**,
   over the SVG. Every hit-target button gets a fixed-CSS-pixel diameter (never an SVG-scaled one), a
   native `title` for a no-JS tooltip, and a baked `aria-label`/`data-detail`.
4. **Write the legend with a short per-mark unit, at a fixed CSS pixel size.** `geo-discipline.md`'s
   own open problem (a legend box sized for the widest circle, not the longest unit word) is
   sidestepped by keeping each reference mark's own unit short ("M") and spending the full word once,
   in the caption; the legend's own swatch size is deliberately NOT derived from the map's own
   (container-scaled) circle size — see "Text is HTML, not SVG."
5. **Decide about the table, deliberately** (`regionTable`). On BY DEFAULT, it is rendered from
   the same `readingOrder` the keyboard's Left/Right/Home/End uses — one order, two media, tagged
   with the SAME `data-group` the filter reads on the map. Turning it off is the exception — read
   what that costs first.
6. **Add a filter only if the test in "When to use" passes** — most beats need
   neither. Both are pure CSS (`:has()`), so wiring one in costs no new JavaScript. Every group
   travels as its SLUG, the one vocabulary the markup and the generated selector share.
7. **Fit the window.** The beat occupies at most one screen: `.mw-stage` takes the leftover height
   and the map is bounded by it as well as by the width. Nothing scrolls inside the visual.
8. **Run `scripts/verify-interaction.mjs`, then screenshot it at real widths** — the script drives
   real pointer events at real coordinates, real clicks on every filter chip, the keyboard, and the
   no-JS pass, and compares every value against the sample data. It cannot see a label collision or
   a bad camera, so screenshot at 1600/1024/768/375 and LOOK: the beat fits each window, the plate's
   own aspect never distorts, the type reads the same visual size at every width. A claim not
   driven, and not screenshotted, is not evidence — the same rule `doctrine`'s verification
   section states for every format in this twin, sharpened by this format's own gotcha above: a
   computed value can lie, a screenshot cannot.

## Producing a choropleth

The cell a newsroom asks for most often, and the one this file used to say was unwritten. Everything
below is measured on the two worked beats: `proof/mapgen-choropleth-web` (41 European countries,
light ground) and a real 241-region world beat driven live with a real key.

1. **Get the geography, and know what it costs you.** *Nothing in this toolchain acquires country
   shapes, and that is a limit rather than an oversight — Natural Earth is 20 MB of public-domain
   GeoJSON that has no business being committed to a skill.* What the toolchain owes you is a
   REFUSAL YOU CAN ACT ON rather than a default path that silently is not there, and as of
   2026-08-22 that is what it gives you: `map-beat/scripts/bake-plate.mjs` used to default
   `--shapes` to `/tmp/map-twin/ne50.geojson`, which no script in this tree writes, so the bake
   failed with a bare `ENOENT` after it had already spent the journalist's key and a browser. There
   is no default now — the bake refuses at the flag, before either, and prints the `curl` below.
   Every `countries.geojson` on disk is a hand-curated 8-, 16- or 42-feature European subset, so
   acquire the world explicitly, beside the beat, and freeze it there:

   ```sh
   curl -sSo /tmp/ne50.geojson \
     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
   ```

   **1:50m, not 1:110m, and the difference is measured, not aesthetic.** At 1:110m a world beat lost
   **64** readings to shapes that do not exist in the file; at 1:50m it lost **8**. Then trim it to
   what the beat draws and SIMPLIFY it before baking — a 1:50m world at native resolution rendered
   **2 190 830 bytes**, over this format's own weight ceiling; simplified at 0.09° (94 690 → 23 788
   coordinates) it landed at **2 015 174**, 1.0 % of margin. `simplifyRing` is in the core.

2. **Declare the study set as a LIST, and join on `ADM0_A3`.** Never `ISO_A3`: eight features in the
   1:50m file carry `ISO_A3 = "-99"` — France, Norway, Kosovo, Northern Cyprus, Somaliland, Kashmir
   and two Australian territories — so joining on it drops **France and Norway off a world map in
   silence**. Strip every other property on the way in so the trap cannot be fallen into later.

3. **Let the join fail loud, and declare all three silences.** `joinValues`/`unmatchedValues` refuse
   a beat until every shape with no reading, every reading with no shape, and every alias is
   DECLARED. On the world beat that was 4 aliases (`SDS→SSD`, `SAH→ESH`, `PSX→PSE`, `KOS→OWID_KOS` —
   unaliased, four real countries render as no-data and look completely legitimate), 12 declared
   silent shapes, and **8 readings that land on no shape at all** because Natural Earth folds each
   into the state that administers it. That last class is the one the doctrine calls worse than a bad
   join — a no-data shape is at least visible and wrong-coloured; a value with no shape leaves no
   mark anywhere to be wrong. **Name them in the caveat the reader sees.**

4. **Take the three colour decisions together, with `choroplethSurfaces`.** The ramp, the no-data
   fill and the water tint are one decision, because the last two are only correct RELATIVE to the
   first — see "Colours" below and `assertSurfacesRead` in `assets/geo-choropleth.ts`.

5. **Bake at a width, and let the height come from the camera.** `--width`, never one `--size` on
   both axes: `frameHeightFor` gives the frame the shape the bounds ask for, and
   `frameMatchesItsCamera` refuses a frame more than 5 % larger than its camera. A world camera is
   close to 2:1 in Web Mercator, so a square frame spends half its pixels on ocean AND hands the
   delivered page a square to put in a wide window.

6. **On a dense camera the pointer path is not partial — for some marks it does not exist, and the
   beat is told which.** Every region too small to land a pointer on by its own shape keeps a 28px
   button; on a world map those buttons cover each other — measured, 143 pointer-active marks with
   82 of them covered at 1600×900, which `collidingPointerTargets` counts. But the collision was
   never the problem. Driven live with a real key against the committed 241-region world beat,
   **63 of its marks get no pixel from the map at all at 1600×900 and 82 at 375×667**: at that camera
   one pixel is about 26 km and Monaco is about a thirteenth of one, and of the 105 marks a
   neighbour's button covers, 46 are not served by the live pointer either. **A mark smaller than a
   pixel has no pointer path and no target engineering creates one.** So `marksWithNoPointerPath`
   counts THOSE and the runner prints the count and the names at four widths beside the colliding
   one — a fact a journalist can act on by tightening the camera, adding an inset, or accepting it
   knowingly in the caveat. The button stays either way: it is the keyboard target and the
   `aria-label`'s carrier, and for a sub-pixel mark that channel and the table are the ONLY paths
   left — which is why `marksStrandedWithNoChannel` REFUSES a beat that strands a mark and then
   drops one of them. Read `references/map-web-discipline.md`, "A mark smaller than a pixel has no
   pointer path at all", for the measurement in full.

7. **Drive it live.** `scripts/verify-live-map.mjs --html <the beat's page>` reads the layers off the
   page's own plan, so it drives a choropleth as readily as the symbol seed, and it EXITS NON-ZERO
   when it cannot find a key rather than reporting success for a run that never happened.

## Colours

**A choropleth's ocean and its no-data fill follow the palette too, and until 2026-08-22 they did
not.** Both were fixed hexes with a docstring arguing that fixing them is what makes a no-data
reading "stay recognisable across every newsroom's own ground colour". Measured on this format's own
two shipped grounds, that claim is false in both directions: on white with a `#B2182B` accent the
ramp runs 0.815 → 0.101 and the fixed `#B9B9B9` (0.485) and `#AAC9E0` (0.557) both land *between
class 2 and class 3*; on `#16191B` with `#D4A853` the ramp climbs 0.052 → 0.616 and the same two are
brighter than five of the six classes, so on a world map the **sea was the loudest thing on a map
about land**. A country with NO READING was painted at the luminance of a real class on every beat
this format has shipped, and `assertRampReads` could not see it — it measures the ramp against the
GROUND, never these two against the RAMP.

`offRampLuminance` puts both in the one band that is not the data — between the ground and the first
class, which is where "this is not a reading" belongs, because a region with no value is nearer to
bare ground than to any class. `noDataFor`/`waterFor` derive them there (neutral for no-data, blue
for water — rule 7 is a rule about HUE), `assertSurfacesRead` refuses a surface a reader would read
as a value, a surface that is really the ground, and a pair nobody could tell apart. A ramp that
starts too close to its own ground fails there and is told to raise its low end, which is the fix.
The two old hexes are not deleted: they are the MIDPOINT of the axis each colour now travels, so the
derivation passes through the value this family already used.

`scripts/render-web.mjs` reads its ground and accent from `PALETTE.md` with `readPalette` — never a hex literal. `PALETTE.md` is the answer `palette`'s own proposal (`proposePalette` + `formatProposal`, `skills/palette/scripts/`) put to the journalist; it is not this skill's to write. Missing file: `readPalette` refuses, names the next action — run the proposal, show it to the journalist, record the answer — and names what to do when nobody is there to answer right now: record the proposal's own recommended option — never inventing a colour, never one that failed the 3:1 floor — with `origin` naming its source and the file's own prose saying no journalist answered; a proposal with no passing option still ends the turn there. That is `palette-names-its-source`, this format's own share of `skills/palette/SKILL.md`.

## The typeface

**This format does not read the story's recorded typeface, and that is a gap, not a design.** `scripts/render-still.mjs:26` holds `export const FONT_FAMILY = "Helvetica, Arial, sans-serif"` as a **const**, and `scripts/render-web.mjs:488` writes the same stack into the delivered page's own CSS. Neither can be reached by a recorded answer: this format has no `readTypeface`/`useTypeface` at all (measured 2026-08-21 — 0 calls), so a hovering reader's tooltip, the size legend and the accessible table are all set in a face nobody chose.

Four of the seven formats that draw their own marks hold `FONT_FAMILY` as a `let` that `useTypeface` reassigns from a recorded `TYPEFACE.md`, refuse a family this machine does not have rather than substituting one, and refuse an element drawn in any other family. This one does not, so until it does, a beat here SAYS so: record the story's answer with `palette`'s own writer (`proposeTypeface` + `writeTypeface`, `skills/palette/scripts/typeface.mjs`, which measures every face `NEWSROOM.md` records on the machine that will render), and name in the beat's own hand-over that this render did not reach it. A gap that is written down is one somebody can close. That is `typeface-is-recorded`, this format's own share of `skills/palette/references/typeface.md`.

## Quick start

```sh
# the bake: one plate, this skill's own sample points, this skill's own namespace under /tmp so
# concurrent work on other beats in this repository never collides with it
bun skills/map-web/scripts/bake-plate.mjs --size 1000 --out /tmp/map-twin-web/plate-1000

# the skill's own seed, from the skill's own sample data — nothing else on disk is needed (the bake
# above runs automatically if the plate is not already there)
bun skills/map-web/scripts/render-web.mjs /tmp/map-web-twin

# the mechanical half of the verification: real pointer events, real clicks, real key presses,
# every value checked against assets/sample-data/regions.json — renders its own copy first
bun skills/map-web/scripts/verify-interaction.mjs

# LOOK AT THE LIVE MAP. The committed page is deliberately unkeyed (R1b), so opening it directly
# shows the FALLBACK plate. This writes a KEYED copy outside the tree and prints its path:
bun skills/map-web/scripts/verify-live-map.mjs --html <the beat's own .html>

# then drive it yourself — a static screenshot of ONE width cannot verify a responsive claim
python3 -m http.server 8935 --bind 127.0.0.1 --directory skills/map-web/output-proof &
# open http://127.0.0.1:8935/population.html in a real (or automated) browser and:
#  1. confirm the title, the filter chips and the legend are on screen — and that the WHOLE beat
#     fits the window, with nothing scrolling inside the visual;
#  2. hover three different points, check the tooltip against assets/sample-data/regions.json;
#  3. Tab through every point AND every control (the filter chips; the live map's own
#     NavigationControl), 
#     confirm the same detail appears from keyboard focus alone;
#  4. screenshot at 1600x900, 1024x768, 768x1024 and 375x667: confirm the beat FITS each window,
#     the plate's own aspect never distorts, and the type is the SAME visual size across all four —
#     not a computed value, the actual picture;
#  5. try the filter: confirm the unfiltered "All regions" view already shows every point (the whole
#     claim), and that narrowing it narrows the map, its labels and the table if the beat ships one;
#  6. disable JavaScript, reload, confirm the map, the legend AND the filter (CSS-only) all still
#     render/work.
```

The first render command runs the SEED's runner (`render`, at the bottom of
`scripts/render-web.mjs`), which reads `assets/sample-data/regions.json` and hands the seed
component and `RegionTable` to the format's generic `renderMapWeb`. A real beat writes its own runner
in the same shape, beside its own story, importing its own component and its own points —
`renderMapWeb` itself does not change, the same rule `chart-web`'s own `render-web.mjs` states
for its own generic function.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The bake's own generous size (drives resolution vs. bake time/file size — see the discipline file's "The plate strategy") | `1000` logical px | `PLATE_SIZE`, `render-web.mjs` (and the CLI default, `bake-plate.mjs`) |
| The largest circle's radius, as a FRACTION of the frame (not a fixed pixel — it has to scale with the fluid SVG) | `0.062` | `MARK_MAX_RADIUS_FRACTION`, `MapWebSeed.tsx` |
| The legend swatch's own max radius, fixed CSS px (deliberately NOT frame-relative) | `22px` | `LEGEND_MAX_RADIUS_PX`, `MapWebSeed.tsx` |
| The per-point hit target's FLOOR in CSS px — its size is `max(floor, the mark's own drawn diameter)` | `28px` | `HIT_TARGET_PX`, `MapWebSeed.tsx` |
| Live tiles on or off for this beat | `true` | `SEED.live`, `scripts/render-web.mjs` |
| The MapTiler key placeholder the delivery substitutes | `__MAPTILER_KEY__` | `KEY_PLACEHOLDER`, `scripts/render-web.mjs` |
| The padding the runtime fit leaves around the study set | `48px` | `fitBoundsOptions`, `assets/live-map.mjs` |
| How far a drawn mark may sit from its camera-derived size | `1%` | `SCALE_TOLERANCE`, `scripts/verify-live-map.mjs` |
| How far a pointer walk may differ from the drawn edge | `3px` | `POINTER_TOLERANCE_PX`, `scripts/verify-live-map.mjs` |
| Whether the beat ships the accessible region table at all (on by default, opt-out per beat — read the discipline file's "The accessibility question" first) | `true` | `regionTable`, `SEED` in `render-web.mjs` (the option on `renderMapWeb`) |
| The smallest height the map is ever squeezed to before the page scrolls again | `180px` | `.mw-stage`'s `min-height`, `buildCss` in `render-web.mjs` |
| The filter chip's own height (a pointer target, not a text row) | `32px` | `.mw-chip`'s `min-height`, `buildCss` in `render-web.mjs` |
| How many reference sizes the legend shows | `3` | `niceReferenceValues`'s `count` default, `geo-symbol.ts` |
| The frame's HEIGHT (derived from the camera, never `--size` on both axes) | `frameHeightFor(bounds, width)` | `bake-plate.mjs` |
| How much of a frame may be margin the camera never asked for | `0.05` | `FRAME_MARGIN_TOLERANCE`, `bake-plate.mjs` |
| The luminance a no-data fill and a water tint are placed at | the midpoint of ground → first class | `offRampLuminance`, `geo-choropleth.ts` |
| How far those two must sit from the nearest class | `0.02` relative luminance | `SURFACE_CLEARANCE`, `geo-choropleth.ts` |
| The smallest channel spread that still reads as a hue | `0.05` | `MIN_CHROMA`, `geo-choropleth.ts` |
| Which regions keep a pointer-active button, as a FRACTION of the frame | `26 / 496` | `SMALL_REGION_FRAME_FRACTION`, `ChoroplethWeb.tsx` |
| The camera this seed bakes | `[[-14, 34], [28, 64]]` — Lisbon to Stockholm, padded ~5° | `BEAT.bounds`, `bake-plate.mjs` |
| Which basemap | `"dataviz-light"`, water overridden before capture to the tint `basemapWaterFor` derives from this beat's own `PALETTE.md` — `#aecce1` for the seed's own white ground and teal accent, `#505e69` for a `#16191B` ground and a `#D4A853` accent | `BEAT.style` / the `style.load` handler, `bake-plate.mjs` |
| How long the capture waits before it gives up on `idle` | `15000` ms | `--settle`, `bake-plate.mjs` |
| This skill's own bake namespace (never collides with `map-beat`'s `/tmp/map-twin`) | `/tmp/map-twin-web` | `DEFAULT_PLATE_DIR`, `render-web.mjs` |
| The one point this seed highlights as the subject | `"paris"` | `SUBJECT_KEY`, `MapWebSeed.tsx` |
| How the `#tooltip` is positioned relative to the pointer/focused point | `14px` above, clamped `8px` from the viewport edge | `show()`, `interaction.mjs` |
| The filter's own dimension, and whether a beat ships one at all (skipped when `groupsOf(points).length <= 1`) | `group` per point, `assets/sample-data/regions.json` | `groupsOf`, `geo-symbol.ts` |
| The PNG comparison's own tolerance (per-channel diff, and the allowed fraction of differing pixels) | tolerance `6`, max fraction `0.002` | `comparePngBuffers`'s options, `compare-png.mjs` |

## Files

- `references/map-web-discipline.md` — the rules this format is written under, each attached to the
  reasoning that produced it. Read before writing a second beat.
- `assets/MapWebSeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat (thirteen European metro areas, Paris the largest, a three-region filter), not a
  stripped mechanics demo. One fluid render, bounded to the window by `.mw-stage`: an SVG carrying
  only geometry, an HTML overlay carrying every piece of furniture and every control, and
  `RegionTable`, the accessible table this format carries by default.
- `assets/geo-choropleth.ts` — this skill's OWN copy of the pure POLYGON core: the join that fails
  loud (`joinValues`/`unmatchedValues`), the classes, the ramp (`sequentialRamp`/`dataRampEnd`/
  `assertRampReads`), the two surfaces that are not the data (`noDataFor`/`waterFor`/
  `assertSurfacesRead` — derived from the same palette the ramp is, and measured against it),
  `collidingPointerTargets`, and the ring arithmetic. `SEED_STUDY`/`SEED_BREAKS` are marked
  **REPLACE ME**: a beat declares its own study set as a LIST, because a study set read back out of
  the shapefile the shapes come from can never disagree with it. See "Producing a choropleth".
- `assets/geo-symbol.ts` — this skill's OWN copy of the pure proportional-symbol geometry, trimmed
  to what this format draws (no polygon join — a symbol map has none), plus `groupsOf`/`slugOf`, the
  filter's own shared vocabulary between the component and the CSS `render-web.mjs` generates.
- `assets/interaction.mjs` — the one script this format ships, inlined verbatim into the HTML.
  `initPoints`/`initAll` are DOM wiring, verified by driving a real browser, not by a test.
- `assets/sample-data/regions.json` — thirteen European metro areas with sample population figures
  (Paris 11.0M largest, Dublin 1.4M smallest) and a `group` per point (the filter's own dimension),
  the seed's data.
- `assets/preview.png` — a full render of the seed at 1024px, screenshotted through headless Chrome
  (furniture is HTML now, not pure SVG — a Resvg rasterise alone can no longer produce this), so a
  reader of this skill sees what it produces. Regenerate with `bun scripts/render-preview.mjs`
  whenever the seed changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — written by the SAME `bun scripts/render-preview.mjs` run that regenerates `assets/preview.png`
  (no `--out`), from the same buffer, never a second render or a second command.
- `scripts/bake-plate.mjs` — this skill's OWN copy of the bake: camera, gate, plate, projection, the
  water-colour override. No shapes/join argument — nothing here needs one.
- `scripts/render-web.mjs` — the format's own machinery (`renderMapWeb`, `buildCss`,
  `assertDistinctSlugs`) plus this skill's own seed runner (`ensurePlate`, `render`, the CLI block)
  behind a labelled `CONFIG — edit for your story` seam. Nothing in this file imports out of this
  skill.
- `scripts/verify-interaction.mjs` — the mechanical half of the FALLBACK layer's verification:
  drives the rendered beat in a real browser with real pointer moves, real clicks and real key
  presses, at four viewport sizes, checking every value against `assets/sample-data/regions.json`
  and finishing with a JavaScript-disabled pass. It renders with the R1b placeholder, so the live
  layer never boots and every check is about the plate — its §0 asserts that reading rather than
  leaving it implied. The LIVE layer's own probe is `scripts/verify-live-map.mjs`.
- `scripts/verify-guards.mjs` — `duplicatedPayload`, `revealDashInScreenSpace`,
  `plateMatchesGeometry` and `plateFollowsGround`, plus the `marksFromSource`, `groundFromPalette`
  and `plateLuminance` readers that feed them. Byte copies of what `scrolly`, `chart-video` and
  `map-beat` earned, walked by `splash/test/guard-copies-parity.test.ts`.
- `scripts/verify-live-map.mjs` — the live layer's probe: renders a KEYED copy into a temp
  directory (never into the tree) and drives it at two container aspects. Defaults to
  `output-proof/population.html`, the page this skill commits.
- `output-proof/population.html` — the seed's own rendered beat, live, carrying the R1b placeholder
  where its key belongs. Regenerated by `bun scripts/render-web.mjs`. It is what
  `test/live-map.test.ts` drives: before it existed that guard was gated on `/tmp/mw-live/population.html`,
  a path no script writes, and printed "live map not driven" on any machine but one.
- `scripts/render-preview.mjs` — renders THIS skill's seed from THIS skill's sample data (never a
  story's render), navigates a headless Chrome tab to it and screenshots the full page, to
  `assets/preview.png`, or `--out <dir>` to write the proof there instead. `--check` re-renders and
  fails non-zero if the committed PNG no longer matches (tolerantly — see `compare-png.mjs`) a fresh
  render.
- `scripts/compare-png.mjs` — `decodePng`/`comparePngBuffers`: is a fresh render the same PICTURE as
  the committed `assets/preview.png`, decided on decoded pixels rather than on bytes. A byte-identical
  COPY of `skills/splash/scripts/compare-png.mjs`, carried rather than imported and walked by
  `splash/test/compare-png-parity.test.ts`; read its header for what it measurably cannot do.
- `scripts/compare-png.mjs` — `comparePngBuffers`, the tolerant decoded-pixel comparison both
  `render-preview.mjs --check` and `test/standalone.test.ts` use in place of a raw byte-equality
  check.
- `scripts/render-still.mjs` — `deriveFurniture`/`measureText`, a byte-identical copy of
  `chart-beat`'s own file (this format now only calls `deriveFurniture`).
- `test/canon.test.ts` — the canon's own shape: the seed carries the exact `REPLACE ME` wording,
  the sample data is real rows the seed can render standalone, `preview.png` is a current render —
  and it RUNS `scripts/verify-interaction.mjs`, so the real-browser behaviour checks are part of
  `bun test` rather than a script someone remembers.
- `test/render-web.test.ts` — `bun:test` coverage: the SSR'd markup's structure (one `<svg>` with no
  `<text>` inside it, point count, exact formatted `data-detail`/`aria-label`/`title` per point, the
  filter chips around real radios, the fieldset present/absent matching the group count, the
  absence of any out-of-map zoom control, the palette, unconditional furniture), the accessible
  table's own row count/order/`data-group`, and `renderMapWeb` itself — the table only when opted
  into, the generated filter selector quoting the slug, and the two group vocabularies it refuses.
  Behaviour is NOT covered here: that is `scripts/verify-interaction.mjs`'s job, in a real browser.
- `test/the-live-layer-is-in-the-artifact.test.ts` — that the renderer PUTS the live map into the
  file it writes, and that every committed map-web page carries it. Written after the audit measured
  that stripping the live block left 354 tests passing; its header carries the two mutations that
  redden it.
- `test/standalone.test.ts` — proves the skill directory alone, copied into a fresh root, still
  renders the SAME picture as this repository's own `assets/preview.png` (tolerant pixel comparison).

## A declared guard is wired to run

`guard-wired-to-run` (`skills/doctrine/references/guard-catalogue.json`): a guard this skill
declares in its own `verify-*.mjs` `GUARDS` array is wired to actually run against what ships —
called from this skill's own producer/render script when the check reads static output, or from a
real DRIVER (a script that drives a live rendered page, e.g. via Puppeteer, or a CLI that walks
real delivered files) when the check needs one — never left reachable only from its own
`*.test.ts`. Measured 2026-08-21 across all eight producing skills: 26 of 40 guard-kind decisions
were declared and unit-tested but never called outside their own test file —
`pageLanguageMatchesStory` on chart-web/map-web/scrolly (the defect that named this discipline) was
three of the twenty-six, not all of them. Too large a population to close in one wave, so it was
written down rather than mechanically enforced.

ROUND SIX ENDED THAT. `fills-its-frame` was distributed to all eight producing skills and called by
none of them four hours later, and a discipline that cannot observe its own violation is theatre.
This is a GUARD now: `declarationsWithoutACaller` (`scripts/detect-guard-wiring.mjs`) reads every
name this skill declares and finds what calls it; `bun skills/<skill>/scripts/check-guard-wiring.mjs`
prints the answer, and `doctrine/test/guard-wiring.test.ts` refuses any name that is unwired and not
recorded. The debt this skill is still carrying is listed BY NAME in that file's `RECORDED_UNWIRED`.
A name may leave that list; adding one is how the defect would recur. A guard written from here on
is wired at the moment it is written, not left for the next stress round to find idle.
