# Architecture — the full layer table and why two things are split the way they are

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

## Why the title and source occupy separate grid rows

The title stays in the HTML `<header>` above the visual; the source follows the track in DOM and
layout order, at the visual's floor. Both remain outside the element that scrolls, so they are
unconditional page furniture rather than step content.

## Why every frame is `aria-hidden`, and why that wrapper lives in `renderScrolly`

The argument is carried by the unconditional title, source and every step's own prose, never
exclusively by the graphic. Exposing only whichever ONE frame happens to be active at a scroll
position a screen reader user has no way to navigate to would be a worse reading than not exposing
the graphic at all. The wrapper lives in the generic scaffold, not the frame, because an `<img>`, an
`<svg>` and a `<div>` need identical treatment from the scaffold's point of view.
