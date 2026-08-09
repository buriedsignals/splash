---
name: twin-map-web
description: Use to produce a map beat in the WEB genre — a self-contained interactive HTML page where hovering or focusing a region gives its exact value, a size legend stays readable, and an always-visible accessible table carries the same facts for a reader with no spatial access to the map. Fills the missing cell in this toolchain's matrix — charts ship static/web/video, maps shipped only static/video until this skill.
---

# twin-map-web — bake the plate once, draw circles a reader can interrogate, and answer for the reader who cannot see the shape

## Overview

The web genre of a map beat. It does not hold a map type and it does not fill a config: it holds
**the interaction**, the same missing piece `twin-chart-web` is for the chart engine — a reader who
can ask "what is this one worth?" and get an exact answer, without anything the legend or the title
already states being gated behind that ask. Before this skill, a map beat could ship static
(`twin-map-beat`'s still) or video (`twin-map-beat`'s mp4), never a genuinely interactive one — the
cell this skill closes.

The one seed proven through this skill, a proportional-symbol map of a sample of thirteen European
metro-area populations (`assets/MapWebSeed.tsx`), draws from the SAME baked-plate approach
`twin-map-beat` ships for its own two genres (`twin-doctrine/references/geo-discipline.md` rules 1,
2, 4, 6, 7, 9, 12): `scripts/bake-plate.mjs` spends the camera once, and the component draws an
`<image>` and some `<circle>`s, never a live map. Nothing under this skill imports `twin-map-beat`'s
own files, though — a skill has to build after being copied alone into a journalist's root, so this
skill carries its OWN copies of everything it needs (`assets/geo-symbol.ts`,
`scripts/render-still.mjs`, `scripts/bake-plate.mjs`), trimmed to what a proportional-symbol beat
actually uses (no polygon join — see the gotcha in `twin-map-beat`'s own `SKILL.md`, "a data join
fails silently" — a point has no shape to join).

There was no doctrine for this genre before this skill. `references/map-web-discipline.md` was
written against this beat's first real build, the way `twin-chart-web/references/web-discipline.md`
was written against the chart engine's own first web build — read it before writing a second map-web
beat, especially its first section: a map is a spatial medium, and a hover tooltip alone is not an
accessible answer to that fact.

## When to use

- When a closed `STORYBOARD.md` picks medium **map** and genre **web**, and the beat's `BRIEF.md` is
  written. No brief, no code — same rule every genre in this twin follows.
- When the argument is stronger with **every region's exact value available on demand**, plus a
  linear, always-visible table for a reader with no spatial access, than with the handful a static
  legend has room to label. A choropleth (regions shaded by value) or a proportional-symbol map
  (circles sized by value) both qualify — this seed is the symbol case; a choropleth's own web beat
  reuses `twin-map-beat/assets/geo.ts`'s join/ramp logic (carried as its own copy, the same rule this
  skill's `geo-symbol.ts` follows) rather than this seed's point geometry.
- **Not** to re-draw a map that already exists as a still or a video build — bake once, reuse the
  plate the same way `twin-map-beat` reuses one camera across its own two genres.
- **Not** for pan/zoom on a live tile source. A baked plate with interactive overlays is the honest,
  self-contained thing: it matches how this project already renders every map, and it means the
  shipped HTML makes zero external request once the plate is inlined as a data URI.

## The one gotcha that will waste your day (read first)

**A static render can be checked with a PNG; an interactive one cannot — and a map's own
accessibility question is not the same question a chart's web genre already answered.** Every rule
in `geo-discipline.md` about the pixels still applies to this genre's own furniture (the legend, the
labels, the water tint), but the thing unique to THIS genre — does hovering circle X show circle X's
own exact value, does Tab reach every one of the points, does the accessible table read correctly, do
the map and its legend survive JavaScript being off — is a *behaviour over time*, provable only by
driving a real browser and using it. See `references/map-web-discipline.md`, "The accessibility
question," before assuming a hover tooltip is enough: it is not, because it requires spatial access
to find in the first place, which is exactly what a screen-reader user does not have. The second trap
this skill's own bake avoids by construction rather than by discipline: MapTiler's `dataviz-light`
basemap paints water a near-grey (`hsl(240, 2%, 88%)`), and a point-based beat leaves nearly the
whole plate exposed as basemap — `scripts/bake-plate.mjs` overrides the `Water`/`Water shadow` layers
to a genuine blue tint (`#aac9e0`) before capture, the fix `geo-discipline.md` rule 7 requires and
that another beat in this same project only found by looking at a rendered symbol map, not by
reading the style.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/map-web-discipline.md` | The accessibility answer, two channels not one, shared touch/hover targets, progressive enhancement via native `<title>`, two pre-rendered layouts, what must never become interactive |
| Pure core | `assets/geo-symbol.ts` | `radiusScale` (equal-area, sqrt), `niceReferenceValues`, `drawOrder`/`readingOrder`, `labelPlacement`, `keepPoint`, `fr`. No browser, no rasteriser — this skill's OWN copy, trimmed to what a symbol map needs (no polygon join) |
| Bake | `scripts/bake-plate.mjs` | One camera, one plate PNG, one `geometry.json` of projected points — this skill's OWN copy of the bake, no shapes/join (a point has neither) |
| Composition | `assets/MapWebSeed.tsx` | `MapWebSeed` (the two-layout SVG: plate, circles, legend, subject note) and `RegionTable` (the accessible table, rendered once) |
| Interaction | `assets/interaction.mjs` | `initMap`/`initAll` — hover/tap/keyboard per point, direct listeners (no proximity resolver needed: each circle is already discrete) |
| Render | `scripts/render-web.mjs` | `renderMapWeb({ component, table, layouts, props, outDir, name })` — SSRs one SVG per layout plus the table once, inlines the interaction script, writes one self-contained HTML file. Also this skill's own seed runner (`ensurePlate`, `render`) behind a labelled CONFIG seam |
| Preview | `scripts/render-preview.mjs` | The seed rendered from sample data to a static PNG (the desktop layout), for a reader of this skill to see without opening a browser |
| Rasteriser | `scripts/render-still.mjs` | `deriveFurniture`/`measureText` — a byte-identical copy of `twin-chart-beat`'s, kept in step by hand (a skill never imports another skill) |
| Sample | `assets/sample-data/regions.json` | Thirteen European metro areas, sample population figures, the seed's own data |

**Why a symbol map, not a choropleth, for this skill's own seed.** A symbol map has no data JOIN
(`twin-map-beat/references/types/proportional-symbol.md`: "there is no data JOIN for this type") and
no polygon geometry to bake, cull or thin — the bake is a handful of `map.project()` calls, not a
Natural-Earth GeoJSON join against declared study-set keys. That made it the faster, lower-risk genre
to prove the web mechanics AND the accessibility answer on first; a choropleth's own web beat is the
next one to write, importing this skill's OWN copy of `twin-map-beat/assets/geo.ts`'s join/ramp logic
rather than `geo-symbol.ts`.

**Why the accessible table is rendered once, not once per layout.** `RegionTable` does not take a
`WebLayout` — the same thirteen facts do not read differently at 360px than at 860px, so
`renderMapWeb` SSRs it exactly once and places it after the (layout-swapped) `<figure>`, not once per
SVG. Duplicating it per layout would mean a screen reader encounters the same table twice on one
page, which is worse than not having it duplicated, not merely wasteful.

## How it works (the shape)

1. **Read `references/map-web-discipline.md`**, especially "The accessibility question," before
   writing a second beat.
2. **Bake the plate once.** `scripts/bake-plate.mjs` projects every point, records which ones missed
   the frame (`keepPoint`), and overrides the basemap's water colour before capture.
3. **Draw the circles, sized by value, largest-first** (`drawOrder`) so smaller circles stay paintable
   on top rather than buried. Every circle gets an invisible, larger hit target
   (`references/map-web-discipline.md`, "Touch and hover share one target"), a nested `<title>` for a
   no-JS native tooltip, and a baked `aria-label`/`data-detail`.
4. **Write the legend with a short per-mark unit.** `geo-discipline.md`'s own open problem (a legend
   box sized for the widest circle, not the longest unit word) is sidestepped by keeping each
   reference mark's own unit short ("M") and spending the full word once, in the caption.
5. **Render the table**, once, from the same `readingOrder` the keyboard's Home/End also uses — one
   order, two media.
6. **Render the HTML**, then **drive a real browser**: desktop width first, then hover three
   different points and check each against the source data, then keyboard-only (Tab reaches every
   point; confirm the accessible table too), then ~360-375px wide, then disable JavaScript and
   confirm the map, its legend and the table all still render. Screenshot each. A claim not driven is
   not evidence — the same rule `twin-doctrine`'s verification section states for every genre in this
   twin.

## Quick start

```sh
# the bake: one plate, this skill's own sample points, this skill's own namespace under /tmp so
# concurrent work on other beats in this repository never collides with it
bun skills/twin-map-web/scripts/bake-plate.mjs --size 496 --out /tmp/map-twin-web/plate-496

# the skill's own seed, from the skill's own sample data — nothing else on disk is needed (the bake
# above runs automatically if the plate is not already there)
bun skills/twin-map-web/scripts/render-web.mjs /tmp/map-web-twin

# then drive it — a static screenshot cannot verify an interactive claim
python3 -m http.server 8935 --bind 127.0.0.1 --directory /tmp/map-web-twin &
# open http://127.0.0.1:8935/population.html in a real (or automated) browser and:
#  1. confirm the title, the legend and the accessible table are on screen before touching anything;
#  2. hover three different circles, check the tooltip against assets/sample-data/regions.json;
#  3. Tab through every circle, confirm the same detail appears from keyboard focus alone;
#  4. resize to ~375px wide, confirm the narrow layout swaps in and nothing clips;
#  5. disable JavaScript, reload, confirm the map, the legend and the table all still render.
```

The first render command runs the SEED's runner (`render`, at the bottom of
`scripts/render-web.mjs`), which reads `assets/sample-data/regions.json` and hands the seed
component, `RegionTable`, and its `LAYOUTS` array to the genre's generic `renderMapWeb`. A real beat
writes its own runner in the same shape, beside its own story, importing its own component and its
own points — `renderMapWeb` itself does not change, the same rule `twin-chart-web`'s own
`render-web.mjs` states for its own generic function.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The two frame widths this genre ships | `860` (desktop) / `360` (narrow) | each `WebLayout`'s `width`, `MapWebSeed.tsx` |
| The breakpoint the CSS media query swaps layouts at | `480px` | `buildCss`, `render-web.mjs` |
| The square plate's own side inside each layout | `420` (desktop) / `324` (narrow) | `mapSize`, each `WebLayout` |
| The largest circle's radius | `26px` (desktop) / `15px` (narrow) | `maxRadiusPx`, each `WebLayout` |
| The smallest invisible hit target's radius (never below the visible circle's own) | `14px` | `hitR`, `MapWebSeed.tsx` |
| How many reference sizes the legend shows | `3` | `niceReferenceValues`'s `count` default, `geo-symbol.ts` |
| The camera this seed bakes | `[[-14, 34], [28, 64]]` — Lisbon to Stockholm, padded ~5° | `BEAT.bounds`, `bake-plate.mjs` |
| Which basemap | `"dataviz-light"`, water overridden to `#aac9e0` before capture | `BEAT.style` / the `style.load` handler, `bake-plate.mjs` |
| How long the capture waits before it gives up on `idle` | `15000` ms | `--settle`, `bake-plate.mjs` |
| This skill's own bake namespace (never collides with `twin-map-beat`'s `/tmp/map-twin`) | `/tmp/map-twin-web` | `DEFAULT_PLATE_DIR`, `render-web.mjs` |
| The one point this seed highlights as the subject | `"paris"` | `SUBJECT_KEY`, `MapWebSeed.tsx` |
| How the `#tooltip` is positioned relative to the pointer/focused point | `14px` above, clamped `8px` from the viewport edge | `show()`, `interaction.mjs` |

## Files

- `references/map-web-discipline.md` — the rules this genre is written under, each attached to the
  reasoning that produced it. Read before writing a second beat.
- `assets/MapWebSeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat (thirteen European metro areas, Paris the largest), not a stripped mechanics demo.
  Also where `WebLayout` is defined and where `RegionTable`, the accessible table, lives.
- `assets/geo-symbol.ts` — this skill's OWN copy of the pure proportional-symbol geometry, trimmed
  to what this genre draws (no polygon join — a symbol map has none).
- `assets/interaction.mjs` — the one script this genre ships, inlined verbatim into the HTML.
  `initMap`/`initAll` are DOM wiring, verified by driving a real browser, not by a test.
- `assets/sample-data/regions.json` — thirteen European metro areas with sample population figures
  (Paris 11.0M largest, Dublin 1.4M smallest), the seed's data.
- `assets/preview.png` — the static desktop layout, rendered on a light ground, so a reader of this
  skill sees what it produces. Regenerate with `bun scripts/render-preview.mjs` whenever the seed
  changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `scripts/bake-plate.mjs` — this skill's OWN copy of the bake: camera, gate, plate, projection, the
  water-colour override. No shapes/join argument — nothing here needs one.
- `scripts/render-web.mjs` — the genre's own machinery (`renderMapWeb`) plus this skill's own seed
  runner (`ensurePlate`, `render`, the CLI block) behind a labelled `CONFIG — edit for your story`
  seam. Nothing in this file imports out of this skill.
- `scripts/render-preview.mjs` — renders THIS skill's seed from THIS skill's sample data (never a
  story's render) to `assets/preview.png`, or `--out <dir>` to write the proof there instead.
  `--check` re-renders and fails non-zero if the committed PNG no longer matches a fresh render.
- `scripts/render-still.mjs` — `deriveFurniture`/`measureText`, a byte-identical copy of
  `twin-chart-beat`'s own file.
- `test/canon.test.ts` — the canon's own shape: the seed carries the exact `REPLACE ME` wording,
  the sample data is real rows the seed can render standalone, `preview.png` is a current render.
- `test/render-web.test.ts` — `bun:test` coverage: the SSR'd markup's structure (point count, exact
  formatted `data-detail`/`aria-label` per point, the palette, unconditional furniture), the
  accessible table's own row count and order, and geometry helpers (`radiusScale`,
  `niceReferenceValues`, `labelPlacement`).
