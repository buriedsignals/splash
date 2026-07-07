# Map-native — render-quality fixes (8 bugs) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Spec:
> `docs/superpowers/specs/2026-07-07-map-native-render-quality-design.md`. Full grounded per-bug detail
> (file:line + repro + verified fixSketch) is in the audit report the controller holds — each task brief
> carries what its implementer needs.

**Goal:** Fix 8 confirmed map-native render bugs to a high standard — each = fix + a SHARED helper (kill the
duplication that caused the drift) + a mechanical guard (feedback→système) + controller render-verify.

**Tech Stack:** Bun, TypeScript, React/D3, MapLibre/MapTiler, Remotion, bun:test.

## Global Constraints
- Runtime **Bun** (`bun`/`bunx`; Remotion via node is the only exception). Tests `bun:test`.
- English code/commits; zero `any`/`@ts-ignore`; no Claude/Anthropic mention.
- `bun run check` (repo root) green at the end of **every** task.
- Branch `feat/map-native-render-quality` (created; base main a4a6870). Merge `--no-ff` at end.
- **Render-verify is the controller's job**: after each visual task the controller produces with the MapTiler
  key (`set -a && . ./.env && set +a` from repo root before `bun run scripts/produce.mjs …`) and READS the PNG
  — dark AND light for touched types. Implementers still produce a still and report its path.
- **Mirror the existing correct pattern.** For dark wiring, `LocatorMap.tsx` and `CartogramMap.tsx` are the
  reference (they thread `dark = resolveMapStyle(config.mapStyle) === "dataviz-dark"` through basemap/legend/
  labels/MapFrame). For symbol labels, `SymbolReveal.tsx:122-144`. Don't reinvent — copy the proven shape.
- **Refactor = no-regression.** Migrating an already-correct component to a shared helper must not change its
  render; render-verify the migrated ones unchanged.

**Grounding (verified file:line):**
- `resolveMapStyle(token?)` — `route-geo.ts:11` (single style-token resolver; `MAP_STYLES=["dataviz-light","dataviz-dark"]`).
- Dark-aware reference components: `LocatorMap.tsx:117` / `CartogramMap.tsx:77` / `HexGridMap.tsx:74` / `DotDensityMap.tsx:76` / `RouteMap.tsx:53` (compute `dark`, switch `DATAVIZ.DARK` basemap, dark legend/labels, `dark={dark}` to `<MapFrame>`).
- `MapFrame.tsx:43` defaults `dark=false`; renders no legend (legend is always a separate `legendRef` div, `data-testid="map-legend"`).
- Broken: `ChoroplethMap.tsx:195` + `SymbolMap.tsx:187` hardcode `DATAVIZ.LIGHT`, never read `config.mapStyle`.
- Inline dupes to extract: legend theme colours (`HexGridMap:288-289`, `CartogramMap:272-273/403`, `DotDensityMap:342`, `LocatorMap`); `fmt` (`HexGridMap:290-291`, `CartogramMap:274-275`); `labelTextSize` = `width<=1080?18:13` (`SymbolReveal:55`, `LocatorReveal:75`, `LocatorStory:83`, `LocatorScrolly:86`).
- Video/scrolly siblings that DO ship a legend: `HexGridStory:325`, `CartogramStory:334`, `DotDensityStory:363`, `LocatorStory:374`.

---

## Task 1: Shared helpers foundation (legendTheme, fmtBin, labelTextSize) + fix #8 (label-size drift)

**Deliverable:** three shared helpers as the single source; existing duplicated consumers migrated (no-regression);
on-map label size unified so static/interactive inherit the narrow-canvas 18px bump (fixes #8).

**Files:** New `src/theme/legend-theme.ts` (or add to `map-tokens.ts`), `src/core/legend-format.ts`; add
`labelTextSize` to `src/core/map-format.ts`. Modify the components that currently inline these.

- [ ] `legendTheme(dark: boolean): { ink: string; sub: string; bg: string; stroke: string }` — the themed legend
  colours currently inlined in Hex/Cartogram/DotDensity/Locator. Values must equal what those components already
  paint (read them; single-source, no drift). Migrate those 4 components to consume it. **Render-verify** one
  dark (e.g. Cartogram dark) unchanged.
- [ ] `fmtBin(n: number, opts?: {minGap?: number}): string` — decimal-aware (`Number.isInteger(n) ? String(n)
  : n.toFixed(1)`; if a `minGap` is passed, derive precision so adjacent labels stay distinct). Extract from
  Hex/Cartogram inline `fmt`; migrate both to consume it. (Choropleth consumes it in Task 2.)
- [ ] `labelTextSize(width: number): number` in `core/map-format.ts` = the `width<=1080?18:13` the 4 video/scrolly
  siblings use. Migrate `SymbolReveal/LocatorReveal/LocatorStory/LocatorScrolly` to consume it, AND make
  `SymbolMap.tsx:29`/`LocatorMap.tsx:33` (static/interactive) consume `labelTextSize(width)` instead of a fixed
  13 — so a portrait/narrow embed gets the 18px the team already judged necessary. **Do NOT** multiply by
  `frame.scale` (regression). **Render-verify**: a narrow (≤1080) static symbol/locator → labels 18px; a wide
  one → 13px (unchanged).
- [ ] `bun run check` green. **Commit** `refactor(map-native): shared legendTheme/fmtBin/labelTextSize helpers + unify on-map label size (fix #8)`.

---

## Task 2: ChoroplethMap dark parity + fmtBin legend (#1 + #7)

**Files:** `src/ChoroplethMap.tsx`, `src/validate-config.ts` (ChoroplethConfig + ChoroplethConfigShape + validateChoroplethConfig).

- [ ] Add `mapStyle?: string` to `ChoroplethConfig` (:42-53) and `ChoroplethConfigShape` (validate-config.ts:50-67);
  validate it against `MAP_STYLES` in `validateChoroplethConfig` (mirror `validateRouteConfig:279-282`).
- [ ] `const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark"` (import from `./route-geo`). Thread it:
  basemap `:195` → `dark ? DATAVIZ.DARK : DATAVIZ.LIGHT`; region stroke `:275` (hardcoded `#ffffff`) → dark
  outline like `CartogramMap:150`; legend ink/sub/bg (`:308/316/493`) → `legendTheme(dark)`; `<MapFrame>` (:509)
  gets `dark={dark}`; dark control-CSS injection (mirror Locator). **Mirror LocatorMap/CartogramMap exactly.**
- [ ] Legend bin labels (`:316`) → `fmtBin` (Task 1), fixing #7 (no more `Math.round`).
- [ ] **Controller render-verify**: dark choropleth renders DARK (basemap + pill + legend + text) AND a
  fractional-value light choropleth shows distinct bin labels (not `0–0,0–1`). **Commit** `fix(map-native): ChoroplethMap honors mapStyle:dark (basemap+legend+furniture) + decimal bin labels`.

---

## Task 3: SymbolMap dark parity (#4)

**Files:** `src/SymbolMap.tsx`, `src/validate-config.ts` (SymbolConfig + SymbolConfigShape).

- [ ] Add `mapStyle?: string` to `SymbolConfig` (:33-44) + `SymbolConfigShape` (validate-config.ts:172-183) +
  validate. `const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark"`.
- [ ] Thread dark (mirror LocatorMap): basemap `:187`; nested-circle legend stroke/fill/bg (`:374/375/425`) →
  `legendTheme(dark)`; direct label text-color/halo (`:261-262`) → `dark ? "#f4f4f5" : "#1a1a1a"` / `dark ?
  "rgba(0,0,0,0.85)" : "#ffffff"` (mirror `LocatorMap:355-356`); symbol stroke `SYMBOL_STROKE`; `<MapFrame
  dark={dark}>`; dark popup/control CSS.
- [ ] **Controller render-verify**: dark symbol renders DARK with legible labels. **Commit** `fix(map-native): SymbolMap honors mapStyle:dark (basemap+legend+labels+furniture)`.

---

## Task 4: DotDensity univariate dot theme + single-source swatch (#5)

**Files:** `src/dot-density-geo.ts`, `src/DotDensityMap.tsx`, `src/conformance.ts`.

- [ ] Export a dark-safe univariate accent from ONE place (`dot-density-geo.ts`): light `#2171b5`, dark = a hue
  visible on the dark basemap (mirror the intent at `route-geo.ts:19-20`). Thread `dark` into the univariate dot
  colour (pass a resolved accent into `computeDotDensity` or set it in the component from the token). The legend
  swatch (`DotDensityMap.tsx:342`) reads **the same token** (not its own `dark ? "#e8e8ec" : "#2171b5"` literal).
- [ ] Guard: extend `checkDotDensityConformance` (`conformance.ts:407`) with a parity assertion — the legend
  swatch colour equals the univariate dot paint colour (single-source check).
- [ ] **Controller render-verify**: dark univariate dot-density → swatch colour == dot colour, both visible on
  dark. **Commit** `fix(map-native): dot-density univariate dot is theme-aware + swatch single-sourced to the dot colour`.

---

## Task 5: Choropleth video/scrolly legend (#2)

**Files:** `src/components/ChoroplethStory.tsx`, `ChoroplethReveal.tsx`, `ChoroplethScrolly.tsx`;
`knowledge/references/map/design-conformance.md`.

- [ ] Render the bin legend in all three, mirroring `CartogramStory:334`/`HexGridStory:325`: a `legendRef` div
  `data-testid="map-legend"` bottom-right, fading in with `furnitureOpacity`, populated from the already-computed
  sortedBins (swatch + `fmtBin` min–max + valueUnit), with reserved space via `resolveMapFrame`'s `legendHeight`.
  Thread `dark` through the legend/furniture too (follow the basemap).
- [ ] Fix the stale carve-out in `design-conformance.md` rule 6 ("video formats carry no legend") → all ramp/
  category maps render a legend in every format (matches rule 5 + the 4 newer types).
- [ ] **Controller render-verify**: a still of story + reveal + scrolly each shows the bin key. **Commit**
  `fix(map-native): choropleth video/scrolly render the bin legend (was undecodable) + fix stale KB rule 6`.

---

## Task 6: Symbol video/scrolly direct labels (#3)

**Files:** `src/components/SymbolStory.tsx`, `SymbolScrolly.tsx`; a parity test.

- [ ] Add the `symbol-labels` layer that `SymbolReveal.tsx:122-144` already builds (same source,
  `text-field:["get","labelText"]` name+value+unit via `symbolLabels`/`labelRadialOffset`, `labelTextSize` from
  Task 1), fading text-opacity in — so every mark carries name+value in video/scrolly, not just the top-5
  callouts. **Do NOT** add a size legend (that stays a v1 deferral).
- [ ] Parity test: all 4 symbol renderers (SymbolMap static, SymbolReveal, SymbolStory, SymbolScrolly) add a
  `symbol-labels` layer — a format that forgets it fails the suite.
- [ ] **Controller render-verify**: a still of SymbolStory (>5 points) shows every circle named+valued. **Commit**
  `fix(map-native): symbol guided-tour + scrolly label every symbol (name+value), not just top-5`.

---

## Task 7: hex-grid guard = renderer ramp resolution (#6)

**Files:** `src/core/map-produce-conformance.ts`, `src/conformance.ts`, a regression test. (No render change.)

- [ ] In `runProduceMapConformance`'s RAMP arm (`:116-121`): branch per type — cartogram/choropleth read
  `config.scaleType`; **hex-grid forces `"sequential"`** (mirror `hex-grid-geo.ts:160`), ignoring stray
  `config.scaleType`. Same in `checkHexGridConformance` (`conformance.ts:529-542`): drop the scaleType input,
  always pass `"sequential"`. This fixes both facets (false-positive refusal AND the greenlight-then-crash where
  `resolvePalette("sequential","rdbu")` throws — now caught in the guard's try/catch as a clean violation).
- [ ] Prefer factoring the per-type ramp resolution so "guard paints what renderer paints" is structural.
- [ ] Regression test: for hex-grid, a config with `scaleType:"diverging"` yields a violation consistent with the
  renderer (never a clean pass), and an all-positive hex + stray `scaleType:"diverging"` does NOT false-refuse.
- [ ] `bun run check` green. **Commit** `fix(map-native): hex-grid produce guard pins sequential to match the renderer (no phantom diverging ramp)`.

---

## Task 8: snap-theme render-time harness + parity tests (the durable system guards)

**Files:** New `scripts/snap-theme.mjs`; wire into `scripts/produce.mjs`; new parity tests.

- [ ] `snap-theme.mjs`: build the static output at `mapStyle:"dataviz-dark"`, sample the REAL painted background
  behind the title pill + legend box + on-map labels + the basemap canvas (reuse `snap-contrast.mjs`'s sampling
  technique) and assert they are actually DARK (luminance below a threshold) — so a type that silently drops
  `mapStyle:dark` FAILS produce before export. Wire it into `produce.mjs` after `snap-contrast` (fail-hard),
  gated to run when `config.mapStyle === "dataviz-dark"`. Document limitations in-code.
- [ ] Parity tests (bun:test): (a) every map renderer that accepts `mapStyle` consumes `resolveMapStyle` (grep/
  AST the component sources — a MapFrame-only partial fix fails); (b) no bin-legend component uses `Math.round`
  on breakpoints (they use `fmtBin`); (c) on-map label size derives from `labelTextSize` across formats.
- [ ] **Controller render-verify**: run `snap-theme.mjs` on a deliberately-reverted ChoroplethMap (temporarily
  hardcode LIGHT) → it goes RED; restore → GREEN. Confirms the harness has teeth.
- [ ] `bun run check` green. **Commit** `test(map-native): snap-theme render harness asserts dark actually renders dark + resolveMapStyle/labels/legend parity tests`.

---

## Definition of done
- All 8 bugs fixed; each type render-verified at the PNG by the controller (dark AND light where relevant).
- Shared helpers are the single source (legendTheme/fmtBin/labelTextSize/ramp-resolution); existing consumers
  migrated no-regression.
- Mechanical guards prevent regression: snap-theme (dark actually dark), resolveMapStyle-consumption parity,
  symbol-labels parity, DotDensity swatch==dot, hex ramp guard=renderer, no-Math.round, legend-in-video.
- `bun run check` green after every task; per-task review + whole-branch opus before merge `--no-ff`. Zero
  `any`/vendor. Record in CLAUDE.md.

## Backlog (out of scope — documented)
- Symbol size-legend in video (intentional v1 deferral — audit false-positive, correctly rejected).
- The 4 rejected false-positives (locator declutter, route distinct-colour, symbol stroke-contrast) — no change.
