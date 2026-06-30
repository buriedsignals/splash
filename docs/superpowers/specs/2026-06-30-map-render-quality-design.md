# map-native — render quality (Group A: 7 grounded fixes) — design

**Date:** 2026-06-30
**Status:** approved (brainstorming)
**Scope:** seven production-quality fixes to the map engine, each delivered as **four coupled
artifacts** — code + conformance rule + KB best-practice at the right LAYER + harness assertion —
mirroring the chart-native discipline. This slice also CREATES the missing **per-format map KB layer**
(`knowledge/references/map/formats/{static,interactive,video}.md`), because four of the fixes are
format best-practices. Group B (storytelling video / camera modes) is a separate later slice.

## Why

User feedback from a full-format verification pass surfaced seven map render-quality gaps. Per the
toolkit's binding rule, each must improve the SYSTEM at the right layer (not patch the example): the
fix lives in shared engine code, is certified by a conformance guard, is grounded in a sourced
best-practice placed in the correct KB layer (global / per-type / per-format), and is verified by the
render harness. The map KB today has the global + per-type layers (chart parity slices 1-4) but NOT
the per-format layer — these fixes require it, so it is created here.

## The KB layering (mirror chart-native)

- **Global** — `knowledge/references/map/design-conformance.md` (exists): universal map rules.
- **Per-type** — `knowledge/references/map/types/{proportional-symbol,choropleth}.md` (exist).
- **Per-format (NEW)** — `knowledge/references/map/formats/{static.md, interactive.md, video.md}`:
  the static / interactive / video best-practices a map must follow regardless of type. The `video.md`
  is created here (motion + framing rules) and feeds Group B.

Every fix below names the layer its best-practice line lands in.

## The seven fixes (each = code + conformance + KB layer + harness)

### 1. Static maps show NO map controls (guard + build isolation)
- **Diagnosis (corrected):** the static build itself is already control-free — `vite.config` defines
  `__INTERACTIVE__ = (process.env.INTERACTIVE === "1")` for BOTH builds, so the static build's
  `__INTERACTIVE__` is `false` → `mount` sets `interactive:false` → no nav/reset controls; a fresh
  static build's DOM has `.maplibregl-ctrl button` count `0` (only the legally-required attribution).
  The controls the user saw in a "static" render came from the **shared-`dist/` contamination class
  of bug** (concurrent/overlapping `produce` runs whose Vite builds write the same fixed `dist/static`
  and `dist/interactive` paths, so a static snapshot can capture the wrong build). The fix is therefore
  a **guard** + **build-output isolation**, not a `mount` change.
- **Code (isolation):** `scripts/produce.mjs` builds into a per-run-unique output directory instead of
  the fixed `dist/static`/`dist/interactive`, and the snap scripts serve from that directory (passed via
  an env var, falling back to the current `dist/...` paths for standalone use). Two `produce` runs (even
  concurrent, even different configs/types) can then never contaminate each other's static/interactive
  snapshots. `vite.config` reads the build-output dir from env (e.g. `BUILD_OUT`).
- **Conformance:** n/a structural — covered by the harness assertion.
- **KB:** **format** `map/formats/static.md` — "a static map carries no interactive chrome (no zoom/nav/reset controls); it is an image. Only the licensing attribution is shown."
- **Harness (guard):** `snap-static.mjs` asserts `document.querySelectorAll(".maplibregl-ctrl button").length === 0` and exits non-zero otherwise — so a controls-in-static render can never ship (produce fails loudly), whatever the cause.

### 2. Data is never covered by the title or the legend (static + video)
- **Code:** `resolveMapFrame` becomes legend-aware: add `legendHeight?: number` to its opts; `pad.bottom = max(sourceBand, legendHeight + MARGIN×scale) + …`. Each component measures/knows its legend box height and passes it (symbol: the nested-circle SVG height; choropleth: the bins legend height). The data extent is then framed above the legend band (and below the title band) by the existing `fitBounds(pad)`.
- **Conformance:** extend `checkMapFraming` — the `pad.bottom` must reserve the supplied `legendHeight` (a new optional `legendHeight` input; flag if `pad.bottom < legendHeight`).
- **KB:** **global** `map/design-conformance.md` — strengthen the framing rule: "the legend occupies a reserved band; no data feature renders under the title or legend."
- **Harness:** structural (pad reserves the bands) + eyeball; pixel-overlap projection is out of scope (as decided in the framing slice).

### 3. A value shown as a label includes its unit
- **Code:** `skills/map-native/src/SymbolMap.tsx` (and `SymbolStory.tsx`) — the `labelText` value line includes `config.valueUnit`: `${name}\n${valueText}${config.valueUnit ?? ""}` → "London\n296$bn". (Today the label omits the unit; the tooltip and legend already include it.)
- **Conformance:** `checkSymbolConformance` — when `valueUnit` is set, the label value must carry the unit (a new boolean input `labelHasUnit`, flag if false while a unit exists).
- **KB:** **global** `design-conformance.md` ("a directly-labelled value states its unit") + **per-type** `proportional-symbol.md` (the symbol label = name + value + unit).
- **Harness:** the conformance unit-test covers it; a render eyeball confirms "London 296$bn".

### 4. The static title pill keeps a gutter from the frame edges
- **Code:** `skills/map-native/src/core/MapFrame.tsx` — the title (and source) pill keeps a minimum gutter `G = max(MARGIN, 16) × scale` from the canvas edges, and the title `maxWidth = width − 2G`; the wrapped (tight) title never touches the border.
- **Conformance:** the framing rule (global) covers "furniture is inset from the edges".
- **KB:** **global** `design-conformance.md` + **format** `static.md` ("furniture sits inside a safe gutter, never flush to the edge").
- **Harness:** `snap-responsive.mjs` asserts the `[data-testid="map-title"]` bbox `left ≥ G` and `right ≤ innerWidth − G` at every width.

### 5. Interactive: tooltip XOR labels (no redundant encoding)
- **Code:** `SymbolMap.tsx` — in interactive mode, DO NOT add the `symbol-labels` layer (the hover popup carries name+value); static and video keep the always-on labels. So labels and tooltip never coexist.
- **Conformance:** n/a (format-conditional render); covered by KB + harness.
- **KB:** **format** `interactive.md` ("an interactive map shows a value on hover (tooltip) OR as a baked label, never both — redundant encodings clutter; hover is the interactive idiom").
- **Harness:** `snap-a11y.mjs` (interactive build) asserts the map has NO `symbol-labels` layer AND a hover produces a popup; `snap-static.mjs` confirms labels ARE present in static.

### 6. Interactive: navigation is bounded to the story zone
- **Code:** `SymbolMap.tsx` + `ChoroplethMap.tsx` — in interactive mode, after `fitBounds`, `map.setMaxBounds(padBounds(geo.bounds, margin))` and `map.setMinZoom(map.getZoom())` (the fit zoom) so the reader cannot pan into empty ocean or zoom out past the story extent.
- **Conformance:** n/a runtime-state; KB + harness.
- **KB:** **format** `interactive.md` ("free-explore is bounded: maxBounds + minZoom keep the reader inside the data's story extent").
- **Harness:** `snap-a11y.mjs` — attempt a large pan/zoom-out and assert the centre stays within `padBounds` and zoom ≥ minZoom.

### 7. Interactive: the map stays centred and re-adapts zoom on resize
- **Code:** both components — a `ResizeObserver` on the container; on resize, `map.resize()` then `map.fitBounds(geo.bounds, { padding: frame.pad })` (re-centre + re-adapt zoom; recompute `frame` from the new size). The data stays centred and the zoom fits at any container width.
- **Conformance:** n/a runtime; KB + harness.
- **KB:** **format** `interactive.md` ("on container resize the map recentres and re-fits — the data is always centred and zoom adapts responsively").
- **Harness:** `snap-responsive.mjs` already snaps the interactive build at 360/768/1100/1600 — extend it to assert the data bbox is centred (map centre ≈ data centre) at each width.

## Files touched

- Code: `scripts/produce.mjs` + `vite.config.ts` + the snap scripts' serve-dir resolution (1, build isolation), `src/core/map-format.ts` `resolveMapFrame` (2), `src/core/MapFrame.tsx` (4), `src/SymbolMap.tsx` (3,5,6,7), `src/components/SymbolStory.tsx` (3), `src/ChoroplethMap.tsx` (6,7), `src/conformance.ts` (2,3).
- Harness: `scripts/snap-static.mjs` (1 guard, 5), `scripts/snap-responsive.mjs` (4,7), `scripts/snap-a11y.mjs` (5,6).
- KB (NEW format layer): `knowledge/references/map/formats/{static.md, interactive.md, video.md}`.
- KB (update): `knowledge/references/map/design-conformance.md` (2,3,4), `knowledge/references/map/types/proportional-symbol.md` (3).

## Testing / verification

- Pure: `conformance.test.ts` gains cases for the legend-band reserve (2) and the label-unit rule (3).
- Render (BOTH types, SEQUENTIAL — `produce` shares `dist/`, never parallel): `produce all` for choropleth + symbol; the harness assertions (1,4,5,6,7) gate the pipeline; eyeball static (no controls, unit on labels, title gutter, legend not over data), interactive (tooltip not labels, bounded nav, centred at 360px), video (legend not over data).

## Task decomposition

1. **Static no-controls (1)** — `snap-static` 0-controls guard (fails produce on any leak) + isolate `produce` build output per run (unique dir via `BUILD_OUT`; vite + snap scripts read it; no cross-run contamination) + `map/formats/static.md`.
2. **Label unit (3) + interactive tooltip-XOR-labels (5)** in `SymbolMap`/`SymbolStory` + conformance unit rule + `interactive.md` + `proportional-symbol.md`/`design-conformance.md` updates + `snap-static`/`snap-a11y` assertions.
3. **Safe-area legend-aware (2) + title gutter (4)** in `resolveMapFrame`/`MapFrame` + `checkMapFraming` legend rule + `design-conformance.md` + `static.md` + `snap-responsive` gutter assertion; eyeball legend-not-over-data.
4. **Interactive nav: maxBounds+minZoom (6) + ResizeObserver re-fit (7)** in both components + `interactive.md` + `snap-a11y`/`snap-responsive` assertions.
5. **Create `map/formats/video.md`** (motion + framing rules, feeds Group B) — folded into whichever task first needs it, or its own small doc task.

(Each render task verifies BOTH choropleth and symbol; a regression in either blocks.)

## Out of scope (deferred)

- **Group B** — storytelling video / camera modes / Tom's map-explainer aesthetic / scrolly-as-video.
- Pixel-precise "no data under furniture" overlap detection (structural pad guarantee + eyeball instead).
- `suggest-visual` routing changes.

## Global constraints (binding)

- **Bun only**; **MapTiler key via env only** (never hard-code/log).
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer.
- **English** throughout.
- **Every fix ships its four artifacts** (code + conformance-or-harness + KB at the right layer + verification) — a fix missing its KB-layer line or its harness assertion is incomplete.
- **Grounded KB** — each best-practice line cites a real source (data-to-viz, FT Visual Vocabulary, Datawrapper Academy, NN/g for interactive, WCAG); no fabricated URLs, no invented conformance rule names.
- **Verify at render on BOTH map types**, sequentially (shared `dist/`); the harness gates the pipeline.
