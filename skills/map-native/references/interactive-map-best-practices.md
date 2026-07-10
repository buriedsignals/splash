# Interactive map & scrollytelling — best practices (grounded)

> Synthesised from authoritative sources (Datawrapper Academy, MapLibre docs, The Pudding/scrollama,
> Mapbox, WCAG/BOIA) to ground the map-native engine. Each rule is enforceable; encode defaults +
> conformance/audit checks against this. Cited sources at the bottom.

## 1. Colour — separate water / land / no-data (three distinct layers)

- **Water/ocean = a blue tint, never grey.** Cartographic convention (OSM Carto `#aad3df`, Mapbox Light
  `#c6e2f5`). Grey water is indistinguishable from no-data.
- **Land basemap (regions with no value) = very light neutral** (`#f5f5f0`–`#e8e8e8`), lighter than the
  no-data grey, well below the data palette so the data pops.
- **No-data regions = a distinct mid grey** (`#c0c0c0`–`#a0a0a0`) — darker than the land background so
  "no data here" reads as present-but-unknown, never confused with water or land.
- All three must stay distinct under deuteranopia simulation. No hatch fills on screen (illegible small).

## 2. No-data hover

- Best practice is a `"<region> — No data"` tooltip (honest, avoids "is it broken?"). **Project decision
  (Rémy): SUPPRESS hover on no-data regions** — only regions WITH a value get a tooltip + pointer cursor.
  Ocean/empty already has no hover in either case. (User instruction overrides the generic best practice.)

## 3. Navigation controls (when pan/zoom is enabled)

- `NavigationControl` (zoom +/−) at **top-right** (Google/Mapbox/OSM convention).
- A **reset/home** control when `maxBounds` is set (returns to the initial `fitBounds`).
- **Attribution** always visible, bottom-right (licensing + sourcing).
- A11y: `aria-label` on zoom buttons (avoid doubling `title`+`aria-label`); keyboard `+/-`/arrows on by
  default (MapLibre `KeyboardHandler`); visible focus ring (≥3:1); the map must NOT be a keyboard trap
  (Tab exits — WCAG 2.1.2).

## 4. Bounds limiting

- `maxBounds` = story area + ~20% padding; `minZoom` so the full area fits on a 375px mobile viewport;
  `maxZoom` capped at tileset resolution (~14–16). `maxBounds` clamps USER pan/zoom but not programmatic
  `flyTo` (story animations still work). Re-`fitBounds` on resize rather than a fixed minZoom.

## 5. Title / credit timing in motion video

- A **title beat/card BEFORE the map moves** (1.5–3s), the title exits, THEN the map establishes. A title
  overlaying the active map at frame 0 competes with the geography it describes. Lower-thirds (region
  names, source) appear DURING the map animation, after geographic orientation. (Social-vertical formats
  sometimes put title-on-map from frame 0 for the no-audio hook — a platform exception, not the default.)

## 6. Scrollytelling architecture (the canonical pattern)

- A single ordered **`chapters[]`** config is the source of truth. Each step carries: `id`, `location`
  (`center`/`zoom`/`pitch`/`bearing`), `mapAnimation` (`flyTo`|`easeTo`|`jumpTo`), `onChapterEnter`/
  `onChapterExit` layer ops, and an optional `callback` for non-map visuals (chart draw-to-progress,
  image crossfade).
- One dispatcher: scrollama `onStepEnter({index, direction})` reads `chapters[index]` and applies it.
  Sticky graphic via CSS `position: sticky` (NOT JS scroll listeners — no jank).
- **Dual output from one storyboard:** the same `chapters[]` drives the scroll interactive AND an
  auto-advancing video (a render pass iterates the chapters with fixed durations, playing each move to
  completion). This is exactly map-native's `mapStory` generalised across visual types.

## 7. Interactive-map UX must-haves (checklist)

Legend always visible (never collapsed on mobile) · source/credit always visible · touch works (test at
375px) · `prefers-reduced-motion` → `flyTo`→`jumpTo`, suppress transitions/scroll-motion · loading state
while tiles fetch · no keyboard trap · text contrast ≥4.5:1 on overlays · `aria-label` on the map
container + a screen-reader data-table alternative · don't steal focus to the map on scroll steps.

## 8. Direct labels must stay inside the map viewport (edge-aware placement)

- **INVARIANT: a symbol/point label never renders outside the map viewport.** A proportional-symbol
  map direct-labels each circle (name + value) so it reads without hover; a label near a viewport edge
  must flip/clamp INWARD, never clip. (Reported: an "Indonésie" circle near the right edge rendered as
  "Indonés" — the name ran off-canvas and was cut.)
- **MapLibre `text-variable-anchor` does NOT enforce this.** It only re-anchors on label↔label
  *collision*; it is blind to the canvas edge, so an edge symbol with no colliding neighbour keeps its
  default side (the list's first anchor) and its text overflows. The edge must be handled explicitly.
- **Rule:** default to the FT/NYT direct-label side (label to the RIGHT of the point). When a right
  placement would exceed the right edge, **flip to the LEFT** (right-align the text so its block hugs
  the point); guard the top/bottom edges the same way; clamp to the least-overflowing side as a last
  resort. Compute this from each symbol's PROJECTED SCREEN position after the camera settles — the edge
  is a screen-space property, not a data property.
- **Shared primitive (single source of truth):** `src/symbol-labels.ts` → `placeSymbolLabel()` (pure,
  unit-tested) picks the in-viewport anchor; `estimateLabelBox()` sizes the label; `assignSymbolLabelAnchors()`
  is the shared loop that projects every symbol and mutates each feature's `anchor`, returning a `changed`
  flag used as the setData guard. Every renderer drives a per-feature, data-driven `text-anchor`
  (`["get","anchor"]`) — NOT `text-variable-anchor` — and calls this shared loop after the camera settles.
  Mirrors the chart-tooltip in-viewport clamp (`chart-native/src/core/tooltip-clamp.ts`).
- **All symbol renderers now enforce this** (source-scanned in `symbol-labels-parity.test.ts`): `SymbolMap.tsx`
  (static + interactive a11y fallback) and the animated `components/SymbolReveal.tsx` / `SymbolStory.tsx` /
  `SymbolScrolly.tsx`. Compute cadence differs by camera: **SymbolReveal** has a fixed camera → compute ONCE
  at the load `idle`; **SymbolStory/SymbolScrolly** `jumpTo` per frame → recompute per frame after the jump
  settles (the projection is synchronous, so project+clamp inline before `continueRender`).
- **Gotcha (compute-once path):** when the clamp flips a label, its `setData` reloads the source
  ASYNCHRONOUSLY. In the fixed-camera load `idle` you MUST wait for a nested `map.once("idle")` after that
  `setData` before `continueRender`, or the still is captured mid-reload and the symbol layer paints blank
  (mirrors LocatorReveal's nested-idle after its declutter setData). The per-frame renderers are already safe
  because their `once("idle")` is registered AFTER the setData. Caught by render-verify on a width-constrained
  fit (an east-edge symbol like Indonésie/Thaïlande flips → setData every load).
- **Follow-up (Locator variants):** `LocatorReveal/Story/Scrolly` (+ `LocatorMap`) still use
  `text-variable-anchor`, but their label model DIFFERS — a priority declutter (`placeLabels`, decides which
  labels show at all) with `text-allow-overlap: true` and a default TOP/centred anchor (label above the pin,
  so horizontal overhang is half a symbol label's). Adopting the viewport clamp there means reconciling
  `placeSymbolLabel`'s side-preference with `placeLabels`' visibility pass — a distinct integration, not the
  same trivial swap. Deferred as its own follow-up.

## Enforceable checklist for the engine

- Water blue / land light / no-data mid-grey — three distinct layers (conformance: assert the three
  colours differ + pass a CVD check).
- Tooltip only on regions with data (project decision); pointer cursor only there.
- `NavigationControl` top-right + reset when bounded; attribution visible.
- `maxBounds` (+~20%) + `minZoom`/`maxZoom`; `fitBounds` on resize.
- Video: a title beat precedes map motion; lower-thirds after orientation.
- Scrolly: one `chapters[]` source of truth; `onStepEnter` dispatcher; CSS sticky; same config feeds video.
- A11y: reduced-motion, container `aria-label`, no keyboard trap, ≥4.5:1 overlay contrast, loading state.
- Direct symbol labels stay inside the viewport — edge-aware `placeSymbolLabel` (flip right→left, clamp),
  never `text-variable-anchor` alone (it ignores the canvas edge). Unit-tested in `symbol-labels.test.ts`.

## Sources

Datawrapper Academy (choropleth, tooltips, colour) · MapLibre docs (NavigationControl, KeyboardHandler,
restrict-panning, MapOptions) · The Pudding (scrollama, position-sticky, six-libraries) · Mapbox
(scrollytelling map) · WCAG 2.3.3 / C39 (reduced motion), 2.1.2 (keyboard trap), 1.4.3 (contrast) ·
BOIA interactive-maps accessibility · WebAIM keyboard. (Full URLs captured in the research transcript.)
