---
name: twin-scrolly
description: Use to produce a scroll-driven interactive — a sticky graphic that advances through narrative steps as the reader scrolls. A VEHICLE, not a fourth chart genre — it carries a beat's own geometry (a chart, for this seed) through narrative steps; it does not invent a second drawing engine. Ships one self-contained HTML file, degrades to the full graphic and every step's own prose with JavaScript off, and honours reduced motion.
---

# twin-scrolly — pin the graphic, scroll the steps, drive a real browser to check it advances

## Overview

The scroll-driven vehicle. It does not hold a chart type and it is not a scrollytelling framework:
it holds the **mechanism** — a sticky graphic column that advances through N narrative steps as the
reader scrolls a column of prose past it — and **one worked beat** that carries that mechanism with
a real chart (flow through a sample basin fell by more than a third), because a seed is a real beat,
not a mechanics demo, the same rule every other genre in this twin keeps.

**This is the one vehicle Splash publicly promises and, before this skill, did not have.** Chart
beats ship static, web (interactive) and video; maps ship the same three. Nothing scrolled. This
skill closes that gap with the smallest thing that genuinely works: one beat, four steps, proven by
driving a real browser through every one of them — not asserted from reading the markup.

`references/scrolly-discipline.md` was written against this seed's own first build, the way
`twin-chart-web/references/web-discipline.md` was written against the CO₂ beat's first web build.
Read it before writing a second scrolly beat — its own "one gotcha" section names a real defect
this skill's first render shipped and a screenshot alone did not catch.

## When to use

- When a closed `STORYBOARD.md` picks a scroll-driven interactive as the format for a beat that
  already has a working chart/map component — a scrolly reuses that component's shape, it does not
  replace it. No brief, no code — same rule as every other genre.
- When the argument is stronger revealed in STEPS than shown all at once — a rebound that reads as
  a genuine surprise because the reader has already scrolled past the decline that came before it,
  never suspense for its own sake (the beat's own overall claim is never withheld — see
  `assets/ScrollySeed.tsx`'s own doc-comment and `references/scrolly-discipline.md`, "What must not
  become interactive-only").
- **Not** a place to invent a new drawing engine. This seed carries its own copy of the "data to
  coordinates, nothing else" geometry split every chart genre in this twin already keeps
  (`chartPoints`/`tracePath`), because nothing under a skill may import out of it — it does NOT
  import `twin-chart-web`'s or `twin-chart-beat`'s geometry. A real beat that already has a chart or
  map component written under one of those skills writes its OWN scrolly frame from this seed's
  shape, the same "read the seed, write the beat" rule the other genres already state.
- **Not** for a map track tonight — see `references/scrolly-discipline.md`, "What this genre does
  not attempt." The mechanism (steps, sticky column, reveal-by-cutoff) generalises; it was proven
  once, with a chart, under a hard deadline. A map beat needs its own pass through this file's own
  gotcha before it ships.
- **Not** a registry or a dispatcher. A scrolly is a vehicle: it carries beats, it is not a new kind
  of beat — `test/canon.test.ts` asserts no file under this skill is named like one.

## The one gotcha that will waste your day (read first)

**A sticky graphic pinned above a single column of prose does not stay above it — scrolled far
enough, the prose scrolls UNDER the pin, and an opaque graphic paints over the words.** This
skill's own first render shipped exactly that defect: it looked correct in a screenshot taken
before scrolling (title present, four frames present, four paragraphs present) and was only caught
by scrolling a real browser to the third of four steps and looking again. The fix is **two columns,
side by side** (graphic column sticky, steps column scrolling next to it, never sharing the same
horizontal space at any scroll position) rather than a taller sticky box, a solid background, or a
higher `z-index` — none of which remove the collision, they only move or hide it. Read
`references/scrolly-discipline.md`'s own "one gotcha" section in full before touching the CSS in
`scripts/render-scrolly.mjs`; it explains WHY `position: sticky` creates this collision (not merely
that it does) and why a shorter graphic or a narrower column does not fix it either.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/scrolly-discipline.md` | The sticky/overlap gotcha and why two columns fix it structurally, what survives with JS off, what a screen reader reaches without scrolling, what the graphic is allowed to be silent about, reduced motion, what this genre does not attempt |
| Geometry + steps | `assets/ScrollySeed.tsx` | `chartPoints`/`tracePath` (pure, own copy — not imported from another chart genre), `STEPS` (this beat's own narrative arc: id, reveal cutoff, which annotations show, the step's own prose), the `ScrollyChartSeed` component |
| Interaction | `assets/interaction.mjs` | `pickActiveStep` (pure, tested — given IntersectionObserver-shaped entries, picks the winning step id), `initScrolly`/`initAll` (DOM wiring: toggles `.active` on the matching `.step`/`.step-frame` pair) |
| Render | `scripts/render-scrolly.mjs` | `renderScrolly({ component, steps, props, outDir, name })` — SSRs one frame per step, builds the two-column scaffold + inlined interaction script, writes one self-contained HTML file. Never imports a story's own steps or numbers by name |
| Rasteriser | `scripts/render-still.mjs` | This skill's OWN copy of `deriveFurniture`/`measureText`/`contrast` — a skill never imports another skill's copy |
| Test | `test/render-scrolly.test.ts` | Pure geometry, `STEPS`' own shape, `pickActiveStep`, the component's SSR output (closed palette, baked-in `active` class, unconditional furniture), the full render (every step's prose present and ungated, exactly one active frame, reduced-motion gated) |
| Test | `test/canon.test.ts` | The canon's own shape: `REPLACE ME` wording present, sample data distinct from the other genres' own, no registry/dispatcher file, preview current |

**Why the title and source live in the HTML `<header>`, not inside each SVG frame.** Every other
chart genre in this twin draws its title inside the one SVG it ships, because there is only ever
one frame on screen. This genre keeps FOUR frames in the same DOM at once (three of them
`aria-hidden`, invisible at any given moment) — duplicating the same title/source string into all
four would be pure waste for no accessibility gain, since one persistent HTML header already
reaches every reader regardless of which frame is active. This is this genre's own deliberate
departure, the same register `web-discipline.md` uses for its own departure (`role="img"`).

**Why the graphic is `aria-hidden` on every frame.** The argument this beat makes is stated in full,
in words, by the unconditional header and every step's own prose — never exclusively by the chart.
Exposing only whichever ONE frame's `<desc>` happens to be active at a scroll position a screen
reader user has no way to navigate to on command would be a worse reading than not exposing the
graphic at all. See `references/scrolly-discipline.md`, "What the graphic is allowed to be silent
about."

**Why the two-column layout only engages at `720px` and up.** Below that, the graphic is static —
present, fully accessible, showing whichever frame is currently `active` — but does not advance as
the reader scrolls. This is a stated scope cut for tonight's deadline, not a silent degradation: see
`references/scrolly-discipline.md`, "What this genre does not attempt."

## How it works (the shape)

1. **Read `scrolly-discipline.md`**, then write the beat's own `STEPS` array before touching the
   component. Each step names its own reveal cutoff (a year, in this seed — whatever the beat's own
   series indexes by), which annotations show, and its own prose. Steps must reveal forward only —
   `renderScrolly` throws if a later step's cutoff is earlier than an earlier one's.
2. **Reuse the geometry shape, write your own copy.** `chartPoints` computes every point's pixel
   coordinates ONCE, over the FULL series and a FIXED domain — every step calls it with the same
   data, so the axis never rescales as the reveal advances. Only `tracePath` decides how much of
   the result a given step actually draws. A beat that needs a different shape (a map, a different
   chart type) writes its own version of this split; it does not parameterise this seed's.
3. **Bake the default state server-side.** Exactly one step (`STEPS[0]`) is rendered with
   `active: true` — the class this puts in the markup, not the inline script, is the entire no-JS
   contract. `assets/interaction.mjs` only ever MOVES that class after the page loads; it never
   assigns it for the first time.
4. **Wire the interaction layer**, not the layout. `assets/interaction.mjs`'s `initScrolly` only
   ever touches `.step`/`.step-frame` elements' own `class` — it has no code path that can hide or
   move the header, the reference rule, or any step's own prose.
5. **Render the HTML**, then **drive a real browser** — scroll through every step and confirm the
   active frame actually changes (not merely that a class moved in the DOM — that a DIFFERENT frame
   is now the one at `opacity: 1`); disable JavaScript and confirm the default frame and every
   step's prose survive; emulate `prefers-reduced-motion: reduce` and confirm the computed
   transition duration drops to `0s`; resize to ~375px and confirm nothing clips and nothing
   overlaps. Screenshot each. A scrolly that "renders" but does not step is the exact failure this
   project keeps finding by looking at pictures instead of reading code — see this skill's own
   gotcha, above.

## Quick start

```sh
# the skill's own seed, from the skill's own sample data — nothing else on disk is needed
bun skills/twin-scrolly/scripts/render-scrolly.mjs /tmp/canon-scrolly

# then drive it — a screenshot taken before scrolling proves nothing about a scrolly
python3 -m http.server 8931 --bind 127.0.0.1 --directory /tmp/canon-scrolly &
# open http://127.0.0.1:8931/rainfall-scrolly.html in a real (or automated) browser and:
#  1. confirm the title, the 2016 reference rule and step 1's own prose are on screen before
#     touching anything;
#  2. scroll to each of the four steps in turn and confirm the pinned frame's own state changes
#     with it (the traced line lengthens, the rebound marker and end label appear on schedule);
#  3. disable JavaScript and reload — confirm the default frame and all four paragraphs are still
#     there, unchanged, just not advancing;
#  4. emulate prefers-reduced-motion: reduce and confirm the frame swap is an instant cut;
#  5. resize to ~375px and confirm nothing clips and the graphic never overlaps the prose.
```

The seed's own runner (`render`, at the bottom of `scripts/render-scrolly.mjs`) reads
`assets/sample-data/rainfall.json` and hands the seed component and its `STEPS` array to the
genre's generic `renderScrolly`. A real beat writes its own runner in that same shape, importing its
own component, its own `STEPS`, and its own data — never editing this skill's own runner in place.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| This genre's own frame size (drives the sticky column's `max-width` too) | `640 × 380` | `FRAME`, `ScrollySeed.tsx` |
| How many narrative steps the seed carries | `4` | `STEPS`, `ScrollySeed.tsx` — any count ≥ 2 works, nothing in `renderScrolly` assumes exactly four |
| The level every step's reference rule holds against | `2016` (`REFERENCE_YEAR`) | CONFIG block, `ScrollySeed.tsx` |
| The one year the rebound marker names | `2021` (`PEAK_YEAR`) — the series' single largest year-over-year rise | CONFIG block, `ScrollySeed.tsx` |
| A domain-end tick within this many px of the reference row is dropped, not drawn | `16` (`MIN_TICK_GAP_PX`) | `ScrollySeed.tsx` — first caught on this seed's own preview, where 950/940 nearly collided |
| The width at which the sticky two-column layout engages | `720px` | `@media` query, `buildCss`, `render-scrolly.mjs` |
| How long a reader has to scroll through one step | `70vh` (`60vh` for the last) | `.step`, `buildCss`, `render-scrolly.mjs` |
| The reduced-motion-gated crossfade duration | `0.3s` | `.step-frame` transition, `buildCss`, `render-scrolly.mjs` |
| The IntersectionObserver's own centre band | `-45% 0px -45% 0px` (the middle 10% of the viewport) | `initScrolly`, `interaction.mjs` |

## Files

- `references/scrolly-discipline.md` — the sticky/overlap gotcha (why it happens, what does not
  fix it, what does), what survives with JS off, what a screen reader reaches without scrolling,
  what the graphic is allowed to be silent about, reduced motion, what this genre does not attempt,
  verification.
- `assets/ScrollySeed.tsx` — the seed, marked `REPLACE ME. Do not parameterise me.`: a real,
  complete beat (flow through a sample basin fell by more than a third across nine annual readings,
  told across four steps), not a stripped mechanics demo. `chartPoints`/`tracePath`/`yTickValues`
  are pure and exported; `STEPS` is this beat's own narrative arc; `ScrollyChartSeed` never imports
  the rasteriser — `ink`/`muted`/`grid`/`measure` are props, derived by whoever calls it.
- `assets/sample-data/rainfall.json` — nine annual readings, 2016–2024 (940mm → 615mm, one
  rebound year), this seed's own data. **Not** the same file as `twin-chart-beat`'s or
  `twin-chart-web`'s own `rainfall.json` — different years, different values, comparable only in
  shape.
- `assets/preview.png` — the seed's LAST step (the fully-revealed chart) rendered on a light
  ground — the single most informative still to show a reader of this skill who runs nothing.
  Regenerate with `bun scripts/render-preview.mjs` whenever the seed changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `assets/interaction.mjs` — the one script this genre ships, inlined verbatim into the HTML.
  `pickActiveStep` is pure and unit-tested; `initScrolly`/`initAll` are DOM wiring, verified by
  driving a real browser, not by a test.
- `scripts/render-scrolly.mjs` — the genre's own machinery: `renderScrolly({ component, steps,
  props, outDir, name })` SSRs one frame per step, builds the two-column scaffold, inlines the
  interaction script, writes one self-contained HTML file. It knows no story's own steps or numbers.
  Beneath it, `SEED`, `render` and the CLI block are the runner for THIS SKILL'S OWN SEED, behind a
  labelled `CONFIG — edit for your story` seam. Nothing in this file imports out of this skill.
- `scripts/render-still.mjs` — this skill's OWN copy of `deriveFurniture`/`contrast`/`measureText`/
  `renderStill` — a skill never imports another skill's copy of its rasteriser.
- `scripts/render-preview.mjs` — renders THIS skill's seed, at its own last step, from THIS skill's
  sample data (never a story's render) to `assets/preview.png` or `--out <dir>`. `--check` re-renders
  and fails non-zero if the committed PNG no longer matches a fresh render of the seed.
- `test/render-scrolly.test.ts` — `bun:test` coverage: the pure geometry (fixed-domain coordinates,
  forward-only reveal, empty path when nothing is revealed), `STEPS`' own shape (forward-sorted,
  every step has prose, peak/end labels only where earned), `pickActiveStep` (largest-ratio
  winner, ignores non-intersecting entries, `null` on empty), the component's SSR output (closed
  palette, the baked-in `active` class present on exactly the right frame, unconditional reference
  rule, decorative `aria-hidden`), and the full render (every step's prose present and ungated in
  the raw HTML, exactly one active frame, the interaction script inlined not fetched, the
  reduced-motion transition gated behind its own media query).
- `test/canon.test.ts` — the canon's own shape: the seed carries the exact `REPLACE ME` wording,
  the sample data is real rows distinct in value from the other genres' own, no file under this
  skill is named like a registry or dispatcher, no relative import climbs above this skill's own
  root outside `test/`, and `preview.png` is a current render (`render-preview.mjs --check`).
