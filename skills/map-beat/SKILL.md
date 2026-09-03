---
name: map-beat
description: Use to produce a MAP beat — one map with one thing to prove — in either format, static or video, by WRITING a bespoke component under doctrine and looking at the render. Carries the bake (one camera, one basemap plate, one file of projected geometry), the join that fails loud, the class scale that makes a comparison legible, and one worked beat in each format.
---

# map-beat — bake the camera once, then draw an image and some coordinates

## Overview

The map craft skill. It does not hold a map type and it does not fill a config: it holds **the
bake**, and two worked beats written on it.

The bake is the whole idea. `scripts/bake-plate.mjs` spends the camera **once** — it loads a
MapTiler style in headless Chrome, gates on `idle` or a bounded settle, screenshots a quiet
basemap **plate**, and projects the beat's shapes into that plate's pixel space with
`map.project()`. After it runs there is no map anywhere in this skill: the still draws an `<image>`
and some `<path>`s through resvg, and the video draws the same image and the same paths through
Remotion. One camera, one geometry, two formats.

Both formats ship here, unlike the chart engine where video is a separate skill. A map beat's
static and video formats differ only in an **order in time**, and they must not drift apart on the
camera; keeping them in one skill is what makes "same bounds, two resolutions" a fact rather than
an intention.

The doctrine is `doctrine/references/geo-discipline.md` — twelve rules, five of them written
against this build.

## When to use

- When a closed `STORYBOARD.md` picks medium **map**, and the beat's `BRIEF.md` names the subject,
  the comparison and the caveat. No brief, no code.
- For **static** when the argument is a distribution the reader should see at once; for **video**
  when the argument has an order — a level laid down, a field built, a subject that lands.
- To write a **new** component for this story. Read `assets/Co2MapStill.tsx` (or `Co2MapVideo.tsx`)
  to learn the shape, then write the beat. Do not import them, extend them, or add a prop to them.
- **Not** for a Datawrapper map (a different producer), and **not** for a chart.

## The one gotcha that will waste your day (read first)

**A data join fails silently, and the map looks right.** A country whose key does not match renders
as no-data, in a category that is on the legend, in a shade a reader accepts. Nothing throws.

Two traps are waiting, and both are in this beat: Natural Earth's `ISO_A3` is **not** the ISO A3
code — France, Norway and Kosovo carry `"-99"`, so joining on it silently drops France (use
`ADM0_A3`) — and Our World in Data codes Kosovo `OWID_KOS` where Natural Earth says `KOS`, so an
unaliased Kosovo is hatched on every European map anybody ever draws from these two sources.

`joinValues` therefore throws two ways: when a shape finds no value **and nobody declared it**, and
when a **declared** no-data shape turns out to have one (a stale declaration is the same defect
arriving from the other side). Both are named. Never soften this into a warning.

The second trap, one level up: **`idle` alone never fires when one tile never resolves**, and a
capture that waits on it hangs forever rather than slowly. Gate on idle **or** a bounded settle,
and record which fired.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `doctrine/references/geo-discipline.md` | The twelve rules: bounded gating, fixed plate, baked geometry, projected labels, the loud join, capture plumbing, no-data as texture, the accent in a choropleth, the quiet plate, the reveal's order, ring culling, camera-before-layout |
| Bake | `scripts/bake-plate.mjs` | One camera: plate PNG + `geometry.json` (pixel rings + projected anchors), culled and thinned |
| Pure core | `assets/geo.ts` | The study set, the alias table, the join, the classes, the ramp, `scalePosition`, ring arithmetic, the claim check. No browser, no rasteriser — which is why BOTH formats can import it |
| Static | `assets/Co2MapStill.tsx` | One beat, 900 × 560, text column beside a square plate |
| Video | `assets/Co2MapVideo.tsx` | The same beat with an order. Exports `arrivalProgress`, the reveal's stagger, testable without a browser |
| Contract | `assets/timing.ts` | `MAP_TIMING`. The vocabulary (`BeatTiming`, `checkTiming`, `progressOf`) is **imported** from `chart-video`, never re-implemented |
| Registration | `assets/Root.tsx`, `assets/index.ts` | The Remotion composition; `durationInFrames` IS `MAP_TIMING.total` |
| Render | `scripts/render-map.mjs` | The ladder: still → final frame → mp4. Runs the join and the claim check, derives the furniture in node |
| Preview | `scripts/render-preview.mjs` | The seed rendered from sample data. Generates `assets/preview.png` and validates it with `--check` |
| Sample | `assets/sample-data/regions.json` | 43 European regions with numeric values, chosen to demonstrate the full colour ramp span |
| Preview | `assets/preview.png` | The static seed rendered on a light ground, so a reader of this skill sees what it produces |

**The accent in a choropleth.** The ramp is a gradient encoding a quantity — the one legitimate
gradient in this system — and it colours every region, so it cannot also carry the semantic accent.
The ramp is derived neutral, from the newsroom's ground toward its own ink (so it lightens instead
of darkening on a charcoal ground, with no branch to get that wrong), and the accent is spent
entirely on the subject: its outline, its label, its mark on the legend. Nothing else on the map
gets either.

**Where the map dependencies live.** The managed development install now includes `puppeteer-core`,
MapLibre, and an Engine-recorded compatible browser as part of the complete root runtime. The bake
has a sealed mode that accepts only that browser, the installed local MapLibre files, and an
Engine-injected `MAPTILER_KEY`; it does not need a CDN script or checkout `.env`. This file's camera,
study set, and shapes remain a worked seed and are never dispatched as arbitrary production. For a
real story, write the declarative `beats/<outputId>/MAP-BAKE.json` described by Splash's
`references/managed-map-bake.md`, then use the closed `bsig run splash map-bake` operation. Engine
validates the treatment, camera, geography, data, expected outputs, and input digests before it
hydrates the key and its recorded browser.

## How it works (the shape)

1. **Freeze the data and the shapes.** A csv and a GeoJSON on disk, not a URL fetched at render.
2. **Declare the study set** — the countries the beat claims to show — plus the alias table and the
   shapes the source genuinely does not report. Declaring is what makes the join checkable.
3. **Bake.** One camera, chosen from the geography (rule 12: a 900 × 560 frame that holds Europe
   also holds the Atlantic, so the plate is square and the layout is built around it). Quiet the
   basemap's own labels and borders; the beat draws the only labels.
4. **Join, loudly.** Then check the claim: the title's comparison and its superlative, measured
   against the source it is drawn from.
5. **Draw the still, and look at the PNG.** Not the SVG, not the tests.
6. **For video: write the timing contract before the drawing**, `checkTiming` it in a test, render
   the **final frame first**, then the mp4, then extract four frames — one inside `reference`, one
   mid-`reveal`, one as the subject lands, and the last — and look at all four.
7. **Pass the size gate 2c pinned** — `--size landscape|square|portrait` — and bake the plate at the
   same aspect. `Root.tsx` takes its `width`/`height` from that answer through `calculateMetadata`,
   the way `durationInFrames` already comes from the timing contract. Before this the composition
   was two literals (1080x1080), so a landscape slot with a 16:9 plate produced a SQUARE mp4 with
   the plate letterboxed into it and the camera work discarded — and nothing warned, because gate
   2c's three careful refusals validated an answer no producer read. `scripts/sizes.mjs` is this
   skill's copy of the three rows; `sizeFor` throws naming all three rather than defaulting.
7. **Pass the size gate 2c pinned** — `--size landscape|square|portrait`, and bake the plate at the
   same aspect. `Root.tsx` takes its `width`/`height` from that answer through `calculateMetadata`,
   the way `durationInFrames` already comes from the timing contract. Before this, the composition
   was two literals (1080 x 1080), so a landscape slot with a 16:9 plate produced a SQUARE mp4 with
   the plate letterboxed into it and the camera work discarded, and nothing warned: gate 2c's three
   careful refusals validated an answer no producer read. `scripts/sizes.mjs` is this skill's copy
   of the three rows; `sizeFor` throws naming all three rather than defaulting.

## Quick start

```sh
# the bake: one per drawn size, same bounds — the still draws 496, the video draws 620
bun skills/map-beat/scripts/bake-plate.mjs --size 496 --out /tmp/map-twin/plate-496
bun skills/map-beat/scripts/bake-plate.mjs --size 620 --out /tmp/map-twin/plate-620

# a video at a NON-SQUARE size bakes at that aspect and renders at it — bake and compose agree.
# `--size` alone still means a square plate, which is what it has always meant.
bun skills/map-beat/scripts/bake-plate.mjs --size 1104 --height 621 --out /tmp/map-twin/plate-16x9
bun skills/map-beat/scripts/render-map.mjs --video --size landscape --video-plate /tmp/map-twin/plate-16x9

# a video at a NON-SQUARE size bakes at that aspect and renders at it — bake and compose agree.
# `--size` alone means a square plate, which is what it has always meant.
bun skills/map-beat/scripts/bake-plate.mjs --size 1104 --height 621 --out /tmp/map-twin/plate-16x9
bun skills/map-beat/scripts/render-map.mjs --video --size landscape --video-plate /tmp/map-twin/plate-16x9

# rung 1: the still (~2 s). Then open it and look at it.
bun skills/map-beat/scripts/render-map.mjs --still

# rung 2: the video's LAST frame, on its own (~3 s)
bun skills/map-beat/scripts/render-map.mjs --final-frame

# rung 3: the mp4 (~10 s), then the four frames it is verified by
bun skills/map-beat/scripts/render-map.mjs --video
cd /tmp/map-twin
for n in 40 110 168 239; do
  ffmpeg -loglevel error -i map.mp4 -vf "select=eq(n\,$n)" -vsync 0 -frames:v 1 -y frame-$n.png
done
```

The frame numbers are not arbitrary: they are one frame inside `reference`, one inside `reveal`,
one inside `subject`, and the last frame of `hold` — read off `MAP_TIMING`.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| What the camera holds | `bounds` `[[-26, 36], [33, 67]]` — wide enough west to hold Iceland whole, not just its eastern edge | `BEAT`, `bake-plate.mjs` |
| Which basemap | `style` `"dataviz-light"` — quiet by construction, and a choropleth wants a ground that encodes nothing | `BEAT`, `bake-plate.mjs` |
| How long the capture waits before it gives up on `idle` | `--settle` `15000` ms | `bake-plate.mjs` |
| Where the subject's label hangs | `anchors.label` `[6.05, 46.62]` — a coordinate, so it follows the camera | `BEAT`, `bake-plate.mjs` |
| How much coastline detail survives | `minGap` `0.6` px | `bake-plate.mjs` |
| How far off-frame a ring may sit before it is culled | `margin` `40` px | `keepRing`, `geo.ts` |
| Where the rungs of the extent ladder sit | powers of four of `EARTH_CIRCUMFERENCE_KM` — one anchor, two zoom levels per rung, nothing typed | `extentBand`, `geo.ts` |
| The biggest a proportional mark may be drawn | half the plate's own MEDIAN nearest-neighbour gap, capped by the beat's typed ceiling | `markRadiusCeilingPx`, `geo.ts` |
| How much projection distortion an area encoding may carry silently | one bin of the beat's OWN legend — no budget is typed | `binsCrossedByProjection`, `geo.ts` |
| The classes | `CO2_BREAKS` `[2, 4, 6, 8, 10]` (six classes, the top open) | `geo.ts` |
| How dark the ramp gets | `FROM` `0.1` / `TO` `0.78` of the way from ground to ink | `sequentialRamp`, `geo.ts` |
| How long the whole beat runs | `total` `240` (8 s × `fps` `30`) | `MAP_TIMING`, `timing.ts` |
| **How long the reader gets to read the average** — the pause, which is the gap, not an event | `reveal.start` `70` minus `reference` end `52` = `18` | `MAP_TIMING` |
| How fast the field fills | `reveal.duration` `86` | `MAP_TIMING` |
| How much the regions' arrivals overlap | `WINDOW` `0.16` of the reveal | `arrivalProgress`, `Co2MapVideo.tsx` |
| How separate the subject's arrival feels | `subject.start` `158` (never below `reveal` end) | `MAP_TIMING` |
| How long the finished map is held | `hold.duration` `38` | `MAP_TIMING` |
| How hard the subject's outline lands | `damping` `200` against `stiffness` `120` — critically damped | `Co2MapVideo.tsx` |
| The still's frame, and the plate inside it | `900` × `560`, `MAP` = `496` | `Co2MapStill.tsx` |
| The video's frame, and the plate inside it | `1080` × `1080`, `MAP` = `620` | `Co2MapVideo.tsx` / `Root.tsx` |
| How tall the legend is (the still throws if the column stops fitting) | `LEGEND.barHeight` `200` / `300` | `Co2MapStill.tsx` / `Co2MapVideo.tsx` |

## Files

- `TYPEFACE.md` — **the face this skill draws in, and a REQUIRED gate: a render refuses without
  one.** `readTypeface` walks up from the beat's own directory, so a story root's own
  `TYPEFACE.md` overrides this skill's; `useTypeface` then puts the answer in force before
  anything is laid out. `origin` records WHO chose — `newsroom` or `journalist` means somebody
  did, `default` means nobody did and the stack is the substrate's own.

  Two things about it are load-bearing and neither is obvious. **A newsroom's face is proposed,
  never imposed:** `newsroom-charter` measures what a newsroom publishes in and `NEWSROOM.md`
  records it, but the journalist decides whether the graphic uses it, and `origin` is where that
  decision is kept. **A face that cannot be resolved is refused, never substituted:** resvg,
  Chrome and Canvas `measureText` all render a fallback for a family they cannot find and report
  nothing, so `useTypeface` lays a probe string out in the recorded family and in a family that
  exists nowhere and refuses when the two produce identical ink. A journalist told "this machine
  does not have Marr Sans" has chosen; a silent stack has not.

  This file's own prose says all of that and said it only to itself: no `SKILL.md` mentioned
  `TYPEFACE.md` at all, so the first an author heard of the gate was a render stopping — after
  preflight, intake, G1, the storyboard exchange, the palette gate, the analyst and the bake.
  The refusal names what to do, but it arrives phases after the point where a journalist should
  have been asked, and after the expensive work.

  **Which formats require it:** the four that rasterise type themselves — `chart-beat`,
  `chart-video`, `chart-web`, `map-beat`. `dw-beat` lays out type server-side, and `map-web`,
  `scrolly` and `image-beat` draw theirs as HTML in a stylesheet. Measured, not assumed:
  `splash/test/typeface-gate-is-documented.test.ts` derives that roster from the call sites and
  refuses a skill that gains the gate without documenting it.

  **Still open, and deliberately not fixed here:** the typeface has no gate POSITION the way the
  palette does. Movement (9) of `references/exchange.md` is titled "The palette and the typeface"
  and asks only about colour, so the honest common case for a real newsroom — measured faces that
  are not installed on this machine — is a refusal nobody was given the chance to answer. That
  wants a proposal with availability measured, next to the palette's, and it should land with
  issue #41.

- `references/types/` — six prose sheets, one per map type, harvested from the sibling parameterised engine and read before writing that type's beat; see its own `README.md` for what is covered and what is not.
- `scripts/bake-plate.mjs` — the camera, the gate, the plate, the projection, the culling. Refuses a
  frame taller than its geography can fill BEFORE the capture (`assertStageServesGeography`), and
  records what the camera's scale implies into `geometry.json`'s `extent` key.
- `scripts/extent-range.mjs` — the camera probe for B4.1. Drives the same `fitBounds`, style and
  capture gate at all six rungs of the ladder — planet to city — from a catalogue passed in with
  `--data`, and writes the plates and the numbers to `output-proof/extent-range/`. It ships no data
  of its own and is not a beat: no claim, no BRIEF. Also drives the world-map-in-portrait decision
  at 1080x1920 both ways, so the rule is a picture and not a paragraph.
- `scripts/render-map.mjs` — the render ladder, the join, the claim check, the beat's own words.
- `scripts/render-preview.mjs` — renders THIS skill's static seed from THIS skill's sample data.
  Accepts `--out <dir>` to write the proof to that directory instead of `assets/preview.png`.
  Supports `--check` mode for verification. Automakes the plate if missing.
- `assets/geo.ts` — the pure core. Imported by both formats and by the tests.
- `assets/Co2MapStill.tsx` — the static beat. **Replace per story.** Lays its column out from both
  ends and throws if the two halves meet, because an overlap is what a reader sees first. **The
  credit is the last line before the bottom margin** (`chart-beat/references/static-discipline.md`,
  "The source on the frame's bottom margin"), carrying the basemap credit with it, unsplit — so on
  this format it is never a translation of a `<text>`: the source joining the bottom half pushes the
  whole bottom stack (caveat, no-data swatch, legend bar, caption) up by exactly the credit block's
  own height, and the plate does not move. When the stack then stops fitting, the fix is to LOWER
  `MAP_Y` — the header gave back the row the source used to occupy — and the beat's own fit guard
  is what says by how much.
- `assets/Co2MapVideo.tsx` — the video beat. **Replace per story.** Exports `arrivalProgress`.
- `assets/timing.ts` — `MAP_TIMING`, and a re-export of the shared vocabulary.
- `assets/Root.tsx`, `assets/index.ts` — the Remotion composition and entry point.
- `assets/sample-data/regions.json` — 43 European regions with numeric values demonstrating the
  full colour ramp span, the seed's data.
- `assets/preview.png` — the static seed rendered on a light ground. Regenerate with
  `bun scripts/render-preview.mjs` whenever the seed or sample data changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `output-proof/extent-range/` — twelve real MapTiler captures at six rungs, two portrait captures,
  `range.json` and `RANGE.md`. The measured range is **40 053 km of ground down to 20 km, 2 047x in
  metres per pixel**, through one camera derivation. Regenerate with `bun scripts/extent-range.mjs`.
- `test/geo.test.ts` — the join in both failing directions, the alias, the classes, the ramp on a
  light and a dark ground, the scale, ring culling including an antimeridian wrap, the reveal order,
  the claim check, and the camera at every scale: the six rungs, the admitted ratios, the
  world-map-in-portrait limit, Mercator's area bias against the beat's own legend, and the mark
  ceiling. Three mutations are recorded at its foot with the output they produced.
- `test/timing.test.ts` — every structural rule of the motion grammar, green on the shipped timing
  and red on a timing mutated to break exactly that rule.
- `test/canon.test.ts` — validation that both format seeds carry the canon's marker wording and
  explicit format labels, and that sample data exists with sufficient variation.
- **No departed beats.** Nothing has ever moved out of this skill: it ships exactly two seeds, one
  per format (`Co2MapStill.tsx`, `Co2MapVideo.tsx`), and both are listed above. The story workspaces
  under `proof/` (`co2-suisse`, `life-expectancy`, `migration`) are CHART beats belonging to the
  chart skills — nothing to do with this one.

## What this beat found

The claim check earned its place immediately, on this fixture's first title: "…et moins que **tous**
ses voisins." **Liechtenstein, at 3,31 t, is below Switzerland's 3,60 t**, so that superlative was
not supported by the source. The title is the journalist's confirmed wording and is rendered as
given — a producer does not silently rewrite an editorial sentence — so `render-map.mjs` printed the
violation, naming the country, on every render. Because this particular title was a developer
fixture rather than a journalist's confirmed wording, there was no editorial intent to protect, so
it was corrected rather than left for a journalist's call: retitled to "…et moins que **la plupart**
de ses voisins" — checked against all five neighbours (FRA 4,07, DEU 7,02, ITA 5,25, AUT 6,23, LIE
3,31 t) before shipping, since 4 of 5 above the subject is a true strict majority. `claimViolations`
now takes a `quorum: "all" | "most"` option so the check can tell the two kinds of claim apart:
"all" still fails on a single exception, "most" fails only when the exception stops being a
minority. This beat calls it with `quorum: "most"`, matching what the title now says.

A second defect was found the same way this one was: by looking at a mid-reveal frame, not by
reading the code. A country that had not yet reached its own window in `Co2MapVideo.tsx`'s reveal
faded in from full transparency, so for several frames it showed the near-white basemap through a
half-opaque fill — reading LIGHTER than a country already filled in the lightest class, i.e. stating
the opposite of the data. Reusing the `no-data` hatch for this would have said the wrong thing (it
already means "the source is silent about this shape forever", not "hasn't been drawn yet"), so a
second, visually distinct texture (`pending`, dots rather than a diagonal hatch) holds every
value-bearing shape opaque from its first frame until its own window opens, then crossfades to its
true ramp colour. Never translucent against the basemap, so it never reads as a value it is not.

Iceland (`ISL`, in `CO2_STUDY`) was also sliced by the frame's top-left corner: the original camera
(`bounds [[-9, 36], [31, 67]]`) put most of it west of the frame. Widening west to `-26` shows it
whole; nudging east from `31` to `33` keeps that widening from re-centring the box far enough west
to newly clip Belarus. Cost: Switzerland reads about 11% smaller than it did at the old bounds — a
real trade, checked against the baked `geometry.json` (every shape's projected bounding box) rather
than eyeballed, and still clearly the only outlined, labelled, accent-coloured region on the map.
