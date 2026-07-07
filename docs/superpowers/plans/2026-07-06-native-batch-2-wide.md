# Native Batch 2 — wide "new guard" types (stacked, stacked-area) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Productionize two wide multi-series chart types (`stacked` bar, `stacked-area`) end-to-end. Unlike Native Batch 1, these need a NEW produce-time conformance guard wired (grounded in each component's real series palette) — plus, for `stacked-area`, a real a11y fix: its right-edge direct labels are painted in the series colour (fails WCAG) and must move to WCAG-safe ink.

**Architecture:** Subsequent batch of the merged native-engine program. The recipe now includes guard-wiring: extract the component's module-private series palette into `core/tokens.ts` (so the guard paints the SAME colours the component renders — the load-bearing correctness point), add a `runProduceConformance` case mirroring the existing `grouped` case (resolve palette → `compute*Layout` for `valueDomain` → call the type's `checkXConformance(seriesColors, textColors)`), then the usual mapper + family entry + flip + SKILL.md + render-verify.

**Tech Stack:** TypeScript, Bun, bun:test, React + D3.

## Global Constraints

- Runtime **Bun**; tests **bun:test**. English only. Zero new `any`/`@ts-ignore`. No vendor (Claude/Anthropic) attribution.
- `bun run check` (root) green at the END of every task.
- Canonical `id` = render key (`stacked`, `stacked-area` — already correct in `NATIVE_TYPES`/`REMOTION_PREFIX`).
- **The guard must reproduce the component's EXACT painted palette.** Each palette is module-private and DIFFERS from grouped's `[blue,orange,green]` — do NOT reuse `GROUPED_SERIES_COLORS`. Extract each into `tokens.ts` and import it in BOTH the component (replacing the local literal, behaviour unchanged) and the guard.
- **Update `suggest-chart/SKILL.md`** for each newly-mapped type (the Batch-1 whole-branch-review lesson: a type wired in code but absent from SKILL.md is not article-reachable — the suggester never emits it).
- Commit render-verify `static.png` (explicitly `git add` it).
- TDD; branch `feat/native-batch-2-wide`; do not merge to `main` within this plan.

## Reference

- Extract-palette precedent: `GROUPED_SERIES_COLORS`/`PIE_SLICE_COLORS`/`BEESWARM_CATEGORY_COLORS` in `skills/chart-native/src/core/tokens.ts`.
- Guard-case precedent: the `grouped` case in `skills/chart-native/src/core/produce-conformance.ts` (resolve `seriesColors` via `seriesFields.map((_,i)=>PALETTE[i%len])`, `compute*Layout` for `valueDomain`, call `checkGroupedBarConformance(input, {text:[ink,muted],bg})`) + `GROUPED_DIMS`.
- Mapper precedent: the `grouped` mapper in `spec-to-config.ts` (wide: `catField=columns[0]`, `seriesFields = columns.slice(1).filter(c=>numericColumns.includes(c))`).
- a11y precedent: the vermillion fix (labels render in `COLORS.ink`; the mark carries the hue) — design rule "le label porte la valeur, le mark porte la teinte".

---

## Task 1: Productionize `stacked` (stacked-bar) — clean grouped-like wide

**Files:**
- Modify: `skills/chart-native/src/core/tokens.ts` (add `STACKED_SERIES_COLORS`)
- Modify: `skills/chart-native/src/StackedBarChart.tsx` (import the palette, replace local `SERIES_COLORS`)
- Modify: `skills/chart-native/src/core/produce-conformance.ts` (add `stacked` guard case + `STACKED_DIMS` + `PRODUCE_GUARDED_TYPES`)
- Modify: `skills/chart-native/src/spec-to-config.ts` (add `stacked` mapper)
- Modify: `skills/chart-native/src/native-types.ts` (flip `stacked` off `deferred`)
- Modify: `skills/suggest-chart/eval/native-family-types.ts` (add `stacked` to part-to-whole)
- Modify: `skills/suggest-chart/SKILL.md` (advertise `stacked`)
- Test: Create `tests/spec-to-config-stacked.test.ts` + `tests/produce-conformance-stacked.test.ts`
- Verify: produce + render-verify

**Grounded facts (scout):** `StackedConfig = {title, source:{name,url}, unit, catField, seriesFields:string[], rows}`. Palette `SERIES_COLORS = [OKABE_ITO.black, OKABE_ITO.orange, OKABE_ITO.skyblue, OKABE_ITO.green, OKABE_ITO.purple]` (module-private at `StackedBarChart.tsx:48-54`). Guard: `checkStackedBarConformance(input:{title,source,valueDomain,seriesCount,seriesColors}, textColors:{text,bg})` (`conformance.ts:448`); `computeStackedLayout(data, dims)` → `valueDomain` (`stacked-bar-geometry.ts:52`). ALL text is ink/muted (segments/legend are rects) → textColors `{text:[ink,muted], bg}`. KB `stacked-bar.md` exists. Shape `wide`.

- [ ] **Step 1: Write the failing guard test**

```ts
// skills/chart-native/tests/produce-conformance-stacked.test.ts
import { describe, it, expect } from "bun:test";
import { runProduceConformance, PRODUCE_GUARDED_TYPES } from "../src/core/produce-conformance";

const cfg = (seriesFields: string[], rows: Record<string, string | number>[]) => ({
  title: "Renewables now supply the biggest slice of the grid",
  source: { name: "Ember 2025", url: "https://ember.org/x" },
  unit: "TWh", catField: "year", seriesFields, rows,
});

describe("stacked produce-time conformance", () => {
  it("is in the guarded set", () => { expect(PRODUCE_GUARDED_TYPES).toContain("stacked"); });
  it("passes a default ≤5-series Okabe-Ito stack (baseline 0)", () => {
    const r = runProduceConformance("stacked", cfg(["hydro", "wind", "solar"], [
      { year: 2020, hydro: 120, wind: 60, solar: 20 }, { year: 2024, hydro: 130, wind: 110, solar: 90 },
    ]));
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it("flags more than 5 series", () => {
    const r = runProduceConformance("stacked", cfg(["a","b","c","d","e","f"], [
      { year: 2020, a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
    ]));
    expect(r.violations.join(" ")).toMatch(/series/);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`stacked` not guarded). `cd skills/chart-native && bun test tests/produce-conformance-stacked.test.ts`

- [ ] **Step 3: Extract `STACKED_SERIES_COLORS` into tokens.ts**

Add after the other palettes in `core/tokens.ts`:
```ts
// Stacked bar series palette (StackedBarChart.tsx), extracted so the produce
// conformance guard derives the SAME colours. ≤5 series (stacked-bar.md).
export const STACKED_SERIES_COLORS = [
  OKABE_ITO.black,
  OKABE_ITO.orange,
  OKABE_ITO.skyblue,
  OKABE_ITO.green,
  OKABE_ITO.purple,
] as const;
```
In `StackedBarChart.tsx`: import `STACKED_SERIES_COLORS` from `./core/tokens` and replace the local `const SERIES_COLORS = [...]` with `const SERIES_COLORS = STACKED_SERIES_COLORS;` (keeps the usages unchanged).

- [ ] **Step 4: Wire the guard**

In `produce-conformance.ts`: import `checkStackedBarConformance` from `./conformance`, `STACKED_SERIES_COLORS` from `./tokens`, `computeStackedLayout` from `../stacked-bar-geometry`, `StackedConfig` type from `../StackedBarChart`. Add `"stacked"` to `PRODUCE_GUARDED_TYPES`. Add a dims const near `GROUPED_DIMS`:
```ts
const STACKED_DIMS = { width: 840, height: 460, padding: { top: 64, right: 16, bottom: 120, left: 52 } };
```
Add the case:
```ts
    case "stacked": {
      const cfg = config as unknown as StackedConfig;
      const seriesColors = cfg.seriesFields.map((_, i) => STACKED_SERIES_COLORS[i % STACKED_SERIES_COLORS.length]);
      const layout = computeStackedLayout({ catField: cfg.catField, seriesFields: cfg.seriesFields, rows: cfg.rows }, STACKED_DIMS);
      return {
        checked: true,
        violations: checkStackedBarConformance(
          { title: cfg.title, source: cfg.source, valueDomain: layout.valueDomain, seriesCount: cfg.seriesFields.length, seriesColors },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 5: Run the guard test + completeness** — `cd skills/chart-native && bun test tests/produce-conformance-stacked.test.ts tests/completeness.test.ts` → PASS (stacked guarded but not yet in MAPPERS → HARD holds; still deferred → FULL skips).

- [ ] **Step 6: Write the failing mapper test**

```ts
// skills/chart-native/tests/spec-to-config-stacked.test.ts
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
const base = { title: "Renewables now supply the biggest slice of the grid", source: { name: "Ember 2025", url: "https://ember.org/x" }, unit: "TWh" };
describe("specToNativeConfig — stacked (wide)", () => {
  it("maps col0 to catField and every following numeric column to seriesFields (stack order)", () => {
    const spec: NativeSpec = { ...base, nativeType: "stacked", data: "year,hydro,wind,solar\n2020,120,60,20\n2024,130,110,90" };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("stacked");
    expect(config.catField).toBe("year");
    expect(config.seriesFields).toEqual(["hydro", "wind", "solar"]);
    expect((config.rows as unknown[]).length).toBe(2);
  });
});
```

- [ ] **Step 7: Add the stacked mapper** (in `spec-to-config.ts` MAPPERS — byte-identical to grouped, type `"stacked"`):
```ts
  stacked(parsed, spec) {
    const catCol = parsed.columns[0];
    const seriesFields = parsed.columns.slice(1).filter((c) => parsed.numericColumns.includes(c));
    return { type: "stacked", config: { title: spec.title, source: src(spec.source), unit: spec.unit, catField: catCol, seriesFields, rows: parsed.rows } };
  },
```

- [ ] **Step 8: Flip + family + SKILL.md**

- `native-types.ts`: remove `deferred` from the `stacked` entry.
- `native-family-types.ts`: `"part-to-whole": ["pie", "stacked"]`.
- `SKILL.md`: add `stacked` to the mapped-native-families list + the `nativeType` keys enumeration, and a shape note: "`stacked` expects a **wide CSV** (category/time first column + 2–5 numeric series columns that stack bottom→top); a composition/part-to-whole story."

- [ ] **Step 9: Run mapper + both invariant halves** — `cd skills/chart-native && bun test tests/spec-to-config-stacked.test.ts tests/completeness.test.ts` PASS; `cd skills/suggest-chart/eval && bun test tests/native-family-types.test.ts` PASS.

- [ ] **Step 10: Render-verify** — write `output-proof/stacked/spec-native.json` (year × 3 energy series, ≥4 rows). Run `bun skills/chart-native/scripts/produce-from-spec.mjs <ABS spec> <ABS output-proof/stacked> static` (absolute paths). Confirm `conformance: OK`. Read `static.png`: stacked segments sum per category, baseline 0, legend in ink labelling each series, Okabe-Ito palette (black/orange/skyblue…), title unclipped. Note in `output-proof/stacked/NOTES-native.md`.

- [ ] **Step 11: Gate + commit** — `bun run check` 14/14. `git add` the tokens/component/produce-conformance/spec-to-config/native-types/native-family-types/SKILL.md + both tests + output-proof/stacked/{spec-native.json,NOTES-native.md,static.png}.
```bash
git commit -m "feat(chart-native): productionize stacked-bar end-to-end (wide mapper + seriesColors guard)"
```

---

## Task 2: Productionize `stacked-area` — wide + a11y fix (series-coloured labels → ink)

**Files:** like Task 1, plus the a11y component fix.
- Modify: `core/tokens.ts` (`STACKED_AREA_COLORS`), `StackedAreaChart.tsx` (import palette + **fix labels to ink**), `core/produce-conformance.ts` (`stacked-area` guard case), `spec-to-config.ts` (mapper), `native-types.ts` (flip), `native-family-types.ts` (change-over-time), `SKILL.md`.
- Test: Create `tests/spec-to-config-stacked-area.test.ts` + `tests/produce-conformance-stacked-area.test.ts`.
- Verify: produce + render-verify (confirm the ink labels read well).

**Grounded facts (scout):** `StackedAreaConfig = {title, source, unit, xField, seriesFields:string[], rows}` (NOTE `xField`, not `catField`). Palette `AREA_COLORS = [OKABE_ITO.skyblue, OKABE_ITO.orange, OKABE_ITO.blue, OKABE_ITO.green, OKABE_ITO.purple]` (module-private, `StackedAreaChart.tsx:45-51`). Guard: `checkStackedAreaConformance(input:{title,source,valueDomain,seriesCount,seriesColors}, textColors)` (`conformance.ts:487`); `computeStackedAreaLayout(data, dims)` → `valueDomain` (`stacked-area-geometry.ts:47`). KB `stacked-area.md` exists. Shape `wide`. **`xField` must be a numeric-parseable time key** (year) — the geometry `Number(r[xField])` throws on NaN.

**★ The a11y fix (`StackedAreaChart.tsx:299-310`):** the right-edge direct band labels are painted `fill={AREA_COLORS[b.seriesIndex % AREA_COLORS.length]}` — the SERIES colour, as TEXT, no halo. Skyblue/orange/green on white fail WCAG 4.5:1 (~1.9–2.5:1). Per the design rule "the label carries the value, the mark carries the hue" (the vermillion precedent), change that `fill` to `COLORS.ink`. The band is still identified by its area colour + the label's position at the band's right edge. This makes the guard's `textColors:[ink,muted]` honest.

- [ ] **Step 1: Write the failing guard test** (`tests/produce-conformance-stacked-area.test.ts`, mirror Task 1's stacked test with `xField:"year"`, default 3-series passes / >5 flagged; assert `PRODUCE_GUARDED_TYPES` contains `"stacked-area"`).

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Extract `STACKED_AREA_COLORS` into tokens.ts** (`[skyblue, orange, blue, green, purple]` — NOTE skyblue-first, DIFFERENT from grouped/stacked). Import it in `StackedAreaChart.tsx`, replace the local `AREA_COLORS` literal.

- [ ] **Step 4: The a11y component fix.** In `StackedAreaChart.tsx:299-310`, change the label `fill={AREA_COLORS[b.seriesIndex % AREA_COLORS.length]}` to `fill={COLORS.ink}` (import `COLORS` if not already). Confirm `COLORS` is imported. (This is the only behavioural change to the component beyond the palette-const swap.)

- [ ] **Step 5: Wire the guard** (mirror Task 1: import `checkStackedAreaConformance`, `STACKED_AREA_COLORS`, `computeStackedAreaLayout`, `StackedAreaConfig`; add `STACKED_AREA_DIMS`; add `"stacked-area"` to `PRODUCE_GUARDED_TYPES`; add the case resolving `seriesColors` from `STACKED_AREA_COLORS`, `computeStackedAreaLayout({xField, seriesFields, rows}, dims)` for `valueDomain`, call `checkStackedAreaConformance(input, {text:[COLORS.ink, COLORS.muted], bg: COLORS.bg})`).

- [ ] **Step 6: Run guard test + completeness** → PASS.

- [ ] **Step 7: Write the failing mapper test** (`tests/spec-to-config-stacked-area.test.ts`: `year,gas,coal,renewables` wide CSV → `xField:"year"`, `seriesFields:["gas","coal","renewables"]`, type `"stacked-area"`).

- [ ] **Step 8: Add the stacked-area mapper** (in MAPPERS — note `xField` not `catField`):
```ts
  "stacked-area"(parsed, spec) {
    const catCol = parsed.columns[0];
    const seriesFields = parsed.columns.slice(1).filter((c) => parsed.numericColumns.includes(c));
    return { type: "stacked-area", config: { title: spec.title, source: src(spec.source), unit: spec.unit, xField: catCol, seriesFields, rows: parsed.rows } };
  },
```

- [ ] **Step 9: Flip + family + SKILL.md** — remove `deferred` from `stacked-area` in `native-types.ts`; `"change-over-time": ["line", "stacked-area"]`; SKILL.md: add `stacked-area` to the families + keys + a note: "`stacked-area` expects a **wide CSV** with a **numeric time key** first column (e.g. `year`) + 2–5 numeric series columns; a composition-over-time story."

- [ ] **Step 10: Run mapper + both invariant halves + the component's existing tests** — `cd skills/chart-native && bun test tests/spec-to-config-stacked-area.test.ts tests/completeness.test.ts` PASS; confirm any existing `stacked-area` geometry/reveal tests still pass (the label-colour change doesn't affect geometry); `cd skills/suggest-chart/eval && bun test tests/native-family-types.test.ts` PASS.

- [ ] **Step 11: Render-verify (confirm the ink-label fix reads well)** — write `output-proof/stacked-area/spec-native.json` (year × 3 series, ≥6 rows, numeric years). Produce `static` (absolute paths). Confirm `conformance: OK`. Read `static.png`: bands stack, **right-edge labels are now dark/ink and legible** (not low-contrast series colour), each band still colour-identifiable, baseline 0, title unclipped. Note in `output-proof/stacked-area/NOTES-native.md`, explicitly confirming the label a11y fix.

- [ ] **Step 12: Gate + commit** — `bun run check` 14/14. Commit all changed files + output-proof/stacked-area/{spec-native.json,NOTES-native.md,static.png}.
```bash
git commit -m "feat(chart-native): productionize stacked-area end-to-end (wide mapper + guard + WCAG-safe direct labels)"
```

---

## Self-Review

**Spec coverage:** two wide types productionized with the NEW-guard recipe (palette extraction so the guard paints the real colours + guard case mirroring grouped). `stacked` is clean; `stacked-area` additionally fixes a real WCAG failure (series-coloured direct labels → ink), consistent with the vermillion precedent + the design rule. Both update SKILL.md (the Batch-1 lesson) so the suggester can actually emit them. After this batch, 11 native types are mapped.

**Placeholder scan:** every guard case, mapper, palette, and test is complete code from the grounded scout recipes. Render-verify steps name the command + what to look for (esp. Task 2's ink-label confirmation).

**Type consistency:** each palette is extracted (not reused from grouped — `stacked` is black-first, `stacked-area` is skyblue-first, both DIFFER from grouped's blue-first); each guard resolves `seriesColors` from its OWN palette + `valueDomain` from its OWN `compute*Layout`; `StackedConfig` uses `catField`, `StackedAreaConfig` uses `xField`. Family keys mirror the DW vocabulary (part-to-whole, change-over-time).

**Green-after-each-task:** within each task the guard lands first (guarded-but-unreachable → HARD holds), then the mapper (reachable + guarded), then flip + family + SKILL.md together.

**Risk — stacked-area label fix:** changing the label `fill` to ink is a small, isolated component change; geometry/reveal tests are unaffected (colour only); the render-verify explicitly confirms the labels read well and stay band-associated by position. The guard's `textColors:[ink,muted]` is honest only AFTER this fix — so the fix (Step 4) must land before/with the guard (Step 5).
