---
name: twin-map-beat
description: Use to produce a MAP beat — one map with one thing to prove — in either genre, static or video, by WRITING a bespoke component under doctrine and looking at the render. Carries the bake (one camera, one basemap plate, one file of projected geometry), the join that fails loud, the class scale that makes a comparison legible, and one worked beat in each genre.
---

# twin-map-beat — bake the camera once, then draw an image and some coordinates

## Overview

The map craft skill. It does not hold a map type and it does not fill a config: it holds **the
bake**, and two worked beats written on it.

The bake is the whole idea. `scripts/bake-plate.mjs` spends the camera **once** — it loads a
MapTiler style in headless Chrome, gates on `idle` or a bounded settle, screenshots a quiet
basemap **plate**, and projects the beat's shapes into that plate's pixel space with
`map.project()`. After it runs there is no map anywhere in this skill: the still draws an `<image>`
and some `<path>`s through resvg, and the video draws the same image and the same paths through
Remotion. One camera, one geometry, two genres.

Both genres ship here, unlike the chart engine where video is a separate skill. A map beat's
static and video genres differ only in an **order in time**, and they must not drift apart on the
camera; keeping them in one skill is what makes "same bounds, two resolutions" a fact rather than
an intention.

The doctrine is `twin-doctrine/references/geo-discipline.md` — twelve rules, five of them written
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
| Doctrine | `twin-doctrine/references/geo-discipline.md` | The twelve rules: bounded gating, fixed plate, baked geometry, projected labels, the loud join, capture plumbing, no-data as texture, the accent in a choropleth, the quiet plate, the reveal's order, ring culling, camera-before-layout |
| Bake | `scripts/bake-plate.mjs` | One camera: plate PNG + `geometry.json` (pixel rings + projected anchors), culled and thinned |
| Pure core | `assets/geo.ts` | The study set, the alias table, the join, the classes, the ramp, `scalePosition`, ring arithmetic, the claim check. No browser, no rasteriser — which is why BOTH genres can import it |
| Static | `assets/Co2MapStill.tsx` | One beat, 900 × 560, text column beside a square plate |
| Video | `assets/Co2MapVideo.tsx` | The same beat with an order. Exports `arrivalProgress`, the reveal's stagger, testable without a browser |
| Contract | `assets/timing.ts` | `MAP_TIMING`. The vocabulary (`BeatTiming`, `checkTiming`, `progressOf`) is **imported** from `twin-chart-video`, never re-implemented |
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

**Where the map dependencies live.** `puppeteer` is a devDependency of `twin/package.json`, and
MapLibre is loaded from a CDN by the bake page, so **an installed Splash root cannot bake a plate**.
That is a real, named gap, and it is deliberate: adding a headless browser to every journalist's
install is a distribution decision, not a code decision — the same call `twin-chart-video` left open
for Remotion. Whoever ships the map genre for real makes it. `MAPTILER_KEY` comes from `twin/.env`.

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

## Quick start

```sh
# the bake: one per drawn size, same bounds — the still draws 496, the video draws 620
bun skills/twin-map-beat/scripts/bake-plate.mjs --size 496 --out /tmp/map-twin/plate-496
bun skills/twin-map-beat/scripts/bake-plate.mjs --size 620 --out /tmp/map-twin/plate-620

# rung 1: the still (~2 s). Then open it and look at it.
bun skills/twin-map-beat/scripts/render-map.mjs --still

# rung 2: the video's LAST frame, on its own (~3 s)
bun skills/twin-map-beat/scripts/render-map.mjs --final-frame

# rung 3: the mp4 (~10 s), then the four frames it is verified by
bun skills/twin-map-beat/scripts/render-map.mjs --video
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

- `references/types/` — six prose sheets, one per map type, harvested from the sibling parameterised engine and read before writing that type's beat; see its own `README.md` for what is covered and what is not.
- `scripts/bake-plate.mjs` — the camera, the gate, the plate, the projection, the culling.
- `scripts/render-map.mjs` — the render ladder, the join, the claim check, the beat's own words.
- `scripts/render-preview.mjs` — renders THIS skill's static seed from THIS skill's sample data.
  Accepts `--out <dir>` to write the proof to that directory instead of `assets/preview.png`.
  Supports `--check` mode for verification. Automakes the plate if missing.
- `assets/geo.ts` — the pure core. Imported by both genres and by the tests.
- `assets/Co2MapStill.tsx` — the static beat. **Replace per story.** Lays its column out from both
  ends and throws if the two halves meet, because an overlap is what a reader sees first. **The
  credit is the last line before the bottom margin** (`twin-chart-beat/references/static-discipline.md`,
  "The source on the frame's bottom margin"), carrying the basemap credit with it, unsplit — so on
  this genre it is never a translation of a `<text>`: the source joining the bottom half pushes the
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
- `test/geo.test.ts` — the join in both failing directions, the alias, the classes, the ramp on a
  light and a dark ground, the scale, ring culling including an antimeridian wrap, the reveal order,
  and the claim check.
- `test/timing.test.ts` — every structural rule of the motion grammar, green on the shipped timing
  and red on a timing mutated to break exactly that rule.
- `test/canon.test.ts` — validation that both genre seeds carry the canon's marker wording and
  explicit genre labels, and that sample data exists with sufficient variation.
- **No departed beats.** Nothing has ever moved out of this skill: it ships exactly two seeds, one
  per genre (`Co2MapStill.tsx`, `Co2MapVideo.tsx`), and both are listed above. The story workspaces
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
