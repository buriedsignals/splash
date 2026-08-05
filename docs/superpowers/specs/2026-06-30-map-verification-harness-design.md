# map-native — verification harness (parity slice 3) — design

**Date:** 2026-06-30
**Status:** approved (brainstorming)
**Scope:** port the chart engine's render-verification harness to maps — a responsive multi-width snap
and an a11y snap — and wire them into `produce.mjs`, so the discipline that catches blank-map /
off-frame / missing-furniture / a11y regressions runs on every produced map. Slice 3 of the 4-slice
maps↔charts parity program (slices 1 MapFrame + 2 conformance shipped; slice 4 KB follows).

## Why

`map-native`'s verification is below chart parity: it has `snap-static.mjs` + `snap-proof.mjs`
(popup/hover only). It lacks the chart engine's `snap-responsive.mjs` (the same embed re-laid-out at
360/768/1100/1600px) and `snap-a11y.mjs` (source link + keyboard reachability). These are exactly the
checks that would have caught the regressions this program hit — a blank map, furniture off-frame, a
title overflowing a narrow viewport. The harness also surfaces a known gap: `ChoroplethMap` sets
`role="region"` + `aria-label` on its map container but `SymbolMap` does NOT — the a11y snap will flag
it, and this slice fixes it.

## Architecture — mirror the chart scripts, layer-aware for maps

The chart scripts key off SVG markers (`.bar`, `circle[role="img"]`). Maps render to a MapTiler GL
**canvas**, so the map scripts key off the same signals the existing `snap-proof.mjs` already uses:
`window.__map__` plus whichever data layer exists (`choropleth-fill` || `symbol-circles`). The
furniture being asserted (title, source, legend) is shared `MapFrame` output, so the assertions are
type-agnostic; only the "wait for the map" + "hover a feature" differ by layer.

### 1. `scripts/snap-responsive.mjs` (NEW)

Serve `dist/interactive` over a local HTTP server (reuse the pattern in `snap-static.mjs`). For each
width in **[360, 768, 1100, 1600]** (height 560, deviceScaleFactor 2):
- load, wait for the map: `window.__map__` present and `map.getLayer("choropleth-fill")||map.getLayer("symbol-circles")` and one `idle`,
- screenshot `responsive-${w}.png` to `OUTDIR`,
- **assert** (collect failures, exit non-zero if any):
  - **no horizontal overflow:** `document.documentElement.scrollWidth <= window.innerWidth`,
  - **title visible:** the MapFrame title text node is present and its bounding box is within the viewport,
  - **source present:** an `a[href]` (the MapFrame source link) exists,
  - **legend visible:** the legend element is present and within the viewport.
- Log a structured line per width (`{ w, scrollOk, titleOk, sourceOk, legendOk }`).

### 2. `scripts/snap-a11y.mjs` (NEW)

Load `dist/interactive` (900×560). Assert (log JSON, exit non-zero on failure):
- **region role:** the map container has `role="region"` and a non-empty `aria-label`,
- **source link:** `a[href]` exists with a non-empty `href`,
- **controls reachable:** the zoom (`.maplibregl-ctrl-zoom-in` / NavigationControl) and the reset (⌂)
  controls are present in the DOM and keyboard-reachable (a `button` that can receive focus via Tab),
- **tooltip on hover:** moving the mouse over a data feature (querying the data layer) shows the popup.
- Screenshot to the given out path.

**Decision (parity-aware):** maps are a GL canvas, so per-data-mark keyboard focus (the chart a11y
bar) is N/A — region-level a11y (`role="region"` + `aria-label`) + keyboard-reachable controls + a
linked source IS the map a11y standard. This is a documented, deliberate difference, not a gap.

### 3. Fix the `SymbolMap` a11y gap

`SymbolMap`'s map container has no `role`/`aria-label` (confirmed). Add `role="region"` +
`aria-label={config.title ?? "map"}` (or a descriptive label) to its map container, mirroring
`ChoroplethMap`, so the a11y snap passes on both types.

### 4. Wire into `produce.mjs`

After the interactive build + the existing proof snap, add a `snap-responsive` step and a `snap-a11y`
step (passing `OUTDIR`), exactly as chart-native's `produce.mjs` runs its responsive + a11y snaps.
The produce run then fails loudly if any responsive/a11y assertion fails — the harness becomes part of
the pipeline, not an optional manual check.

## Data flow

```
produce.mjs <config> <outDir>
  → vite build (static, interactive)
  → snap-static / snap-proof (existing)
  → snap-responsive.mjs OUTDIR  → responsive-{360,768,1100,1600}.png + per-width assertions
  → snap-a11y.mjs OUTDIR        → a11y.png + region/source/controls/tooltip assertions
  (any assertion failure → non-zero exit → produce fails)
```

## Testing / verification

This slice's deliverable is the harness itself; it is verified by RUNNING it on real builds:
- Build + run both scripts against the **symbol** interactive build AND the **choropleth** interactive
  build. All assertions must pass for both. Eyeball the `responsive-360.png` for each — confirm the
  title pill, source, and legend are visible and not clipped at the narrowest width (this is the
  regression the harness exists to catch). If a furniture element clips or overflows at 360px, that is
  a real finding to FIX in this slice (adjust MapFrame's responsive constraints), not to assert around.
- The `SymbolMap` a11y fix is verified by the a11y snap passing on the symbol build (region role
  present).

## Task decomposition

1. `snap-responsive.mjs` + wire into `produce.mjs`; run on symbol + choropleth; eyeball `responsive-360.png` for both; fix any furniture clip/overflow surfaced at narrow widths.
2. `snap-a11y.mjs` + add `role="region"`/`aria-label` to `SymbolMap`; wire into `produce.mjs`; run on symbol + choropleth; confirm all a11y assertions pass.

## Out of scope (deferred)

- **KB references** (`map/design-conformance.md`, `map/types/choropleth.md`) — slice 4.
- **Per-data-mark keyboard a11y** on the GL canvas — N/A for maps (region-level is the standard).
- **Wiring `checkMapFraming`/conformance into produce** — the separate "conformance at render" debt.
- A `snap-reveal` (mid-animation stage capture) for maps — the chart engine has one; not needed for
  the framing/a11y goal of this slice.

## Global constraints (binding)

- **Bun only** — scripts run via `bun scripts/...`; Playwright via the project's existing dep.
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer, no an authorship trailer naming an assistant.
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** — the interactive build needs `VITE_MAPTILER_KEY` at build time (loaded via `set -a && . ../../.env && set +a`); never hard-code or log it.
- **Shared scripts must work for BOTH map types** — the layer detection (`choropleth-fill`||`symbol-circles`) keeps them type-agnostic; verify on both before done.
- **Verify by running** — the harness is proven by executing it against real symbol + choropleth interactive builds, not by unit tests.
