# Map Route / Flow — Static + Interactive Design

**Date:** 2026-07-03
**Status:** Approved (design phase)
**Depends on:** the map-native engine — `route-geo.ts` (`computeRoute`, `RouteConfig`/`RouteLayout`,
`QUALITATIVE`, `resolveMapStyle`/`MAP_STYLES`), the existing `RouteReveal.tsx` visual vocabulary (route
line + per-territory fill/border/labels), and the layer-on-basemap Map-component pattern
(`HexGridMap.tsx`/`CartogramMap.tsx`). turf 7.2.

## Goal

The route/flow map type currently ships **video only** (the draw-on `RouteReveal` + `RouteScrolly`). Add
the two missing 2D formats — **static** and **interactive** — via a `RouteMap.tsx` that renders the
COMPLETE route (the reveal's final state): the full route line + all territory fills + borders + labels,
on the basemap, with pan/zoom + hover in the interactive build. This closes the `◻ ◻` gap in the roadmap
(→ S✓ I✓ V✓).

## Non-goals

- No change to the video path (`RouteReveal`/`RouteScrolly`) — it stays as-is.
- No interactive HTML scrolly here (a `ScrollyRouteMap` is a separate follow-up; route's *video* scrolly
  already exists).
- No new geometry core — reuse `computeRoute`. No new palette — reuse `QUALITATIVE`.

## Rendering (`RouteMap.tsx`, static + interactive)

`computeRoute(config)` once → `RouteLayout {route, territories}`. On the basemap (`resolveMapStyle`
dark/light; strip basemap labels + inner admin borders as `RouteReveal` does):

- **Route line** — a `line` layer id `route-line` drawing the full `route` polyline, styled like
  `RouteReveal`'s route line (colour + width; a subtle casing/glow is optional). This is the primary mark.
- **Territories** — a `fill` layer per territory (or one fill layer keyed by territory) using each
  territory's `QUALITATIVE` colour at a modest opacity, plus a border line, plus a text label at the
  territory centroid — the reveal's final state.
- **Direction** — since a static image cannot animate the draw-on, convey direction with a **start marker**
  (at `route[0]`) and an **end marker** (at the last route point), plus **arrowheads along the line** (a
  `symbol` layer with `symbol-placement: line` + an arrow glyph, or periodic triangle markers). Start→end
  reads as the journey direction.
- **Legend** — a small territory legend (swatch + name) in the furniture, complementing the on-map labels.
- **Interaction** (interactive build) — pan/zoom (bounded), hover a territory → its name (+ any value);
  hover the route → nothing or a title. Reuse the hover-popup pattern from the other Map components.
- **Framing** — `fitBounds` to the union of the route + territory bounds.

## Config

Reuse `RouteConfig` (`type:"route"`, `route: [number,number][]`, optional `territories`, `basemap`,
`mapStyle?`, `title`, `description?`, `source?`). No new fields required. (If a `direction?: boolean`
capability is wanted to suppress markers for a non-directional path, it can be added later; default =
show direction.)

## Validation & conformance

Route currently has no `validateRouteConfig`/`checkRouteConformance`. Add minimal ones (mirror the
hex-grid siblings' shape):
- **validate:** `type==="route"`; `route` a non-empty array of `[lon,lat]` pairs with ≥2 points;
  `territories` (if present) well-formed; a title.
- **conformance:** `computeRoute` succeeds; route has ≥2 points; bounds non-empty; valid `mapStyle`;
  global L0 (title/description/source). (Territory legend present if territories exist.)

## Formats & files

**Create:** `src/RouteMap.tsx`, `tests/route-map.test.ts` (or extend `route-geo.test.ts` for any new
helper); reuse the existing `assets/sample-data/route.json` sample (verify it has territories + furniture;
add a second sample if useful).
**Modify:** `src/validate-config.ts` (`validateRouteConfig`), `src/conformance.ts`
(`checkRouteConformance`), `src/mount.tsx` (dispatch route → `RouteMap` for static/interactive),
`scripts/produce.mjs` (`isRoute` now emits static + interactive snaps in addition to the video),
snap ready-gate (add `route-line`), `scripts/audit-cases.mjs`, `SKILL.md` (roadmap route → S✓ I✓ V✓),
`knowledge/references/map/types/` route doc (add static/interactive + the direction convention).

## Error handling & edge cases

- `route` with <2 points → validation error.
- No `territories` → render just the route line + start/end markers + arrowheads (valid; some routes have
  no waypoints).
- Route crossing the antimeridian → acceptable if `computeRoute` handles it; else document.
- Degenerate bounds (all points coincident) → pad (as the other types do).

## Testing

- Unit: any new pure helper (e.g. arrowhead placement, start/end extraction) is deterministic + tested.
- Conformance: a good route config passes; missing title / <2 points / bad mapStyle fail.
- **Render verification (controller views personally):** the static route shows the full line + all
  territories + labels + start/end markers + direction arrows on the basemap; the colour per territory is
  correct; light + dark mapStyle; the interactive build pans/zooms and hover shows the territory name.
  The render must read as a clear journey (direction legible) — verified at render, not just "it renders".

## Global constraints

- Runtime **Bun** always; tests `bun test`. English everywhere. **No** Claude/Anthropic mention, **no**
  `Co-Authored-By`, **no** Claude-Session trailer.
- MapTiler key in `splash/.env` (gitignored) — never commit/log it.
- Reuse `computeRoute`, `QUALITATIVE`, `resolveMapStyle`, `RouteReveal`'s visual vocabulary, the
  Map-component layer/hover/legend pattern; do not fork them.
- **Render quality is a merge gate** — the controller personally verifies the static + interactive route
  reads as a clear directional journey before merge.
