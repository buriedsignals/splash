# map-native — MapFrame shared shell (parity slice 1) — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** give the maps engine the shared furniture shell the charts engine has — a `MapFrame`
component + a `resolveMapFrame` format-scaler + map tokens — so every map (choropleth + symbol) in
every format (static / interactive / video) renders its title, description, and source in RESERVED
zones that never overlap the data and never leave the frame, with text scaled per format. This is
slice 1 of the 4-slice "maps to chart parity" program; slices 2 (format-aware conformance), 3
(verification harness), 4 (KB) follow.

## Why

The maps engine has the pure core, per-type conformance, and the 3-format pipeline, but it has NO
shared shell. Title/description/source are hardcoded absolute-positioned `<div>`s duplicated across
`ChoroplethMap`, `SymbolMap`, `ChoroplethStory`, `SymbolStory`, and the map is framed with a uniform
`fitBounds(padding: 64)`. Consequences the user hit: the video title sits ON the data (no reserved
band), labels/symbols can leave the frame (uniform 64px doesn't cover label overhang or the title
band), and the **video has no source attribution at all**. The charts engine already solved this with
`ChartFrame` + `resolveFrame` + tokens; this slice ports that pattern to maps.

## Architecture — mirror the chart triptych

The chart engine's quality shell is three pieces: `core/tokens.ts` (base sizes) → `core/format.ts`
`resolveFrame` (the brain: scaled paddings + type sizes per canvas) → `core/ChartFrame.tsx` (the shell:
title/source in reserved zones, plot inset). Maps get the exact analogue.

### 1. `src/theme/map-tokens.ts` (NEW) — single source of truth for frame typography/spacing

```ts
export const FRAME_TYPE = { title: 22, description: 14, source: 12 }; // base px (matches chart tokens)
export const FRAME_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FRAME_COLORS = {
  pill: "rgba(255,255,255,0.92)", // overlay backing for web furniture
  ink: "#1a1a1a", // title text
  muted: "#5f5f5f", // description / source text
};
```

Replaces the hardcoded `fontSize:30`, `top:12`, `rgba(255,255,255,0.92)`, `#1a1a1a` etc. scattered
across the four render components.

### 2. `src/core/map-format.ts` (NEW) — `resolveMapFrame` (pure, tested)

```ts
export interface ResolvedMapFrame {
  scale: number; // text/inset multiplier derived from the canvas
  pad: { top: number; bottom: number; left: number; right: number }; // fitBounds safe-area, px
  type: { title: number; description: number; source: number }; // scaled font px
}

// Derive the frame for a given canvas. `titleLines`/`hasDescription` size the top band; `labelOverhang`
// (px a label can extend past its symbol, default ~64) sizes the side/extra insets.
export function resolveMapFrame(
  width: number,
  height: number,
  opts?: { titleLines?: number; hasDescription?: boolean; labelOverhang?: number },
): ResolvedMapFrame;
```

Behaviour (pure, deterministic):
- **scale** = `clamp(min(width, height) / 720, 0.85, 1.6)` — narrow/portrait canvases get larger text
  (a real number; 1.0 at 720px, larger for 1080-min portrait, capped).
- **type** = `FRAME_TYPE.* × scale` (rounded).
- **pad.top** = title band = `titleLines × type.title × LINE_HEIGHT + (hasDescription ? type.description × LINE_HEIGHT : 0) + 2 × MARGIN × scale`. This is the reserved title zone the data must clear.
- **pad.bottom** = source band + legend/attribution room = `type.source × LINE_HEIGHT + LEGEND_ROOM × scale + MARGIN × scale`.
- **pad.left / pad.right** = `max(BASE_INSET, labelOverhang) × scale` — clears the label radial-offset
  overhang so a side-anchored label cannot leave the frame.
- Constants: `LINE_HEIGHT = 1.3`, `MARGIN = 12`, `BASE_INSET = 24`, `LEGEND_ROOM = 28`.

This `pad` is what the map component passes to `fitBounds(geo.bounds, { padding: pad })` (MapTiler
accepts an object) so the data extent is framed INSIDE the reserved zones — title-not-on-data and
nothing-off-frame are then true by construction.

### 3. `src/core/MapFrame.tsx` (NEW) — the shared furniture shell (mirror `ChartFrame`)

```ts
interface MapFrameProps {
  title: string;
  description?: string;
  source: { name: string; url?: string };
  width: number;
  height: number;
  responsive: boolean; // true: web static/interactive (flow-constrained pills) | false: video (fixed px)
  frame: ResolvedMapFrame; // from resolveMapFrame, so furniture + fitBounds share one source of truth
  children: React.ReactNode; // the map container <div>
}
```

- Renders the map `children` filling the canvas, then overlays furniture in reserved zones:
  - **Title** at the top band: `top: MARGIN×scale, left: MARGIN×scale`, `font-size: frame.type.title`,
    `max-width` constrained to the frame width minus insets, wraps within the band, `FRAME_COLORS.ink`,
    on a `FRAME_COLORS.pill` backing in web mode (legible over any basemap).
  - **Description** (if present) directly under the title in the same band, `frame.type.description`,
    `FRAME_COLORS.muted`.
  - **Source** — ALWAYS rendered (this is the gap fixed for video): bottom band,
    `font-size: frame.type.source`, `FRAME_COLORS.muted`; a link when `source.url` is present (web),
    plain text in video. "Source: {name}".
- `responsive: true` (web) — pills with the backing, positioned absolutely but width-constrained so they
  never exceed the canvas. `responsive: false` (video) — fixed absolute px, scaled, text-shadow for
  legibility instead of a pill (matches the current video title treatment but scaled + with source).
- The legend stays owned by each map component (its content is type-specific), but it renders inside
  `pad.bottom`'s reserved room so it doesn't collide with the source.

### 4. Wire the four render components to MapFrame

Each of `ChoroplethMap.tsx`, `SymbolMap.tsx`, `ChoroplethStory.tsx`, `SymbolStory.tsx`:
- Compute `const frame = resolveMapFrame(width, height, { titleLines, hasDescription, labelOverhang })`.
- Pass `frame.pad` to `fitBounds(geo.bounds, { padding: frame.pad, duration: 0 })` (replace the uniform
  `{ padding: 64 }`).
- Wrap the map container in `<MapFrame title=… description=… source=… width=… height=… responsive=… frame={frame}>` and DELETE the component's own hardcoded title/source `<div>`s.
- Keep each component's type-specific bits untouched: the GL layers (circles/labels/fill), the reveal
  effects, `mapReady` gate, `attributionControl`, the legend content, hover popups, navigation controls.

`ChoroplethStory` currently uses a title-card beat; reconcile by having the `TitleCard` beat use
`MapFrame`'s title styling and ensuring `MapFrame`'s source renders in the persistent overlay during
reveal/takeaway beats (it had none). Do not remove the beat structure — only route furniture through
the shared tokens/frame and add the missing source.

## Data flow

```
component (width,height, title, description?, source, geo.bounds)
  → resolveMapFrame(width,height,{titleLines,hasDescription,labelOverhang})  → { scale, pad, type }
  → fitBounds(geo.bounds, { padding: pad })            // data framed inside the safe-area
  → <MapFrame frame={…} title description source responsive>{map container}</MapFrame>
       renders title (top band) + description + source (bottom) in reserved zones, scaled
```

## Testing

| Unit | Cases |
| --- | --- |
| `tests/map-format.test.ts` | `resolveMapFrame`: scale = 1.0 at 720 min-dim, larger for portrait 1080×1350 (capped ≤1.6), ≥0.85 floor; `pad.top` ≥ the title band for given `titleLines`; `pad.bottom` reserves the source line; `pad.left/right` ≥ `labelOverhang × scale`; `type.*` = base × scale; deterministic |
| live e2e (render) — BOTH map types | produce all formats for `symbol.json` AND a choropleth config; **eyeball static + interactive + 3 videos for each**: title sits in its band and NEVER over a symbol/region, the source line is visible in EVERY format INCLUDING the three videos, no symbol/label/legend leaves the frame, portrait/square text legibly scaled. Choropleth must not regress (it shares MapFrame now). Record in `output-proof/`. |

## Task decomposition (each an independently testable deliverable)

1. `src/theme/map-tokens.ts` (FRAME_TYPE/FRAME_FONT/FRAME_COLORS) — trivial constants, folded into Task 2's first use (no standalone test).
2. `src/core/map-format.ts` `resolveMapFrame` + `tests/map-format.test.ts` (pure, TDD).
3. `src/core/MapFrame.tsx` + wire the two WEB components (`ChoroplethMap`, `SymbolMap`): pad→fitBounds + `<MapFrame>` furniture, delete hardcoded divs; produce static + interactive for symbol AND choropleth, eyeball title-in-band + source-visible + nothing-off-frame; verify nav still works.
4. Wire the two VIDEO components (`ChoroplethStory`, `SymbolStory`) to `MapFrame` (+ source in video, scaled title); re-render the 3 videos for symbol AND choropleth, eyeball every ratio incl. portrait (title clear of data, source visible, nothing off-frame); update `output-proof/symbol/e2e-proof.md`.

## Out of scope (deferred to later parity slices)

- **Format-aware conformance + framing/legibility RULES** (`checkGlobalMapConformance` L0 extraction,
  `format` param, title-not-on-data / source-visible / nothing-off-frame assertions) — slice 2. This
  slice makes those true BY CONSTRUCTION; slice 2 adds the guard that asserts it.
- **Responsive multi-width + a11y snap harness** (`snap-responsive.mjs`, `snap-a11y.mjs`) — slice 3.
- **KB references** (`map/design-conformance.md`, `map/types/choropleth.md`) — slice 4.
- **Camera-mode system for video** (tour/zoom-out/pan/3D) — separate track.
- A generic `core/text.ts truncate` / `core/legend.ts` for maps — only if a render needs it; not now.

## Global constraints (binding)

- **Bun only** — `bun`, `bunx`, `bun test` (Remotion render via `bunx remotion … --gl=angle --concurrency=1` is the accepted exception).
- **No Claude/Anthropic mention** in any file or commit message — no `Claude-Session:` trailer, no an authorship trailer naming an assistant.
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** — never hard-code or log it.
- **MapFrame is shared** — every change must be verified at render on BOTH map types (choropleth + symbol) across ALL formats incl. portrait; a regression in either is a blocker.
- **Verify at render** — eyeball each format; a static PNG cannot show navigation, and the source/ title bands must be confirmed visually in every format.
