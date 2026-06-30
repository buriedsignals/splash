# map-native — web framing v2 (dézoom-to-fit-all + controls z-index) — design

**Date:** 2026-06-30
**Status:** approved (brainstorming)
**Scope:** fix two web-map render-quality issues from Rémy's review of the interactive build: (A) the
title/legend cover the data and the view is cropped/too tight at narrow widths — replace the
band-reservation framing (which crops) with a CENTERED generous fit so the full data extent is always
visible and the corner furniture overlays the margin, not the data; (B) the interactive map controls
sit behind the title pill — give them a z-index above the furniture. Each fix ships code + conformance
+ KB layer + harness. The full-bleed overlay model is KEPT (no flow-frame); it is just framed better.
Group B (storytelling video / camera modes) is separate.

## Why

The shipped web framing reserves a title band (top) + legend band (bottom) via the `fitBounds`
padding. At narrow widths this fails two ways: (1) the title wraps to 3 lines (taller than the
2-line estimate), so the top data sits UNDER the title; the legend (a corner) overlaps a corner data
point; (2) the large reserved bands + a `minZoom` locked to the build-time fit zoom prevent the map
from zooming out enough at 360px, so the data extent is CROPPED (e.g. Italy off-screen). Rémy's
directive: "dézoome pour tout faire apparaître" — show the whole zone, data centred, furniture over
the empty margin. Also: the interactive nav controls are fine to show, but must sit ON TOP of the
title pill (currently partly occluded).

## A. Centered generous fit — full extent always visible, corners clear

The data must always be fully visible (every city / every region, even at 360px — letterbox at
extreme ratios, never crop) and centred, so the corner furniture (title top-left, legend bottom-right,
source bottom-left) overlays the surrounding margin/ocean.

- **Fit margin:** the components call `fitBounds(clampBounds(geo.bounds), { padding })` where `padding`
  reserves, on each side, at least the furniture that lives there PLUS a base breathing margin — so the
  data is inset to roughly the centre ~65% and no corner furniture can reach it. `resolveMapFrame`
  keeps producing the per-side pad; the change is that the components also apply a base symmetric
  margin (so left/right/bottom keep the data off the corners, not only the label-overhang side).
- **Real title height (not a 2-line estimate):** the top band must equal the ACTUAL rendered title
  pill height. The `MapFrame` measures the title block's DOM height (a `ref` + layout effect /
  `ResizeObserver` on the title node) and reports it; the map's top padding uses that measured height
  so a 3-line wrapped title at 360px is cleared exactly. (Fallback to the `resolveMapFrame` estimate
  before the first measurement.)
- **Re-fit + minZoom on resize:** the existing container `ResizeObserver` re-fits; it must also
  RECOMPUTE `minZoom` from the CURRENT size — `minZoom` = the zoom that fits the full clamped bounds at
  the current container size (not the build-time zoom). This is what was cropping at 360px: a minZoom
  locked to a wider-build fit zoom prevented zooming out enough. `maxBounds` stays (data + margin) so
  free-pan is still bounded, but the initial/resize fit always shows the whole extent.
- **Symmetric breathing on tall/narrow canvases:** at extreme ratios `fitBounds` letterboxes (extra
  margin on the long axis) — the data is centred, never cropped.

## B. Controls z-index above the furniture

The MapTiler controls (NavigationControl + reset) must render ABOVE the title/legend overlays. The
`MapFrame` furniture currently uses `zIndex: 10`; set the controls' container z-index higher (the
MapTiler `.maplibregl-ctrl` containers, or place the controls so their stacking context wins), and/or
lower the furniture z-index, so the +/−/reset are never occluded by the title pill. Interactive only
(static/video have no controls).

## System artifacts (per the binding rule)

- **Code:** `src/core/map-format.ts` (`resolveMapFrame` — optional `titleHeightPx` override / base margin), `src/core/MapFrame.tsx` (measure title height; controls/furniture z-index), `src/SymbolMap.tsx` + `src/ChoroplethMap.tsx` (centred fit margin; re-fit + minZoom-on-resize; pass measured title height).
- **Conformance:** extend `checkMapFraming` — the framing is adequate when the reserved bands fit the data centred (the existing legend/title-band checks already cover "reserved"; add that the title band uses the real/〉estimate height when supplied).
- **KB:** `knowledge/references/map/formats/static.md` + `interactive.md` — "the full data extent is ALWAYS visible (centred, letterbox not crop); furniture overlays the margin, never the data; interactive controls render above the furniture." Sourced by name (Datawrapper Academy, NN/g, FT Visual Vocabulary).
- **Harness:** `scripts/snap-responsive.mjs` — assert the data bbox CENTRE ≈ the viewport centre (already partly there) AND the data bbox is fully within the inner safe area (not under the title/legend bands) at every width incl. 360. `scripts/snap-a11y.mjs` — assert a control button's bounding box is NOT occluded by the title pill (its centre is the topmost element / higher stacking).

## Testing / verification

- Pure: `map-format.test.ts` — `resolveMapFrame` honours a supplied `titleHeightPx` (top pad ≥ it).
- Render (BOTH types, static + interactive, incl. 360px): produce static for choropleth + symbol;
  READ each `static.png` AND `responsive-360.png` — the FULL extent shows (all cities / all data
  regions visible), data centred, title + legend over the margin (no data under them); the interactive
  controls sit above the title. The harness assertions gate it.

## Task decomposition

1. **Centred fit + minZoom-on-resize** (both components) — the dézoom-to-fit-all + re-fit; KB lines; harness centre/within-safe-area assertion. Render-verify 360px shows the whole extent on both types.
2. **Measured title height** (`MapFrame` + `resolveMapFrame` `titleHeightPx`) + the conformance tie-in — the wrapped title never covers data; test.
3. **Controls z-index** (`MapFrame`) + `snap-a11y` not-occluded assertion + KB line.

## Out of scope (deferred)

- **Flow-frame** (title-above-map) — explicitly NOT chosen; we keep the full-bleed overlay, better framed.
- **Group B** — storytelling video / camera modes / scrolly-as-video / Tom's map-explainer.
- Pixel-perfect overlap detection (centred-fit guarantee + eyeball, as before).

## Global constraints (binding)

- **Bun only**; **MapTiler key via env only** (never hard-code/log).
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer.
- **English.**
- **Every fix ships its four artifacts** (code + conformance/harness + KB at the right layer + render verification on BOTH types).
- **Grounded KB**, sourced by name, no fabricated URLs.
- **Verify at render on BOTH types, static + interactive, incl. 360px** — the whole extent must be visible and the furniture clear of data.
