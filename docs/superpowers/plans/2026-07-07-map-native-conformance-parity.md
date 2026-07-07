# Map-native — conformance-au-produce parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax. Spec:
> `docs/superpowers/specs/2026-07-07-map-native-conformance-parity-design.md` (v2, revised after adversarial review).

**Goal:** Port chart-native's `conformance-au-produce` floor to `map-native`: a non-conforming map **fails the
run before export**. Close the real hole (palette CVD unvalidated on hex-grid/cartogram) and wire a **lean
produce guard** (furniture L0 semantics + palette CVD, config-time, **no basemap GeoJSON loaded**).

**Architecture (v2 lean, adversarially reviewed — Rémy chose "lean"):** the produce guard = **furniture (all 7
types) + palette-CVD (3 ramp types)** at config-time. It loads **no GeoJSON** and replays no heavy geo-core;
structural rules that need the basemap stay covered by the existing render-time snaps. Mirror of the chart
split (produce-conformance = config-time; snaps = render-time). The palette-CVD rule is pushed **into the
per-type checks** (feedback→système), then the guard enforces it uniformly.

**Tech Stack:** Bun, TypeScript, React/D3 (map-native), MapLibre/MapTiler, bun:test.

## Global Constraints

- Runtime **Bun** (`bun`, `bunx` — never npm/node except Remotion). Tests `bun:test`.
- Code/comments/identifiers/commits/branches in **English**. Zero `any` / `@ts-ignore`. No vendor mention.
- `bun run check` (repo root) MUST be green at the end of every task. `check.mjs:9-12` already runs
  `skills/map-native` tests — new tests are picked up automatically (no wiring).
- Work on branch `feat/map-native-conformance-parity` (create at Task 1). Merge `--no-ff` at the end.
- The guard **loads no basemap GeoJSON** and replays no heavy geo-core (choropleth/cartogram/route join layers).
- Guards validate the SAME colours the component paints: ramp via `resolvePalette(scaleType, palette).ramp`
  (single source `theme/scale.ts`); furniture via `theme/map-tokens.ts` light/dark tokens.
- **Produce-verify by the controller (me)**: Read the guard output AND a produced sample render per relevant
  type via the real `scripts/produce.mjs` — do not trust a subagent's claim.

**Grounding (verified file:line — from 3-reader scout + adversarial review):**
- `checkGlobalMapConformance(input{title,description?,source{name?,url?}}, textColors{text:string[];bg:string}): string[]` — `conformance.ts:64`. L0: title≥12 / not year-range / not ALL-CAPS / description / source name+url / each `text` ≥4.5:1 on `bg`.
- `checkPaletteConformance({scaleType, scaleColors, values?, paletteName?, subject?}): string[]` — `conformance.ts:114`. `isCvdSafeRamp` = every colour ∈ `VETTED_COLORS` (`scale.ts:142`).
- `resolvePalette(scaleType, palette).ramp` — `scale.ts:107`. **Throws on unknown named palette**; returns an **unvalidated** ramp ONLY on the `Array.isArray(request)` branch (`scale.ts:116-122`) → the custom-array hole.
- Per-type checks: `checkChoroplethConformance` `:156` (**only one calling `checkPaletteConformance` `:191`**), `checkSymbolConformance` `:220`, `checkRouteConformance` `:290` (**no L0**, returns `{violations}`), `checkRouteConfigConformance(config,boundaries,textColors)` `:623` (composes L0 + `computeRoute` — needs boundaries), `checkDotDensityConformance` `:406`, `checkLocatorConformance` `:449`, `checkHexGridConformance` `:488` (**no palette CVD**), `checkCartogramConformance(input incl. features, textColors)` `:528` (**no palette CVD**; recomputes `computeCartogram`, `layout.bins.map(b=>b.color)` in scope `:575`).
- `validate-config.ts`: `paletteErrors` (uses `isCvdSafeRamp`), `ChoroplethConfigShape{palette,scaleType}` `:58-60`, `HexGridConfigShape` `:509-521` (**no `palette` field**), `validateHexGridConfig` `:523-609` (**no `paletteErrors` call**), `validateCartogramConfig` calls `paletteErrors` `:647`.
- `hex-grid-geo.ts` reads `data.palette` `:160` (default `BLUES`); `cartogram-geo.ts` reuses `computeChoropleth` `:52`.
- Furniture tokens: `FRAME_COLORS{ink:"#1a1a1a",muted:"#5f5f5f",pill:white}` `map-tokens.ts:8-12`; `FRAME_COLORS_DARK{ink:"#f4f4f5",muted:"#c4c4c8",pill:dark}` `:15-19`. `MapFrame.tsx:73` picks via `dark = resolveMapStyle(mapStyle)==="dataviz-dark"`.
- `mount.tsx`: discriminators `config.type === "symbol"|"route"|"locator"|"dot-density"|"hex-grid"|"cartogram"` `:42-47`; **choropleth = default `else` branch** `:82-88` (sample configs have **no `type` field**). No canonical registry; `AnyConfig` union `:18-25`.
- `produce.mjs`: arg guard + `mkdirSync` `:41`; first `vite build` `:58`; config read (too late) `:89`; snaps `snap-responsive`/`snap-a11y` fail-hard `:64-81`. Does **not** import `conformance.ts`. Stale `SKILL.md:318` "defaults to `all`" contradicts `produce.mjs:30` (`static`).
- `check.mjs:9-12` lists `skills/map-native` in `TEST_DIRS`.

---

## File Structure

- New: `skills/map-native/src/map-types.ts` (`MAP_TYPES`), `skills/map-native/src/core/map-produce-conformance.ts` (`runProduceMapConformance` + `MAP_PRODUCE_GUARDED_TYPES` + `RAMP_TYPES`), `skills/map-native/tests/{map-types,map-produce-conformance,map-completeness}.test.ts`.
- Modify: `skills/map-native/src/conformance.ts` (palette into hex-grid/cartogram checks), `skills/map-native/src/validate-config.ts` (hex-grid palette field + `paletteErrors`), `skills/map-native/scripts/produce.mjs` (fail-hard gate), `skills/map-native/SKILL.md` (one-line note + stale fix).
- Verify/author: `knowledge/references/map/types/*.md` (7 refs) + `knowledge/references/map/design-conformance.md` (palette-CVD rule note).

---

## Task 1: Close the palette-CVD hole IN the per-type checks (the payoff)

**Files:** Modify `src/conformance.ts`, `src/validate-config.ts`; New `tests/palette-parity.test.ts` (or extend `tests/conformance.test.ts`).

**Rationale:** `checkPaletteConformance` is wired to choropleth only (`conformance.ts:191`). hex-grid + cartogram
compute a ramp but never CVD-validate it. Trigger = a **custom-array** palette (`palette:['#f00',…]`); named
palettes are always vetted (`scale.ts:107-137`). Fix the rule at the **type level** (feedback→système).

- [ ] **Step 1 (RED):** In `tests/`, add cases: `checkHexGridConformance` and `checkCartogramConformance` on a
  config with `palette: ['#ff0000','#00ff00','#0000ff']` (custom, non-CVD-safe) MUST return a violation
  mentioning the palette; the same with a named/default palette MUST NOT. Run — expect FAIL (no palette check
  today).
- [ ] **Step 2:** In `checkHexGridConformance` (`conformance.ts:488`), after L0, compute the ramp the component
  paints and validate it:
  ```ts
  // hex-grid paints resolvePalette(scaleType, data.palette).ramp (hex-grid-geo.ts:160). Validate it — the
  // custom-array branch of resolvePalette (scale.ts:116-122) is the only way a non-CVD ramp reaches produce.
  try {
    const ramp = resolvePalette(input.scaleType ?? "sequential", input.palette).ramp;
    v.push(...checkPaletteConformance({ scaleType: input.scaleType ?? "sequential", scaleColors: ramp,
      values: input.values, paletteName: typeof input.palette === "string" ? input.palette : undefined }));
  } catch (e) { v.push(`palette: ${(e as Error).message}`); }
  ```
  Thread `palette`/`scaleType`/`values` into the check's `input` type (additive, optional). Mirror the choropleth
  call at `:191` for consistency.
- [ ] **Step 3:** In `checkCartogramConformance` (`conformance.ts:528`), it already computes `layout.bins`
  (`:575`). Add `v.push(...checkPaletteConformance({ scaleType: <layout.scaleType or input>, scaleColors:
  layout.bins.map(b => b.color), values: input.values, paletteName: typeof input.palette === "string" ?
  input.palette : undefined }))`. No extra compute (reuse `layout`).
- [ ] **Step 4 (validate-layer parity for hex-grid):** Add a `palette?` field to `HexGridConfigShape`
  (`validate-config.ts:509-521`) and a `paletteErrors(...)` call to `validateHexGridConfig` (`:523-609`),
  mirroring `validateCartogramConfig` (`:647`). Additive/back-compat (was silently accepted, now validated).
- [ ] **Step 5 (GREEN):** Run the Task-1 tests → PASS. Run `bun run check` → 14/14 green.
- [ ] **Step 6 (KB):** Add a one-line rule to `knowledge/references/map/design-conformance.md`: "the colour ramp
  must be CVD-safe (`isCvdSafeRamp`); enforced for choropleth, **hex-grid, cartogram**" with the code cross-ref.
- [ ] **Step 7: Commit** — `git checkout -b feat/map-native-conformance-parity` first (branch base = `main`
  `4a5ef49`), then `git commit -m "fix(map-native): CVD-validate the ramp on hex-grid + cartogram (palette parity with choropleth)"`.

---

## Task 2: Canonical `MAP_TYPES` registry + drift-test

**Files:** New `src/map-types.ts`, `tests/map-types.test.ts`.

**Interfaces:** `export const MAP_TYPES = ['choropleth','symbol','route','locator','dot-density','hex-grid','cartogram'] as const; export type MapType = typeof MAP_TYPES[number];`

- [ ] **Step 1:** Write `src/map-types.ts` with `MAP_TYPES` (7 reachable; contour omitted — never built) + `MapType`.
- [ ] **Step 2 (drift-test, no mount.tsx refactor):** `tests/map-types.test.ts` reads `mount.tsx` **as text**,
  regex-extracts the `config.type === "<literal>"` discriminators, adds `"choropleth"` (the default `else`
  branch), and asserts the resulting set deep-equals `[...MAP_TYPES].sort()`. This alarms on drift (a new `is*`
  flag not added to `MAP_TYPES`, or vice versa) **without** importing anything into `mount.tsx`. Do **not**
  anchor on the Remotion registries (orthogonal to conformance).
  - If a text-grep feels brittle, the acceptable alternative is asserting `MAP_TYPES` ≡ the runtime `storyComps`
    key set in `produce.mjs:100-104` — but prefer the mount.tsx anchor (it is the reachability source of truth).
- [ ] **Step 3:** `bun run check` green. **Commit** `feat(map-native): canonical MAP_TYPES registry + drift-test vs mount.tsx reachability`.

---

## Task 3: `runProduceMapConformance` — the lean produce guard

**Files:** New `src/core/map-produce-conformance.ts`, `tests/map-produce-conformance.test.ts`.

**Interfaces:**
```ts
export const RAMP_TYPES = ['choropleth','hex-grid','cartogram'] as const;
export const MAP_PRODUCE_GUARDED_TYPES = [...MAP_TYPES]; // all 7 furniture-guarded (parity invariant target)
export interface MapConformanceRunResult { checked: boolean; violations: string[] }
export function runProduceMapConformance(rawType: string | undefined, config: Record<string, unknown>): MapConformanceRunResult
```

**Design (lean — no GeoJSON, no heavy geo-replay):**
```ts
export function runProduceMapConformance(rawType, config) {
  const type = rawType ?? "choropleth";                     // CRITICAL: choropleth is the type-less default
  if (!MAP_TYPES.includes(type)) return { checked: true, violations: [`unknown map type "${type}"`] }; // typo→violation, not silent pass
  if (!MAP_PRODUCE_GUARDED_TYPES.includes(type)) return { checked: false, violations: [] };
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";        // light/dark furniture (what MapFrame paints)
  const fc = dark ? FRAME_COLORS_DARK : FRAME_COLORS;
  const textColors = { text: [fc.ink, fc.muted], bg: fc.pill };
  const violations = checkGlobalMapConformance(
    { title: config.title, description: config.description, source: config.source }, textColors);
  if (RAMP_TYPES.includes(type)) {
    try {
      const scaleType = config.scaleType ?? "sequential";
      const ramp = resolvePalette(scaleType, config.palette).ramp;         // pure — no geometry, no basemap
      violations.push(...checkPaletteConformance({ scaleType, scaleColors: ramp,
        values: extractValues(config), paletteName: typeof config.palette === "string" ? config.palette : undefined,
        subject: config.subject }));
    } catch (e) { violations.push(`palette: ${(e as Error).message}`); }   // resolvePalette throws on unknown name → clean violation
  }
  return { checked: true, violations };
}
```
The guard is **furniture (all 7) + palette (3 ramp types)** — it does **not** call the full per-type checks
(their structural inputs need the basemap; those stay snap/test-covered). `route` gets its **missing L0** here
(it had none). `resolveMapStyle`, `FRAME_COLORS(_DARK)` are imported from their existing modules (locate
`resolveMapStyle` — used in `MapFrame.tsx:73` and the components).

- [ ] **Step 1 (RED):** `tests/map-produce-conformance.test.ts`:
  - a **type-less** choropleth config (no `type`) → `checked:true`, and with a bad title (ALL-CAPS / <12) →
    a violation (proves the CRITICAL default-normalization: choropleth is guarded, not skipped).
  - a `hex-grid` / `cartogram` config with a **custom non-safe** `palette:['#f00','#0f0','#00f']` → a palette
    violation (proves the ramp arm fires at produce).
  - a clean config of each of the 7 types (with valid furniture + named/default palette) → `[]` violations.
  - an **unknown** `type:"bogus"` → a violation (not `checked:false`).
  - a `mapStyle:"dataviz-dark"` config → the check runs against DARK tokens (assert it doesn't false-flag the
    pre-vetted dark furniture).
  - Run → FAIL (module absent).
- [ ] **Step 2:** Implement `map-produce-conformance.ts` as above. `extractValues(config)` = the numeric column
  the choropleth/hex/cartogram key off (from `config.rows`/`config.data`) or `undefined` if not trivially
  available — `values` is optional in `checkPaletteConformance`; keep it best-effort.
- [ ] **Step 3 (GREEN):** Task-3 tests PASS; `bun run check` 14/14 green.
- [ ] **Step 4: Commit** `feat(map-native): runProduceMapConformance — lean produce guard (furniture L0 + palette CVD, no GeoJSON)`.

**Honest-scope note (put in the module header comment):** this guard covers config-time furniture + palette;
structural rules needing the basemap (bounds, region-join, symbol max-radius) stay in the render-time snaps;
GL-rendered labels are out of scope (separate spike). Furniture-contrast is drift-defense on pre-vetted tokens.

---

## Task 4: Wire the gate into `produce.mjs` (fail-hard) + SKILL.md + produce-verify

**Files:** Modify `scripts/produce.mjs`, `SKILL.md`.

- [ ] **Step 1:** In `produce.mjs`, just after the arg guard + `mkdirSync` (`:41`) and **before** the first
  `vite build` (`:58`), read the config and run the gate (mirror chart `produce.mjs:47-61`):
  ```js
  const parsed = JSON.parse(readFileSync(configPath, "utf8"));
  const { runProduceMapConformance } = await import("../src/core/map-produce-conformance.ts");
  const res = runProduceMapConformance(parsed.type, parsed);
  if (!res.checked) console.log(`conformance: no guard wired for "${parsed.type}" — skipping`);
  else if (res.violations.length) { res.violations.forEach(v => console.error(`  ✗ ${v}`)); process.exit(1); }
  else console.log("conformance: OK (0 violations)");
  ```
  (Confirm the existing config read at `:89` can reuse `parsed` or stays independent — avoid double-read.)
- [ ] **Step 2 (RED then GREEN — produce-verify by controller):**
  - Take an existing clean sample (`assets/sample-data/choropleth.json`) → `produce.mjs` static → gate logs OK,
    build proceeds. **I Read the produced PNG** to confirm the map still renders.
  - Make a deliberately non-conforming copy (remove `source`, OR set `palette:['#f00','#0f0','#00f']` on a
    hex-grid sample) → `produce.mjs` → **exits non-zero before build** with the violation printed. Confirm no
    output written.
- [ ] **Step 3 (SKILL.md honesty):** add one line under the conformance section: "Conformance now runs
  **fail-hard at produce** (furniture L0 + palette CVD) before any build." Fix the stale `SKILL.md:318`
  "defaults to `all`" → "defaults to `static`". **No type-list edit** (a guard is not a new emittable type).
- [ ] **Step 4:** `bun run check` green. **Commit** `feat(map-native): gate produce.mjs on conformance (fail-hard before build) + SKILL.md note`.

---

## Task 5: Parity invariant `map-completeness.test.ts` + KB refs

**Files:** New `tests/map-completeness.test.ts`; Verify/author `knowledge/references/map/types/*.md`.

- [ ] **Step 1 (verify KB):** confirm a ref exists per reachable type at `knowledge/references/map/types/`
  with the id→display-name map: `choropleth→choropleth.md`, `symbol→proportional-symbol.md`,
  `route→route.md` (or `flow-map.md`), `locator→locator.md`, `dot-density→dot-density.md`,
  `hex-grid→hex-grid.md`, `cartogram→cartogram.md`. **Author any missing** ref, mirroring the existing
  `choropleth.md`/`proportional-symbol.md` format (sourced URLs only, cross-ref the per-type check + the guard).
  Record the id→filename overrides in the test (as chart `completeness.test.ts` does with `KB_FILENAME`).
- [ ] **Step 2 (invariant):** `tests/map-completeness.test.ts`: for every `MAP_TYPES` entry — assert it ∈
  `MAP_PRODUCE_GUARDED_TYPES` **and** its KB ref file exists. **Non-vacant:** all 7 reachable, 0 deferred → all
  must be guarded (adding an 8th type without wiring the guard fails this test). No escape hatch needed (contour
  is not in `MAP_TYPES`).
- [ ] **Step 3:** `bun run check` green (all 7 wired in Task 3 → invariant green immediately; never committed red).
  **Commit** `test(map-native): parity invariant — reachable ⟹ guarded + KB ref (mirror chart completeness)`.

---

## Definition of done

- A non-conforming map (bad furniture semantics, or a custom non-CVD-safe ramp) **fails `produce.mjs` before
  build** for all 7 map types; proven RED-on-bad / GREEN-on-clean, **produce-verified at the render by me**.
- The palette-CVD hole is closed **in the per-type checks** (hex-grid + cartogram) and enforced at produce.
- `MAP_TYPES` is the single source; drift-test anchors it to `mount.tsx` reachability; parity invariant
  (reachable ⟹ guarded ∧ KB) is non-vacant.
- `bun run check` green after **every** task. Per-task review + whole-branch opus review before merge `--no-ff`.
  Zero `any`/`@ts-ignore`, zero vendor mention, Bun runtime. Record in CLAUDE.md.

## Backlog (out of scope — documented, not silently dropped)

- **GL-rendered label contrast** (MapLibre symbol layers on WebGL canvas): the map equivalent of `snap-contrast`;
  needs GL pixel-sampling, a separate spike.
- **Format-aware framing at produce** (video title-overrun): the guard has no `{width,height}`; snaps cover
  interactive; video framing is a separate follow-on.
- **Scrolly produce path** (`skills/scrolly/scripts/produce.mjs`): a separate producer this guard never touches —
  port the gate there in a follow-on.
- **Full per-type structural checks at produce** (legend presence, ≥3 scaleColors, symbol max-radius, region-join):
  need the basemap/viewport; config-complete subsets (e.g. choropleth ≥3 scaleColors from the ramp length) could
  be added per-type as an enhancement.
- **Second drift point avoided:** because the guard loads no basemap GeoJSON, there is no guard-side
  basemap→file registry to drift against the component's `GEOJSON_BY_BASEMAP` (a cost the "full" option carried).
