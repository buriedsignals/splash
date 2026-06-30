# map-native — map legibility & navigation (slice A+B) — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** make the symbol map read and behave like a real map, not a chart — **(A)** legible
labels placed beside the symbols (not on top), and **(B)** real navigation in the interactive build.
This is the first of two slices addressing the feedback "it's not readable on the map + the navigation
side is missing (it's a map, not a chart)". The second slice (parameterised camera modes for video) is
designed separately.

## Why

The shipped proportional-symbol map labels each circle with a two-line "City\nvalue" centred ON the
circle — dark text on a mid-blue fill, small, cramped, and illegible at portrait sizes. And the
interactive build offers only zoom buttons, so it does not feel like an explorable map. Both are map
fundamentals: a symbol's value must be readable beside it, and a map must be navigable. Both fixes are
grounded best practice (no editorial fork), and both generalise to every map type.

## A — Label legibility (all three formats)

Replace the centred-on-circle label with a **beside-the-symbol** label using native MapLibre GL symbol
capabilities (no DOM overlay):

- **`text-variable-anchor: ["left", "right", "top", "bottom"]`** + **`text-radial-offset`** (data-driven
  by the symbol radius) so the label sits just OUTSIDE the circle edge and the renderer auto-selects the
  first free side (built-in anti-collision + edge flipping).
- **`text-radial-offset`** in ems = `(radius + GAP) / textSize`, computed by a small pure helper
  `labelRadialOffset(radius, textSize, gap?)` (testable) and applied per feature via a GL expression.
- **Larger text + strong white halo:** `text-halo-color #ffffff`, `text-halo-width ~1.6`,
  `text-color #1a1a1a`; `text-allow-overlap: false` + `text-optional: true` keep auto anti-collision on
  dense maps (overflowing labels are hidden, not piled).
- **Ratio-aware size:** in video, `SymbolStory` reads its composition dimensions (`useVideoConfig`) and
  scales `text-size` up for square / portrait (the "illegible in portrait" point). The static/interactive
  build uses a fixed legible base size.
- Label text stays "City\nvalue" (two lines) or the value alone when the symbol has no name — content is
  unchanged; only placement, size, and anchoring change.

**Deferred:** explicit leader lines for displaced labels (the radial-offset + auto-anchor suffices for
the low-point-count case; leader lines are a dense-map polish).

### Files (A)
- `skills/map-native/src/symbol-labels.ts` — add `labelRadialOffset(radius, textSize, gap?): number`
  (pure, ems). Tested.
- `skills/map-native/src/SymbolMap.tsx` — rework the `symbol-labels` layer: `text-variable-anchor`,
  data-driven `text-radial-offset`, larger base `text-size`.
- `skills/map-native/src/components/SymbolStory.tsx` — same layer config + `text-size` scaled by the
  composition ratio (`useVideoConfig`).

## B — Interactive navigation

Give the interactive build full map navigation, mirroring the choropleth controls:

- **`NavigationControl`** (zoom buttons + compass) — already present; keep.
- **Reset-to-extent control:** `ChoroplethMap.tsx` already defines a `makeResetControl(dataBounds)`
  (a minimal `IControl` with a ⌂ button that `fitBounds` back to the data extent). **Extract it to a
  shared `src/controls.ts`** and reuse it in BOTH `ChoroplethMap` and `SymbolMap` (DRY — remove the
  inline copy from `ChoroplethMap`).
- **Pan / drag / scroll-zoom** are enabled by `interactive: true` (MapTiler default) — confirm they work.
- Static and video builds remain `interactive: false` (no controls baked in).

### Files (B)
- `skills/map-native/src/controls.ts` — NEW. `export function makeResetControl(dataBounds: [number,number,number,number]): maptilersdk.IControl` (moved verbatim from `ChoroplethMap.tsx`).
- `skills/map-native/src/ChoroplethMap.tsx` — import `makeResetControl` from `./controls`; delete the inline definition (no behaviour change).
- `skills/map-native/src/SymbolMap.tsx` — in interactive mode add `NavigationControl` (if not already) + `makeResetControl(geo.bounds)`.

## Decisions (best practice — not user knobs)

- **Labels beside, not on, the symbol** — the value must be readable without the fill behind it; native
  `text-variable-anchor` + radial offset is the GL-idiomatic way and gives free anti-collision.
- **Reset-to-extent is a map necessity** — once a reader pans/zooms, they need one click back to the story
  frame; the choropleth already proved this control, so we share it.
- **Leader lines deferred** — not needed at low point counts; revisit for dense maps.

## Testing

| Unit | Cases |
| --- | --- |
| `symbol-labels.test.ts` | `labelRadialOffset`: larger radius → larger offset; offset = (radius+gap)/textSize; deterministic |
| live e2e (render) | static + interactive + 3 videos produced from `symbol.json`; **eyeball every format incl. portrait**: labels sit beside circles, legible, not overlapping the fills, auto-flipped near edges; portrait labels are readably sized |
| live e2e (navigation) | interactive build in Playwright: pan/drag moves the map, scroll zooms, the reset ⌂ control re-frames to the data extent; screenshot the reset working |

## Task decomposition (each an independently testable deliverable)

1. `labelRadialOffset` pure helper + tests.
2. Extract `makeResetControl` to `src/controls.ts`; rewire `ChoroplethMap` to import it (no behaviour change; existing choropleth tests/render still pass).
3. Rework labels in `SymbolMap.tsx` (beside placement, variable-anchor, radial offset, larger size) + add `NavigationControl` + reset control in interactive mode; produce static + interactive, eyeball legibility + verify nav live.
4. Rework labels in `SymbolStory.tsx` (same placement + ratio-scaled `text-size`); re-render 3 videos, eyeball every format incl. portrait; update `output-proof/symbol/e2e-proof.md`.

## Out of scope (deferred)

- **Camera-mode system for video** (tour / zoom-out / pan / 3D) — the next slice (its own design).
- **Explicit leader lines** for displaced labels (dense-map polish).
- **`suggest-visual` routing** to the symbol map / camera-mode selection by the AI — the grouped routing pass.
- Value-inside-large-circle white text (a styling variant) — superseded by beside-placement here.

## Global constraints (binding)

- **Bun only** — `bun`, `bunx`, `bun test` (Remotion render via `bunx remotion … --gl=angle --concurrency=1` is the accepted exception).
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer, no `Co-Authored-By: Claude`.
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** — never hard-code or log it.
- **Verify at render** — eyeball each format at multiple sizes incl. portrait, and verify interactive navigation live in-browser (a static PNG cannot show pan/zoom/reset).
