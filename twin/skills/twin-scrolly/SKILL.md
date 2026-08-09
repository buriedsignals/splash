---
name: twin-scrolly
description: Use to produce a scroll-driven interactive — a sticky graphic that fills the frame behind, with narrative prose stepping over it as the reader scrolls. A VEHICLE, not a fourth chart genre — it ASSEMBLES DIFFERENT MEDIA behind one narrative (a photograph, then a drawn diagram, in this seed); it does not invent a second drawing engine and it does not step a single chart through several states. Ships one self-contained HTML file, degrades to the full graphic and every step's own prose with JavaScript off, and honours reduced motion.
---

# twin-scrolly — the graphic is the ground, the prose travels over it, drive a real browser to check both

## Overview

The scroll-driven vehicle. It does not hold a chart type and it is not a scrollytelling framework:
it holds the **mechanism** — a sticky graphic that fills the frame behind the reader's own scroll,
with a column of prose passing OVER it as N narrative steps go by — and **one worked beat** that
carries that mechanism with two genuinely different kinds of evidence (a photograph of a gauge
station, then a diagram of the instrument itself), because a seed is a real beat, not a mechanics
demo, the same rule every other genre in this twin keeps.

**This is the one vehicle Splash publicly promises and, before this skill, did not have.** Chart
beats ship static, web (interactive) and video; maps ship the same three. Nothing scrolled. This
skill closes that gap with the smallest thing that genuinely works: one beat, two steps of two
different media, proven by driving a real browser through every one of them — not asserted from
reading the markup.

`references/scrolly-discipline.md` was written against this seed's own first build, the way
`twin-chart-web/references/web-discipline.md` was written against the CO₂ beat's first web build,
and rewritten against this seed's SECOND build, after two structural corrections. Read it before
writing a second scrolly beat — its own "one gotcha" section names a real defect this skill's first
render shipped, and its own "Measuring prose over the graphic" section names the rule the second
build lives under.

## When to use

- When a closed `STORYBOARD.md` picks a scroll-driven interactive as the format for a beat whose
  argument is genuinely told across **different kinds of evidence** — a photograph, then a drawn
  diagram, then (a real beat might add) a chart or a map — narrated as one sequence. That is what
  this vehicle is FOR: assembling media a single beat, of any one genre, cannot assemble on its own.
- **If every step would show the same chart, do not reach for this skill — animate the beat
  instead.** A scrolly that steps four states of one chart is not a vehicle carrying different
  media; it is a duplicate of a beat that already exists under `twin-chart-web` or `twin-chart-beat`,
  stepped by hand instead of animated. `test/canon.test.ts` enforces that this seed itself never
  regresses into that shape (its own `STEPS_META` must carry at least two visibly different
  `frameKind`s) — the same discipline a real beat's own steps should keep.
- When the argument is stronger revealed in STEPS than shown all at once — a place, then the
  instrument that measures it, in an order that mirrors how a reader would actually be shown the two
  — never suspense for its own sake (the beat's own overall claim is never withheld — see
  `assets/ScrollySeed.tsx`'s own doc-comment and `references/scrolly-discipline.md`, "What must not
  become interactive-only").
- **Not** a place to invent a new drawing engine. This seed's own `DrawnGraphicFrame` carries the
  same "paint only with ground/ink/muted/accent, nothing hard-coded" discipline every chart genre in
  this twin already keeps, because nothing under a skill may import out of it — it does NOT import
  `twin-chart-web`'s or `twin-chart-beat`'s geometry, and it draws a diagram, not a chart (no axis,
  no data-driven reveal — see `assets/ScrollySeed.tsx`'s own doc-comment on why). A real beat that
  already has a chart or map component written under one of those skills hands this genre's scaffold
  ITS OWN rendered element as a step's `frame` — the scaffold never asks what that element is.
- **Not** for a map track tonight — see `references/scrolly-discipline.md`, "What this genre does
  not attempt." The mechanism (steps, sticky ground, prose-over-graphic) generalises; it was proven
  once, with two static media, under a hard deadline. A map beat needs its own pass through this
  file's own gotcha before it ships.
- **Not** a registry or a dispatcher. A scrolly is a vehicle: it carries beats, it is not a new kind
  of beat — `test/canon.test.ts` asserts no file under this skill is named like one.

## The one gotcha that will waste your day (read first)

**A `position: sticky` graphic pinned above prose reserves its OWN box at its original document
position — that is a fact about `sticky`, not a bug to route around.** This skill's own first
build tried to route around it: a second column, graphic sticky on one side, steps scrolling on the
other, never sharing horizontal space. That shipped legible, but it was the wrong SHAPE — the
project owner's own correction: *the graphic fills the frame behind, prose travels over it, the
ordinary scrollytelling shape*, not two lanes that never touch.

**The fix this skill ships instead uses the exact fact that caused the original defect, rather than
fighting it.** `.scrolly-graphic` sits sticky at the top of `.scrolly-track`, reserving a box
`--graphic-h` tall — the SAME reservation that, in the first build's single-column attempt, let a
later paragraph scroll invisibly-then-visibly through the graphic's own footprint. Now
`.scrolly-steps` — the very next sibling — is given `margin-top: calc(-1 * var(--graphic-h))`,
pulling it back UP over that exact reserved box on purpose. The sticky graphic and the scrolling
prose end up sharing the same screen coordinates for as long as the track has steps left to give,
which is precisely the overlap the first build's two-column layout spent its whole existence
avoiding. Read `references/scrolly-discipline.md`'s own "The one gotcha" and "Measuring prose over
the graphic" sections in full before touching `buildCss` in `scripts/render-scrolly.mjs`; the second
section is what makes the now-deliberate overlap safe to read, not merely present.

**Legibility is not assumed from an opaque-looking panel — it is measured.** Every step's own prose
sits in a `.step-panel` painted fully OPAQUE with the render's own `ground` (never a translucent
scrim, whose effective colour would drift with whatever part of the graphic happens to be behind it
at a given scroll position). Because the panel fully occludes the graphic at its own footprint, the
only contrast question left is ink-on-ground — the exact pairing `deriveFurniture` already computes
and escalates for every other piece of furniture in this twin. `renderScrolly` asserts this
contrast at build time (a tripwire, not a decision — see its own comment), and
`test/render-scrolly.test.ts` asserts it again independently. On this seed's own light ground, the
measured panel contrast is **21.00:1** (pure black ink on white ground) — confirmed a second way, by
reading `getComputedStyle` in a real, driven browser, not merely computed in node.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/scrolly-discipline.md` | The sticky-reservation fact and how the overlap remedy uses it on purpose, how prose-over-graphic contrast is measured (not assumed), what survives with JS off, what a screen reader reaches without scrolling, what the graphic is allowed to be silent about, reduced motion, what this genre does not attempt |
| Seed | `assets/ScrollySeed.tsx` | `STEPS_META` (this beat's own two-step arc: id, `frameKind`, prose), `ImageFrame` (a full-bleed `<img>`, this toolchain's stand-in for a photograph), `DrawnGraphicFrame` (a full-bleed `<svg>` diagram, painted only with ground/ink/muted/accent), `FRAME` (the drawn frame's own internal design canvas) |
| Interaction | `assets/interaction.mjs` | `pickActiveStep` (pure, tested — given IntersectionObserver-shaped entries, picks the winning step id), `initScrolly`/`initAll` (DOM wiring: toggles `.active` on the matching `.step`/`.step-frame` pair, knows nothing about what a frame IS) |
| Render | `scripts/render-scrolly.mjs` | **Above the CONFIG marker**: `renderScrolly({ steps, title, source, ground, outDir, name })` — the genre's own MEDIA-AGNOSTIC machinery. `steps` is `{ id, prose, frame: ReactElement }[]`; this function SSRs each `frame`, wraps it in a generic `<div class="step-frame">` (never the frame component's own job), builds the overlap scaffold, measures panel contrast, inlines the interaction script. It never reads `frameKind` — `test/render-scrolly.test.ts` scans the function's own source to prove it. **Below the marker**: `SEED`, `buildFrame` (the ONE place that reads `frameKind` and builds a `ReactElement` from it), `render` (this seed's own runner) |
| Rasteriser | `scripts/render-still.mjs` | This skill's OWN copy of `deriveFurniture`/`contrast`/`measureText` — a skill never imports another skill's copy |
| Photo generator | `scripts/build-sample-photo.mjs` | Generates this seed's own `assets/sample-data/basin-photo.png` — a flat, illustrated scene authored from shapes (nothing in this toolchain fetches real photographs yet), not sourced from anywhere, so there is nothing to credit |
| Test | `test/render-scrolly.test.ts` | `STEPS_META`'s own shape (including the ≥2-distinct-`frameKind`s structural check), `ImageFrame`/`DrawnGraphicFrame` SSR in isolation, `pickActiveStep`, the generic `renderScrolly` (media-agnostic by source-scan, panel contrast measured, overlap markup present, no two-column markup), the seed's own `render` end to end |
| Test | `test/canon.test.ts` | The canon's own shape: `REPLACE ME` wording present, the seed's own photograph is a real decoded PNG, the seed renders standalone into an empty `--out` directory with nothing else on disk, no registry/dispatcher file, preview current |

**Why the title and source live in the HTML `<header>`, ahead of the sticky track entirely.** The
header is the ONE piece of furniture that never sits over the graphic — it is plain document flow,
scrolled past once, before `.scrolly-track` even begins. This is a deliberate simplification this
skill's second build made: the first build kept the header inside the (then two-column) graphic
box; once the graphic became full-bleed and sticky, keeping the header there would have made it a
third thing needing the "measured, not assumed" contrast treatment this file's own gotcha section
describes for prose. Placing it before the track sidesteps that question entirely while keeping the
same guarantee the first build's architecture note made: the beat's own argument is stated in full,
unconditional, before any step's own reveal begins.

**Why the graphic is `aria-hidden` on every frame, and why that wrapper lives in `renderScrolly`,
never in `ImageFrame`/`DrawnGraphicFrame` themselves.** The argument this beat makes is stated in
full, in words, by the unconditional header and every step's own prose — never exclusively by the
graphic. Exposing only whichever ONE frame happens to be active at a scroll position a screen reader
user has no way to navigate to on command would be a worse reading than not exposing the graphic at
all. The wrapper lives in the generic scaffold (not the frame component) for the same reason the
`active` class does: an `<img>` and an `<svg>` need identical treatment from the scaffold's own
point of view, and that treatment must not be duplicated per frame kind.

## How it works (the shape)

1. **Read `scrolly-discipline.md`**, then write the beat's own `STEPS_META` array before touching
   any component. Each step names its own `id` (must be unique — `renderScrolly` throws otherwise),
   its own `frameKind`, and its own prose. **Before finishing, count the distinct `frameKind`s: if
   there is only one, this is not a scrolly — animate the beat instead** (see "When to use").
2. **Write one component per frame kind your steps actually use**, not one parameterised component
   with a mode flag. Neither component imports the rasteriser (`deriveFurniture`) — `ink`/`muted`/
   `grid` are props, derived once in node by whoever calls it (`scripts/render-scrolly.mjs`'s own
   seed runner for a real beat). Neither component knows about `.step-frame`, `active`, or
   `aria-hidden` — those belong to the scaffold.
3. **Teach the CONFIG seam's `buildFrame` a case per `frameKind`.** This is the ONLY place in
   `render-scrolly.mjs` allowed to know what kind of thing a step's frame is. `renderScrolly` itself
   never changes for a new medium.
4. **Bake the default state server-side.** Exactly one step (index `0`) is wrapped `active` by
   `renderScrolly` — not assigned by the inline script after the page loads. `assets/interaction.mjs`
   only ever MOVES that class after the page loads; it never assigns it for the first time.
5. **Wire the interaction layer**, not the layout. `assets/interaction.mjs`'s `initScrolly` only
   ever touches `.step`/`.step-frame` elements' own `class` — it has no code path that can hide or
   move the header or any step's own prose.
6. **Render the HTML**, then **drive a real browser** — scroll through every step and confirm the
   active frame actually changes (not merely that a class moved in the DOM — that a DIFFERENT frame
   is now the one at `opacity: 1`, confirmed via `getComputedStyle`, not by reading the markup);
   confirm the prose panel stays legible at EVERY scroll position, including the moment it crosses
   the graphic (read the panel's own computed background/colour and compute the contrast — do not
   assume an opaque-looking panel settles it); disable JavaScript and confirm the default frame and
   every step's prose survive; emulate `prefers-reduced-motion: reduce` and confirm the computed
   transition duration drops to `0s`; resize to ~375px and confirm nothing clips and nothing
   overflows horizontally. Screenshot each. A scrolly that "renders" but does not step, or that
   steps but goes illegible mid-scroll, is the exact failure this project keeps finding by looking
   at pictures instead of reading code — see this skill's own gotcha, above.

## Quick start

```sh
# the skill's own seed, from the skill's own directory — nothing else on disk is needed
bun skills/twin-scrolly/scripts/render-scrolly.mjs /tmp/canon-scrolly

# then drive it — a screenshot taken before scrolling proves nothing about a scrolly
python3 -m http.server 8931 --bind 127.0.0.1 --directory /tmp/canon-scrolly &
# open http://127.0.0.1:8931/gauge-scrolly.html in a real (or automated) browser and:
#  1. confirm the title, the source and the photograph step's own prose are on screen before
#     touching anything, the prose panel legible over the photo;
#  2. scroll down and confirm the pinned frame swaps from the photograph to the instrument diagram
#     (a DIFFERENT frame at opacity 1, not merely a moved class) while the prose panel stays legible
#     the whole way through;
#  3. disable JavaScript and reload — confirm the default (photograph) frame and both paragraphs are
#     still there, unchanged, just not advancing;
#  4. emulate prefers-reduced-motion: reduce and confirm the frame swap is an instant cut;
#  5. resize to ~375px and confirm nothing clips and the page never scrolls horizontally.
```

The seed's own runner (`render`, at the bottom of `scripts/render-scrolly.mjs`) reads
`assets/sample-data/basin-photo.png`, embeds it as a data URI, and hands the genre's generic
`renderScrolly` two built frames (one `ImageFrame`, one `DrawnGraphicFrame`) plus their prose. A
real beat writes its own runner in that same shape, importing its own frame components and building
its own `steps` array — never editing this skill's own runner in place.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The drawn frame's own internal design canvas (not the box it renders at in the real page — see `DrawnGraphicFrame`'s own doc-comment) | `640 × 900` | `FRAME`, `ScrollySeed.tsx` |
| How many narrative steps the seed carries | `2` | `STEPS_META`, `ScrollySeed.tsx` — any count ≥ 2 works, and at least two distinct `frameKind`s (canon-enforced) |
| The sticky graphic's own height (drives how much scroll the overlap covers) | `min(70vh, 640px)` | `--graphic-h`, `.scrolly-track`, `buildCss`, `render-scrolly.mjs` |
| How long a reader has to scroll through one step | `70vh` (`60vh` for the last) | `.step`, `buildCss`, `render-scrolly.mjs` |
| The prose panel's own max width | `min(42ch, 100%)` | `.step-panel`, `buildCss`, `render-scrolly.mjs` |
| The reduced-motion-gated crossfade duration | `0.3s` | `.step-frame` transition, `buildCss`, `render-scrolly.mjs` |
| The IntersectionObserver's own centre band | `-45% 0px -45% 0px` (the middle 10% of the viewport) | `initScrolly`, `interaction.mjs` |
| The WCAG floor `renderScrolly`'s own panel-contrast tripwire enforces | `4.5` | `renderScrolly`, `render-scrolly.mjs` |

## Files

- `references/scrolly-discipline.md` — the sticky-reservation fact and how the shipped remedy uses
  it deliberately, how prose-over-graphic contrast is measured (not assumed), what survives with JS
  off, what a screen reader reaches without scrolling, what the graphic is allowed to be silent
  about, reduced motion, what this genre does not attempt, verification.
- `assets/ScrollySeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat (the daily reading behind every figure this project's other beats report traces to
  one instrument, at one place — told first with a photograph, then with a diagram), not a stripped
  mechanics demo. `STEPS_META` is this beat's own narrative arc; `ImageFrame`/`DrawnGraphicFrame`
  are its two frame components, neither one importing the rasteriser or knowing about the scaffold's
  own wrapper classes.
- `assets/sample-data/basin-photo.png` — this seed's own illustrated "photograph", authored by
  `scripts/build-sample-photo.mjs` from flat shapes (nothing fetched, nothing to credit). The
  minimal graphic under this skill that needs nothing else on disk is `DrawnGraphicFrame`, not this
  file — see `scripts/render-preview.mjs`.
- `scripts/build-sample-photo.mjs` — generates `basin-photo.png` deterministically. Not run by any
  test or by `render-scrolly.mjs` itself (which reads the committed PNG as plain bytes); re-run only
  if the scene itself should change.
- `assets/preview.png` — the seed's own `DrawnGraphicFrame`, rendered standalone (the one frame this
  skill needs nothing else on disk to show) — the single most informative still to show a reader of
  this skill who runs nothing. Regenerate with `bun scripts/render-preview.mjs` whenever the seed
  changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own data —
  regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `assets/interaction.mjs` — the one script this genre ships, inlined verbatim into the HTML.
  `pickActiveStep` is pure and unit-tested; `initScrolly`/`initAll` are DOM wiring, verified by
  driving a real browser, not by a test. Knows nothing about what a `.step-frame` holds.
- `scripts/render-scrolly.mjs` — **above its own CONFIG marker**: `renderScrolly({ steps, title,
  source, ground, outDir, name })`, the genre's MEDIA-AGNOSTIC machinery — SSRs whatever
  `ReactElement` each step hands it, wraps it generically, builds the sticky-graphic/overlapping-
  prose scaffold, measures and asserts panel contrast, inlines the interaction script. **Below the
  marker**: `SEED` (this seed's own words), `buildFrame` (the one place that reads `frameKind`),
  `render` and the CLI block (this seed's own runner). Nothing in this file imports out of this
  skill.
- `scripts/render-still.mjs` — this skill's OWN copy of `deriveFurniture`/`contrast`/`measureText`/
  `renderStill` — a skill never imports another skill's copy of its rasteriser.
- `scripts/render-preview.mjs` — renders THIS skill's own `DrawnGraphicFrame` standalone (never a
  story's render, never needing the photograph) to `assets/preview.png` or `--out <dir>`. `--check`
  re-renders and fails non-zero if the committed PNG no longer matches a fresh render of the seed;
  pointed at an empty `--out` directory, this is also the proof this skill renders with nothing else
  on disk (`test/canon.test.ts`).
- `test/render-scrolly.test.ts` — `bun:test` coverage: `STEPS_META`'s own shape (including the
  ≥2-distinct-`frameKind`s structural check), `ImageFrame`/`DrawnGraphicFrame` SSR in isolation
  (closed palette, no self-assigned scaffold classes), `pickActiveStep`, the generic `renderScrolly`
  (refuses <2 steps, refuses duplicate ids, media-agnostic by source-scan of its own function body,
  panel contrast measured and asserted ≥4.5:1, overlap markup present and two-column markup absent),
  and the seed's own `render` end to end (photograph embedded as a data URI, every step's prose
  present).
- `test/canon.test.ts` — the canon's own shape: the seed carries the exact `REPLACE ME` wording, the
  seed's own photograph decodes as a real PNG, the seed renders standalone into an empty `--out`
  directory with nothing else on disk, `STEPS_META` carries at least two distinct `frameKind`s, no
  file under this skill is named like a registry or dispatcher, no relative import climbs above this
  skill's own root outside `test/`, and `preview.png` is a current render (`render-preview.mjs
  --check`).
