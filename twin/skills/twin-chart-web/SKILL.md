---
name: twin-chart-web
description: Use to produce a chart beat in the WEB genre — a self-contained interactive HTML page that reuses a chart's existing pure geometry, adds hover/tap/keyboard detail on every reading the static frame had to omit, and degrades to that same static frame with JavaScript off. Carries the interaction script, one worked composition, and the render ladder's third rung.
---

# twin-chart-web — SSR the frame, inline the interaction, drive a real browser to check it

## Overview

The web genre of a chart beat. It does not hold a chart: it holds **the interaction** — the one
thing a static frame and a video build cannot have, a reader who can ask the chart a question and
get an exact answer back, without anything the static frame already states being gated behind that
ask.

One beat has been proven through this skill, `co2-suisse` — its composition
(`proof/co2-suisse/EmissionsWeb.tsx`) lives with the rest of that story's own files, not inside
this skill's `assets/`, so this skill never hosts a particular story's numbers, only the genre's own
mechanics (`scripts/render-web.mjs`'s generic `renderWeb`, `assets/interaction.mjs`). A worked
example lives beside the skill the same replace-me way `twin-chart-beat`'s seed and
`twin-chart-video`'s compositions do — see "Quick start" for how to drive it. The CO₂ beat's
geometry (`proof/co2-suisse/crossing-geometry.ts`) is the same pure core the static beat
(`proof/co2-suisse/EmissionsLine.tsx`) and the video beat
(`twin-chart-video/assets/EmissionsVideo.tsx`) already share — one geometry, three outputs. What
this genre adds on top: every one of the series' 75 readings gets an exact, on-demand value via
hover, tap or keyboard focus, none of it printed by default.

There was no doctrine for this genre before this skill. `references/web-discipline.md` was written
against this beat's first real build, the way `static-discipline.md` was written against the first
static beat and `motion-grammar.md` against the first video build — read it before writing a second
web beat.

## When to use

- When a closed `STORYBOARD.md` picks medium `chart` and genre **web**, and the beat's `BRIEF.md` is
  written. No brief, no code — same rule as the other two genres.
- When the argument is stronger with **every reading available on demand** than with the handful a
  static frame has room to label — a long series (here, 75 annual points) where the honest use of
  interaction is detail the static frame had to omit, never the same numbers repeated for effect.
  See `web-discipline.md`, "What hover reveals."
- **Not** to re-draw a chart that already exists as a still or a video build. Import its geometry —
  a story's web composition imports its own `crossing-geometry.ts`-shaped module exactly as its
  static and video siblings do (`proof/co2-suisse/EmissionsWeb.tsx` imports
  `proof/co2-suisse/crossing-geometry.ts`, the same file `EmissionsLine.tsx` and `EmissionsVideo.tsx`
  import).
- **Not** for a map (a different engine) and **not** for a Datawrapper chart (a different producer).

## The one gotcha that will waste your day (read first)

**A static render can be checked with a PNG; an interactive one cannot.** Every rule in
`static-discipline.md` about looking at the pixels still applies to this genre's own furniture, but
the thing unique to this genre — does hovering point X show point X's own value, does Tab actually
reach it, does nothing clip once the frame is 360px wide — is a *behaviour over time*, not a frame.
`test/render-web.test.ts` covers what a unit test can honestly prove (the geometry, the palette, the
point count, the exact formatted value per point, the pure `nearestIndex` helper) and stops there.
The DOM wiring in `assets/interaction.mjs`'s `initChart` is proven, or not, by opening the rendered
file in a real browser and using it — which is exactly how this skill's own first build caught a
real bug a unit test never would have: the narrow layout's source line clipped clean off the right
edge of the frame the first time it was actually looked at, because nothing in the markup or the
test suite says "clipped," only a screenshot does.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/web-discipline.md` | What hover reveals that static could not, keyboard/touch parity, what survives with JS off, two pre-rendered layouts instead of a live reflow, what must never become interactive, the one box this genre allows |
| Geometry | the story's own `crossing-geometry.ts` (e.g. `proof/co2-suisse/crossing-geometry.ts`) | Shared with the static and video beats — `crossingGeometry`, `fr`, `yTickValues`. Not reimplemented here |
| Composition | the story's own `EmissionsWeb.tsx`-shaped file, filed beside its story, not under this skill's `assets/` | A `WebLayout`-parameterised component, called once per layout the story supplies — not a live-reflow engine |
| Interaction | `assets/interaction.mjs` | `nearestIndex` (pure, tested), `initChart`, `initAll` — hover/tap via one `.hit-area` overlay, keyboard via native `tabIndex={0}` on every point plus arrow-key shortcuts |
| Render | `scripts/render-web.mjs` | Exports the genre's generic `renderWeb({ component, layouts, props, outDir, name })` — SSRs one element per layout, derives furniture/measures gutters in node (`twin-chart-beat/scripts/render-still.mjs`), inlines the interaction script, writes one self-contained HTML file. It never imports a story's own layout constants; the caller hands them in |
| Test | `test/render-web.test.ts` | CSV parsing, the component's SSR output (palette, point count, exact per-point values, unconditional furniture), the pure `nearestIndex` helper, a direct cross-check against `crossingGeometry` |

**Where the furniture and the measurement live.** Same pattern `render-video.mjs` set:
`deriveFurniture`/`measureText` live beside a native rasteriser in
`twin-chart-beat/scripts/render-still.mjs` that no browser bundle can load, so `renderWeb` (node)
derives the furniture and measures every gutter once, and passes the results into whichever
component it was given as props (`measure`, `ink`/`muted`/`grid`). The composition itself never
imports the rasteriser.

**Why two layouts, not a live reflow.** `web-discipline.md`'s "Responsive behaviour" section argues
this in full — in short, a client-side engine recomputing `tickStep` and re-measuring gutters on
every resize is the same "one universal component" anti-pattern `twin-chart-beat`'s own "write the
beat's own component" rule already rejects, wearing a resize listener. Two hand-authored,
independently-tuned `WebLayout`s, each SSR'd once, is both less code and less risk.

**Why `render-web.mjs` does not import a story's layouts.** Its first build called `renderWeb`
`render`, and that function reached directly into `EmissionsWeb.tsx` for its two named layout
constants — the skill's own renderer importing a story's frame geometry, which is the dependency
running backwards: a second beat would have had to name its own layouts identically just to keep
the skill's code working. `renderWeb` now takes `component` and `layouts` as arguments; a story
hands it its own array (`EmissionsWeb.tsx` exports `LAYOUTS`, not two individually-imported
constants) and its own props. The genre's machinery does not know, and does not need to know, what
any one story calls its layouts or how many pixels wide they are.

## How it works (the shape)

1. **Read `web-discipline.md`**, then write the layout(s) before the interaction script. The layout
   is drawn exactly like a static beat's frame — this genre's only departure is what gets added on
   top, never what static furniture is allowed to look like.
2. **Import the geometry**; do not redraw it. `crossingGeometry`/`fr`/`yTickValues` are the same
   calls the static and video beats make.
3. **Bake every point's exact detail server-side.** `render-web.mjs` (node) computes each of the 75
   readings' `data-detail` string with the same `fr()` the other genres use — the browser script
   never formats a number, it only reads an attribute back.
4. **Wire the interaction layer**, not the layout. `assets/interaction.mjs`'s `initChart` only ever
   touches `.pt` circles' own class and the shared `#tooltip` — it has no code path that can hide or
   move the title, the reference rule, the peak's own label, or the subject's end label. See
   `web-discipline.md`, "What must not become interactive."
5. **Render the HTML**, then **drive a real browser** — desktop width first (confirm the argument is
   present before any interaction), then hover three different years and check each against the
   source data, then keyboard-only, then ~360px wide. Screenshot each. A claim not driven is not
   evidence — the same rule `twin-doctrine`'s verification section states for every genre in this
   twin.

## Quick start

```sh
bun skills/twin-chart-web/scripts/render-web.mjs /tmp/canon-web

# then drive it — a static screenshot cannot verify an interactive claim
python3 -m http.server 8934 --bind 127.0.0.1 --directory /tmp/canon-web &
# open http://127.0.0.1:8934/co2.html in a real (or automated) browser and:
#  1. confirm the title, the 1967 reference rule and the 2024 accent point are on screen before
#     touching anything;
#  2. hover three different years, check the tooltip against the source CSV;
#  3. Tab to a point, confirm the same detail appears from keyboard focus alone;
#  4. resize to ~360px wide, confirm nothing is clipped and the axis is still locatable.
```

This runs the CO₂ beat's own runner (`render`, at the bottom of `scripts/render-web.mjs`), which
reads a CSV (`--data`, default `/tmp/web-twin/data.csv`) and hands its component and its own
`LAYOUTS` array to the genre's generic `renderWeb`. A second beat writes its own runner the same
shape, importing its own story's composition and layouts.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The two frame widths this genre ships | `900` (desktop) / `360` (narrow), CO₂ beat's own numbers | each `WebLayout`'s `width`, the story's own composition file |
| The breakpoint the CSS media query swaps layouts at | `480px` | `buildCss`, `render-web.mjs` |
| How many y gridlines each layout asks for | `5` (desktop) / `4` (narrow) | `yTickHint`, each `WebLayout` |
| How many x ticks `tickStep` derives a round interval from | `6` (desktop) / `3` (narrow) | `xTickHint`, each `WebLayout` |
| A regular gridline this close to the reference is dropped | `20px` (desktop) / `16px` (narrow) | `minGridlineGapPx`, each `WebLayout` |
| The plot's own floor for usable height, independent of header wrap | `340px` (desktop) / `220px` (narrow) | `plotMinHeight`, each `WebLayout` — the frame's total height derives from this, never a fixed guess |
| The invisible hit target's radius per point (keyboard focus outline, not the touch target — see `web-discipline.md`) | `5` | `.pt` circle `r`, the story's own composition file |
| How the `#tooltip` is positioned relative to the pointer/focused point | `14px` above, clamped `8px` from the viewport edge | `show()`, `interaction.mjs` |
| The one CSS breakpoint deciding which pre-rendered SVG is visible | `max-width: 480px` | `buildCss`, `render-web.mjs` |
| The seed's two frame widths | `900` (desktop, also `SEED_LAYOUT`) / `360` (narrow) | `DESKTOP_LAYOUT`/`NARROW_LAYOUT`, `ChartWebSeed.tsx` |
| The level the seed's reference rule holds against | `2015` (`REFERENCE_YEAR`) | CONFIG block, `ChartWebSeed.tsx` |
| The one year the seed's own peak marker names | `2020` (`PEAK_YEAR`) — the series' single largest year-over-year rise | CONFIG block, `ChartWebSeed.tsx` |

## Files

- `references/web-discipline.md` — the rules this genre is written under, each attached to the
  reasoning or the defect that produced it.
- `assets/ChartWebSeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat (rainfall over a sample town, fell by a third), not a stripped mechanics demo. Also
  where `WebLayout` is defined, describing this genre's own mechanics rather than any one story's
  numbers — a story's own composition (e.g. `proof/co2-suisse/EmissionsWeb.tsx`) does NOT import
  this type; it declares its own matching copy inline, the "duplicate, do not link" ruling this
  project applies to anything with no `#shared/*` vendoring path (see the seed's own doc-comment).
  Like `proof/co2-suisse/EmissionsWeb.tsx`, the component never imports the rasteriser —
  `ink`/`muted`/`grid`/`measure` are props, derived in node by whoever calls it
  (`scripts/render-preview.mjs` for this skill's own preview). `chartGeometry`/`yTickValues`/
  `xTickValues` are pure and exported.
- `assets/sample-data/rainfall.json` — eleven annual readings for the seed's sample town
  (2015–2025, 912mm → 604mm). **Not** the same series as
  `twin-chart-beat/assets/sample-data/rainfall.json` — that file's own eleven rows differ from 2019
  on (and carry a null, this genre's data does not) — the two are comparable in shape only, not
  value for value.
- `assets/preview.png` — the seed rendered on a light ground, at `SEED_LAYOUT` (the desktop rung).
  Regenerate with `scripts/render-preview.mjs` whenever the seed changes.
- `assets/interaction.mjs` — the one script this genre ships, inlined verbatim into the HTML.
  `nearestIndex` is pure and unit-tested; `initChart`/`initAll` are DOM wiring, verified by driving
  a real browser, not by a test.
- `scripts/render-web.mjs` — the genre's own machinery: `renderWeb({ component, layouts, props,
  outDir, name })` SSRs one element per layout, derives the furniture, inlines the interaction
  script, writes one self-contained HTML file. It knows no story's numbers. Beneath it,
  `readingsFromCsv`, `BEAT`, `render` and the CLI block are the CO₂ beat's own runner — the same "a
  story's script filed beside the skill" shape `twin-chart-video/scripts/render-video.mjs` already
  has.
- `scripts/render-preview.mjs` — renders THIS skill's seed from THIS skill's sample data (never a
  story's render) to `assets/preview.png`. Derives `ink`/`muted`/`grid` with `deriveFurniture` and
  supplies `measureText` as `measure` — the same division `render-web.mjs`'s `renderWeb` uses for a
  real beat, so the seed component itself never imports the rasteriser. `--check` re-renders and
  fails non-zero if the committed PNG no longer matches a fresh render of the seed — the freshness
  contract `test/canon.test.ts` asserts, and the same canonical shape Tasks 6 and 7 adapt to their
  own seed and renderer.
- `test/render-web.test.ts` — `bun:test` coverage: CSV parsing, the component's SSR output (closed
  palette, point count, exact per-point French-formatted values, everything argument-bearing
  rendered unconditionally), the pure `nearestIndex` helper, and a direct cross-check against
  `crossingGeometry` so this genre never carries a second implementation of data-to-coordinates.
- `test/canon.test.ts` — the canon's own shape, not a story's: no CO₂ story component under this
  skill's `assets/`, the seed carries the exact `REPLACE ME` wording and none of the CO₂ story's own
  copy, the sample data is real rows a seed can render standalone, and `preview.png` is a current
  render (`render-preview.mjs --check`).
- **The CO₂ beat's own files live outside this skill, in `proof/co2-suisse/`**: `EmissionsWeb.tsx`
  (composition — declares its own `WebLayout` type inline, not imported from this skill's seed,
  and exports its own two named layout constants and a `LAYOUTS` array bundling them for
  `render-web.mjs`'s CLI),
  `crossing-geometry.ts` (the pure core, shared with the static and video beats), `EmissionsLine.tsx`
  (the static beat), `BRIEF.md`, `STORYBOARD.md`, `co2-suisse-still.png`. This skill's own `assets/`
  carries no story of its own beyond the seed — replace `proof/co2-suisse/` with the next story's own
  workspace, never edit those files in place expecting them to generalise.
