# Native Batch 3 — clean single-shape new-guard types (dot-strip, waffle, radial-bar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Productionize three more chart types end-to-end — `dot-strip`, `waffle`, `radial-bar`. All three are the CLEAN kind: simple single-shape mapper + a NEW guard that reuses an existing bespoke check + an Okabe-Ito palette + NO component a11y fix needed (scout-verified: no series/mark colour is painted as WCAG-failing label text on white).

**Architecture:** Subsequent batch of the merged native-engine program, using the proven new-guard recipe (extract the component's palette into `tokens.ts` when it's a module-private array; wire an inline `runProduceConformance` case; add mapper + family + flip + SKILL.md + render-verify). Two of the three (`dot-strip`, `radial-bar`) also need their per-type KB reference authored (currently missing at repo-root `knowledge/references/chart/types/`).

**Tech Stack:** TypeScript, Bun, bun:test, React + D3.

## Global Constraints

- Bun; bun:test. English only. Zero new `any`/`@ts-ignore`. No vendor attribution.
- `bun run check` green at the END of every task.
- Guard must reproduce the component's EXACT painted palette. Extract a module-private palette ARRAY to `tokens.ts`; for a palette that is just an alias of an already-exported `OKABE_ITO` member, reference `OKABE_ITO.<x>` directly (no extraction).
- Update `suggest-chart/SKILL.md` for each newly-mapped type (families list + nativeType keys + a shape note).
- When a type's KB ref is MISSING, author it (sourced, cross-referencing the type's `checkXConformance`) — else the completeness FULL-local KB predicate fails on flip.
- Commit render-verify `static.png` (explicitly `git add`).
- TDD; branch `feat/native-batch-3-single`; do not merge to `main` within this plan.

## Reference
- Palette-extraction precedent: `PIE_SLICE_COLORS`/`WAFFLE`-style in `core/tokens.ts`.
- Guard-case precedent (no-layout bespoke): the `pie` case in `produce-conformance.ts`; (with-layout): the `grouped`/`stacked` cases.
- KB precedent: the 34 existing refs at `knowledge/references/chart/types/` (e.g. `beeswarm.md`, `pie.md`) — mirror their structure (sourced: FT Visual Vocabulary + data-to-viz; cross-ref the `checkXConformance`).

---

## Task 1: Productionize `dot-strip` (single) — reuse check, no palette extraction, author KB

**Grounded facts:** `DotStripConfig = {title, source:{name,url}, unit, categoryField, valueField, summaryLabel?, rows}` (rows = RAW observations, MANY per category). Mark colour `DOT_COLOR = OKABE_ITO.blue` (alias → no extraction). Check `checkDotStripConformance(input:{title,source,dotColor,hasSummaryMarker,categoryCounts:number[]}, textColors)` (`conformance.ts:642`). All text ink/muted → no a11y fix. KB `dot-strip.md` **MISSING**. Family: `distribution`.

**Files:** Modify `produce-conformance.ts`, `spec-to-config.ts`, `native-types.ts`, `native-family-types.ts`, `SKILL.md`; Create `tests/produce-conformance-dot-strip.test.ts`, `tests/spec-to-config-dot-strip.test.ts`, `knowledge/references/chart/types/dot-strip.md`; render-verify.

- [ ] **Step 1: Failing guard test** (`tests/produce-conformance-dot-strip.test.ts`): assert `PRODUCE_GUARDED_TYPES` contains `"dot-strip"`; a config with ≥2 categories each having ≥1 observation → 0 violations; (optional) a category with 0 observations is not constructible from rows, so just assert the pass case + guarded-set membership.

```ts
import { describe, it, expect } from "bun:test";
import { runProduceConformance, PRODUCE_GUARDED_TYPES } from "../src/core/produce-conformance";
const cfg = (rows: Record<string, string | number>[]) => ({
  title: "Wait times vary far more between clinics than within them",
  source: { name: "NHS 2025", url: "https://nhs.uk/x" }, unit: "wait (days)",
  categoryField: "clinic", valueField: "days", rows,
});
describe("dot-strip produce-time conformance", () => {
  it("is in the guarded set", () => { expect(PRODUCE_GUARDED_TYPES).toContain("dot-strip"); });
  it("passes raw-observation data with a mean marker", () => {
    const r = runProduceConformance("dot-strip", cfg([
      { clinic: "A", days: 5 }, { clinic: "A", days: 9 }, { clinic: "B", days: 3 }, { clinic: "B", days: 20 },
    ]));
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Wire the guard** in `produce-conformance.ts`: add `checkDotStripConformance` to the `./conformance` import; add `OKABE_ITO` to the `./tokens` import (currently absent); `import type { DotStripConfig } from "../DotStripChart"`. Add `"dot-strip"` to `PRODUCE_GUARDED_TYPES`. Add the case (no compute-layout; derive `categoryCounts` by grouping rows):
```ts
    case "dot-strip": {
      const cfg = config as unknown as DotStripConfig;
      const counts = new Map<string, number>();
      for (const r of cfg.rows) {
        const c = String(r[cfg.categoryField]);
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      return {
        checked: true,
        violations: checkDotStripConformance(
          { title: cfg.title, source: cfg.source, dotColor: OKABE_ITO.blue, hasSummaryMarker: true, categoryCounts: [...counts.values()] },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 4: Guard test + completeness** → PASS.

- [ ] **Step 5: Failing mapper test** (`tests/spec-to-config-dot-strip.test.ts`): a `clinic,days` CSV with repeated categories → `categoryField:"clinic"`, `valueField:"days"`, rows passed raw (count preserved), type `"dot-strip"`.

- [ ] **Step 6: Add the mapper** (single; rows raw; note `categoryField`/`valueField`):
```ts
  "dot-strip"(parsed, spec) {
    const catCol = parsed.columns[0];
    const valCol = parsed.numericColumns[parsed.numericColumns.length - 1] ?? parsed.columns[parsed.columns.length - 1];
    return { type: "dot-strip", config: { title: spec.title, source: src(spec.source), unit: spec.unit, categoryField: catCol, valueField: valCol, rows: parsed.rows } };
  },
```

- [ ] **Step 7: Author the KB ref** `knowledge/references/chart/types/dot-strip.md` — mirror `beeswarm.md`'s structure: intent (compare the SPREAD of raw observations across a few categories), when to use / not, correctness (raw observations not aggregates, a mean/median summary marker, ≥1 obs per category, single Okabe-Ito hue), motion. Sourced: FT Visual Vocabulary ("Distribution"/dot strip plot) + data-to-viz. Cross-ref `checkDotStripConformance` (`skills/chart-native/src/core/conformance.ts:642`). Real URLs only.

- [ ] **Step 8: Flip + family + SKILL.md** — remove `deferred` from `dot-strip` in `native-types.ts`; `"distribution": ["histogram", "beeswarm", "dot-strip"]`; SKILL.md advertises `dot-strip` + a shape note ("category + one value, with MANY rows per category = raw observations; shows the spread across a few groups").

- [ ] **Step 9: Both invariant halves** → PASS (KB file now exists so FULL-local passes).

- [ ] **Step 10: Render-verify** — `output-proof/dot-strip/spec-native.json` (a few clinics × many raw wait-day observations). Produce `static` (absolute paths). Confirm `conformance: OK`. Read `static.png`: dots per category showing spread, a mean marker per category, single blue hue, category + value axes labelled in ink/muted, title unclipped. Note in `output-proof/dot-strip/NOTES-native.md`.

- [ ] **Step 11: Gate + commit** — `bun run check` 14/14. Commit all + `output-proof/dot-strip/{spec-native.json,NOTES-native.md,static.png}` + the KB ref.
```bash
git commit -m "feat(chart-native): productionize dot-strip end-to-end (single mapper + guard + KB ref)"
```

---

## Task 2: Productionize `waffle` (single, part-to-whole) — extract palette, mapper builds items

**Grounded facts:** `WaffleConfig = {title, source, unit, gridN?, items:{label,value}[]}` (config takes a pre-built `items` array — mapper must build it from rows). Palette `WAFFLE_COLORS` (module-private, ≤6 Okabe-Ito) → extract to `tokens.ts` as `WAFFLE_CATEGORY_COLORS`. Check `checkWaffleConformance(input:{title,source,unit,categoryCount,categoryColors}, textColors)` (`conformance.ts:940`) — requires non-empty `unit`, ≤6 categories, Okabe-Ito. KB `waffle.md` EXISTS. Family: `part-to-whole`.

**Files:** Modify `tokens.ts`, `WaffleChart.tsx`, `produce-conformance.ts`, `spec-to-config.ts`, `native-types.ts`, `native-family-types.ts`, `SKILL.md`; Create `tests/produce-conformance-waffle.test.ts`, `tests/spec-to-config-waffle.test.ts`; render-verify.

- [ ] **Step 1: Failing guard test** (default ≤6 Okabe-Ito passes; a >6-category items array → ">6" violation; assert `PRODUCE_GUARDED_TYPES` contains `"waffle"`).

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Extract `WAFFLE_CATEGORY_COLORS`** into `tokens.ts` (`[OKABE_ITO.blue, orange, green, purple, vermillion, skyblue]` — the 6 in `WaffleChart.tsx:43-50`); import it in `WaffleChart.tsx`, replace the local `WAFFLE_COLORS`.

- [ ] **Step 4: Wire the guard** (mirror the pie case, no layout): import `checkWaffleConformance`, `WAFFLE_CATEGORY_COLORS`, `WaffleConfig`; add `"waffle"` to `PRODUCE_GUARDED_TYPES`. Case:
```ts
    case "waffle": {
      const cfg = config as unknown as WaffleConfig;
      const categoryColors = cfg.items.map((_, i) => WAFFLE_CATEGORY_COLORS[i % WAFFLE_CATEGORY_COLORS.length]);
      return {
        checked: true,
        violations: checkWaffleConformance(
          { title: cfg.title, source: cfg.source, unit: cfg.unit, categoryCount: cfg.items.length, categoryColors },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 5: Guard test + completeness** → PASS.

- [ ] **Step 6: Failing mapper test** (a `source,share` CSV → `config.items = [{label,value},…]`, type `"waffle"`).

- [ ] **Step 7: Add the mapper** (builds `items` from rows):
```ts
  waffle(parsed, spec) {
    const catCol = parsed.columns[0];
    const valCol = parsed.numericColumns[parsed.numericColumns.length - 1] ?? parsed.columns[parsed.columns.length - 1];
    const items = parsed.rows.map((r) => ({ label: String(r[catCol]), value: Number(r[valCol]) }));
    return { type: "waffle", config: { title: spec.title, source: src(spec.source), unit: spec.unit, items } };
  },
```

- [ ] **Step 8: Flip + family + SKILL.md** — remove `deferred` from `waffle`; `"part-to-whole": ["pie", "stacked", "waffle"]`; SKILL.md advertises `waffle` + a shape note ("category + one value = parts of a whole, ≤6 categories — group the tail into 'Other'; `unit` names what one square is").

- [ ] **Step 9: Both invariant halves** → PASS.

- [ ] **Step 10: Render-verify** — `output-proof/waffle/spec-native.json` (≤6 energy sources × share). Produce `static`. Confirm `conformance: OK`. Read `static.png`: a grid of squares split by category (Okabe-Ito ≤6), legend in ink, `unit` subtitle present, title unclipped. Note in NOTES-native.md.

- [ ] **Step 11: Gate + commit** — `bun run check` 14/14. Commit all + `output-proof/waffle/*`.
```bash
git commit -m "feat(chart-native): productionize waffle end-to-end (single mapper builds items + guard)"
```

---

## Task 3: Productionize `radial-bar` (single, cyclical magnitude) — don't sort, author KB

**Grounded facts:** `RadialBarConfig = {title, source, unit, categoryField, valueField, rows}` (note `categoryField`/`valueField`). Marks `BASE_COLOR=OKABE_ITO.blue`, `PEAK_COLOR=OKABE_ITO.orange` (aliases → no extraction; guard uses `dataColor: OKABE_ITO.blue`). Check `checkRadialBarConformance(input:{title,source,dataColor,radialBaseline,tickCount}, textColors)` (`conformance.ts:745`) — requires `radialBaseline === 0`, `tickCount ≥ 1`. `computeRadialBarLayout(data, dims)` → `.ticks`. No text-in-mark-colour → no a11y fix. KB `radial-bar.md` **MISSING**. Family: `magnitude` (cyclical). **Mapper must NOT sort** (angle encodes cyclical category position).

**Files:** Modify `produce-conformance.ts`, `spec-to-config.ts`, `native-types.ts`, `native-family-types.ts`, `SKILL.md`; Create `tests/produce-conformance-radial-bar.test.ts`, `tests/spec-to-config-radial-bar.test.ts`, `knowledge/references/chart/types/radial-bar.md`; render-verify.

- [ ] **Step 1: Failing guard test** (default passes; assert `PRODUCE_GUARDED_TYPES` contains `"radial-bar"`; the guard passes a normal cyclical dataset).

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Wire the guard** — import `checkRadialBarConformance`, `computeRadialBarLayout` from `../radial-bar-geometry`, `OKABE_ITO` (if not already), `type RadialBarConfig`; add `RADIAL_BAR_DIMS` placeholder; add `"radial-bar"` to `PRODUCE_GUARDED_TYPES`. Case:
```ts
    case "radial-bar": {
      const cfg = config as unknown as RadialBarConfig;
      const layout = computeRadialBarLayout({ categoryField: cfg.categoryField, valueField: cfg.valueField, rows: cfg.rows }, RADIAL_BAR_DIMS);
      return {
        checked: true,
        violations: checkRadialBarConformance(
          { title: cfg.title, source: cfg.source, dataColor: OKABE_ITO.blue, radialBaseline: 0, tickCount: layout.ticks.length },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 4: Guard test + completeness** → PASS.

- [ ] **Step 5: Failing mapper test** (an `hour,trips` CSV → `categoryField:"hour"`, `valueField:"trips"`, rows in CSV order (NOT sorted), type `"radial-bar"`).

- [ ] **Step 6: Add the mapper** (single; `categoryField`/`valueField`; NO sort):
```ts
  "radial-bar"(parsed, spec) {
    const catCol = parsed.columns[0];
    const valCol = parsed.numericColumns[parsed.numericColumns.length - 1] ?? parsed.columns[parsed.columns.length - 1];
    return { type: "radial-bar", config: { title: spec.title, source: src(spec.source), unit: spec.unit, categoryField: catCol, valueField: valCol, rows: parsed.rows } };
  },
```

- [ ] **Step 7: Author the KB ref** `knowledge/references/chart/types/radial-bar.md` — mirror an existing ref: intent (magnitude around a CYCLE — hours/months/compass; NOT a substitute for a plain bar for non-cyclical categories), correctness (baseline 0, preserve cyclical order, single Okabe-Ito hue + a peak accent). Sourced (FT Visual Vocabulary, data-to-viz radial/circular barplot caveats — a radial bar distorts area, use only when the cycle matters). Cross-ref `checkRadialBarConformance` (`conformance.ts:745`). Real URLs only.

- [ ] **Step 8: Flip + family + SKILL.md** — remove `deferred` from `radial-bar`; `"magnitude": ["bar", "grouped", "radial-bar"]`; SKILL.md advertises `radial-bar` + a shape note ("category + one value; use ONLY for CYCLICAL categories (hours/months/compass) — keep CSV row order; for non-cyclical magnitude prefer `bar`").

- [ ] **Step 9: Both invariant halves** → PASS.

- [ ] **Step 10: Render-verify** — `output-proof/radial-bar/spec-native.json` (24 hours × trip counts, or 12 months). Produce `static`. Confirm `conformance: OK`. Read `static.png`: radial bars around the circle in category order, baseline 0 at centre, peak(s) accented orange, category rim labels + value ticks legible, title unclipped. Note in NOTES-native.md.

- [ ] **Step 11: Gate + commit** — `bun run check` 14/14. Commit all + `output-proof/radial-bar/*` + the KB ref.
```bash
git commit -m "feat(chart-native): productionize radial-bar end-to-end (cyclical single mapper + guard + KB ref)"
```

---

## Self-Review

**Spec coverage:** three clean single-shape types productionized via the new-guard recipe. `dot-strip` (distribution) + `radial-bar` (cyclical magnitude) additionally author their missing KB ref; `waffle` (part-to-whole) extracts its module-private palette. After this batch, 14 native types are mapped. All scout-verified clean (no series/mark colour painted as WCAG-failing label text on white → no component a11y fix, unlike the deviation/comparison types deferred to a later a11y batch).

**Placeholder scan:** every guard case, mapper, and test is complete code from the grounded scout recipes; KB steps name the mirror ref + the cross-ref target + the sourcing.

**Type consistency:** field names per component (`dot-strip`/`radial-bar` use `categoryField`/`valueField`, NOT `catField`/`valField`; `waffle` builds `items[]`). Guards use each check's exact bespoke signature (`dotColor`/`categoryColors`/`dataColor` + `textColors[ink,muted]`). `dot-strip`/`radial-bar` don't sort (raw observations / cyclical order); `waffle` caps ≤6. Family keys mirror the DW vocabulary.

**Green-after-each-task:** within each task the guard lands first (guarded-but-unreachable → HARD holds), then the mapper (reachable), then flip + family + SKILL.md + (where needed) the KB ref together — so the completeness FULL-local (mapper ∧ guard ∧ KB) is satisfied at flip.

**Systemic finding for a later batch (logged):** the scout found that `diverging`, `dumbbell`, `waterfall`, `bullet`, `treemap` all paint value/data labels in the MARK colour (vermillion/orange < 4.5:1 on white) — the same WCAG class as the stacked-area bug. Each needs a component label→ink fix. That is a separate a11y-focused batch (with the option of a mechanical check enhancement so this class is caught, not just render-verified).
