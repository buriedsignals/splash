# Map Route / Flow — Static + Interactive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing **static** + **interactive** formats to the route/flow map type via a
`RouteMap.tsx` that renders the COMPLETE route (the reveal's final state) on the basemap. Closes the
roadmap `◻ ◻` gap → S✓ I✓ V✓.

**Architecture:** Reuse `computeRoute` (geometry already exists). `RouteMap.tsx` draws the route line
(electric glow + core, like `RouteReveal`) + per-territory fills/borders/labels + start/end markers +
direction arrowheads, on the basemap, with hover in the interactive build. No new geometry core; no video
change.

**Tech Stack:** Bun, TypeScript, turf 7.2, MapTiler SDK, React, `bun:test`.

**Prereq:** route video path exists (`route-geo.ts` `computeRoute`, `RouteReveal.tsx`, `RouteScrolly.tsx`);
sample `assets/sample-data/route.json` (type route, 603-pt river, 2 territories, dark, full furniture).

## Global Constraints

- Runtime **Bun** always; tests `bun test`. English everywhere. **No** Claude/Anthropic mention, **no**
  `Co-Authored-By`, **no** Claude-Session trailer.
- MapTiler key in `splash/.env` (gitignored) — never commit/log it;
  `set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a`.
- Reuse `computeRoute`/`RouteConfig`/`RouteLayout`/`QUALITATIVE`/`resolveMapStyle` (`src/route-geo.ts`) and
  `RouteReveal.tsx`'s visual vocabulary (electric line: glow `#49C6FF` width~11 opacity .32 blur 6 → core
  width~3; territory fills + border trails + labels). Do NOT fork them; do NOT change the video path.
- After writing any `.tsx`, verify NUL-free: `python3 -c "print(open('<file>','rb').read().count(b'\\x00'))"` prints 0.
- **Render quality is a merge gate:** the controller personally views the static + interactive renders and
  confirms the route reads as a clear DIRECTIONAL journey (line + territories + labels + start/end +
  arrows), light + dark — not just "it renders".

## File structure

**Create:** `src/RouteMap.tsx`, `tests/route-conformance.test.ts`.
**Modify:** `src/validate-config.ts` (`validateRouteConfig`), `src/conformance.ts`
(`checkRouteConformance`), `src/mount.tsx`, `scripts/produce.mjs`, the snap ready-gate scripts,
`scripts/audit-cases.mjs`, `SKILL.md`, `knowledge/references/map/types/` route doc.
**Reference (read):** `src/components/RouteReveal.tsx` (line/territory/label style + basemap-label
stripping), `src/HexGridMap.tsx`/`src/CartogramMap.tsx` (Map-component pattern: hover, legend, mapStyle,
fitBounds), `src/route-geo.ts` (`computeRoute` + `RouteLayout` shape), the hex-grid validate/conformance
entries.

---

## Task 1: `validateRouteConfig` + `checkRouteConformance`

**Files:** Modify `src/validate-config.ts`, `src/conformance.ts`; Test `tests/route-conformance.test.ts`.

Route currently has no validator/conformance. Add them, mirroring the hex-grid siblings' RETURN SHAPE
exactly (read `validateHexGridConfig` + `checkHexGridConformance` first; match verbatim). Deltas:
- **validateRouteConfig:** `type==="route"`; `route` an array of `[number,number]` pairs with ≥2 points
  (reject <2 or malformed pairs); `territories` (if present) an array of well-formed entries; a `title`.
- **checkRouteConformance:** `computeRoute(config)` succeeds (catch → violation); `route.length >= 2`;
  bounds non-empty; valid `mapStyle` ∈ `MAP_STYLES`; global L0 (`checkGlobalMapConformance`).

- [ ] **Step 1:** Write failing tests — validate rejects `<2` route points, malformed pair, missing title;
  conformance passes `route.json`, fails on a `<2`-point route / bad mapStyle / short title. Read
  `route.json` for a valid fixture; build a minimal invalid one inline.
- [ ] **Step 2:** Run → fail. `cd skills/map-native && bun test tests/route-conformance.test.ts`
- [ ] **Step 3:** Implement both append-only in the validate/conformance dispatch (don't touch other types).
- [ ] **Step 4:** Run → pass + full suite `cd skills/map-native && bun test`.
- [ ] **Step 5:** Commit
```bash
git add skills/map-native/src/validate-config.ts skills/map-native/src/conformance.ts skills/map-native/tests/route-conformance.test.ts
git commit -m "feat(map-native): route config validation + conformance guard"
```

---

## Task 2: `RouteMap.tsx` (static + interactive) + wiring + render-verify

**Files:** Create `src/RouteMap.tsx`; Modify `src/mount.tsx`, `scripts/produce.mjs`, the snap ready-gate scripts.

- [ ] **Step 1: Write `RouteMap.tsx`** — port the Map-component pattern from `HexGridMap.tsx`, using
  `RouteReveal.tsx`'s visual vocabulary. `Props { config; progress?; interactive? }`. On load:
  1. `computeRoute(config)` once → `{route, territories}`. `dark = resolveMapStyle(config.mapStyle) === "dataviz-dark"`.
     Init the map with the resolved style; strip basemap labels + inner admin borders (copy RouteReveal's approach).
  2. **Territories:** for each territory add a `fill` layer (`fill-color: terr.color` from QUALITATIVE,
     `fill-opacity` ~0.22), a border `line` layer (`line-color: terr.color`, width ~2), and a text label at
     the territory centroid. (Full/final state — no per-territory reveal animation.)
  3. **Route line (the primary mark):** add a glow `line` layer id `route-line-glow`
     (`line-color: "#49C6FF"` (or the ELECTRIC.glow used by RouteReveal for this mapStyle), width ~11,
     opacity ~0.32, blur ~6) then a core `line` layer id `route-line` (`line-color: ELECTRIC.line`, width ~3,
     opacity ~0.95), from a GeoJSON LineString of `layout.route`. Full length (no head/animation).
  4. **Direction:** add a start marker (circle at `route[0]`) and an end marker (circle at the last point),
     visually distinct (e.g. start = hollow ring, end = filled dot) — and a `symbol` layer id `route-arrows`
     over the route line with `symbol-placement: "line"`, a triangle/► arrow glyph as `text-field` (or an
     SDF icon), `symbol-spacing` ~120 so arrows repeat sparsely along the line indicating flow direction.
  5. **Legend:** a territory legend (swatch + name per territory) reusing HexGridMap's legend markup; plus
     the on-map labels from step 2.
  6. **Interactive:** hover a territory fill → popup with the territory name (+ any value); pan/zoom bounded
     (adopt HexGridMap's bounded-nav or a minZoom pin). `fitBounds` to the union bounds of route + territories.
  7. mapStyle-adaptive; `progress` multiplies nothing for static (full opacity); NUL-free.
- [ ] **Step 2: Wire `mount.tsx`** — dispatch `type==="route"` → `<RouteMap config={...}/>` for the
  static/interactive builds (mirror how hex-grid/cartogram dispatch). (The video path is unchanged — it
  goes through produce's video kinds, not mount's static render.)
- [ ] **Step 3: Wire `scripts/produce.mjs`** — `isRoute` currently emits video-only. Make it ALSO emit the
  static + interactive snaps (the web build + 4 snaps) like the other types, while KEEPING its video
  (route-reveal `story`) kinds. Add `route-line` to the snap ready-gate OR-list additively; type-gate the
  route hover branch in snap-proof/snap-a11y.
- [ ] **Step 4: Typecheck + full suite** — `cd skills/map-native && bunx tsc --noEmit && bun test`
  (clean apart from pre-existing react-dom TS2688; all pass).
- [ ] **Step 5: Render-verify static + interactive, light + dark.** COMMIT first, then:
```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
bun scripts/produce.mjs assets/sample-data/route.json /tmp/route/dark static
# a light variant: make a copy with mapStyle dataviz-light to check both
node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync('assets/sample-data/route.json','utf8'));c.mapStyle='dataviz-light';fs.writeFileSync('/tmp/route-light.json',JSON.stringify(c))"
bun scripts/produce.mjs /tmp/route-light.json /tmp/route/light static
```
Inspect the PNG/interactive stills and CONFIRM: the full route line (glow+core) drawn end-to-end; both
territories filled + bordered + labelled; start + end markers present; direction arrows repeat along the
line (flow legible); legend + basemap correct; dark AND light both read well; interactive hover shows a
territory name. **The route must read as a clear directional journey.** If a render exceeds ~8 min, STOP →
DONE_WITH_CONCERNS.
- [ ] **Step 6: Commit**
```bash
git add skills/map-native/src/RouteMap.tsx skills/map-native/src/mount.tsx skills/map-native/scripts/produce.mjs skills/map-native/scripts/snap-*.mjs
git commit -m "feat(map-native): RouteMap static+interactive (route line + territories + direction) + wiring"
```

---

## Task 3: KB + roadmap + audit

**Files:** Modify `knowledge/references/map/types/` route doc (create if absent), `SKILL.md`,
`scripts/audit-cases.mjs`.

- [ ] **Step 1:** Update (or create) the route KB type doc: add the static + interactive formats (the
  complete route on the basemap, territories, the direction convention: start/end markers + flow arrows),
  when to use route/flow vs the others (a journey/path/flow across space with optional waypoints), the
  reuse of the electric line + QUALITATIVE, hover, mapStyle. Keep the video section. Implementation pointer:
  `route-geo.ts` (`computeRoute`) + `RouteMap.tsx` (static+interactive) + `RouteReveal`/`RouteScrolly` (video)
  + `checkRouteConformance`.
- [ ] **Step 2:** SKILL.md roadmap — the `Flow / route` row: set S ✓ I ✓ (keep V ✓); update the note to
  "static + interactive + video (route-reveal / scrolly)". Match the table format; do not restructure.
- [ ] **Step 3:** Add a route audit case (the sample) additively to `scripts/audit-cases.mjs` (+ `audit.mjs`
  if needed); run the audit → route case clean.
- [ ] **Step 4:** Full suite pass (`cd skills/map-native && bun test`).
- [ ] **Step 5:** Commit
```bash
git add knowledge/references/map/types/ skills/map-native/SKILL.md skills/map-native/scripts/audit-cases.mjs skills/map-native/scripts/audit.mjs
git commit -m "docs(map-native): route static+interactive shipped — KB + roadmap (S✓ I✓ V✓) + audit case"
```

---

## Self-Review

**Spec coverage:** validation + conformance → Task 1; `RouteMap` static+interactive (route line +
territories + labels + direction markers/arrows + legend + hover) + wiring + render-verify → Task 2; KB +
roadmap + audit → Task 3. Reuses `computeRoute`/`QUALITATIVE`/`resolveMapStyle` + RouteReveal's vocabulary;
video path untouched. Render quality is an explicit merge gate (directional journey legible, light + dark).

**Placeholder scan:** Task 2 enumerates concrete layer ids + paint (route-line-glow / route-line / arrows /
per-territory fills) and exact render commands. Tasks 1 + 3 port named siblings. No "TBD".

**Type consistency:** `RouteMap` consumes `computeRoute`'s `RouteLayout {route, territories}`; layer id
`route-line` matches the snap ready-gate + hover gating; `validateRouteConfig`/`checkRouteConformance`
return the hex-grid sibling shapes. `QUALITATIVE` territory colours match RouteReveal.
