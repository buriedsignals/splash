---
name: scrolly
description: Use to produce a scroll-driven interactive (scrollytelling) — a FIXED graphic that fills the frame, with an opaque prose card centred over it and travelling upward as the reader scrolls (the page itself does not scroll). The scrolly skill produces IMAGE, MAP and CHART scrollys: a sequence of the journalist's own photographs, a baked map (optionally a live MapTiler layer leashed to the subject), or a single chart whose states the scroll interpolates continuously — each ONE medium under a travelling prose card, and that is the ordinary case. Assembling several media behind one narrative is a documented extension the seed also demonstrates, not the thing to reach for first. It does not invent a second drawing engine, and a chart scrolly never replays the static chart's states as a slideshow — the scroll drives one continuous interpolation, each card changing the picture.
---

# scrolly — the graphic is the fixed ground, the prose is pinned in a lane over it, drive a real browser through a CONTINUOUS scroll to check both

## Overview

The scroll-driven vehicle: a FIXED graphic filling the frame behind the reader's own scroll, with a
pinned panel of prose sitting OVER it as N narrative steps go by. It holds the mechanism, not a
chart-type library.

Three scrollies: **image** (the journalist's own photographs), **map** (a baked plate, optionally a
live MapTiler layer), and **chart** (one chart, the scroll interpolating its own states
continuously). One medium, one fixed graphic, prose cards over it — start here. Assembling several
media behind one narrative (the seed's own four tracks) is a documented EXTENSION, not the default —
read `references/assembly-extension.md` before reaching for it.

**Read `references/scrolly-discipline.md` before writing a second scrolly beat** — the full doctrine
behind this file's rules.

## When to use

- A closed `STORYBOARD.md` picks a scroll-driven interactive for a beat whose argument is told across
  **different kinds of evidence** narrated as one sequence (the assembly extension), OR
- **A single chart or map argues its point BETTER as a scroll-led continuous transformation** than as
  one static frame or an unguided web page — never a replay of static states as a slideshow. Read
  `references/types/<type>.md` for the type's scroll gestures and worked example first.
- The argument is stronger revealed in STEPS than shown all at once. The overall claim is stated in
  full in the header, before any step's reveal.
- **Not** a place to invent a new drawing engine, a moving camera, or a registry/dispatcher.

## The one gotcha that will waste your day

**A SCROLLY CHECKED BY JUMPING TO SCROLL POSITIONS IS NOT CHECKED.** Sampling settles into a state
that looks perfect and hides a graphic that never once painted correctly under a real, continuous
scroll — *le scrolly est buggé pour tous* is how the owner put it the last time this shipped anyway.
Install a `requestAnimationFrame` recorder BEFORE you touch the scroll position:
`scripts/verify-scrolly.mjs` is that recorder. Full detail and the reason it matters:
`references/verification-checklist.md`.

## Producing a scrolly in a run

**Prerequisite — `PALETTE.md` must already be recorded**, a journalist decision from `skills/palette`
(once `NEWSROOM.md` is resolved), never defaulted by scrolly. The scaffolded runner refuses
immediately, by name, when it is missing.

1. **Pick the type** from the catalogue table below and **read its sheet**
   (`references/types/<type>.md`): what it argues, its scroll gestures, what a choreography must not
   do, and its worked example(s).
2. **Scaffold the plumbing** rather than copying it by hand — a cold run was measured copying
   ~400-500 identical lines per beat. `bun skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type
   <type> --beat proof/scrolly-<subject> --component <PascalName>` for a chart type;
   `scaffold-scrolly-map-beat.mjs` (same flags) for a map type. Works into a beat folder that already
   exists (analyst's `data.json`/`DATA-NOTES.md`, written first); refuses only an unknown `--type`, a
   `--beat` not under `proof/` (or a story's `beats/`), or a real file collision. Every written file
   carries `SCAFFOLD` markers for the beat's own work. A map type's `<type>-plan.mjs` is a small real
   WORKING plan, not an empty skeleton — edit it, don't restart it; read
   `references/map-scrolly-state-binding.md` before changing its layers.
   **Data shape matching**: the scaffold picks the worked example whose recorded DATA SHAPE
   (`points` vs `per-area`, from `references/types/<type>.md`) matches `--shape <name>` or the
   subject's own `data.json` columns; when no worked example matches it still scaffolds — from the
   closest one — with a `SHAPE MISMATCH` banner at every copied data-loading and mark-drawing region
   naming what must change. Never a silent mismatch. Detail: `references/data-shape-matching.md`.
3. **Write the claim/assertions/choreography/marks** the scaffold marked — `grep -rn SCAFFOLD <beat>`
   finds every stub. The runner throws a named error while any copy is a placeholder.
4. **Fast loop**: render with the live composed direction (`.local.html` for a map beat) and look at
   it before driving anything. `--no-bake` reuses fallback images after the first bake.
5. **Owner review**: drive it continuously (`scripts/verify-scrolly.mjs`, and
   `scripts/verify-live-map-scrolly.mjs` for a map beat) — see "The one gotcha" above.
6. **Final pass**: bake (drop `--no-bake` for a map beat) and run the guards
   (`test/scroll-integrity.test.ts`, `test/render-scrolly.test.ts`) before delivery.

**ONE ART DIRECTION IN A PRODUCTION RUN**, not the three filed demo directions: the scaffolded
runner composes one from the beat's own `PALETTE.md` and text (`composeDirections`,
`shared/design-base/compose.mjs`) and renders only that by default. `--filed` renders `creme`,
`nocturne`, `rapport` for a catalogue proof only — a production beat never ships all three.

## Quick start

```sh
# the skill's own seed — the frozen data and the baked plate are committed, so nothing is fetched
bun skills/scrolly/scripts/render-scrolly.mjs /tmp/canon-scrolly

# re-bake the map plate only if the camera or the station changes (needs MAPTILER_KEY)
bun skills/scrolly/scripts/bake-plate.mjs

# then drive it — a screenshot taken before scrolling proves nothing about a scrolly
python3 -m http.server 8931 --bind 127.0.0.1 --directory /tmp/canon-scrolly &
# open http://127.0.0.1:8931/gauge-scrolly.html in an automated browser and drive it continuously;
# see references/verification-checklist.md for the full list to measure.
```

## How it works (the shape)

1. **Read `scrolly-discipline.md`**, then write the beat's own `STEPS_META` before touching any
   component. **Count the distinct `frameKind`s: if there is only one, this is not a scrolly.**
2. **Write one component per frame kind.** No frame component imports the rasteriser —
   `ink`/`muted`/`grid` are props, derived once in node by whoever calls it. No frame knows about
   `.step-frame`, `active` or `aria-hidden`; those belong to the scaffold.
3. **Decide, per frame, whether it is scenery or evidence.** Scenery (a basemap, a drawn backdrop)
   is COVER-cropped and fills the frame; anything it annotates goes inside `safeBand()`. Evidence (a
   chart, and a photograph) is FITTED and never cropped. Place labels against the CARD's own stripe —
   see `references/scrolly-discipline.md`, "Two kinds of frame," for the full placement rule.
4. **Freeze the data beside the beat and compute every figure from it.** `prose` is a function of
   derived facts, not a string with numbers typed into it.
5. **Teach the CONFIG seam's `buildFrame` a case per `frameKind`.** That is the entire cost of a new
   medium; `renderScrolly` does not change.
6. **Bake the default state server-side.** Exactly one frame is wrapped `active` by `renderScrolly`,
   never assigned by the script after load. The script only ever MOVES that class.
7. **Write more than two steps** — two hides boundary bugs a middle step would catch.
8. **Render the HTML, then DRIVE A REAL BROWSER through a CONTINUOUS scroll** —
   `bun skills/scrolly/scripts/verify-scrolly.mjs <file.html>` does it at all three widths. Measure
   the full checklist in `references/verification-checklist.md` — do not eyeball.

## Per-type sheets

Every catalogue chart and map type has its own sheet: what it argues, the scroll gestures that suit
it, what a choreography must not do, the precision to assert, its worked `proof/scrolly-*` example(s),
and each worked example's own data shape. Read the type's sheet before writing its choreography.

| Type | Sheet | Worked example |
| --- | --- | --- |
| Area (and stacked area) | `references/types/area.md` | `proof/scrolly-area-swiss-co2/` |
| Bar and column | `references/types/bar-and-column.md` | `proof/scrolly-bar-top-emitters-2024/` |
| Beeswarm | `references/types/beeswarm.md` | `proof/scrolly-beeswarm-co2-per-person/` |
| Box plot | `references/types/boxplot.md` | `proof/scrolly-boxplot-france-co2-decades/` |
| Bullet | `references/types/bullet.md` | `proof/scrolly-bullet-low-carbon-share/` |
| Bump (ranking-over-time) | `references/types/bump.md` | `proof/scrolly-bump-emitter-rank/` |
| Calendar heatmap | `references/types/calendar-heatmap.md` | `proof/scrolly-calendar-heatmap-geneva/` |
| Connected scatter | `references/types/connected-scatter.md` | `proof/scrolly-connected-scatter-lowcarbon/` |
| Diverging bar | `references/types/diverging-bar.md` | `proof/scrolly-diverging-bar-eu-per-capita/` |
| Diverging stacked bar (Likert) | `references/types/diverging-stacked-bar.md` | `proof/scrolly-diverging-stacked-electricity/` |
| Dot strip | `references/types/dot-strip.md` | `proof/scrolly-dot-strip-lowcarbon-spread/` |
| Dumbbell (range plot) | `references/types/dumbbell.md` | `proof/scrolly-dumbbell-life-expectancy-gains/` |
| Gantt | `references/types/gantt.md` | `proof/scrolly-gantt-top-ten-tenure/` |
| Grouped bar | `references/types/grouped-bar.md` | `proof/scrolly-wind-vs-solar/` |
| Heatmap (matrix) | `references/types/heatmap.md` | `proof/scrolly-heatmap-coal-share-europe/` |
| Histogram | `references/types/histogram.md` | `proof/scrolly-carbon-footprint-spread/` |
| Line | `references/types/line.md` | `proof/scrolly-line-swiss-co2/` |
| Lollipop | `references/types/lollipop.md` | `proof/scrolly-lollipop-co2-per-person/` |
| Marimekko (mosaic plot) | `references/types/marimekko.md` | `proof/scrolly-marimekko-electricity-mix/` |
| Parallel coordinates | `references/types/parallel-coordinates.md` | `proof/scrolly-parallel-coordinates-electricity-mix/` |
| Pictogram (isotype) | `references/types/pictogram.md` | `proof/scrolly-pictogram-europe-lowcarbon/` |
| Pie and donut | `references/types/pie-and-donut.md` | `proof/scrolly-donut-world-co2-share/` |
| Population pyramid | `references/types/population-pyramid.md` | `proof/scrolly-swiss-age-pyramid/` |
| Radar (spider) | `references/types/radar.md` | `proof/scrolly-radar-electricity-mix/` |
| Sankey | `references/types/sankey.md` | `proof/scrolly-sankey-electricity-sources/` |
| Scatter (and bubble) | `references/types/scatter.md` | `proof/scrolly-scatter-income-life-expectancy/` |
| Slope (slopegraph) | `references/types/slope.md` | `proof/scrolly-slope-europe-lowcarbon/` |
| Small multiples | `references/types/small-multiples.md` | `proof/scrolly-small-multiples-lowcarbon/` |
| Stacked bar | `references/types/stacked-bar.md` | `proof/scrolly-stacked-bar-lowcarbon-growth/` |
| Streamgraph | `references/types/streamgraph.md` | `proof/scrolly-streamgraph-swiss-electricity/` |
| Treemap | `references/types/treemap.md` | `proof/scrolly-treemap-europe-capacity/` |
| Waterfall (bridge) | `references/types/waterfall.md` | `proof/scrolly-germany-electricity-bridge/` |
| Cartogram (area distortion — and tile cartogram) | `references/types/cartogram.md` | `proof/scrolly-cartogram-europe-lowcarbon/` |
| Choropleth | `references/types/choropleth.md` | `proof/scrolly-choropleth-europe-lowcarbon/` |
| Contour / isoline | `references/types/contour-isoline.md` | `proof/scrolly-contour-europe-distance/` |
| Dot density | `references/types/dot-density.md` | `proof/scrolly-dot-density-europe-stations/` |
| Flow map (route — and origin-destination) | `references/types/flow-map.md` | `proof/scrolly-flow-map-ukraine-protection/` |
| Hex grid (spatial binning — and hex cartogram) | `references/types/hex-grid.md` | `proof/scrolly-hex-grid-europe-protection/` |
| Locator | `references/types/locator.md` | `proof/scrolly-locator-zaporizhzhia/` |
| Proportional symbol (symbol / bubble map) | `references/types/proportional-symbol.md` | `proof/scrolly-proportional-symbol-europe-capacity/` |

## Architecture

Full layer table (doctrine, seed, render, bake, verify, tests) and the two placement rationales:
`references/architecture.md`.

## Tuning knobs

Every configurable value (prose lane, step height, card widths, contrast floor, drift ceiling, …)
and where it lives: `references/tuning-knobs.md`.

## Files

References: `scrolly-discipline.md` (full doctrine), `assembly-extension.md` (single-medium vs
four-track), `architecture.md` (full layer table), `tuning-knobs.md`, `verification-checklist.md`,
`data-shape-matching.md`, `directed-type-choreography.md` (choreography gestures),
`map-scrolly-state-binding.md` (the `$state` token `bindState`/`validateScrollyPlan` accept), all
under `references/`. `TYPEFACE.md` — this skill's recorded typeface (`origin: default`); a story root
overrides it.

Seed (`assets/`): `ScrollySeed.tsx` (`REPLACE ME` — `STEPS_META`, the four frame components, the
placement constants), `gauge-data.ts` (the reading layer), `sample-data/` (frozen CSV, station file,
baked plate, illustrated scene), `interaction.mjs` (`pickActiveStep`, `measureProgress`,
`initScrolly`), `preview.png` (regenerate with `scripts/render-preview.mjs`).

Scripts: `render-scrolly.mjs` (`renderScrolly` media-agnostic machinery above the CONFIG marker;
`buildFrame` below it), `scaffold-scrolly-beat.mjs` / `scaffold-scrolly-map-beat.mjs` (see
"Producing a scrolly in a run"), `bake-plate.mjs` (map bake, run once), `render-preview.mjs`,
`build-sample-photo.mjs`, `verify-scrolly.mjs` (`... <file.html> [--width=1600]`),
`render-still.mjs` (this skill's own `deriveFurniture`/`contrast`/`measureText`).

`output-proof/` — the four tracks as a real browser rendered them, at the scroll position where
`data-progress` reaches that step.

Tests: `test/render-scrolly.test.ts` (generic scaffold, card-over-visual, two widths),
`test/scroll-integrity.test.ts` (walks `verify-scrolly.mjs` over every scrolly on disk),
`test/seed-tracks.test.ts` (four tracks, data layer, claims recomputed from the frozen file),
`test/canon.test.ts` (canon shape, no registry/dispatcher).
