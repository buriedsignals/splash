# Native Group A — bullet + slope end-to-end — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `slope` and `bullet` reachable end-to-end (article → suggester → mapper → conformant produce → render), finishing Group A (17 → 19 native types).

**Architecture:** The proven "check-exists-but-unwired" recipe (per Batch 3): extract each component's module-private palette to `core/tokens.ts` (so the produce-time guard paints the SAME colours the component renders), wire a produce-conformance guard case reusing the existing check, add a mapper, a family entry, flip off `deferred`, advertise in `suggest-chart/SKILL.md`, verify the KB ref exists, render-verify E2E. A machine-checked completeness invariant enforces reachable ⟹ guarded ∧ mapper ∧ family ∧ KB.

**Tech Stack:** Bun, TypeScript, React/D3 (chart-native), bun:test.

## Global Constraints

- Runtime **Bun** (`bun`, `bunx` — never npm/node except Remotion). Tests `bun:test`.
- Code/comments/identifiers/commits/branches in **English**. Zero `any` / `@ts-ignore`. No Claude/Anthropic mention.
- `bun run check` (repo root) MUST be green at the end of every task.
- Work on branch `feat/native-group-a-bullet-slope` (already created). Merge `--no-ff` at the end.
- Guards reproduce the component's EXACT palette via a shared `tokens.ts` array (single source).
- Both components are ALREADY a11y-fixed — do NOT touch their label fills; this is couture only.
- **Render-verify every type at the PNG yourself** (Read the produced image) via the real `produce-from-spec.mjs`.
- KB refs EXIST at repo-root `knowledge/references/chart/types/{slope,bullet}.md` — VERIFY, do NOT author.

**Grounding (verified file:line):**
- `checkSlopeConformance(input{title,source,leftPeriod?,rightPeriod?,accentColor,lineColors[]}, textColors)` — `conformance.ts:568`. No compute-layout.
- `checkBulletConformance(input{title,source,measureColors[],rows:{target?}[]}, textColors)` — `conformance.ts:352`. No compute-layout.
- `SlopeConfig = {title, source{name,url}, unit, labelField, leftField, rightField, leftPeriod, rightPeriod, highlightLabel?, rows}` — `SlopeChart.tsx`.
- `BulletConfig = {title, source{name,url}, unit, rows:{label,unit,value,target,max,bands:number[]}[]}` — `BulletChart.tsx`.
- Slope palette consts: `CONTEXT = COLORS.muted` (`SlopeChart.tsx:51`), `ACCENT = OKABE_ITO.vermillion` (`:52`).
- Bullet palette consts: `HIT = OKABE_ITO.blue` (`BulletChart.tsx:50`), `MISS = OKABE_ITO.vermillion` (`:51`).
- Bullet bands semantics: `bullet-geometry.ts:88` computes `edges = [0, ...bands, max]`; `bands: []` → one `[0,max]` zone (neutral track). `[max]` would be a degenerate zero-width zone — use `[]`.
- `native-types.ts`: `slope` entry line 47, `bullet` entry line 54 (both `deferred: A_PENDING(...)`).
- `NATIVE_FAMILY_TYPES` keys today: `change-over-time`, `correlation`, `part-to-whole`, `magnitude`, `distribution`, `ranking`, `deviation` (`skills/suggest-chart/eval/native-family-types.ts`).
- Mapper table: `MAPPERS` in `spec-to-config.ts` (mirror `dumbbell`/`pie`); `src(spec.source)` builds `{name,url}`.

---

## File Structure

Per type, the same 5 recipe files + palette:
- `skills/chart-native/src/core/tokens.ts` — add the palette array.
- `skills/chart-native/src/{SlopeChart,BulletChart}.tsx` — read the palette from tokens (no other change).
- `skills/chart-native/src/core/produce-conformance.ts` — guard case + `PRODUCE_GUARDED_TYPES`.
- `skills/chart-native/src/spec-to-config.ts` — mapper in `MAPPERS`.
- `skills/chart-native/src/native-types.ts` — flip off `deferred`.
- `skills/suggest-chart/eval/native-family-types.ts` — family entry.
- `skills/suggest-chart/SKILL.md` — advertise (key list + shape note).

---

## Task 1: Productionize slope end-to-end

**Files:**
- Modify: `src/core/tokens.ts`, `src/SlopeChart.tsx`, `src/core/produce-conformance.ts`, `src/spec-to-config.ts`, `src/native-types.ts`, `skills/suggest-chart/eval/native-family-types.ts`, `skills/suggest-chart/SKILL.md`
- Verify: `knowledge/references/chart/types/slope.md` (exists — do NOT author)

**Interfaces:**
- Produces: `SLOPE_LINE_COLORS: readonly [string, string]` = `[COLORS.muted, OKABE_ITO.vermillion]` (context, accent); `slope` reachable from a `NativeSpec`.

- [ ] **Step 1: Extract the palette to tokens.ts** (next to `DIVERGING_SIGN_COLORS` etc.):

```ts
// Slope: neutral context line (muted) + the one editorial accent (vermillion).
// The guard (checkSlopeConformance) validates THESE, so component + guard never drift.
export const SLOPE_LINE_COLORS = [COLORS.muted, OKABE_ITO.vermillion] as const;
```

- [ ] **Step 2: Point the component at it** — `SlopeChart.tsx:51-52`:

```tsx
import { COLORS, FONT, TYPE, OKABE_ITO, SLOPE_LINE_COLORS } from "./core/tokens";
// ...
const CONTEXT = SLOPE_LINE_COLORS[0]; // neutral context line (slope.md rule 4)
const ACCENT = SLOPE_LINE_COLORS[1]; // the one editorial line
```
(Keep `OKABE_ITO` in the import only if still referenced elsewhere in the file; otherwise drop it to avoid an unused-import tsc error.)

- [ ] **Step 3: Add the guard case** — `produce-conformance.ts`. Add imports:

```ts
import { checkSlopeConformance } from "./conformance";
import { SLOPE_LINE_COLORS } from "./tokens";
import type { SlopeConfig } from "../SlopeChart";
```
Add `"slope"` to `PRODUCE_GUARDED_TYPES`. Add the case (no compute-layout — position encoding):
```ts
    case "slope": {
      const cfg = config as unknown as SlopeConfig;
      return {
        checked: true,
        violations: checkSlopeConformance(
          {
            title: cfg.title,
            source: cfg.source,
            leftPeriod: cfg.leftPeriod,
            rightPeriod: cfg.rightPeriod,
            accentColor: SLOPE_LINE_COLORS[1],
            lineColors: [...SLOPE_LINE_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 4: Add the mapper** to `MAPPERS` in `spec-to-config.ts` (mirror `dumbbell`):

```ts
  slope(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    const leftField = numericColumns[0];
    const rightField = numericColumns[numericColumns.length - 1];
    return {
      type: "slope",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        labelField: labelCol,
        leftField,
        rightField,
        leftPeriod: leftField, // the two column headers are the period captions
        rightPeriod: rightField,
        ...(spec.highlight ? { highlightLabel: spec.highlight } : {}),
        rows,
      },
    };
  },
```

- [ ] **Step 5: Flip off `deferred`** — `native-types.ts:47`:

```ts
  { id: "slope", family: "A", shape: "wide" },
```

- [ ] **Step 6: Add the family entry** — `native-family-types.ts`, append `slope` to `change-over-time`:

```ts
  "change-over-time": ["line", "stacked-area", "slope"],
```

- [ ] **Step 7: Advertise in the suggester** — `suggest-chart/SKILL.md`: add `slope` to the nativeType key list(s) and add a CSV-shape note near the other per-type notes:

```md
`slope` expects **category + exactly TWO time-point columns** (e.g. `2019`,`2024`); the two column headers
become the period captions. Route it for a two-point change/comparison per category — NOT for 3+ points
(use `line`). `highlight` names the one line that bucks the trend.
```

- [ ] **Step 8: Verify the KB ref exists** (do not author):

Run: `ls knowledge/references/chart/types/slope.md`
Expected: the file exists.

- [ ] **Step 9: Gate + completeness green**

Run: `bun run check`
Expected: PASS — `completeness.test.ts` (reachable ⟹ guarded ∧ mapper ∧ KB) and `native-family-types.test.ts` (every family id is a non-deferred native type) both accept `slope`.

- [ ] **Step 10: Render-verify E2E** — produce a slope static from a spec/CSV with `category, <period1>, <period2>` (2 numeric columns) via the real produce path (`scripts/produce-from-spec.mjs`) and write the PNG to `/private/tmp/claude-501/-Users-rmdms-Sites-Professional-atelier/09e77fc1-8fab-4f66-b1ca-26e67d7d2f11/scratchpad/slope-e2e.png`. Confirm: two period captions, sloping lines, one accent line (if highlight given), end-labels in ink, title un-clipped, source present.

- [ ] **Step 11: Commit**

```bash
git add skills/chart-native/src/core/tokens.ts skills/chart-native/src/SlopeChart.tsx skills/chart-native/src/core/produce-conformance.ts skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/SKILL.md
git commit -m "feat(chart-native): productionize slope end-to-end (two-period mapper + guard + family + SKILL)"
```

---

## Task 2: Productionize bullet end-to-end

**Files:** same recipe set, for bullet. Verify `knowledge/references/chart/types/bullet.md` (exists).

**Interfaces:**
- Consumes: `checkBulletConformance(input{title,source,measureColors[],rows:{target?}[]}, textColors)` (`conformance.ts:352`); `BulletConfig` (`BulletChart.tsx`).
- Produces: `BULLET_MEASURE_COLORS: readonly [string, string]` = `[OKABE_ITO.blue, OKABE_ITO.vermillion]` (hit, miss); `bullet` reachable from a `NativeSpec`.

- [ ] **Step 1: Extract the palette to tokens.ts**:

```ts
// Bullet: measure coloured by whether it HIT (blue) or MISSED (vermillion) its target.
export const BULLET_MEASURE_COLORS = [OKABE_ITO.blue, OKABE_ITO.vermillion] as const;
```

- [ ] **Step 2: Point the component at it** — `BulletChart.tsx:50-51`:

```tsx
import { COLORS, FONT, TYPE, OKABE_ITO, BULLET_MEASURE_COLORS } from "./core/tokens";
// ...
const HIT = BULLET_MEASURE_COLORS[0]; // met the target
const MISS = BULLET_MEASURE_COLORS[1]; // missed the target
```
(Drop `OKABE_ITO` from the import only if no longer referenced in the file.)

- [ ] **Step 3: Add the guard case** — `produce-conformance.ts`. Add imports:

```ts
import { checkBulletConformance } from "./conformance";
import { BULLET_MEASURE_COLORS } from "./tokens";
import type { BulletConfig } from "../BulletChart";
```
Add `"bullet"` to `PRODUCE_GUARDED_TYPES`. Add the case (no compute-layout — per-row `[0,max]` by construction):
```ts
    case "bullet": {
      const cfg = config as unknown as BulletConfig;
      return {
        checked: true,
        violations: checkBulletConformance(
          {
            title: cfg.title,
            source: cfg.source,
            measureColors: [...BULLET_MEASURE_COLORS],
            rows: cfg.rows.map((r) => ({ target: r.target })),
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 4: Add the mapper** to `MAPPERS`. Synthesize `max` (headroom) and a single neutral band (`bands: []`):

```ts
  bullet(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    // target = a column literally named "target", else the last numeric column
    const targetCol =
      columns.find((c) => c.toLowerCase() === "target") ??
      numericColumns[numericColumns.length - 1];
    // value = the other numeric column (the measure)
    const valueCol =
      numericColumns.find((c) => c !== targetCol) ?? numericColumns[0];
    const bulletRows = rows.map((r) => {
      const value = Number(r[valueCol]);
      const target = Number(r[targetCol]);
      // per-row scale with ~15% headroom so the target marker never hugs the edge
      const max = Math.ceil(Math.max(value, target) * 1.15);
      return {
        label: String(r[labelCol]),
        unit: spec.unit,
        value,
        target,
        max,
        bands: [] as number[], // single neutral track; qualitative multi-band deferred
      };
    });
    return {
      type: "bullet",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        rows: bulletRows,
      },
    };
  },
```

- [ ] **Step 5: Flip off `deferred`** — `native-types.ts:54`:

```ts
  { id: "bullet", family: "A", shape: "single" },
```

- [ ] **Step 6: Add the family entry** — `native-family-types.ts`, append `bullet` to `magnitude`:

```ts
  magnitude: ["bar", "grouped", "radial-bar", "dumbbell", "bullet"],
```

- [ ] **Step 7: Advertise in the suggester** — `suggest-chart/SKILL.md`: add `bullet` to the key list(s) + a shape note:

```md
`bullet` expects **category + a measure value + a `target`** (a column named `target`, or the last numeric
column). Route it ONLY when there's a target to measure against (a KPI vs its goal). The measure is coloured
by hit (blue) / miss (vermillion); by default it sits on a single neutral track — qualitative range bands
require explicit threshold columns (deferred), never invent them.
```

- [ ] **Step 8: Verify the KB ref exists**:

Run: `ls knowledge/references/chart/types/bullet.md`
Expected: the file exists.

- [ ] **Step 9: Gate + completeness green**

Run: `bun run check`
Expected: PASS — completeness + native-family-types accept `bullet`.

- [ ] **Step 10: Render-verify E2E** — produce a bullet static from a spec/CSV `category, value, target` (positive KPI values) via `scripts/produce-from-spec.mjs`; write the PNG to `/private/tmp/claude-501/-Users-rmdms-Sites-Professional-atelier/09e77fc1-8fab-4f66-b1ca-26e67d7d2f11/scratchpad/bullet-e2e.png`. Confirm: each row shows the measure bar vs a target tick on a single neutral grey track, measure coloured blue (met) / vermillion (missed), value labels in ink with margin (target not clipped at the edge), title un-clipped, source present.

- [ ] **Step 11: Commit**

```bash
git add skills/chart-native/src/core/tokens.ts skills/chart-native/src/BulletChart.tsx skills/chart-native/src/core/produce-conformance.ts skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/SKILL.md
git commit -m "feat(chart-native): productionize bullet end-to-end (measure/target mapper, neutral track, guard + family + SKILL)"
```

---

## Definition of done

- slope + bullet reachable end-to-end (palette→tokens + guard + mapper + family + flip + SKILL + KB verified), each render-verified E2E at the PNG by the controller.
- `bun run check` green after each task; completeness + family invariants accept both types.
- bullet: `bands: []` neutral track (no invented qualitative thresholds); `max = ceil(max(value,target)×1.15)`; multi-band deferred + noted in SKILL.md.
- Per-task review + whole-branch opus review before merge `--no-ff`; record in CLAUDE.md.
- Zero `any`/`@ts-ignore`, zero vendor mention, Bun runtime.

## Backlog (out of scope)

- Bullet multi-band (explicit qualitative threshold columns → segmented backdrop).
- Bullet mapper assumes positive value/target (KPI); `bullet-geometry` throws on `max ≤ 0` — degenerate all-zero rows would fail produce (fail-safe). Add an explicit guard if it bites.
- Remaining Family A couture: bump/pyramid/diverging-stacked/fan/treemap.
- Satellites: map-native conformance + contrast-harness parity; WaterfallChart long rotated category labels (framing); export-time hash; MIT release; split CLAUDE.md.
