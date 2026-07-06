# Native Engine End-to-End — Plan 1 (mechanism + grouped-bar witness) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn chart-native's article→config seam from a hard-coded 4-case switch into a table-driven registry whose coverage is a machine-checked invariant, and prove the full production contract end-to-end on one new multi-series type (`grouped-bar`).

**Architecture:** A single exported `NATIVE_TYPES` list becomes the source of truth (killing the un-exported PREFIX + registry duplication). `spec-to-config` becomes a `MAPPERS` table gated by a fail-loud `validateShape`. A completeness test enforces the invariant *reachable ⟹ conformance-guarded*, and *not-deferred, not-legacy ⟹ full 5-deliverable contract*. `grouped-bar` is wired through all five deliverables (mapper, produce-time conformance guard, suggester vocab + eval validation, KB ref, render-verify).

**Tech Stack:** TypeScript, Bun, bun:test, React + D3 (existing chart-native engine), Remotion (video, untouched here).

## Global Constraints

- Runtime is **Bun** — never `npm`/`node`. Tests use **bun:test** (`describe`/`it`/`expect`).
- Code, comments, identifiers, commit messages, branch names: **English only**.
- **Zero `any`, zero `@ts-ignore`.** The two existing `// eslint-disable-next-line @typescript-eslint/no-explicit-any` lines on the registries may be preserved verbatim when moved; introduce no new ones.
- **No vendor attribution** in any artifact (no `Co-Authored-By`, no "Generated with", no Claude/Anthropic mention in commits/docs/code).
- `bun run check` (root) MUST be green at the END of every task (tsc on `skills/{atelier,chart-native,map-native,scrolly}` + `bun test` on the 10 suites).
- The canonical type **id is the render-path key** (`grouped`, `stacked`, `diverging`, `pyramid` — NOT the display names). The mapper returns `type` = this id; `nativeType` in a `NativeSpec` is this id.
- TDD: write the failing test first, watch it fail, implement the minimum, watch it pass, commit.
- Branch already exists: `feat/native-engine-couture`. Commit there; do not merge to `main` within this plan.

---

## File Structure

**New files:**
- `skills/chart-native/src/native-types.ts` — canonical `NATIVE_TYPES` list + `NativeTypeEntry` + `NativeShape` + `REMOTION_PREFIX` + `LEGACY_KB_FAMILY_BACKFILL`. Pure data, no component imports.
- `skills/chart-native/src/csv.ts` — `ParsedCsv` + `parseCsv` (moved out of spec-to-config so shape-validation can share them).
- `skills/chart-native/src/shape-validation.ts` — `validateShape(id, parsed)` + `ShapeMismatchError`.
- `skills/chart-native/src/component-registry.tsx` — `AUDIT_REGISTRY` + `INTERACTIVE_REGISTRY` (moved out of mount.tsx, side-effect-free).
- `skills/chart-native/knowledge/references/chart/types/grouped.md` — the first chart type KB ref.
- `skills/suggest-chart/eval/native-family-types.ts` — `NATIVE_FAMILY_TYPES` (intent → native ids), mirror of `family-types.ts`.
- Tests: `tests/native-types.test.ts`, `tests/shape-validation.test.ts`, `tests/spec-to-config-backcompat.test.ts`, `tests/completeness.test.ts`, `tests/produce-conformance-pie.test.ts`, `tests/produce-conformance-grouped.test.ts` (all under `skills/chart-native/tests/`); an addition to `skills/suggest-chart/eval/tests/score.test.ts`.

**Modified files:**
- `skills/chart-native/scripts/produce.mjs` — import `REMOTION_PREFIX` (delete local literal).
- `skills/chart-native/src/mount.tsx` — import the two registries (delete local defs).
- `skills/chart-native/src/spec-to-config.ts` — table-driven `MAPPERS`; parse via `csv.ts`; call `validateShape`; add `grouped`.
- `skills/chart-native/src/core/tokens.ts` — add `PIE_SLICE_COLORS`, `GROUPED_SERIES_COLORS`.
- `skills/chart-native/src/PieChart.tsx`, `GroupedBarChart.tsx` — import the extracted palettes.
- `skills/chart-native/src/core/produce-conformance.ts` — add `PRODUCE_GUARDED_TYPES`, `pie` + `grouped` cases.
- `skills/suggest-chart/eval/score.ts` — native branch validating `nativeType`.
- `skills/suggest-chart/SKILL.md` — add `grouped` to the mapped native families + the wide-CSV note.

---

## Task 1: Canonical `NATIVE_TYPES` list + single-sourced Remotion prefix

**Files:**
- Create: `skills/chart-native/src/native-types.ts`
- Modify: `skills/chart-native/scripts/produce.mjs:30-49`
- Test: `skills/chart-native/tests/native-types.test.ts`

**Interfaces:**
- Produces: `NativeShape` (`"single" | "wide" | "paired" | "distribution" | "structural"`); `NativeTypeEntry` (`{ id: string; family: "A" | "B"; shape: NativeShape; deferred?: string }`); `NATIVE_TYPES: readonly NativeTypeEntry[]` (41 entries, `id` = render key); `REMOTION_PREFIX: Record<string, string>`; `LEGACY_KB_FAMILY_BACKFILL: readonly string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/chart-native/tests/native-types.test.ts
import { describe, it, expect } from "bun:test";
import { NATIVE_TYPES, REMOTION_PREFIX } from "../src/native-types";

describe("NATIVE_TYPES canonical list", () => {
  it("has unique ids", () => {
    const ids = NATIVE_TYPES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("ids exactly match the Remotion prefix keys (no render-path drift)", () => {
    const ids = [...NATIVE_TYPES.map((e) => e.id)].sort();
    const prefixKeys = Object.keys(REMOTION_PREFIX).sort();
    expect(ids).toEqual(prefixKeys);
  });
  it("every entry is well-formed", () => {
    for (const e of NATIVE_TYPES) {
      expect(["A", "B"]).toContain(e.family);
      expect(["single", "wide", "paired", "distribution", "structural"]).toContain(e.shape);
      if (e.deferred !== undefined) expect(e.deferred.trim().length).toBeGreaterThan(0);
    }
  });
  it("keeps the four legacy reachable types non-deferred", () => {
    for (const id of ["line", "bar", "scatter", "pie"]) {
      const e = NATIVE_TYPES.find((x) => x.id === id);
      expect(e?.deferred).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/chart-native && bun test tests/native-types.test.ts`
Expected: FAIL — `Cannot find module "../src/native-types"`.

- [ ] **Step 3: Create `native-types.ts`**

```ts
// skills/chart-native/src/native-types.ts
// The canonical native-chart-type registry: the SINGLE source of truth for which
// types the engine ships, replacing the un-exported literals previously duplicated
// in scripts/produce.mjs (PREFIX) and src/mount.tsx (the two component registries).
// `id` is the RENDER KEY (what produce.mjs looks up, what a NativeSpec.nativeType
// carries) — not a display name. `shape` documents the CSV shape a mapper expects;
// `family` = A (article-realistic, tidy-CSV) vs B (structural/specialist, deferred).
// `deferred` (a reason) marks a type NOT expected to be reachable+guarded yet; its
// absence means the type must satisfy the full contract (see tests/completeness.test.ts).

export type NativeShape = "single" | "wide" | "paired" | "distribution" | "structural";

export interface NativeTypeEntry {
  id: string;
  family: "A" | "B";
  shape: NativeShape;
  /** reason a type is not yet expected mapped; absent ⇔ must meet the full contract */
  deferred?: string;
}

// The four types reachable today whose KB ref + native-family entry are a tracked
// backfill (Plan 2), NOT a silent gap. They ARE reachable and conformance-guarded
// (the hard invariant still applies to them); they are only exempt from the
// KB + family predicates of the full contract. This list must SHRINK, never grow.
export const LEGACY_KB_FAMILY_BACKFILL: readonly string[] = ["line", "bar", "scatter", "pie"];

const A_PENDING = (shape: NativeShape) => `family-A: reachable+guarded pending its shape batch (${shape})`;

export const NATIVE_TYPES: readonly NativeTypeEntry[] = [
  // --- reachable today (Plan 1 keeps/loads them into the MAPPERS table) ---
  { id: "line", family: "A", shape: "single" },
  { id: "bar", family: "A", shape: "single" },
  { id: "scatter", family: "A", shape: "paired" },
  { id: "pie", family: "A", shape: "single" },
  // --- the Plan 1 witness (flipped to mapped in Task 10) ---
  { id: "grouped", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  // --- Family A, deferred until their shape batch ---
  { id: "stacked", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "slope", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "dumbbell", family: "A", shape: "paired", deferred: A_PENDING("paired") },
  { id: "stacked-area", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "histogram", family: "A", shape: "distribution", deferred: A_PENDING("distribution") },
  { id: "diverging", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "waterfall", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "lollipop", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "pyramid", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "bullet", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "connected-scatter", family: "A", shape: "paired", deferred: A_PENDING("paired") },
  { id: "boxplot", family: "A", shape: "distribution", deferred: A_PENDING("distribution") },
  { id: "bump", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "beeswarm", family: "A", shape: "distribution", deferred: A_PENDING("distribution") },
  { id: "treemap", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "diverging-stacked", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "waffle", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "fan", family: "A", shape: "wide", deferred: A_PENDING("wide") },
  { id: "dot-strip", family: "A", shape: "single", deferred: A_PENDING("single") },
  { id: "violin", family: "A", shape: "distribution", deferred: A_PENDING("distribution") },
  { id: "radial-bar", family: "A", shape: "single", deferred: A_PENDING("single") },
  // --- Family B, deferred by design (structural/specialist data an article rarely yields) ---
  { id: "heatmap", family: "B", shape: "structural", deferred: "family-B: needs an x×y×value matrix" },
  { id: "marimekko", family: "B", shape: "structural", deferred: "family-B: 2D width×height encoding" },
  { id: "radar", family: "B", shape: "wide", deferred: "family-B: rare in a small newsroom" },
  { id: "sankey", family: "B", shape: "structural", deferred: "family-B: needs nodes+links" },
  { id: "streamgraph", family: "B", shape: "wide", deferred: "family-B: rare in a small newsroom" },
  { id: "gantt", family: "B", shape: "structural", deferred: "family-B: needs start/end intervals" },
  { id: "calendar", family: "B", shape: "structural", deferred: "family-B: needs a dense date grid" },
  { id: "lorenz", family: "B", shape: "distribution", deferred: "family-B: specialist inequality curve" },
  { id: "candlestick", family: "B", shape: "structural", deferred: "family-B: needs OHLC" },
  { id: "chord", family: "B", shape: "structural", deferred: "family-B: needs a flow matrix" },
  { id: "sunburst", family: "B", shape: "structural", deferred: "family-B: needs a hierarchy" },
  { id: "parallel", family: "B", shape: "wide", deferred: "family-B: rare in a small newsroom" },
  { id: "arc", family: "B", shape: "structural", deferred: "family-B: needs a hierarchy/edges" },
  { id: "combo", family: "B", shape: "wide", deferred: "family-B: per-series encoding choice" },
  { id: "pictogram", family: "B", shape: "single", deferred: "family-B: stylistic variant of waffle" },
];

// type → Remotion composition prefix (XReveal/XSquare/XPortrait). Several keys don't
// PascalCase cleanly (pyramid → PopulationPyramid, grouped → GroupedBar). Consumed by
// scripts/produce.mjs; asserted equal to NATIVE_TYPES ids by tests/native-types.test.ts.
export const REMOTION_PREFIX: Record<string, string> = {
  line: "Line", bar: "Bar", scatter: "Scatter", pie: "Pie",
  stacked: "StackedBar", slope: "Slope", grouped: "GroupedBar",
  dumbbell: "Dumbbell", "stacked-area": "StackedArea", heatmap: "Heatmap",
  histogram: "Histogram", diverging: "DivergingBar", waterfall: "Waterfall",
  lollipop: "Lollipop", pyramid: "Pyramid", bullet: "Bullet",
  "connected-scatter": "ConnectedScatter", marimekko: "Marimekko", radar: "Radar",
  boxplot: "Boxplot", bump: "Bump", beeswarm: "Beeswarm", treemap: "Treemap",
  "diverging-stacked": "DivergingStacked", sankey: "Sankey",
  streamgraph: "Streamgraph", gantt: "Gantt", fan: "Fan", calendar: "Calendar",
  waffle: "Waffle", lorenz: "Lorenz", candlestick: "Candlestick", chord: "Chord",
  sunburst: "Sunburst", parallel: "Parallel", "dot-strip": "DotStrip",
  violin: "Violin", arc: "Arc", "radial-bar": "RadialBar", combo: "Combo",
  pictogram: "Pictogram",
};
```

- [ ] **Step 4: Point `produce.mjs` at the single source**

In `skills/chart-native/scripts/produce.mjs`, delete the local `const PREFIX = {…}` (lines 28-44) and its comment, add an import near the other imports (after line 14):

```js
import { REMOTION_PREFIX } from "../src/native-types.ts";
```

Then replace the lookup at line 45 (`const X = PREFIX[type];`) with:

```js
const X = REMOTION_PREFIX[type];
if (!X) {
  console.error(`produce: unknown type "${type}". Known: ${Object.keys(REMOTION_PREFIX).join(", ")}`);
  process.exit(1);
}
```

(Delete the old lines 45-49 that referenced `PREFIX`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd skills/chart-native && bun test tests/native-types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full gate**

Run: `bun run check` (from repo root)
Expected: all checks PASS (produce.mjs still resolves prefixes; nothing else changed).

- [ ] **Step 7: Commit**

```bash
git add skills/chart-native/src/native-types.ts skills/chart-native/tests/native-types.test.ts skills/chart-native/scripts/produce.mjs
git commit -m "feat(chart-native): canonical NATIVE_TYPES list + single-sourced Remotion prefix"
```

---

## Task 2: Extract component registries → close the last drift gap

**Files:**
- Create: `skills/chart-native/src/component-registry.tsx`
- Modify: `skills/chart-native/src/mount.tsx:156-201` (AUDIT_REGISTRY) + the INTERACTIVE_REGISTRY block that follows through its closing `}`
- Test: `skills/chart-native/tests/native-types.test.ts` (extend)

**Interfaces:**
- Produces: `AUDIT_REGISTRY: Record<string, ComponentType>` and `INTERACTIVE_REGISTRY: Record<string, ComponentType>` exported from `component-registry.tsx`.
- Consumes: `NATIVE_TYPES` from Task 1.

- [ ] **Step 1: Write the failing test (extend native-types.test.ts)**

Append to `skills/chart-native/tests/native-types.test.ts`:

```ts
import { AUDIT_REGISTRY, INTERACTIVE_REGISTRY } from "../src/component-registry";

describe("component registries match the canonical list", () => {
  const ids = [...NATIVE_TYPES.map((e) => e.id)].sort();
  it("AUDIT_REGISTRY keys === NATIVE_TYPES ids", () => {
    expect(Object.keys(AUDIT_REGISTRY).sort()).toEqual(ids);
  });
  it("INTERACTIVE_REGISTRY keys === NATIVE_TYPES ids", () => {
    expect(Object.keys(INTERACTIVE_REGISTRY).sort()).toEqual(ids);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/chart-native && bun test tests/native-types.test.ts`
Expected: FAIL — `Cannot find module "../src/component-registry"`.

- [ ] **Step 3: Create `component-registry.tsx`**

Move the two registry objects out of `mount.tsx` verbatim into a new side-effect-free module. Copy the component `import` statements they need from the top of `mount.tsx` (all the `LineChart`, `InteractiveLineChart`, … imports), then:

```tsx
// skills/chart-native/src/component-registry.tsx
// The type-id → component maps for BOTH the audit/static path and the interactive
// path, extracted from mount.tsx so they carry NO DOM side effects and can be
// asserted equal to NATIVE_TYPES (tests/native-types.test.ts). mount.tsx imports
// these; it keeps the createRoot() mounting. Keys are the render ids of NATIVE_TYPES.
import { /* all AUDIT + Interactive component imports moved from mount.tsx */ } from "…";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AUDIT_REGISTRY: Record<string, any> = {
  /* the exact object literal from mount.tsx lines 159-201 */
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const INTERACTIVE_REGISTRY: Record<string, any> = {
  /* the exact object literal that follows in mount.tsx */
};
```

(Preserve the `eslint-disable` comments exactly; introduce no new `any`.)

- [ ] **Step 4: Update `mount.tsx` to import them**

In `mount.tsx`, delete the two `const AUDIT_REGISTRY = {…}` / `const INTERACTIVE_REGISTRY = {…}` literals and the now-unused component imports they consumed, and add:

```tsx
import { AUDIT_REGISTRY, INTERACTIVE_REGISTRY } from "./component-registry";
```

Keep every other line of `mount.tsx` (the `createRoot`, the injected-config logic) unchanged.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd skills/chart-native && bun test tests/native-types.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Run the full gate**

Run: `bun run check`
Expected: PASS (tsc resolves the moved imports; mount.tsx behavior unchanged).

- [ ] **Step 7: Commit**

```bash
git add skills/chart-native/src/component-registry.tsx skills/chart-native/src/mount.tsx skills/chart-native/tests/native-types.test.ts
git commit -m "refactor(chart-native): extract component registries; assert no render-path drift"
```

---

## Task 3: `csv.ts` + `validateShape` fail-loud helper

**Files:**
- Create: `skills/chart-native/src/csv.ts`
- Create: `skills/chart-native/src/shape-validation.ts`
- Modify: `skills/chart-native/src/spec-to-config.ts` (import `ParsedCsv`/`parseCsv` from `csv.ts` instead of the local copy — done fully in Task 4; for Task 3 only ADD `csv.ts`, do not yet touch spec-to-config)
- Test: `skills/chart-native/tests/shape-validation.test.ts`

**Interfaces:**
- Produces: `ParsedCsv` (`{ columns: string[]; rows: Record<string, string | number>[]; numericColumns: string[] }`) + `parseCsv(csv: string): ParsedCsv` from `csv.ts`; `ShapeMismatchError extends Error` + `validateShape(id: string, parsed: ParsedCsv): void` from `shape-validation.ts` (throws on mismatch, returns void on ok).
- Consumes: `NATIVE_TYPES` (Task 1) to look up a type's `shape`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/chart-native/tests/shape-validation.test.ts
import { describe, it, expect } from "bun:test";
import { parseCsv } from "../src/csv";
import { validateShape, ShapeMismatchError } from "../src/shape-validation";

const p = (csv: string) => parseCsv(csv);

describe("validateShape", () => {
  it("accepts a single-shape CSV for bar (category + one value)", () => {
    expect(() => validateShape("bar", p("country,share\nBrazil,87.3\nIndia,19.8"))).not.toThrow();
  });
  it("accepts a paired-shape CSV for scatter (two numeric columns)", () => {
    expect(() => validateShape("scatter", p("school,spend,score\nA,5200,72\nB,3100,58"))).not.toThrow();
  });
  it("accepts a wide-shape CSV for grouped (category + ≥2 numeric series)", () => {
    expect(() => validateShape("grouped", p("region,2019,2020\nNorth,4,6\nSouth,3,5"))).not.toThrow();
  });
  it("rejects a wide-shape CSV with only one numeric series", () => {
    expect(() => validateShape("grouped", p("region,2019\nNorth,4\nSouth,3"))).toThrow(ShapeMismatchError);
  });
  it("names the expected shape and what it got", () => {
    try {
      validateShape("grouped", p("region,2019\nNorth,4"));
    } catch (e) {
      expect((e as Error).message).toMatch(/wide/);
      expect((e as Error).message).toMatch(/grouped/);
    }
  });
  it("rejects a paired-shape CSV that has fewer than two numeric columns", () => {
    expect(() => validateShape("scatter", p("city,pop\nX,10"))).toThrow(ShapeMismatchError);
  });
  it("accepts a distribution-shape CSV (at least one numeric column)", () => {
    expect(() => validateShape("beeswarm", p("group,value\nA,1\nA,2\nB,3"))).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/chart-native && bun test tests/shape-validation.test.ts`
Expected: FAIL — modules `../src/csv` / `../src/shape-validation` not found.

- [ ] **Step 3: Create `csv.ts`**

Copy `ParsedCsv` + `parseCsv` verbatim out of `spec-to-config.ts:31-56` into a new module (do NOT delete them from spec-to-config yet — Task 4 does the swap):

```ts
// skills/chart-native/src/csv.ts
// Shared CSV parsing for the native producer: header + rows, with per-column numeric
// detection. Extracted from spec-to-config.ts so shape-validation.ts and the mappers
// share one parser. Pure, framework-free.
export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string | number>[];
  numericColumns: string[];
}

export function parseCsv(csv: string): ParsedCsv {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) throw new Error("csv: needs a header + ≥1 row");
  const columns = lines[0].split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string | number> = {};
    columns.forEach((col, i) => {
      const raw = (cells[i] ?? "").trim();
      const num = Number(raw);
      row[col] = raw !== "" && Number.isFinite(num) ? num : raw;
    });
    return row;
  });
  const numericColumns = columns.filter((c) => rows.every((r) => typeof r[c] === "number"));
  return { columns, rows, numericColumns };
}
```

- [ ] **Step 4: Create `shape-validation.ts`**

```ts
// skills/chart-native/src/shape-validation.ts
// The fail-loud structural gate: before a mapper runs, assert the CSV actually fits
// the type's declared shape (native-types.ts). A mismatch throws a labeled error
// naming expected-vs-got, so a bad CSV can never silently mis-render. These are
// STRUCTURAL floors (can this even be drawn as this type); design maxima (≤3 series,
// ≤5 slices, baseline-0) are enforced later by the produce-time conformance guard.
import { NATIVE_TYPES, type NativeShape } from "./native-types";
import type { ParsedCsv } from "./csv";

export class ShapeMismatchError extends Error {
  constructor(id: string, shape: NativeShape, got: string) {
    super(`shape-validation: "${id}" expects a ${shape} CSV — ${got}`);
    this.name = "ShapeMismatchError";
  }
}

function seriesColumns(parsed: ParsedCsv): string[] {
  // numeric columns that are NOT the first (category/x) column
  const [first] = parsed.columns;
  return parsed.numericColumns.filter((c) => c !== first);
}

export function validateShape(id: string, parsed: ParsedCsv): void {
  const entry = NATIVE_TYPES.find((e) => e.id === id);
  if (!entry) return; // unknown ids are the mapper's concern (UnsupportedNativeType)
  const { shape } = entry;
  const nCols = parsed.columns.length;
  const nNum = parsed.numericColumns.length;

  switch (shape) {
    case "single":
      if (nCols < 2 || nNum < 1)
        throw new ShapeMismatchError(id, shape, `got ${nCols} columns / ${nNum} numeric (need ≥2 columns, ≥1 numeric value)`);
      return;
    case "paired":
      if (nNum < 2)
        throw new ShapeMismatchError(id, shape, `got ${nNum} numeric columns (need ≥2 for the x/y or start/end pair)`);
      return;
    case "wide":
      if (seriesColumns(parsed).length < 2)
        throw new ShapeMismatchError(id, shape, `got ${seriesColumns(parsed).length} numeric series after the category column (need ≥2)`);
      return;
    case "distribution":
      if (nNum < 1)
        throw new ShapeMismatchError(id, shape, `got 0 numeric columns (need ≥1 column of raw values)`);
      return;
    case "structural":
      // structural types are deferred (never in MAPPERS) — validateShape is not called for them
      return;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd skills/chart-native && bun test tests/shape-validation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Run the full gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add skills/chart-native/src/csv.ts skills/chart-native/src/shape-validation.ts skills/chart-native/tests/shape-validation.test.ts
git commit -m "feat(chart-native): shared csv parser + fail-loud validateShape"
```

---

## Task 4: Table-driven `MAPPERS` (migrate the 4) + validateShape wired in

**Files:**
- Modify: `skills/chart-native/src/spec-to-config.ts` (whole file becomes table-driven)
- Test: `skills/chart-native/tests/spec-to-config.test.ts` (must pass UNCHANGED) + Create `skills/chart-native/tests/spec-to-config-backcompat.test.ts`

**Interfaces:**
- Produces: `MAPPERS: Record<string, (parsed: ParsedCsv, spec: NativeSpec) => { type: string; config: Record<string, unknown> }>` exported from `spec-to-config.ts`; `specToNativeConfig` unchanged in signature.
- Consumes: `parseCsv`/`ParsedCsv` (`csv.ts`), `validateShape` (`shape-validation.ts`).

- [ ] **Step 1: Write the failing back-compat test**

```ts
// skills/chart-native/tests/spec-to-config-backcompat.test.ts
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, MAPPERS, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Brazil runs on renewables while most big economies still lag",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  unit: "share of electricity from renewables, 2024 (%)",
};

describe("MAPPERS table", () => {
  it("exposes exactly the four legacy mappers", () => {
    expect(Object.keys(MAPPERS).sort()).toEqual(["bar", "line", "pie", "scatter"]);
  });
  it("bar config is byte-identical to the pre-table output", () => {
    const spec: NativeSpec = { ...base, nativeType: "bar", data: "country,share\nBrazil,87.3\nIndia,19.8\nCanada,64.3", sort: "desc", highlight: "Brazil" };
    expect(specToNativeConfig(spec)).toEqual({
      type: "bar",
      config: {
        title: base.title, source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
        unit: base.unit, catField: "country", valField: "share",
        orientation: "horizontal", sort: "desc", highlightIndex: 0,
        rows: [
          { country: "Brazil", share: 87.3 }, { country: "India", share: 19.8 }, { country: "Canada", share: 64.3 },
        ],
      },
    });
  });
  it("throws a shape error before an unsupported type is even looked up", () => {
    const spec: NativeSpec = { ...base, nativeType: "bar", data: "country\nBrazil" };
    expect(() => specToNativeConfig(spec)).toThrow(/single/);
  });
});
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `cd skills/chart-native && bun test tests/spec-to-config-backcompat.test.ts`
Expected: FAIL — `MAPPERS` is not exported.

- [ ] **Step 3: Refactor `spec-to-config.ts` to the table**

Rewrite `spec-to-config.ts` so it: imports `parseCsv`/`ParsedCsv` from `./csv` (delete the local copies) and `validateShape` from `./shape-validation`; keeps the `NativeSpec` interface, `UnsupportedNativeType`, `looksTemporal`, and `src()` helpers; converts the four `case` bodies verbatim into a `MAPPERS` record whose functions take `(parsed, spec)` and return `{ type, config }`; and makes `specToNativeConfig` do: parse → `if (!MAPPERS[spec.nativeType]) throw new UnsupportedNativeType(spec.nativeType)` → `validateShape(spec.nativeType, parsed)` → `return MAPPERS[spec.nativeType](parsed, spec)`.

```ts
// key structure (bodies are the existing case logic, moved verbatim):
export const MAPPERS: Record<string, (parsed: ParsedCsv, spec: NativeSpec) => { type: string; config: Record<string, unknown> }> = {
  bar(parsed, spec) { /* existing bar case, using parsed.{columns,rows,numericColumns} */ },
  line(parsed, spec) { /* existing line case */ },
  scatter(parsed, spec) { /* existing scatter case */ },
  pie(parsed, spec) { /* existing pie case */ },
};

export function specToNativeConfig(spec: NativeSpec): { type: string; config: Record<string, unknown> } {
  const parsed = parseCsv(spec.data);
  const mapper = MAPPERS[spec.nativeType];
  if (!mapper) throw new UnsupportedNativeType(spec.nativeType);
  validateShape(spec.nativeType, parsed);
  return mapper(parsed, spec);
}
```

Preserve every field each case wrote (catField/valField/orientation/sort/highlightIndex/baseColor for bar; directLabel/xField/yField/xType/baseColor for line; xField/yField/xLabel/yLabel/labelField/baseColor for scatter; labelField/valueField for pie), so the output stays byte-identical.

- [ ] **Step 4: Run the migrated + existing tests**

Run: `cd skills/chart-native && bun test tests/spec-to-config.test.ts tests/spec-to-config-backcompat.test.ts`
Expected: PASS — the existing 12-ish assertions plus the 3 new back-compat assertions. (The existing "unsupported → throws UnsupportedNativeType" test still passes: `sankey` has no `MAPPERS` entry.)

- [ ] **Step 5: Run the full gate**

Run: `bun run check`
Expected: PASS (produce-from-spec.mjs still imports `specToNativeConfig`/`UnsupportedNativeType`, both preserved).

- [ ] **Step 6: Commit**

```bash
git add skills/chart-native/src/spec-to-config.ts skills/chart-native/tests/spec-to-config-backcompat.test.ts
git commit -m "refactor(chart-native): table-driven MAPPERS + shape gate; four legacy types byte-identical"
```

---

## Task 5: Completeness test + wire pie's produce-time guard

**Files:**
- Modify: `skills/chart-native/src/core/tokens.ts` (add `PIE_SLICE_COLORS`)
- Modify: `skills/chart-native/src/PieChart.tsx:44-51` (import the palette)
- Modify: `skills/chart-native/src/core/produce-conformance.ts` (add `PRODUCE_GUARDED_TYPES` + a `pie` case)
- Test: Create `skills/chart-native/tests/completeness.test.ts` + `skills/chart-native/tests/produce-conformance-pie.test.ts`

**Interfaces:**
- Produces: `PRODUCE_GUARDED_TYPES: readonly string[]` from `produce-conformance.ts`; `PIE_SLICE_COLORS` from `tokens.ts`.
- Consumes: `NATIVE_TYPES`, `LEGACY_KB_FAMILY_BACKFILL` (Task 1); `MAPPERS` (Task 4).

> **Invariant ownership (avoids a cross-skill dependency + a missing-module tsc break):** the chart-native completeness test asserts the LOCAL predicates it owns — reachable ⟹ guarded, and non-deferred/non-legacy ⟹ mapper ∧ guard ∧ KB file. The FAMILY predicate (a mapped type is pickable by the suggester) is owned by suggest-chart and asserted there (Task 8), mirroring the existing `family-types.test.ts`. The two halves together enforce the full contract without chart-native importing suggest-chart.

- [ ] **Step 1: Write the failing completeness test**

```ts
// skills/chart-native/tests/completeness.test.ts
import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NATIVE_TYPES, LEGACY_KB_FAMILY_BACKFILL } from "../src/native-types";
import { MAPPERS } from "../src/spec-to-config";
import { PRODUCE_GUARDED_TYPES } from "../src/core/produce-conformance";

const KB_DIR = join(import.meta.dir, "..", "knowledge", "references", "chart", "types");

describe("native engine completeness invariant (chart-native local half)", () => {
  it("HARD: every reachable type is conformance-guarded (no reachable-but-unguarded)", () => {
    for (const id of Object.keys(MAPPERS)) {
      expect(PRODUCE_GUARDED_TYPES).toContain(id);
    }
  });

  it("FULL(local): a non-deferred, non-legacy type has a mapper, a guard, and a KB ref", () => {
    for (const e of NATIVE_TYPES) {
      if (e.deferred || LEGACY_KB_FAMILY_BACKFILL.includes(e.id)) continue;
      expect(Object.keys(MAPPERS)).toContain(e.id);
      expect(PRODUCE_GUARDED_TYPES).toContain(e.id);
      expect(existsSync(join(KB_DIR, `${e.id}.md`))).toBe(true);
    }
  });

  it("legacy backfill list only holds reachable+guarded types and never grows past four", () => {
    expect(LEGACY_KB_FAMILY_BACKFILL.length).toBeLessThanOrEqual(4);
    for (const id of LEGACY_KB_FAMILY_BACKFILL) {
      expect(Object.keys(MAPPERS)).toContain(id);
      expect(PRODUCE_GUARDED_TYPES).toContain(id);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/chart-native && bun test tests/completeness.test.ts`
Expected: FAIL — `PRODUCE_GUARDED_TYPES` not exported; and once it is, the HARD test fails because `pie ∈ MAPPERS` but `pie ∉` the 7 guarded types.

- [ ] **Step 3: Write the pie guard test**

```ts
// skills/chart-native/tests/produce-conformance-pie.test.ts
import { describe, it, expect } from "bun:test";
import { runProduceConformance } from "../src/core/produce-conformance";

const pie = (rows: Record<string, string | number>[]) => ({
  title: "Hydro still supplies most of the country's clean power",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  unit: "share of clean generation", labelField: "source", valueField: "gwh", rows,
});

describe("pie produce-time conformance", () => {
  it("passes the default palette (≤5 Okabe-Ito slices)", () => {
    const r = runProduceConformance("pie", pie([{ source: "Hydro", gwh: 420 }, { source: "Wind", gwh: 180 }, { source: "Solar", gwh: 90 }]));
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it("flags more than five slices", () => {
    const rows = ["A", "B", "C", "D", "E", "F"].map((s, i) => ({ source: s, gwh: 10 + i }));
    const r = runProduceConformance("pie", pie(rows));
    expect(r.checked).toBe(true);
    expect(r.violations.join(" ")).toMatch(/slices \(> 5\)/);
  });
});
```

- [ ] **Step 4: Extract `PIE_SLICE_COLORS` into tokens.ts**

In `skills/chart-native/src/core/tokens.ts`, after `BEESWARM_CATEGORY_COLORS`, add:

```ts
// Pie/donut slice palette (PieChart.tsx), extracted so the produce-time conformance
// resolver derives the SAME slice colours without duplicating the literal (like
// BEESWARM_CATEGORY_COLORS). Marks only — every pie TEXT label is COLORS.ink.
export const PIE_SLICE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.vermillion,
  OKABE_ITO.purple,
] as const;
```

In `PieChart.tsx`, replace the local `const SLICE_COLORS = [...]` (lines 44-51) with an import: change line 19's tokens import to also pull `PIE_SLICE_COLORS`, and add `const SLICE_COLORS = PIE_SLICE_COLORS;` (keeps the 3 in-file usages at lines 200/229/290 unchanged).

- [ ] **Step 5: Add `PRODUCE_GUARDED_TYPES` + the pie case in produce-conformance.ts**

Add imports at the top: `import { checkPieConformance } from "./conformance";`, `import { PIE_SLICE_COLORS, COLORS } from "./tokens";`, and `import type { PieConfig } from "../PieChart";`. Add the exported guard set (superset of the flat-triple types):

```ts
// Every type with a produce-time guard wired (flat-triple resolver types + the
// bespoke-signature types resolved inline below). The completeness test asserts
// MAPPERS ⊆ this set (no reachable type is unguarded).
export const PRODUCE_GUARDED_TYPES: readonly string[] = [
  ...RESOLVABLE_CONFORMANCE_TYPES,
  "pie",
];
```

Change the guard on line 64 from `RESOLVABLE_CONFORMANCE_TYPES` to `PRODUCE_GUARDED_TYPES`. Add a `pie` case to the switch (bespoke `sliceColors`, like beeswarm's inline `categoryColors`):

```ts
    case "pie": {
      const cfg = config as unknown as PieConfig;
      const sliceColors = cfg.rows.map((_, i) => PIE_SLICE_COLORS[i % PIE_SLICE_COLORS.length]);
      return {
        checked: true,
        violations: checkPieConformance(
          { title: cfg.title, source: cfg.source, sliceCount: cfg.rows.length, sliceColors },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 6: Run the tests**

Run: `cd skills/chart-native && bun test tests/produce-conformance-pie.test.ts tests/completeness.test.ts`
Expected: PASS — pie now guarded, HARD invariant satisfied, FULL invariant vacuous (grouped still deferred; the 4 legacy are backfill-exempt).

- [ ] **Step 7: Run the full gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add skills/chart-native/src/core/tokens.ts skills/chart-native/src/PieChart.tsx skills/chart-native/src/core/produce-conformance.ts skills/chart-native/tests/completeness.test.ts skills/chart-native/tests/produce-conformance-pie.test.ts
git commit -m "feat(chart-native): completeness invariant + pie produce-time guard (no reachable-but-unguarded)"
```

---

## Task 6: grouped-bar conformance guard (guard before reachable)

**Files:**
- Modify: `skills/chart-native/src/core/tokens.ts` (add `GROUPED_SERIES_COLORS`)
- Modify: `skills/chart-native/src/GroupedBarChart.tsx:48` (import the palette; fix the stale KB comment)
- Modify: `skills/chart-native/src/core/produce-conformance.ts` (add `grouped` to `PRODUCE_GUARDED_TYPES` + a case)
- Test: Create `skills/chart-native/tests/produce-conformance-grouped.test.ts`

**Interfaces:**
- Produces: `GROUPED_SERIES_COLORS` from `tokens.ts`; `grouped` ∈ `PRODUCE_GUARDED_TYPES`.
- Consumes: `computeGroupedLayout` (`grouped-bar-geometry.ts`), `checkGroupedBarConformance` (`conformance.ts`), `GroupedConfig` (`GroupedBarChart.tsx`).

> Guard-before-mapper ordering: adding `grouped` to the guard set while it is NOT yet in `MAPPERS` keeps `bun run check` green (a guarded-but-unreachable type is allowed — the invariant is MAPPERS ⊆ GUARDED, not equality).

- [ ] **Step 1: Write the failing test**

```ts
// skills/chart-native/tests/produce-conformance-grouped.test.ts
import { describe, it, expect } from "bun:test";
import { runProduceConformance, PRODUCE_GUARDED_TYPES } from "../src/core/produce-conformance";

const grouped = (seriesFields: string[], rows: Record<string, string | number>[]) => ({
  title: "Urban wages pulled ahead of rural pay across every region",
  source: { name: "INSEE 2025", url: "https://insee.fr/x" },
  unit: "median monthly wage (€)", catField: "region", seriesFields, rows,
});

describe("grouped-bar produce-time conformance", () => {
  it("is in the guarded set", () => {
    expect(PRODUCE_GUARDED_TYPES).toContain("grouped");
  });
  it("passes the default 2-series Okabe-Ito palette", () => {
    const r = runProduceConformance("grouped", grouped(["urban", "rural"], [
      { region: "North", urban: 2400, rural: 1900 }, { region: "South", urban: 2200, rural: 1800 },
    ]));
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it("flags more than three series (picket-fence rule)", () => {
    const r = runProduceConformance("grouped", grouped(["a", "b", "c", "d"], [
      { region: "North", a: 1, b: 2, c: 3, d: 4 },
    ]));
    expect(r.violations.join(" ")).toMatch(/series \(> 3\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/chart-native && bun test tests/produce-conformance-grouped.test.ts`
Expected: FAIL — `grouped` not in `PRODUCE_GUARDED_TYPES`, no `grouped` case.

- [ ] **Step 3: Extract `GROUPED_SERIES_COLORS` into tokens.ts**

In `tokens.ts`, after `PIE_SLICE_COLORS`, add:

```ts
// Grouped bar/column series palette (GroupedBarChart.tsx), extracted so the produce
// conformance resolver derives the SAME series colours. ≤3 series (grouped.md).
export const GROUPED_SERIES_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
] as const;
```

In `GroupedBarChart.tsx`: change line 22's tokens import to also pull `GROUPED_SERIES_COLORS`; replace line 48 `const GROUP_COLORS = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];` with `const GROUP_COLORS = GROUPED_SERIES_COLORS;` (the 3 usages stay). While here, fix the stale `grouped-bar.md` references in the file's comments (lines 12-13, 47, 173) to `grouped.md` (the KB file created in Task 9).

- [ ] **Step 4: Add the grouped case + guard entry in produce-conformance.ts**

Add imports: `import { checkGroupedBarConformance } from "./conformance";`, `import { GROUPED_SERIES_COLORS } from "./tokens";`, `import { computeGroupedLayout } from "../grouped-bar-geometry";`, `import type { GroupedConfig } from "../GroupedBarChart";`. Extend the guard set:

```ts
export const PRODUCE_GUARDED_TYPES: readonly string[] = [
  ...RESOLVABLE_CONFORMANCE_TYPES,
  "pie",
  "grouped",
];
```

Add a shared dims constant near the other `*_DIMS` (grouped uses the same domain-from-data property as bar):

```ts
const GROUPED_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 16, bottom: 96, left: 52 },
};
```

Add the case:

```ts
    case "grouped": {
      const cfg = config as unknown as GroupedConfig;
      const seriesColors = cfg.seriesFields.map((_, i) => GROUPED_SERIES_COLORS[i % GROUPED_SERIES_COLORS.length]);
      const layout = computeGroupedLayout(
        { catField: cfg.catField, seriesFields: cfg.seriesFields, rows: cfg.rows },
        GROUPED_DIMS,
      );
      return {
        checked: true,
        violations: checkGroupedBarConformance(
          { title: cfg.title, source: cfg.source, valueDomain: layout.valueDomain, seriesCount: cfg.seriesFields.length, seriesColors },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 5: Run the tests**

Run: `cd skills/chart-native && bun test tests/produce-conformance-grouped.test.ts tests/completeness.test.ts`
Expected: PASS (grouped guarded; completeness still green — grouped not yet reachable).

- [ ] **Step 6: Run the full gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add skills/chart-native/src/core/tokens.ts skills/chart-native/src/GroupedBarChart.tsx skills/chart-native/src/core/produce-conformance.ts skills/chart-native/tests/produce-conformance-grouped.test.ts
git commit -m "feat(chart-native): grouped-bar produce-time conformance guard"
```

---

## Task 7: grouped-bar mapper (make it reachable)

**Files:**
- Modify: `skills/chart-native/src/spec-to-config.ts` (add the `grouped` mapper)
- Test: Create `skills/chart-native/tests/spec-to-config-grouped.test.ts`

**Interfaces:**
- Produces: `MAPPERS.grouped` returning `{ type: "grouped", config: { title, source, unit, catField, seriesFields, rows } }`.
- Consumes: the wide `validateShape` from Task 3; `GroupedConfig` shape (fields: `title, source{name,url}, unit, catField, seriesFields[], rows`).

- [ ] **Step 1: Write the failing test**

```ts
// skills/chart-native/tests/spec-to-config-grouped.test.ts
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
import { ShapeMismatchError } from "../src/shape-validation";

const base = {
  title: "Urban wages pulled ahead of rural pay across every region",
  source: { name: "INSEE 2025", url: "https://insee.fr/x" },
  unit: "median monthly wage (€)",
};

describe("specToNativeConfig — grouped (wide CSV convention)", () => {
  it("maps every numeric column after the category into seriesFields", () => {
    const spec: NativeSpec = { ...base, nativeType: "grouped", data: "region,urban,rural\nNorth,2400,1900\nSouth,2200,1800" };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("grouped");
    expect(config.catField).toBe("region");
    expect(config.seriesFields).toEqual(["urban", "rural"]);
    expect((config.rows as unknown[]).length).toBe(2);
  });
  it("keeps a numeric first column as the category (not a series)", () => {
    const spec: NativeSpec = { ...base, nativeType: "grouped", data: "year,urban,rural\n2019,2400,1900\n2020,2450,1950" };
    expect(specToNativeConfig(spec).config.seriesFields).toEqual(["urban", "rural"]);
  });
  it("rejects a single-series CSV via the shape gate", () => {
    const spec: NativeSpec = { ...base, nativeType: "grouped", data: "region,urban\nNorth,2400" };
    expect(() => specToNativeConfig(spec)).toThrow(ShapeMismatchError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/chart-native && bun test tests/spec-to-config-grouped.test.ts`
Expected: FAIL — `grouped` throws `UnsupportedNativeType` (no MAPPERS entry).

- [ ] **Step 3: Add the grouped mapper**

In `spec-to-config.ts`, add to `MAPPERS`:

```ts
  grouped(parsed, spec) {
    const catCol = parsed.columns[0];
    // wide convention: every NUMERIC column after the category is a series
    const seriesFields = parsed.columns.slice(1).filter((c) => parsed.numericColumns.includes(c));
    return {
      type: "grouped",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        catField: catCol,
        seriesFields,
        rows: parsed.rows,
      },
    };
  },
```

- [ ] **Step 4: Run the tests**

Run: `cd skills/chart-native && bun test tests/spec-to-config-grouped.test.ts tests/completeness.test.ts`
Expected: PASS — grouped reachable AND already guarded (Task 6) → HARD invariant holds; grouped still `deferred` → FULL skips it.

- [ ] **Step 5: Run the full gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/chart-native/src/spec-to-config.ts skills/chart-native/tests/spec-to-config-grouped.test.ts
git commit -m "feat(chart-native): grouped-bar mapper (wide-CSV convention)"
```

---

## Task 8: Native family table + eval `nativeType` validation (driven by `bar`)

**Files:**
- Create: `skills/suggest-chart/eval/native-family-types.ts`
- Modify: `skills/suggest-chart/eval/score.ts` (native branch)
- Test: `skills/suggest-chart/eval/tests/score.test.ts` (add a native block)

**Interfaces:**
- Produces: `NATIVE_FAMILY_TYPES: Record<string, string[]>` (intent → native ids); a `producer === "chart-native"` branch in `scoreSpec`.
- Consumes: `NATIVE_TYPES` (to validate `nativeType`), imported by id only.

> The score branch rejects a `deferred` type (so ② can never route to an unready native type — the exact silent-degrade we are fixing). It is therefore driven here by `bar` (the only non-deferred native type also in the family table); grouped's native score test lands in Task 10 after grouped flips non-deferred. `NATIVE_FAMILY_TYPES` lists only `bar` here; grouped is added in Task 10 the moment it becomes non-deferred, so the family table never lists a deferred type.

- [ ] **Step 1: Write the failing test (append to score.test.ts)**

```ts
describe("scoreSpec — chart-native producer", () => {
  const nativeBar = {
    producer: "chart-native", nativeType: "bar",
    title: "Brazil runs on renewables while most big economies still lag",
    source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
    unit: "share of electricity from renewables (%)", data: "country,share\nBrazil,87.3\nIndia,19.8",
  };
  it("passes a valid native bar spec for the magnitude family", () => {
    const r = scoreSpec(nativeBar, { family: "magnitude", element: "chart", producer: "chart-native" });
    expect(r.pass).toBe(true);
  });
  it("fails an unknown nativeType", () => {
    const r = scoreSpec({ ...nativeBar, nativeType: "wat" }, { family: "magnitude", element: "chart", producer: "chart-native" });
    expect(r.pass).toBe(false);
    expect(r.notes.join(" ")).toMatch(/nativeType/);
  });
  it("fails a deferred nativeType (② must not route to an unready type)", () => {
    const r = scoreSpec({ ...nativeBar, nativeType: "sankey" }, { family: "magnitude", element: "chart", producer: "chart-native" });
    expect(r.pass).toBe(false);
  });
  it("fails a nativeType outside the intent family", () => {
    const r = scoreSpec(nativeBar, { family: "correlation", element: "chart", producer: "chart-native" });
    expect(r.familyMatch).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/suggest-chart/eval && bun test tests/score.test.ts`
Expected: FAIL — a native bar spec currently hits `validateChartSpec` (DW) and is invalid.

- [ ] **Step 3: Create `native-family-types.ts`**

```ts
// skills/suggest-chart/eval/native-family-types.ts
// Editorial intent family → the chart-native type ids that legitimately serve it.
// The native mirror of family-types.ts (which is DW-only). Every id here MUST be a
// non-deferred NATIVE_TYPES entry — asserted by tests/native-family-types.test.ts
// (created in Task 10). No tiers.
export const NATIVE_FAMILY_TYPES: Record<string, string[]> = {
  magnitude: ["bar"],
};
```

- [ ] **Step 4: Add the native branch to `score.ts`**

Add imports at the top of `score.ts`:

```ts
import { NATIVE_TYPES } from "../../chart-native/src/native-types";
import { NATIVE_FAMILY_TYPES } from "./native-family-types";
```

Immediately BEFORE the existing DW `const v = validateChartSpec(spec);` (current line 95), insert:

```ts
  if (producer === "chart-native") {
    const nativeType = (spec as Record<string, unknown>)?.["nativeType"];
    const known = typeof nativeType === "string" && NATIVE_TYPES.some((e) => e.id === nativeType && !e.deferred);
    if (!known) notes.push(`nativeType ${String(nativeType)} is not a mapped native type`);
    const allowed = NATIVE_FAMILY_TYPES[expect.family] ?? [];
    const familyMatch = typeof nativeType === "string" && allowed.includes(nativeType);
    if (!familyMatch) notes.push(`nativeType ${String(nativeType)} not in native family ${expect.family} [${allowed.join(",")}]`);
    return { validates: known, familyMatch, guardrailsOk: known, pass: known && familyMatch, notes };
  }
```

- [ ] **Step 5: Run the tests**

Run: `cd skills/suggest-chart/eval && bun test tests/score.test.ts`
Expected: PASS (existing map/DW assertions unchanged; the new native block passes — bar is non-deferred and in the family table; sankey is deferred → fails as intended).

- [ ] **Step 6: Run the full gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/eval/score.ts skills/suggest-chart/eval/tests/score.test.ts
git commit -m "feat(suggest-chart): native family table + eval nativeType validation"
```

---

## Task 9: grouped-bar KB reference

**Files:**
- Create: `skills/chart-native/knowledge/references/chart/types/grouped.md`
- Test: covered by `tests/completeness.test.ts` (KB file existence) once grouped flips in Task 10.

**Interfaces:** none (documentation deliverable). The file must be sourced and cross-referenced to the real conformance check.

- [ ] **Step 1: Write the KB reference**

Create `skills/chart-native/knowledge/references/chart/types/grouped.md` with the type's editorial rules, each grounded in a real source and cross-referenced to `checkGroupedBarConformance` (`skills/chart-native/src/core/conformance.ts:526`). Cover: intent = compare within AND across categories; wide-CSV shape; **baseline-0** (position→length, inherited bar rule); **≤3 series** (else picket fence → small multiples); Okabe-Ito CVD-safe series palette; legend replaces direct labels. Sources: FT Visual Vocabulary (Magnitude/"grouped column"), data-to-viz grouped barplot. Real URLs only; no invented links. Mirror the structure of the existing map type ref `skills/map-native/knowledge/references/map/types/proportional-symbol.md` (read it first for house style).

- [ ] **Step 2: Verify the cross-reference is real**

Run: `grep -n "checkGroupedBarConformance" skills/chart-native/src/core/conformance.ts`
Expected: prints the definition line (confirms the cross-ref points at real code).

- [ ] **Step 3: Run the full gate**

Run: `bun run check`
Expected: PASS (adding a markdown file changes nothing executable; completeness still green because grouped is still `deferred`).

- [ ] **Step 4: Commit**

```bash
git add skills/chart-native/knowledge/references/chart/types/grouped.md
git commit -m "docs(chart-native): grouped-bar KB reference (first chart type ref)"
```

---

## Task 10: Activate grouped-bar — flip to `mapped` + enforce the full contract on both sides

This task flips grouped to non-deferred and, IN THE SAME COMMIT, adds everything the flip makes mandatory (the family-table entry, the suggester vocab) plus the two tests that now hold (chart-native FULL enforces grouped; the suggest-chart family-coverage half). Doing them together keeps `bun run check` green: grouped becomes non-deferred exactly when its mapper (Task 7), guard (Task 6), KB (Task 9), and family entry all exist.

**Files:**
- Modify: `skills/chart-native/src/native-types.ts` (remove `grouped`'s `deferred`)
- Modify: `skills/suggest-chart/eval/native-family-types.ts` (add `grouped` to magnitude)
- Modify: `skills/suggest-chart/SKILL.md:141-146` (add grouped + the wide-CSV note)
- Test: Create `skills/suggest-chart/eval/tests/native-family-types.test.ts`; append a grouped case to `skills/suggest-chart/eval/tests/score.test.ts`; `skills/chart-native/tests/completeness.test.ts` now enforces grouped.

- [ ] **Step 1: Add grouped to the native family table**

In `skills/suggest-chart/eval/native-family-types.ts` change `magnitude: ["bar"],` to `magnitude: ["bar", "grouped"],`.

- [ ] **Step 2: Write the family-coverage completeness test (suggest-chart half)**

```ts
// skills/suggest-chart/eval/tests/native-family-types.test.ts
import { describe, it, expect } from "bun:test";
import { NATIVE_TYPES } from "../../../chart-native/src/native-types";
import { NATIVE_FAMILY_TYPES } from "../native-family-types";

const LEGACY = new Set(["line", "bar", "scatter", "pie"]); // KB/family backfill (Plan 2)

describe("NATIVE_FAMILY_TYPES completeness (suggest-chart half)", () => {
  const familyIds = new Set(Object.values(NATIVE_FAMILY_TYPES).flat());
  it("only lists non-deferred native types the producer can actually render", () => {
    for (const id of familyIds) {
      const e = NATIVE_TYPES.find((x) => x.id === id);
      expect(e).toBeDefined();
      expect(e?.deferred).toBeUndefined();
    }
  });
  it("makes every mapped (non-deferred, non-legacy) type pickable by intent", () => {
    for (const e of NATIVE_TYPES) {
      if (e.deferred || LEGACY.has(e.id)) continue;
      expect(familyIds.has(e.id)).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Append a grouped native case to score.test.ts**

Add inside the existing `describe("scoreSpec — chart-native producer", …)` block (or as a sibling `it`):

```ts
  it("passes a valid native grouped spec for the magnitude family (post-flip)", () => {
    const r = scoreSpec(
      { producer: "chart-native", nativeType: "grouped",
        title: "Urban wages pulled ahead of rural pay across every region",
        source: { name: "INSEE 2025", url: "https://insee.fr/x" },
        unit: "median monthly wage (€)", data: "region,urban,rural\nNorth,2400,1900" },
      { family: "magnitude", element: "chart", producer: "chart-native" },
    );
    expect(r.pass).toBe(true);
  });
```

- [ ] **Step 4: Run the new suggest-chart tests to verify they fail (grouped still deferred)**

Run: `cd skills/suggest-chart/eval && bun test tests/native-family-types.test.ts tests/score.test.ts`
Expected: FAIL — grouped is listed in the family table and emitted by the score case, but is still `deferred` in `NATIVE_TYPES` (so `known` is false and "only lists non-deferred" fails).

- [ ] **Step 5: Flip grouped to non-deferred**

In `native-types.ts`, change the grouped entry from
`{ id: "grouped", family: "A", shape: "wide", deferred: A_PENDING("wide") },`
to
`{ id: "grouped", family: "A", shape: "wide" },`.

- [ ] **Step 6: Update `SKILL.md`**

In `skills/suggest-chart/SKILL.md`, change the mapped-families sentence (line 141) from `**bar/column, line, scatter, pie**` to `**bar/column, line, scatter, pie, grouped**`, and after the `nativeType uses the chart-native keys` sentence (line 145-146) add:

```
`grouped` expects a **wide CSV**: the first column is the category, and every following numeric column is a series (≤3 — beyond that use small multiples). Example: `region,urban,rural` then a row like `North,2400,1900`.
```

- [ ] **Step 7: Run both halves of the invariant**

Run: `cd skills/chart-native && bun test tests/completeness.test.ts tests/native-types.test.ts`
Expected: PASS — grouped now subject to FULL(local): in MAPPERS (Task 7) ∧ guarded (Task 6) ∧ KB file exists (Task 9). (If any is missing, the test names which predicate failed.)
Run: `cd skills/suggest-chart/eval && bun test tests/native-family-types.test.ts tests/score.test.ts`
Expected: PASS — grouped is non-deferred, in the family table, and renderable, so both the family-coverage and the grouped score case pass.

- [ ] **Step 8: Run the full gate**

Run: `bun run check`
Expected: all checks PASS.

- [ ] **Step 9: Commit**

```bash
git add skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/SKILL.md skills/suggest-chart/eval/tests/native-family-types.test.ts skills/suggest-chart/eval/tests/score.test.ts
git commit -m "feat(chart-native): grouped-bar is production-mapped (full 5-deliverable contract, both invariant halves)"
```

---

## Task 11: Render-verify grouped-bar end-to-end

**Files:**
- Create: `skills/chart-native/output-proof/grouped/` (produced artifacts + a short notes file)
- No source changes (verification only).

> This is the deliverable the project keeps re-learning: "tests pass" ≠ "the render is right." Produce the witness and LOOK at it before declaring the contract proven.

- [ ] **Step 1: Author a realistic grouped NativeSpec fixture**

Write `skills/chart-native/output-proof/grouped/spec.json`:

```json
{
  "producer": "chart-native",
  "nativeType": "grouped",
  "title": "Urban wages pulled ahead of rural pay in every region",
  "source": { "name": "INSEE 2025", "url": "https://www.insee.fr/en/statistiques" },
  "unit": "median monthly wage (€)",
  "data": "region,urban,rural\nNorth,2400,1900\nSouth,2250,1750\nEast,2300,1820\nWest,2500,2010"
}
```

- [ ] **Step 2: Produce static + interactive (no video — faster; the reveal is proven by the shared contract test)**

Run: `bun skills/chart-native/scripts/produce-from-spec.mjs skills/chart-native/output-proof/grouped/spec.json skills/chart-native/output-proof/grouped static`
Expected: the run prints `[produce grouped] conformance: OK (0 violations).` then builds; `PRODUCE_RESULT {…}` names `static.png` + `interactive.html`. A conformance violation would `exit 1` before building — that is the guard working.

- [ ] **Step 3: Render-verify at a second width + interactive**

Open `skills/chart-native/output-proof/grouped/static.png` and `interactive.html` and confirm by eye: the two series read clearly per region, the legend labels both series, the y-axis starts at 0, the title is not clipped, and hovering a bar shows its region + series + value. Re-run Step 2 with a narrow build if needed (the snap harness already exercises multiple widths). Capture what you saw in `skills/chart-native/output-proof/grouped/NOTES.md` (one paragraph: what you verified, at what widths, any issue).

- [ ] **Step 4: Final full gate**

Run: `bun run check`
Expected: all checks PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/chart-native/output-proof/grouped
git commit -m "test(chart-native): render-verify grouped-bar end-to-end (static + interactive)"
```

---

## Self-Review

**Spec coverage (against `2026-07-06-native-engine-end-to-end-design.md`):**
- Canonical `NATIVE_TYPES` + no render-path drift → Tasks 1-2.
- `validateShape` fail-loud + CSV conventions → Task 3.
- Table-driven `MAPPERS`, 4 migrated byte-identical → Task 4.
- Completeness test / invariant (reachable ⟹ guarded; mapped ⟺ full contract) → Task 5 (+ tightened in 10).
- Conformance resolver for a bespoke `seriesColors` type → Task 6; pie's `sliceColors` guard closes the pre-existing reachable-but-unguarded gap → Task 5.
- grouped guard → Task 6; grouped mapper (wide convention) → Task 7; native family table + eval `nativeType` validation (bar-driven) → Task 8; KB → Task 9; activation (flip non-deferred + grouped family/SKILL/family-coverage test/grouped score case) → Task 10; render-verify → Task 11.
- **Invariant split by ownership** (avoids chart-native importing suggest-chart + a missing-module tsc break): chart-native's completeness test owns *reachable ⟹ guarded* and *non-deferred/non-legacy ⟹ mapper ∧ guard ∧ KB* (Task 5); suggest-chart owns *family-coverage* (Task 10). Together = the full 5-deliverable contract.
- **Green after every task:** the guard lands before the mapper (Task 6 before 7) so a type is never reachable-but-unguarded at a commit; the score branch is driven by non-deferred `bar` (Task 8) and grouped's score case waits until grouped flips non-deferred (Task 10) — the branch rejects `deferred` types by design.
- Fallback contract preserved (deferred/unknown → `UnsupportedNativeType` → exit 2) → Task 4 keeps `UnsupportedNativeType`.
- **Deviation from spec, surfaced:** the spec framed the conformance resolver as "extend `resolveConformanceColors` 7→N", but the bespoke-signature checks (`checkGroupedBarConformance`, `checkPieConformance`) do NOT take the flat `{data,text,bg}` triple — they take `seriesColors`/`sliceColors` + `textColors`. So bespoke types are resolved INLINE in `runProduceConformance` (the beeswarm precedent), not via `resolveConformanceColors`. Same guarantee, accurate mechanism.
- **Scope addition, surfaced:** grounding found pie is reachable-but-unguarded today and no chart type has a KB ref. Plan 1 wires pie's guard (Task 5) and represents the 4 legacy types' KB/family debt via the visible `LEGACY_KB_FAMILY_BACKFILL` allowlist rather than a dishonest `deferred`.

**Placeholder scan:** every code step shows the actual code or an exact line-range move; no "TBD"/"similar to Task N"/"add validation". Task 2 and Task 4 describe verbatim moves (the moved literals are the existing file contents at cited lines).

**Type consistency:** `NativeShape`, `NativeTypeEntry`, `MAPPERS` signature, `PRODUCE_GUARDED_TYPES`, `NATIVE_FAMILY_TYPES` are used identically across tasks; the chart-native completeness test (Task 5) consumes `NATIVE_TYPES`/`LEGACY_KB_FAMILY_BACKFILL` (Task 1) + `MAPPERS` (Task 4) + `PRODUCE_GUARDED_TYPES` (Task 5/6); the suggest-chart family-coverage test (Task 10) + `score.ts` (Task 8) consume `NATIVE_TYPES` + `NATIVE_FAMILY_TYPES`. `GroupedConfig`/`PieConfig` field names (`catField`/`seriesFields`/`rows`; `labelField`/`valueField`/`rows`) match the components read during planning.
