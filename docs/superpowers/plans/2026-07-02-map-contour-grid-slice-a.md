# Map Contour / Isoline (v2 — gridded input) — Slice A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the contour type's core + static + interactive around a GRIDDED field input (no IDW).
`contour-geo.ts` runs `turf.isobands`/`isolines` directly on the grid values; the visible footprint follows
the grid's non-null cells. `ContourMap.tsx` renders it on the basemap.

**Architecture:** The field is a `values: (number|null)[][]` matrix + `bounds`. Build a FULL rectangular
turf point grid from it (null → sentinel), run `turf.isobands`/`isolines`, DROP the no-data (sentinel) band,
colour the real bands by break index via the reused choropleth scale (with the diverging `reverseScale`/
`midpoint` opt-in cherry-picked from `feat/map-contour` `66ed609`). No interpolation → no bullseye artifacts;
no convex-hull clip → the footprint = the non-null cells.

**Tech Stack:** Bun, TypeScript, turf 7.2 (`isobands`/`isolines`/`point`/`featureCollection`/`bbox`),
MapTiler SDK, React, `bun:test`.

**Prereq:** the map-native engine (choropleth `BLUES`/`DIVERGING` scale; `HexGridMap`/`CartogramMap` as the
layer-on-basemap references; `resolveMapStyle`). Grid-contour design spec approved. The ABANDONED scatter+IDW
contour lives on branch `feat/map-contour` (do NOT reuse its `contour-geo.ts`/`ContourMap.tsx`); this plan
starts contour fresh on a new branch from `main`.

## Global Constraints

- Runtime **Bun** always; tests `bun test`. English everywhere. **No** Claude/Anthropic mention, **no**
  `Co-Authored-By`, **no** Claude-Session trailer.
- MapTiler key in `atelier/.env` (gitignored) — never commit/log it;
  `set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a`.
- **Determinism:** pure function of config; turf isobands/isolines deterministic; no `Date.now`/`Math.random`.
- **NO interpolation / NO IDW / NO convex-hull clip.** Bands/lines come straight from the grid values; the
  footprint follows the non-null cells (via the sentinel no-data band, dropped).
- **Basemap always kept** (situated field) — no neutral background.
- Colour bands by break INDEX (turf's band-label is a range string, not a colour key).
- After writing any `.tsx`, verify NUL-free: `python3 -c "print(open('<file>','rb').read().count(b'\\x00'))"` prints 0.
- **Render quality is a merge gate:** the controller personally verifies the field is SMOOTH (no bullseyes)
  and the footprint follows the data (non-null region) — not a rectangle/blob.

## turf facts (verified)
- `turf.isobands(grid, breaks, {zProperty:"value"})` REQUIRES a full uniform rectangular point grid (it
  throws "Matrix of points is not uniform" on a ragged set). So no-data is handled by a sentinel, not omission.
- With null→sentinel `-9999` and breaks `[-10000, ...realBreaks]`, isobands returns `realBreaks.length` bands;
  band 0 is `[-10000, realBreaks[0]]` = the no-data band → DROP it; the rest are the field, in break order.
- Band `properties.value` is a range string ("0-11") → colour by index. `isolines` `properties.value` = the
  break number.

---

## File structure

**Create:** `src/contour-geo.ts`, `src/ContourMap.tsx`, `assets/sample-data/contour-bands.json`,
`assets/sample-data/contour-both.json`, `knowledge/references/map/types/contour.md`, `tests/contour-geo.test.ts`.
**Modify:** `src/validate-config.ts`, `src/conformance.ts`, `src/mount.tsx`, `scripts/produce.mjs`,
`scripts/audit-cases.mjs`, `SKILL.md`; **cherry-pick** the diverging `reverseScale`/`midpoint` fix into
`src/choropleth-geo.ts` + `src/cartogram-geo.ts` (Task 1 step).

**Reference:** `src/hex-grid-geo.ts` (BLUES bin reuse), `src/CartogramMap.tsx`/`src/HexGridMap.tsx` (cell
layer/hover/legend/mapStyle/fitBounds), `src/theme/scale.ts` (`BLUES`/`DIVERGING`). The diverging fix to
cherry-pick: `git show 66ed609` on `feat/map-contour` (choropleth-geo `reverseScale`, cartogram-geo threading).

---

## Task 1: `contour-geo.ts` (grid → isobands/isolines, no-data-aware) + diverging fix cherry-pick

**Files:** Create `src/contour-geo.ts`, `tests/contour-geo.test.ts`; Modify `src/choropleth-geo.ts`,
`src/cartogram-geo.ts` (cherry-pick the diverging opt-in).

- [ ] **Step 0: Cherry-pick the diverging fix.** `git show 66ed609 -- skills/map-native/src/choropleth-geo.ts skills/map-native/src/cartogram-geo.ts` (on `feat/map-contour`) and re-apply the OPT-IN `reverseScale` (index inversion in the colour lookup) to `choropleth-geo.ts` and the `midpoint`/`reverseScale` threading in `cartogram-geo.ts`. Defaults unset → byte-identical to current. Run `bun test` to confirm no regression. (This is the reusable half of the abandoned branch.)

- [ ] **Step 1: Write the failing test** — `tests/contour-geo.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { computeContour } from "../src/contour-geo";

// 6x6 smooth ramp field; a null no-data corner (top-right 2x2).
const V = (r: number, c: number): number | null =>
  (r < 2 && c > 3) ? null : (r + c); // ramp 0..10, nulls top-right
const values = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => V(r, c)));
const bounds: [number, number, number, number] = [0, 40, 10, 50];

describe("computeContour (gridded)", () => {
  const layout = computeContour({ field: { values, bounds }, render: "both", bins: 4, valueLabel: "t" });
  it("emits colour-indexed bands + lines from the grid (no-data band dropped)", () => {
    expect(layout.bands.length).toBeGreaterThanOrEqual(1);
    expect(layout.lines.length).toBeGreaterThanOrEqual(1);
    expect(layout.bands.every((b) => b.color.startsWith("#"))).toBe(true);
    expect(layout.bands.map((b) => b.binIdx)).toEqual(layout.bands.map((_, i) => i));
    // no band should carry the sentinel range
    expect(layout.bands.some((b) => b.min < -1000)).toBe(false);
  });
  it("footprint excludes the no-data cells (bands do not cover the null corner)", () => {
    // The null corner is around lon>6.6, lat>48.3; assert no band polygon contains that point.
    const { booleanPointInPolygon, point } = require("@turf/turf");
    const inNull = point([9, 49.5]);
    expect(layout.bands.some((b) => booleanPointInPolygon(inNull, b.feature as any))).toBe(false);
  });
  it("is deterministic", () => {
    const again = computeContour({ field: { values, bounds }, render: "both", bins: 4, valueLabel: "t" });
    expect(JSON.stringify(again.bands)).toBe(JSON.stringify(layout.bands));
  });
  it("gates render mode", () => {
    expect(computeContour({ field: { values, bounds }, render: "bands", valueLabel: "t" }).lines.length).toBe(0);
    expect(computeContour({ field: { values, bounds }, render: "lines", valueLabel: "t" }).bands.length).toBe(0);
  });
  it("diverging anchors on midpoint and reverseScale flips colour", () => {
    const a = computeContour({ field: { values, bounds }, render: "bands", scaleType: "diverging", midpoint: 5, valueLabel: "t" });
    const b = computeContour({ field: { values, bounds }, render: "bands", scaleType: "diverging", midpoint: 5, reverseScale: true, valueLabel: "t" });
    expect(a.bands[0].color).not.toBe(b.bands[0].color);
  });
  it("throws when the grid is all null", () => {
    const allNull = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => null));
    expect(() => computeContour({ field: { values: allNull, bounds }, valueLabel: "t" })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails.** `cd skills/map-native && bun test tests/contour-geo.test.ts`

- [ ] **Step 3: Write the implementation** — `src/contour-geo.ts`. Core algorithm (verified against turf):
  - Validate `values` is a non-empty rectangular matrix; gather non-null values → `real`. Throw if `real` empty.
  - `rows = values.length`, `cols = values[0].length`; `[w,s,e,n] = bounds`. Cell centre for `(r,c)`:
    `lon = w + (e-w) * c/(cols-1)`, `lat = n - (n-s) * r/(rows-1)` (row 0 = north). Guard cols/rows === 1.
  - Build a FULL point FeatureCollection over ALL cells; null cells get `value = SENTINEL` (`-1e6`).
  - Compute `realBreaks` (explicit `data.breaks`, or auto: sequential = equal-interval over [min,max] of
    `real`; diverging = symmetric around `data.midpoint ?? (min+max)/2`, `bins` splits — mirror choropleth).
  - `bandBreaks = [SENTINEL - 1, ...realBreaks]`. `turf.isobands(grid, bandBreaks, {zProperty:"value"})` →
    features; DROP feature index 0 (the `[SENTINEL-1, realBreaks[0]]` no-data band); the remaining are the
    field bands in break order → map to `{feature, color: colorForIdx(i, realBreaks.length-1, reverseScale),
    binIdx:i, min:realBreaks[i], max:realBreaks[i+1]}` (render includes bands).
  - Lines (render includes lines): `turf.isolines(grid, realBreaks, {zProperty:"value"})` → each
    `{feature, value:Number(props.value), color}`. (Isolines only at realBreaks, so no sentinel line.)
  - `colorForIdx(i, count, reverse)`: `let k = count<=1?0:Math.round(i/(count-1)*(ramp.length-1)); if(reverse) k = ramp.length-1-k; return ramp[k];` where `ramp = scaleType==="diverging" ? DIVERGING : BLUES`.
  - `bounds` = the input `field.bounds`. Return `{bands, lines, breaks: realBreaks, render, bounds, valueLabel, scaleType}`.
  - Pure; no Date/random; no IDW; no hull clip.

- [ ] **Step 4: Run tests → pass.** `cd skills/map-native && bun test tests/contour-geo.test.ts`. If the
  no-data footprint test fails (a band still covers the null corner), the sentinel band-drop left a boundary
  band — verify the SENTINEL is far below `realBreaks[0]` and only feature 0 is dropped; if turf emits the
  no-data region across more than one band, drop all bands whose `max <= realBreaks[0]`.

- [ ] **Step 5: Full suite.** `cd skills/map-native && bun test` (baseline + new contour + unchanged others).

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/contour-geo.ts skills/map-native/tests/contour-geo.test.ts skills/map-native/src/choropleth-geo.ts skills/map-native/src/cartogram-geo.ts
git commit -m "feat(map-native): contour core v2 — gridded field → isobands/isolines (no IDW), no-data footprint + diverging reverseScale/midpoint"
```

---

## Task 2: `validateContourConfig` + `checkContourConformance`

**Files:** Modify `src/validate-config.ts`, `src/conformance.ts`; add cases to the validation/conformance test files.

Mirror the hex-grid/cartogram validators EXACTLY (return shapes). Deltas:
- **validate:** `type==="contour"`; `field.values` a non-empty RECTANGULAR matrix of `number|null` (reject
  ragged rows / empty / all-null); `field.bounds` a 4-number `[w,s,e,n]` with `w<e && s<n`; `render` ∈
  {bands,lines,both} if present; `scaleType` ∈ {sequential,diverging} if present; `bins` 3–7 if present;
  explicit `breaks` monotonically increasing if present; `midpoint` a number if present; `reverseScale` a
  boolean if present; a title.
- **conformance:** compute the layout; assert break legend (breaks.length ≥ 2), value label, bounds
  non-empty, geometry (bands ≥ 1 for bands/both, lines ≥ 1 for lines/both), valid mapStyle, global L0.

- [ ] Steps: failing tests (reject ragged matrix, all-null, bad bounds, bad render/scaleType, non-monotonic
  breaks, missing title; conformance pass bands + both, fail missing valueLabel / bad mapStyle) → fail →
  implement append-only → pass → full suite → commit `feat(map-native): contour v2 config validation + conformance guard`.

---

## Task 3: `ContourMap.tsx` (static + interactive) + wiring + samples + render-verify

**Files:** Create `src/ContourMap.tsx`, `assets/sample-data/contour-bands.json`, `contour-both.json`;
Modify `src/mount.tsx`, `scripts/produce.mjs`.

- [ ] **Step 1: Write `ContourMap.tsx`** — port `HexGridMap.tsx`. `computeContour(config)` once; bands `fill`
  layer id `contour-bands` (`fill-color:["get","__color"]`, opacity 0.75) tagged `{__color,__min,__max}`;
  lines `line` layer id `contour-lines` tagged `{__value,__color}`, bands under lines; render-mode gated;
  break legend + valueLabel; hover → value band / iso-value; `resolveMapStyle`; **basemap kept** (no neutral
  bg, no layer-hiding); `fitBounds(layout.bounds)`. NUL-free.
- [ ] **Step 2: Author two samples** — a GRIDDED field each. `contour-bands.json`: `field.values` a
  ~15×20 matrix over a real region (e.g. a temperature/pollution field), `null` outside the region's
  footprint (e.g. over sea) so the map follows the data; `render:"bands"`, sequential, full furniture,
  `mapStyle:"dataviz-light"`. `contour-both.json`: a ~15×20 field, `render:"both"`, `scaleType:"diverging"`,
  `midpoint:0`, `reverseScale:true` (warm=high), full furniture, `mapStyle:"dataviz-dark"`. Generate the
  matrices with a smooth function + null mask (a script is fine); the field must be SMOOTH and its non-null
  footprint must approximate the real region. Both must pass validate + conformance.
- [ ] **Step 3: Wire `mount.tsx` + `produce.mjs`** — contour → `ContourMap`; `isContour` static+interactive
  arms, video kinds EMPTY (Slice A); add `contour-bands` AND `contour-lines` to the snap ready-gate OR-list
  additively; type-gate hover branches.
- [ ] **Step 4: Typecheck + full suite** (`bunx tsc --noEmit && bun test`, clean; all pass).
- [ ] **Step 5: Render-verify** — COMMIT first:
```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/atelier/.env; set +a
bun scripts/produce.mjs assets/sample-data/contour-bands.json /tmp/contourg/bands static
bun scripts/produce.mjs assets/sample-data/contour-both.json /tmp/contourg/both static
```
CONFIRM (the implementer inspects, THEN the controller personally re-verifies): the field is SMOOTH (NO
bullseye diamonds), its footprint follows the non-null region (NOT a rectangle/blob), band colour ascends
monotonically with value, the diverging sample reads warm=high / neutral at 0, legend + basemap correct.
If bullseyes appear or the footprint is a box/blob, STOP and report — the gridded approach should eliminate both.
- [ ] **Step 6: Commit** `feat(map-native): ContourMap v2 static+interactive (gridded isobands/isolines, data-footprint) + wiring`.

---

## Task 4: KB type doc + roadmap + audit case

**Files:** Create `knowledge/references/map/types/contour.md`; Modify `SKILL.md`, `scripts/audit-cases.mjs`.

- [ ] **Step 1:** Write the KB doc (mirror `types/hex-grid.md`): gridded field input (no IDW), the three
  render modes, when to use vs hex-grid (discrete point cloud) / choropleth (regions), encoding (break
  scale + diverging reverseScale/midpoint), the no-data footprint (zone = non-null cells, corresponds to the
  data), basemap-always-kept, hover, anti-patterns (don't feed a sparse scatter — this type needs a grid),
  credits, a Slice-A scope note (static+interactive shipped; video + interactive scrolly = Slice B, needs a
  future `ScrollyContourMap`). Implementation pointer: `contour-geo.ts` + `ContourMap.tsx` + `checkContourConformance`.
- [ ] **Step 2:** SKILL.md roadmap Contour row → S ✓ I ✓ V ◻; note "v2 gridded input (isobands/isolines, no IDW)".
- [ ] **Step 3:** Add a contour audit case (bands + both) additively; run audit → clean.
- [ ] **Step 4:** Full suite pass.
- [ ] **Step 5:** Commit `docs(map-native): contour v2 KB type doc + roadmap (S✓ I✓ V◻) + audit case`.

---

## Self-Review

**Spec coverage (Slice A):** gridded `computeContour` (isobands/isolines, no-data footprint, no IDW, diverging
reverseScale/midpoint) → Task 1 (+ the shared diverging cherry-pick); validation + conformance → Task 2;
`ContourMap` + samples + wiring + render-verify → Task 3; KB + roadmap + audit → Task 4. Basemap-always-kept
+ data-footprint + smooth-no-bullseye stated. Render quality is an explicit merge gate.

**Placeholder scan:** Task 1 carries the verified turf algorithm (full grid + sentinel no-data band drop +
colour-by-index) with complete tests. Tasks 2-4 port named siblings with enumerated deltas + exact commands.

**Type consistency:** `computeContour(config)`, `ContourLayout {bands,lines,breaks,render,bounds,valueLabel,
scaleType}`, `ContourBand {feature,color,binIdx,min,max}`, `ContourLine {feature,value,color}`, layer ids
`contour-bands`/`contour-lines` consistent across tasks. `colorForIdx` reverseScale matches the cherry-picked
choropleth logic. `field.values`/`bounds` shape consistent between config, validation, and the core.
