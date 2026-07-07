# Native Batch 1 — line/scatter/pie routing + 4 already-guarded types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the native suggester routing for the existing legacy types (line/scatter/pie) and productionize four more chart types (histogram, lollipop, connected-scatter, beeswarm) whose produce-time conformance guard AND KB ref already exist — so productionizing each is just a mapper + a family-table entry + a flip + a render-verify.

**Architecture:** This is a subsequent batch of the already-designed native-engine program (spec `docs/superpowers/specs/2026-07-06-native-engine-end-to-end-design.md`, mechanism merged in `main`). It reuses the proven recipe: add a `spec-to-config` MAPPERS entry (gated by the existing `validateShape`), add a `NATIVE_FAMILY_TYPES` intent entry, flip the type's `deferred` off in `NATIVE_TYPES`, and render-verify. The completeness invariant (`reachable ⟹ guarded`, and non-deferred/non-legacy ⟹ mapper ∧ guard ∧ KB) is already enforced by tests and keeps every step honest.

**Tech Stack:** TypeScript, Bun, bun:test, React + D3 (existing chart-native engine).

## Global Constraints

- Runtime **Bun** — never npm/node. Tests **bun:test**.
- Code, comments, identifiers, commit messages, branches: **English only**.
- **Zero new `any`/`@ts-ignore`.** No vendor (Claude/Anthropic) attribution in any artifact.
- `bun run check` (root) MUST be green at the END of every task.
- Canonical `id` = render key (`connected-scatter`, `lollipop`, `histogram`, `beeswarm` — all already correct in `NATIVE_TYPES`/`REMOTION_PREFIX`).
- Each new type's produce-time guard ALREADY EXISTS (all four are in `PRODUCE_GUARDED_TYPES`) and its KB ref ALREADY EXISTS at repo-root `knowledge/references/chart/types/<display-name>.md` — do NOT create guards or KB files.
- TDD: failing test first, watch it fail, minimal implementation, watch it pass, commit.
- Branch already exists: `feat/native-batch-1`. Commit there; do not merge to `main` within this plan.

## Reference — the merged patterns you extend

- `skills/chart-native/src/spec-to-config.ts` — the `MAPPERS` record + `NativeSpec` interface + `src()` helper + `parseCsv`/`ParsedCsv` (from `./csv`). New mappers go here, in the same style as `bar`/`grouped`.
- `skills/chart-native/src/native-types.ts` — `NATIVE_TYPES` entries carry `{id, family, shape, deferred?}`. Flipping a type = removing its `deferred`.
- `skills/suggest-chart/eval/native-family-types.ts` — `NATIVE_FAMILY_TYPES` intent → native ids.
- `skills/suggest-chart/eval/score.ts` — the `producer === "chart-native"` branch.
- Completeness tests: `skills/chart-native/tests/completeness.test.ts` (HARD + FULL-local) and `skills/suggest-chart/eval/tests/native-family-types.test.ts` (family-coverage). Both stay green throughout.

---

## Task 1: Native line/scatter/pie eval routing + stronger native `validates`

Closes the whole-branch review's Important #2: native `line`/`scatter`/`pie` are producer-reachable+guarded but not suggester-scorable, and the native `validates` gate is weaker than the DW one.

**Files:**
- Modify: `skills/suggest-chart/eval/native-family-types.ts`
- Modify: `skills/suggest-chart/eval/score.ts`
- Test: `skills/suggest-chart/eval/tests/score.test.ts` (append)

**Interfaces:**
- `NATIVE_FAMILY_TYPES` gains `"change-over-time": ["line"]`, `correlation: ["scatter"]`, `"part-to-whole": ["pie"]` (keeps `magnitude: ["bar","grouped"]`).
- `score.ts` native branch `validates` strengthened to require title + source + (data fits its shape).

- [ ] **Step 1: Write the failing tests (append to score.test.ts)**

```ts
describe("scoreSpec — chart-native line/scatter/pie routing + validation", () => {
  const base = { source: { name: "OWID 2025", url: "https://ourworldindata.org/x" } };
  it("routes a native line spec to change-over-time", () => {
    const r = scoreSpec(
      { producer: "chart-native", nativeType: "line", ...base, title: "Renewables climbed every year since 2015", unit: "share of electricity (%)", data: "year,share\n2015,20\n2020,30\n2024,42" },
      { family: "change-over-time", element: "chart", producer: "chart-native" });
    expect(r.pass).toBe(true);
  });
  it("routes a native scatter spec to correlation", () => {
    const r = scoreSpec(
      { producer: "chart-native", nativeType: "scatter", ...base, title: "Higher spend tracks higher scores", unit: "score", data: "school,spend,score\nA,5200,72\nB,3100,58" },
      { family: "correlation", element: "chart", producer: "chart-native" });
    expect(r.pass).toBe(true);
  });
  it("routes a native pie spec to part-to-whole", () => {
    const r = scoreSpec(
      { producer: "chart-native", nativeType: "pie", ...base, title: "Hydro supplies most clean power", unit: "share", data: "source,gwh\nHydro,420\nWind,180" },
      { family: "part-to-whole", element: "chart", producer: "chart-native" });
    expect(r.pass).toBe(true);
  });
  it("fails a native spec with an empty title (validates parity with DW)", () => {
    const r = scoreSpec(
      { producer: "chart-native", nativeType: "line", ...base, title: "", unit: "x", data: "year,v\n2015,1\n2016,2" },
      { family: "change-over-time", element: "chart", producer: "chart-native" });
    expect(r.validates).toBe(false);
  });
  it("fails a native spec whose data does not fit the type's shape", () => {
    // scatter is `paired` (needs ≥2 numeric); a single-numeric CSV must fail validation
    const r = scoreSpec(
      { producer: "chart-native", nativeType: "scatter", ...base, title: "This should not validate", unit: "x", data: "city,pop\nX,10\nY,20" },
      { family: "correlation", element: "chart", producer: "chart-native" });
    expect(r.validates).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/suggest-chart/eval && bun test tests/score.test.ts`
Expected: FAIL — line/scatter/pie are not in `NATIVE_FAMILY_TYPES` (familyMatch false), and the empty-title / bad-shape specs currently pass `validates` (which is just `known`).

- [ ] **Step 3: Extend the native family table**

In `skills/suggest-chart/eval/native-family-types.ts`:

```ts
export const NATIVE_FAMILY_TYPES: Record<string, string[]> = {
  "change-over-time": ["line"],
  correlation: ["scatter"],
  "part-to-whole": ["pie"],
  magnitude: ["bar", "grouped"],
};
```

- [ ] **Step 4: Strengthen the native `validates` in score.ts**

Import the shape validator + parser at the top of `score.ts` (same cross-skill style as the existing `NATIVE_TYPES` import):

```ts
import { parseCsv } from "../../chart-native/src/csv";
import { validateShape } from "../../chart-native/src/shape-validation";
```

Replace the native branch body so `validates` also checks title, source, and data-shape (wrap the throwing `validateShape` in try/catch → boolean):

```ts
  if (producer === "chart-native") {
    const s = spec as Record<string, unknown>;
    const nativeType = s["nativeType"];
    const known = typeof nativeType === "string" && NATIVE_TYPES.some((e) => e.id === nativeType && !e.deferred);
    if (!known) notes.push(`nativeType ${String(nativeType)} is not a mapped native type`);
    const title = typeof s["title"] === "string" ? (s["title"] as string).trim() : "";
    const src = s["source"] as { name?: string; url?: string } | undefined;
    const hasSource = !!src?.name?.trim() && !!src?.url?.trim();
    let dataOk = true;
    const data = s["data"];
    if (known && typeof data === "string") {
      try { validateShape(nativeType as string, parseCsv(data)); }
      catch (e) { dataOk = false; notes.push((e as Error).message); }
    }
    if (!title) notes.push("native spec is missing an insight title");
    if (!hasSource) notes.push("native spec is missing source name+url");
    const validates = known && !!title && hasSource && dataOk;
    const allowed = NATIVE_FAMILY_TYPES[expect.family] ?? [];
    const familyMatch = typeof nativeType === "string" && allowed.includes(nativeType);
    if (!familyMatch) notes.push(`nativeType ${String(nativeType)} not in native family ${expect.family} [${allowed.join(",")}]`);
    return { validates, familyMatch, guardrailsOk: validates, pass: validates && familyMatch, notes };
  }
```

- [ ] **Step 5: Run the suggest-chart suites**

Run: `cd skills/suggest-chart/eval && bun test tests/score.test.ts tests/native-family-types.test.ts`
Expected: PASS — the new routing + validation tests pass; the existing family-coverage test still passes (line/scatter/pie are non-deferred, so listing them is legal; they are legacy-exempt from the "every mapped type is listed" assertion, so listing them is allowed but not required).

- [ ] **Step 6: Full gate**

Run: `bun run check` — Expected: 14/14 PASS.

- [ ] **Step 7: Commit**

```bash
git add skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/eval/score.ts skills/suggest-chart/eval/tests/score.test.ts
git commit -m "feat(suggest-chart): route native line/scatter/pie by intent; strengthen native validates to DW parity"
```

---

## Task 2: Productionize `histogram` (distribution)

**Files:**
- Modify: `skills/chart-native/src/spec-to-config.ts` (add `histogram` mapper)
- Modify: `skills/chart-native/src/native-types.ts` (flip `histogram` off `deferred`)
- Modify: `skills/suggest-chart/eval/native-family-types.ts` (add `distribution: ["histogram"]`)
- Test: Create `skills/chart-native/tests/spec-to-config-histogram.test.ts`
- Verify: produce + render-verify

**Interfaces (grounded by scouting):** `HistogramConfig` = `{ title, source:{name,url}, unit, valueField, binWidth?, rows }`. Guard: `histogram` ∈ `PRODUCE_GUARDED_TYPES` (already). KB: `histogram.md` (exists). Shape: `distribution`.

- [ ] **Step 1: Write the failing mapper test**

```ts
// skills/chart-native/tests/spec-to-config-histogram.test.ts
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = { title: "Most trips finish in under 20 minutes", source: { name: "TfL 2025", url: "https://tfl.gov.uk/x" }, unit: "trip duration (minutes)" };

describe("specToNativeConfig — histogram (distribution)", () => {
  it("maps the single numeric column to valueField and passes rows through raw", () => {
    const spec: NativeSpec = { ...base, nativeType: "histogram", data: "minutes\n8\n12\n15\n19\n22\n31" };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("histogram");
    expect(config.valueField).toBe("minutes");
    expect((config.rows as unknown[]).length).toBe(6);
    expect(config.binWidth).toBeUndefined();
    expect(config.baseColor).toBeUndefined();
  });
  it("prefers valueUnit for the inline unit when present", () => {
    const spec: NativeSpec = { ...base, nativeType: "histogram", valueUnit: "min", data: "minutes\n8\n12\n15" };
    expect(specToNativeConfig(spec).config.unit).toBe("min");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `cd skills/chart-native && bun test tests/spec-to-config-histogram.test.ts` → FAIL (`UnsupportedNativeType`).

- [ ] **Step 3: Add the histogram mapper**

In `spec-to-config.ts` `MAPPERS`:

```ts
  histogram(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const valueField = numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    return {
      type: "histogram",
      config: {
        title: spec.title,
        source: src(spec.source),
        // unit does double duty (subtitle + inline "median N unit"); prefer the short callout unit
        unit: spec.valueUnit ?? spec.unit,
        valueField,
        rows,
      },
    };
  },
```

(Do NOT forward `binWidth` — no NativeSpec field; the geometry auto-derives it. Do NOT forward `baseColor` — `HistogramConfig` has none and the conformance resolver forbids it.)

- [ ] **Step 4: Flip histogram + add its family entry**

In `native-types.ts` change `histogram` from `{ id: "histogram", family: "A", shape: "distribution", deferred: A_PENDING("distribution") }` to `{ id: "histogram", family: "A", shape: "distribution" }`.
In `native-family-types.ts` add `distribution: ["histogram"],`.

- [ ] **Step 5: Run mapper + both invariant halves**

Run: `cd skills/chart-native && bun test tests/spec-to-config-histogram.test.ts tests/completeness.test.ts`
Expected: PASS (histogram now mapper ∧ guard ∧ KB `histogram.md` ∧ family entry → FULL-local enforces it and passes).
Run: `cd skills/suggest-chart/eval && bun test tests/native-family-types.test.ts` — Expected: PASS (histogram non-deferred + in family table).

- [ ] **Step 6: Render-verify**

Write `skills/chart-native/output-proof/histogram/spec-native.json` with a realistic distribution NativeSpec (≥30 raw observations, e.g. trip durations). Run:
`bun skills/chart-native/scripts/produce-from-spec.mjs skills/chart-native/output-proof/histogram/spec-native.json skills/chart-native/output-proof/histogram static`
Confirm the conformance-OK line, then Read the produced `static.png` and verify by eye: bars form a sensible distribution, the median line + label are legible (label in ink, not vermillion), title unclipped, axis labelled. Note findings in `skills/chart-native/output-proof/histogram/NOTES-native.md`. (If produce fails on the known relative-path footgun, pass absolute paths.)

- [ ] **Step 7: Full gate + commit**

Run: `bun run check` → 14/14. Then:
```bash
git add skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/chart-native/tests/spec-to-config-histogram.test.ts skills/chart-native/output-proof/histogram/spec-native.json skills/chart-native/output-proof/histogram/NOTES-native.md
git commit -m "feat(chart-native): productionize histogram end-to-end (distribution mapper + flip)"
```

---

## Task 3: Productionize `lollipop` (single)

**Files:** Modify `spec-to-config.ts`, `native-types.ts`, `native-family-types.ts`; create `tests/spec-to-config-lollipop.test.ts`; render-verify.

**Interfaces:** `LollipopConfig` = `{ title, source, unit, catField, valField, highlightLabel?, rows }` (NO baseColor/orientation/sort). Guard: reuses `checkBarConformance` (already wired). KB: `lollipop.md` (exists). Shape: `single`.

- [ ] **Step 1: Failing test**

```ts
// skills/chart-native/tests/spec-to-config-lollipop.test.ts
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
const base = { title: "Nurses wait longest for a first appointment", source: { name: "NHS 2025", url: "https://nhs.uk/x" }, unit: "median wait (days)" };
describe("specToNativeConfig — lollipop (single)", () => {
  it("maps category + value and threads highlight to highlightLabel (raw string)", () => {
    const spec: NativeSpec = { ...base, nativeType: "lollipop", data: "role,days\nNurse,31\nGP,12\nDentist,9", highlight: "Nurse" };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("lollipop");
    expect(config.catField).toBe("role");
    expect(config.valField).toBe("days");
    expect(config.highlightLabel).toBe("Nurse");
  });
  it("omits highlightLabel when no highlight given, and never forwards baseColor", () => {
    const { config } = specToNativeConfig({ ...base, nativeType: "lollipop", data: "role,days\nNurse,31\nGP,12", baseColor: "#009E73" });
    expect(config.highlightLabel).toBeUndefined();
    expect(config.baseColor).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run → FAIL** (`UnsupportedNativeType`).

- [ ] **Step 3: Add the lollipop mapper**

```ts
  lollipop(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const catCol = columns[0];
    const valCol = numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    return {
      type: "lollipop",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        catField: catCol,
        valField: valCol,
        ...(spec.highlight ? { highlightLabel: spec.highlight } : {}),
        rows,
      },
    };
  },
```

- [ ] **Step 4: Flip + family** — remove `deferred` from the `lollipop` entry in `native-types.ts`; add `lollipop` to `native-family-types.ts` under `ranking` (`ranking: ["lollipop"],`).

- [ ] **Step 5: Run mapper + invariant halves** — `cd skills/chart-native && bun test tests/spec-to-config-lollipop.test.ts tests/completeness.test.ts` PASS; `cd skills/suggest-chart/eval && bun test tests/native-family-types.test.ts` PASS.

- [ ] **Step 6: Render-verify** — `output-proof/lollipop/spec-native.json` (role × wait days, one highlighted). Produce `static`, Read `static.png`, verify: stems from baseline 0, dots, direct value labels in ink, highlighted row emphasised by the mark (not a low-contrast label). Note in `NOTES-native.md`.

- [ ] **Step 7: Gate + commit**

```bash
git add skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/chart-native/tests/spec-to-config-lollipop.test.ts skills/chart-native/output-proof/lollipop/spec-native.json skills/chart-native/output-proof/lollipop/NOTES-native.md
git commit -m "feat(chart-native): productionize lollipop end-to-end (single mapper + flip)"
```

---

## Task 4: Productionize `connected-scatter` (paired)

**Files:** Modify `spec-to-config.ts`, `native-types.ts`, `native-family-types.ts`; create `tests/spec-to-config-connected-scatter.test.ts`; render-verify.

**Interfaces:** `ConnectedScatterConfig` = `{ title, source, unit, labelField, xField, yField, xLabel, yLabel, rows }` (NO baseColor; both axis labels required). Guard: reuses `checkScatterConformance` (already wired). KB: `connected-scatter.md` (exists). Shape: `paired`.

- [ ] **Step 1: Failing test**

```ts
// skills/chart-native/tests/spec-to-config-connected-scatter.test.ts
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
const base = { title: "Unemployment and inflation traced a loop", source: { name: "BLS 2025", url: "https://bls.gov/x" }, unit: "1980–2020" };
describe("specToNativeConfig — connected-scatter (paired)", () => {
  it("uses col0 as the ordering label and the two measure columns as x/y (excluding col0)", () => {
    const spec: NativeSpec = { ...base, nativeType: "connected-scatter", data: "year,unemployment,inflation\n1980,7.1,13.5\n1990,5.6,5.4\n2000,4.0,3.4" };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("connected-scatter");
    expect(config.labelField).toBe("year");
    expect(config.xField).toBe("unemployment");
    expect(config.yField).toBe("inflation");
    expect(config.xLabel).toBe("unemployment");
    expect(config.yLabel).toBe("inflation");
  });
  it("does not treat a numeric year column as a measure axis", () => {
    const { config } = specToNativeConfig({ ...base, nativeType: "connected-scatter", data: "year,x,y\n2000,1,2\n2001,3,4" });
    expect(config.xField).toBe("x");
    expect(config.yField).toBe("y");
  });
});
```

- [ ] **Step 2: Run → FAIL** (`UnsupportedNativeType`).

- [ ] **Step 3: Add the connected-scatter mapper**

```ts
  "connected-scatter"(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0]; // the sequence/time key that ORDERS the path
    const measures = numericColumns.filter((c) => c !== labelCol);
    const xField = measures[0] ?? columns[1];
    const yField = measures[1] ?? columns[2];
    return {
      type: "connected-scatter",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        labelField: labelCol,
        xField,
        yField,
        xLabel: xField,
        yLabel: yField,
        rows, // pass through IN ORDER — do NOT sort (the path follows row order)
      },
    };
  },
```

- [ ] **Step 4: Flip + family** — remove `deferred` from `connected-scatter` in `native-types.ts`; add `connected-scatter` to `native-family-types.ts` under `correlation` (`correlation: ["scatter", "connected-scatter"],`).

- [ ] **Step 5: Run mapper + invariant halves** — PASS both suites as in Task 2/3.

- [ ] **Step 6: Render-verify** — `output-proof/connected-scatter/spec-native.json` (year × unemployment × inflation, ≥6 ordered rows). Produce `static`, Read `static.png`, verify: the path connects points in year order, both axes titled, start/end labelled by year, no zig-zag (order preserved). Note in `NOTES-native.md`.

- [ ] **Step 7: Gate + commit**

```bash
git add skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/chart-native/tests/spec-to-config-connected-scatter.test.ts skills/chart-native/output-proof/connected-scatter/spec-native.json skills/chart-native/output-proof/connected-scatter/NOTES-native.md
git commit -m "feat(chart-native): productionize connected-scatter end-to-end (paired mapper + flip)"
```

---

## Task 5: Productionize `beeswarm` (distribution) — with the cardinality heuristic

**Files:** Modify `spec-to-config.ts`, `native-types.ts`, `native-family-types.ts`; create `tests/spec-to-config-beeswarm.test.ts`; render-verify.

**Interfaces:** `BeeswarmConfig` = `{ title, source:{name,url}, valueLabel, categories?:string[], points:{value:number, label?:string, category?:string}[] }`. Guard: `checkBeeswarmConformance` (already wired) — **HARD-fails produce if >5 distinct categories**. KB: `beeswarm.md` (exists). Shape: `distribution`.

**Design micro-decision (documented):** a distribution CSV may have 0–2 text columns. The grouping `category` (drives ≤5 colours) must be the **low-cardinality** text column; the other text column (if any) is the per-point `label` (tooltip only). Pick the category as the text column with the FEWEST distinct values; if none, omit `categories` (single-hue swarm). A high-cardinality pick would fail the produce guard — that's why we do NOT blindly use `columns[0]`.

- [ ] **Step 1: Failing test**

```ts
// skills/chart-native/tests/spec-to-config-beeswarm.test.ts
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
const base = { title: "Salaries cluster low with a long tail", source: { name: "Levels 2025", url: "https://levels.fyi/x" }, unit: "annual salary (k$)" };
describe("specToNativeConfig — beeswarm (distribution)", () => {
  it("single numeric column → points only, no categories, valueLabel from unit", () => {
    const spec: NativeSpec = { ...base, nativeType: "beeswarm", data: "salary\n80\n95\n110\n300" };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("beeswarm");
    expect(config.valueLabel).toBe(base.unit);
    expect(config.categories).toBeUndefined();
    expect((config.points as unknown[]).length).toBe(4);
    expect((config.points as { value: number }[])[0].value).toBe(80);
  });
  it("category + value → low-cardinality text col becomes the grouping category", () => {
    const spec: NativeSpec = { ...base, nativeType: "beeswarm", data: "level,salary\nJunior,80\nJunior,95\nSenior,180\nSenior,210" };
    const { config } = specToNativeConfig(spec);
    expect(config.categories).toEqual(["Junior", "Senior"]);
    expect((config.points as { category?: string }[])[0].category).toBe("Junior");
  });
  it("picks the FEWER-distinct text column as category and the other as per-point label", () => {
    const spec: NativeSpec = { ...base, nativeType: "beeswarm", data: "name,team,salary\nAda,A,80\nBob,B,95\nCy,A,110\nDee,B,130" };
    const { config } = specToNativeConfig(spec);
    // team has 2 distinct, name has 4 → team is the category
    expect(config.categories).toEqual(["A", "B"]);
    const p0 = (config.points as { label?: string; category?: string }[])[0];
    expect(p0.category).toBe("A");
    expect(p0.label).toBe("Ada");
  });
});
```

- [ ] **Step 2: Run → FAIL** (`UnsupportedNativeType`).

- [ ] **Step 3: Add the beeswarm mapper**

```ts
  beeswarm(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const valCol = numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    const textCols = columns.filter((c) => c !== valCol && !numericColumns.includes(c));
    const distinct = (c: string) => new Set(rows.map((r) => String(r[c]))).size;
    const catCol = textCols.length
      ? [...textCols].sort((a, b) => distinct(a) - distinct(b))[0]
      : undefined;
    const labelCol = textCols.find((c) => c !== catCol);
    const categories = catCol ? [...new Set(rows.map((r) => String(r[catCol])))] : undefined;
    const points = rows.map((r) => ({
      value: Number(r[valCol]),
      ...(labelCol ? { label: String(r[labelCol]) } : {}),
      ...(catCol ? { category: String(r[catCol]) } : {}),
    }));
    return {
      type: "beeswarm",
      config: {
        title: spec.title,
        source: src(spec.source),
        valueLabel: spec.unit, // NativeSpec has no valueLabel; its long-axis `unit` maps here
        ...(categories ? { categories } : {}),
        points,
      },
    };
  },
```

- [ ] **Step 4: Flip + family** — remove `deferred` from `beeswarm` in `native-types.ts`; add `beeswarm` to `native-family-types.ts` under `distribution` (`distribution: ["histogram", "beeswarm"],`).

- [ ] **Step 5: Run mapper + invariant halves** — PASS both suites.

- [ ] **Step 6: Render-verify** — `output-proof/beeswarm/spec-native.json` (a `level,salary` CSV with ≥20 rows, ≤3 levels so ≤5 categories). Produce `static`, Read `static.png`, verify: dots form a swarm without overlap, ≤5 category colours (Okabe-Ito), value axis labelled, no >5-category produce failure. Note in `NOTES-native.md`.

- [ ] **Step 7: Gate + commit**

```bash
git add skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/chart-native/tests/spec-to-config-beeswarm.test.ts skills/chart-native/output-proof/beeswarm/spec-native.json skills/chart-native/output-proof/beeswarm/NOTES-native.md
git commit -m "feat(chart-native): productionize beeswarm end-to-end (distribution mapper + cardinality heuristic + flip)"
```

---

## Self-Review

**Spec coverage:** Task 1 closes the whole-branch review's Important #2 (native line/scatter/pie routing + validates parity). Tasks 2–5 productionize the four already-guarded types via the proven recipe (mapper + family entry + flip + render-verify); each relies only on pre-existing guards + KB (verified by the scout). After this batch, 9 native types are mapped (bar/line/scatter/pie/grouped + histogram/lollipop/connected-scatter/beeswarm).

**Placeholder scan:** every mapper body + test is complete code from the grounded scout recipes; render-verify steps name the exact produce command + what to look for.

**Type consistency:** each mapper returns the exact `*Config` field set the scout confirmed from the component (histogram: no binWidth/baseColor; lollipop: highlightLabel raw string; connected-scatter: both axis labels + no sort; beeswarm: valueLabel + cardinality-picked categories). `NATIVE_FAMILY_TYPES` intents mirror the DW `family-types.ts` keys. The completeness invariant enforces mapper ∧ guard ∧ KB for each flipped type; the family-coverage test enforces the suggester half.

**Green-after-each-task:** within each type task, the mapper is added (reachable + already-guarded → HARD holds; still deferred → FULL skips), then the family entry + flip land together (RED→GREEN), so `bun run check` is green at each task's end.

**Risk — beeswarm cardinality heuristic:** the one non-mechanical decision. The >5-category produce guard is the backstop (a bad pick fails loudly, not silently). The test covers the 0/1/2-text-column cases; the render-verify confirms ≤5 colours on a real CSV.
