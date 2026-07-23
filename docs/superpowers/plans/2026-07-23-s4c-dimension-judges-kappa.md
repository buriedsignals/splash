# S4c — Per-dimension judges + κ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline audit layer in `../splash-harness` that decomposes judge opinion into four semantic dimensions and measures each dimension's inter-rater agreement (κ), with zero change to the live run pipeline.

**Architecture:** Three units — `src/kappa.ts` (generic Cohen/Fleiss κ over a label matrix), `src/dimension-judge.ts` (four pure dimension prompt-builders + a runner over an injected call seam), `scripts/dimension-kappa.mjs` (opt-in CLI that re-judges stored `runs/<runId>/transcript.jsonl` and emits a κ report). The κ math is pure and textbook-fixture-tested; the dimension judges reuse the existing `judge.ts` seams (`summarizeTranscript`, `extractJson`, `JudgeCallFn`); the CLI's real model calls are excluded from the suite exactly like `verify-source-bundle`/`materialize-cells`.

**Tech Stack:** Bun, TypeScript, `bun:test`.

## Global Constraints

- Runtime **Bun**; tests `bun:test`; TDD (failing test first).
- **TEST-ONLY on tool behaviour** — S4c is offline and observes stored runs; it makes **no change to the live run pipeline** (`run-e2e.mjs`, `judge.ts`, `gate.ts` are not modified).
- Commits on `../splash-harness` branch `master`. **No vendor trailer** — no `Claude`/`Anthropic`/`Co-Authored-By`/`Claude-Session` line in any commit.
- The CLI `scripts/dimension-kappa.mjs` performs **real model spend** and is **excluded from `bun test` and CI** — no `*.test.ts` file may invoke a real model call; every test uses a stub `JudgeCallFn`. Do **not** add a gate/CI line for it (mirror `scripts/verify-source-bundle.mjs`).
- **Fail loud on malformed SHAPE** (unequal-length rater vectors, ragged Fleiss matrix, non-numeric `--passes`/`--latest`) with a thrown error / `process.exit(1)`. **Never throw on degenerate DATA** (single observed category, `1 − pₑ = 0`) — return `kappa: NaN`, `band: "undefined"`.
- κ never silently coerces an unparseable verdict to `pass` — an unparseable dimension verdict is `null`.
- The κ report and CLI stdout must state κ measures **judge self-consistency, not correctness** (T4 honest-framing discipline).

**Dimensions (exact keys, order):** `encoding-fit`, `editorial-fidelity`, `narrative`, `craft`.
**Ordinal labels (exact, order):** `pass`, `minor`, `major`, `critical`.
**Landis–Koch bands:** `<0` poor · `≤0.20` slight · `≤0.40` fair · `≤0.60` moderate · `≤0.80` substantial · else almost-perfect · NaN → undefined.

---

### Task 1: `src/kappa.ts` — Cohen's κ + interpretation bands

**Files:**
- Create: `src/kappa.ts`
- Test: `src/kappa.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `type KappaBand = "poor" | "slight" | "fair" | "moderate" | "substantial" | "almost-perfect" | "undefined"`
  - `interface KappaResult { kappa: number; raters: number; items: number; categories: string[]; observedAgreement: number; expectedAgreement: number; band: KappaBand }`
  - `function landisKochBand(kappa: number): KappaBand`
  - `function cohenKappa(raterA: string[], raterB: string[], categories?: string[]): KappaResult`

- [ ] **Step 1: Write the failing test**

```ts
// src/kappa.test.ts
import { test, expect } from "bun:test";
import { cohenKappa, landisKochBand } from "./kappa.ts";

// Textbook fixture: 50 paired ratings, 2 categories.
// both yes:20, A yes/B no:5, A no/B yes:10, both no:15
// p0 = (20+15)/50 = 0.70 ; A: yes .5/no .5 ; B: yes .6/no .4 ; pe = .5*.6 + .5*.4 = 0.50
// kappa = (0.70-0.50)/(1-0.50) = 0.40
const rep = (label: string, n: number) => Array(n).fill(label);
const raterA = [...rep("yes", 20), ...rep("yes", 5), ...rep("no", 10), ...rep("no", 15)];
const raterB = [...rep("yes", 20), ...rep("no", 5), ...rep("yes", 10), ...rep("no", 15)];

test("cohenKappa matches the hand-computed textbook value (0.40, fair)", () => {
  const r = cohenKappa(raterA, raterB);
  expect(r.observedAgreement).toBeCloseTo(0.7, 5);
  expect(r.expectedAgreement).toBeCloseTo(0.5, 5);
  expect(r.kappa).toBeCloseTo(0.4, 5);
  expect(r.band).toBe("fair");
  expect(r.raters).toBe(2);
  expect(r.items).toBe(50);
});

test("cohenKappa is 1 / almost-perfect on perfect agreement with >=2 categories", () => {
  const r = cohenKappa(["a", "b", "a", "b"], ["a", "b", "a", "b"]);
  expect(r.kappa).toBeCloseTo(1, 5);
  expect(r.band).toBe("almost-perfect");
});

test("cohenKappa is NaN / undefined on a single observed category (1 - pe = 0)", () => {
  const r = cohenKappa(["a", "a", "a"], ["a", "a", "a"]);
  expect(Number.isNaN(r.kappa)).toBe(true);
  expect(r.band).toBe("undefined");
});

test("cohenKappa throws on unequal-length rater vectors", () => {
  expect(() => cohenKappa(["a", "b"], ["a"])).toThrow(/length/i);
});

test("landisKochBand boundaries", () => {
  expect(landisKochBand(-0.1)).toBe("poor");
  expect(landisKochBand(0.2)).toBe("slight");
  expect(landisKochBand(0.4)).toBe("fair");
  expect(landisKochBand(0.6)).toBe("moderate");
  expect(landisKochBand(0.8)).toBe("substantial");
  expect(landisKochBand(0.95)).toBe("almost-perfect");
  expect(landisKochBand(NaN)).toBe("undefined");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../splash-harness && bun test src/kappa.test.ts`
Expected: FAIL — `cohenKappa`/`landisKochBand` not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/kappa.ts
export type KappaBand =
  | "poor"
  | "slight"
  | "fair"
  | "moderate"
  | "substantial"
  | "almost-perfect"
  | "undefined";

export interface KappaResult {
  kappa: number; // NaN when undefined (single category / 1 - pe = 0)
  raters: number;
  items: number;
  categories: string[];
  observedAgreement: number;
  expectedAgreement: number;
  band: KappaBand;
}

export function landisKochBand(kappa: number): KappaBand {
  if (Number.isNaN(kappa)) return "undefined";
  if (kappa < 0) return "poor";
  if (kappa <= 0.2) return "slight";
  if (kappa <= 0.4) return "fair";
  if (kappa <= 0.6) return "moderate";
  if (kappa <= 0.8) return "substantial";
  return "almost-perfect";
}

function distinctCategories(labels: string[], override?: string[]): string[] {
  if (override) return [...override];
  return [...new Set(labels)].sort();
}

export function cohenKappa(
  raterA: string[],
  raterB: string[],
  categories?: string[],
): KappaResult {
  if (raterA.length !== raterB.length) {
    throw new Error(
      `cohenKappa: rater vectors must have equal length (got ${raterA.length} and ${raterB.length})`,
    );
  }
  const n = raterA.length;
  const cats = distinctCategories([...raterA, ...raterB], categories);
  // observed agreement
  let agree = 0;
  for (let i = 0; i < n; i++) if (raterA[i] === raterB[i]) agree++;
  const p0 = n === 0 ? 0 : agree / n;
  // expected agreement from per-rater marginals
  let pe = 0;
  for (const c of cats) {
    const pa = raterA.filter((x) => x === c).length / n;
    const pb = raterB.filter((x) => x === c).length / n;
    pe += pa * pb;
  }
  const kappa = 1 - pe === 0 ? NaN : (p0 - pe) / (1 - pe);
  return {
    kappa,
    raters: 2,
    items: n,
    categories: cats,
    observedAgreement: p0,
    expectedAgreement: pe,
    band: landisKochBand(kappa),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ../splash-harness && bun test src/kappa.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd ../splash-harness && git add src/kappa.ts src/kappa.test.ts
git commit -m "feat(kappa): Cohen's kappa + Landis-Koch bands (textbook-fixture tested)"
```

---

### Task 2: `src/kappa.ts` — Fleiss' κ + `agreement()` dispatch

**Files:**
- Modify: `src/kappa.ts`
- Test: `src/kappa.test.ts`

**Interfaces:**
- Consumes: `KappaResult`, `landisKochBand`, `cohenKappa` (Task 1).
- Produces:
  - `function fleissKappa(matrix: string[][], categories?: string[]): KappaResult` — `matrix` is **raters × items** (each row one rater, each column one item), fixed raters-per-item.
  - `function agreement(matrix: string[][], categories?: string[]): KappaResult` — 2 rows → `cohenKappa(matrix[0], matrix[1])`; >2 rows → `fleissKappa(matrix)`.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/kappa.test.ts
import { fleissKappa, agreement } from "./kappa.ts";

// Hand-computed Fleiss fixture: 3 raters x 4 items, 2 categories.
// item counts: I1 3pass/0fail, I2 3/0, I3 0/3, I4 2/1
// P_i = (sum n_ij^2 - n)/(n(n-1)), n=3: I1..I3 = 1.0, I4 = (5-3)/6 = 0.3333
// Pbar = (1+1+1+0.3333)/4 = 0.8333
// p_pass = 8/12 = 0.6667, p_fail = 4/12 = 0.3333 ; Pe = .4444+.1111 = 0.5556
// kappa = (0.8333-0.5556)/(1-0.5556) = 0.625
const r1 = ["pass", "pass", "fail", "pass"];
const r2 = ["pass", "pass", "fail", "pass"];
const r3 = ["pass", "pass", "fail", "fail"];

test("fleissKappa matches the hand-computed value (0.625, substantial)", () => {
  const r = fleissKappa([r1, r2, r3]);
  expect(r.kappa).toBeCloseTo(0.625, 3);
  expect(r.band).toBe("substantial");
  expect(r.raters).toBe(3);
  expect(r.items).toBe(4);
});

test("fleissKappa throws on a ragged matrix", () => {
  expect(() => fleissKappa([["a", "b"], ["a"]])).toThrow(/ragged|length/i);
});

test("agreement dispatches to Cohen for 2 raters and Fleiss for 3", () => {
  const two = agreement([["a", "b", "a"], ["a", "b", "b"]]);
  expect(two).toEqual(cohenKappa(["a", "b", "a"], ["a", "b", "b"]));
  const three = agreement([r1, r2, r3]);
  expect(three).toEqual(fleissKappa([r1, r2, r3]));
});
```

Note: `cohenKappa`/`fleissKappa` are already imported at the top of the file from Task 1's import line — extend that import rather than duplicating it.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../splash-harness && bun test src/kappa.test.ts`
Expected: FAIL — `fleissKappa`/`agreement` not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// append to src/kappa.ts
export function fleissKappa(
  matrix: string[][],
  categories?: string[],
): KappaResult {
  const raters = matrix.length;
  const items = raters === 0 ? 0 : matrix[0].length;
  for (const row of matrix) {
    if (row.length !== items) {
      throw new Error(
        `fleissKappa: ragged matrix — every rater row must have the same number of items (expected ${items})`,
      );
    }
  }
  const cats = distinctCategories(matrix.flat(), categories);
  const n = raters; // ratings per item (constant)
  // item x category count table
  let pBarSum = 0;
  const catTotals = new Map<string, number>(cats.map((c) => [c, 0]));
  for (let j = 0; j < items; j++) {
    const counts = new Map<string, number>(cats.map((c) => [c, 0]));
    for (let i = 0; i < raters; i++) {
      const c = matrix[i][j];
      counts.set(c, (counts.get(c) ?? 0) + 1);
      catTotals.set(c, (catTotals.get(c) ?? 0) + 1);
    }
    let sumSq = 0;
    for (const c of cats) sumSq += (counts.get(c) ?? 0) ** 2;
    const pI = n <= 1 ? 0 : (sumSq - n) / (n * (n - 1));
    pBarSum += pI;
  }
  const pBar = items === 0 ? 0 : pBarSum / items;
  let pe = 0;
  const denom = items * n;
  for (const c of cats) {
    const pj = denom === 0 ? 0 : (catTotals.get(c) ?? 0) / denom;
    pe += pj * pj;
  }
  const kappa = 1 - pe === 0 ? NaN : (pBar - pe) / (1 - pe);
  return {
    kappa,
    raters,
    items,
    categories: cats,
    observedAgreement: pBar,
    expectedAgreement: pe,
    band: landisKochBand(kappa),
  };
}

export function agreement(
  matrix: string[][],
  categories?: string[],
): KappaResult {
  if (matrix.length === 2) return cohenKappa(matrix[0], matrix[1], categories);
  return fleissKappa(matrix, categories);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ../splash-harness && bun test src/kappa.test.ts`
Expected: PASS (8 tests total).

- [ ] **Step 5: Commit**

```bash
cd ../splash-harness && git add src/kappa.ts src/kappa.test.ts
git commit -m "feat(kappa): Fleiss' kappa (N raters) + agreement() shape dispatch"
```

---

### Task 3: `src/dimension-judge.ts` — dimensions, prompt-builders, verdict parse

**Files:**
- Create: `src/dimension-judge.ts`
- Test: `src/dimension-judge.test.ts`

**Interfaces:**
- Consumes: `extractJson` from `src/judge.ts` (existing: `export function extractJson(text: string): string | null`).
- Produces:
  - `const DIMENSION_LABELS = ["pass","minor","major","critical"] as const` ; `type DimensionLabel`
  - `type DimensionKey = "encoding-fit" | "editorial-fidelity" | "narrative" | "craft"`
  - `const DIMENSIONS: readonly DimensionKey[]`
  - `interface DimensionContext { caseSlug: string; transcriptText: string; acceptedSpecJson: string | null; metaNote: string }`
  - `function buildDimensionPrompt(dim: DimensionKey, ctx: DimensionContext, passIndex?: number): string`
  - `function parseDimensionVerdict(raw: string): DimensionLabel | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/dimension-judge.test.ts
import { test, expect } from "bun:test";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  buildDimensionPrompt,
  parseDimensionVerdict,
  type DimensionContext,
} from "./dimension-judge.ts";

const ctx: DimensionContext = {
  caseSlug: "demo-case",
  transcriptText: "JOURNALIST: make a chart\nSPLASH: delivered a bar chart",
  acceptedSpecJson: '{"type":"bar"}',
  metaNote: "format=static, delivered=true",
};

test("buildDimensionPrompt embeds the dimension's own rubric anchor and the STRICT JSON instruction", () => {
  const p = buildDimensionPrompt("editorial-fidelity", ctx);
  expect(p).toMatch(/editorial-fidelity/);
  expect(p).toMatch(/takeaway/i); // this dimension's anchor
  expect(p).toMatch(/STRICT JSON/i);
  expect(p).toMatch(/"label"/);
  expect(p).toContain(ctx.transcriptText);
});

test("buildDimensionPrompt for one dimension does not ask about another dimension's concern", () => {
  const enc = buildDimensionPrompt("encoding-fit", ctx);
  expect(enc).toMatch(/Visual Vocabulary|chart.{0,3}type|encoding/i);
  // encoding-fit prompt must not steer the model to judge narrative beats
  expect(enc).not.toMatch(/scrolly beats|narrative arc/i);
});

test("buildDimensionPrompt passIndex only adds an independence note, not new criteria", () => {
  const a = buildDimensionPrompt("craft", ctx, 0);
  const b = buildDimensionPrompt("craft", ctx, 1);
  expect(a).not.toBe(b); // varies by pass
  expect(b).toMatch(/independent pass/i);
});

test("parseDimensionVerdict accepts a valid label, tolerates prose-wrapped JSON", () => {
  expect(parseDimensionVerdict('{"label":"major","reason":"x"}')).toBe("major");
  expect(parseDimensionVerdict('here: {"label":"pass"} done')).toBe("pass");
});

test("parseDimensionVerdict returns null on out-of-enum / empty / non-JSON, never silently pass", () => {
  expect(parseDimensionVerdict('{"label":"amazing"}')).toBeNull();
  expect(parseDimensionVerdict("")).toBeNull();
  expect(parseDimensionVerdict("no json here")).toBeNull();
});

test("DIMENSIONS and DIMENSION_LABELS are the locked sets", () => {
  expect([...DIMENSIONS]).toEqual([
    "encoding-fit",
    "editorial-fidelity",
    "narrative",
    "craft",
  ]);
  expect([...DIMENSION_LABELS]).toEqual(["pass", "minor", "major", "critical"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../splash-harness && bun test src/dimension-judge.test.ts`
Expected: FAIL — module not found / exports missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/dimension-judge.ts
import { extractJson } from "./judge.ts";

export const DIMENSION_LABELS = ["pass", "minor", "major", "critical"] as const;
export type DimensionLabel = (typeof DIMENSION_LABELS)[number];

export type DimensionKey =
  | "encoding-fit"
  | "editorial-fidelity"
  | "narrative"
  | "craft";

export const DIMENSIONS: readonly DimensionKey[] = [
  "encoding-fit",
  "editorial-fidelity",
  "narrative",
  "craft",
] as const;

export interface DimensionContext {
  caseSlug: string;
  transcriptText: string;
  acceptedSpecJson: string | null;
  metaNote: string;
}

// Each dimension names ONLY its own rubric anchor, so a per-dimension judge stays isolated.
const DIMENSION_RUBRIC: Record<DimensionKey, string> = {
  "encoding-fit":
    "Does the chosen chart/map TYPE match the data's intent per the FT Visual Vocabulary (comparison / distribution / relationship / composition / trend / geo)? Judge ONLY type↔intent encoding fitness — not colour, not narrative.",
  "editorial-fidelity":
    "Does the shipped TITLE match the confirmed takeaway (no drift, no over-claim), are all numeric claims grounded in the article's data, and is the source attributed honestly? Judge ONLY editorial fidelity — not chart type, not aesthetics.",
  narrative:
    "Is the framing coherent and does the piece build a clear arc (for scrolly/video: do the beats advance the story)? Judge ONLY narrative quality — not encoding, not craft polish.",
  craft:
    "Is the deliverable legible and well-finished — labels un-truncated, legend readable, layout uncluttered — beyond the mechanical contrast checks? Judge ONLY craft/legibility polish — not chart type, not narrative.",
};

export function buildDimensionPrompt(
  dim: DimensionKey,
  ctx: DimensionContext,
  passIndex = 0,
): string {
  const lines = [
    `You are auditing ONE dimension — "${dim}" — of a data-visualisation run driven by the splash tool.`,
    `Case: ${ctx.caseSlug}. Run facts: ${ctx.metaNote}.`,
    "",
    `## The single dimension to judge: ${dim}`,
    DIMENSION_RUBRIC[dim],
    "",
    "## Transcript (condensed)",
    ctx.transcriptText,
    "",
    "## Shipped spec",
    ctx.acceptedSpecJson ?? "(no accepted.json recovered)",
    "",
    passIndex > 0
      ? `This is independent pass #${passIndex + 1}: judge afresh from the evidence; do not assume a prior verdict.`
      : "Judge afresh from the evidence.",
    "",
    'Output STRICT JSON ONLY — no prose, no markdown fences: {"label":"pass|minor|major|critical","reason":"<one sentence>"}.',
    'Use exactly one of pass / minor / major / critical for "label".',
  ];
  return lines.join("\n");
}

export function parseDimensionVerdict(raw: string): DimensionLabel | null {
  const json = extractJson(raw);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const label = (parsed as { label?: unknown })?.label;
  if (
    typeof label === "string" &&
    (DIMENSION_LABELS as readonly string[]).includes(label)
  ) {
    return label as DimensionLabel;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ../splash-harness && bun test src/dimension-judge.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd ../splash-harness && git add src/dimension-judge.ts src/dimension-judge.test.ts
git commit -m "feat(dimension-judge): 4 semantic dimensions — pure prompt-builders + verdict parse"
```

---

### Task 4: `src/dimension-judge.ts` — `runDimensionJudge` runner + drift-guard

**Files:**
- Modify: `src/dimension-judge.ts`
- Test: `src/dimension-judge.test.ts`
- Test: `src/dimension-rubric.test.ts`

**Interfaces:**
- Consumes: `JudgeCallFn` from `src/judge.ts` (existing: `export type JudgeCallFn = (args: JudgeCallArgs) => Promise<string>` where `JudgeCallArgs = { prompt: string; model: string; systemPrompt: string; harnessDir: string }`).
- Produces:
  - `const DIMENSION_JUDGE_SYSTEM: string`
  - `function runDimensionJudge(dim: DimensionKey, ctx: DimensionContext, call: JudgeCallFn, opts: { model: string; harnessDir: string; passIndex?: number }): Promise<DimensionLabel | null>`

- [ ] **Step 1: Write the failing test**

```ts
// append to src/dimension-judge.test.ts
import { runDimensionJudge, DIMENSION_JUDGE_SYSTEM } from "./dimension-judge.ts";
import type { JudgeCallFn } from "./judge.ts";

test("runDimensionJudge returns the stubbed label and passes the dimension system prompt", async () => {
  let seenSystem = "";
  const stub: JudgeCallFn = async (args) => {
    seenSystem = args.systemPrompt;
    return '{"label":"minor","reason":"ok"}';
  };
  const out = await runDimensionJudge("craft", ctx, stub, {
    model: "claude-sonnet-5",
    harnessDir: "/tmp",
  });
  expect(out).toBe("minor");
  expect(seenSystem).toBe(DIMENSION_JUDGE_SYSTEM);
});

test("runDimensionJudge returns null when the model reply is unparseable", async () => {
  const stub: JudgeCallFn = async () => "garbage, no json";
  const out = await runDimensionJudge("narrative", ctx, stub, {
    model: "claude-sonnet-5",
    harnessDir: "/tmp",
  });
  expect(out).toBeNull();
});
```

```ts
// src/dimension-rubric.test.ts
import { test, expect } from "bun:test";
import {
  DIMENSIONS,
  buildDimensionPrompt,
  type DimensionContext,
} from "./dimension-judge.ts";

const ctx: DimensionContext = {
  caseSlug: "c",
  transcriptText: "t",
  acceptedSpecJson: null,
  metaNote: "m",
};

// Drift-guard: every declared dimension must have a real prompt branch that names it —
// no key may fall through to an empty/default prompt.
test("every DIMENSION has a prompt branch that names the dimension", () => {
  expect(DIMENSIONS.length).toBe(4);
  for (const dim of DIMENSIONS) {
    const p = buildDimensionPrompt(dim, ctx);
    expect(p).toContain(dim);
    expect(p.length).toBeGreaterThan(120); // a real rubric, not a stub
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../splash-harness && bun test src/dimension-judge.test.ts src/dimension-rubric.test.ts`
Expected: FAIL — `runDimensionJudge`/`DIMENSION_JUDGE_SYSTEM` not exported (rubric drift-guard passes already, that's fine).

- [ ] **Step 3: Write minimal implementation**

```ts
// append to src/dimension-judge.ts
import type { JudgeCallFn } from "./judge.ts";

export const DIMENSION_JUDGE_SYSTEM =
  "You are an independent single-dimension reviewer of a data-visualisation run. " +
  "You judge exactly the one dimension named in the prompt and nothing else. " +
  "You output strict JSON with a single ordinal label and a one-sentence reason.";

export async function runDimensionJudge(
  dim: DimensionKey,
  ctx: DimensionContext,
  call: JudgeCallFn,
  opts: { model: string; harnessDir: string; passIndex?: number },
): Promise<DimensionLabel | null> {
  const prompt = buildDimensionPrompt(dim, ctx, opts.passIndex ?? 0);
  const raw = await call({
    prompt,
    model: opts.model,
    systemPrompt: DIMENSION_JUDGE_SYSTEM,
    harnessDir: opts.harnessDir,
  });
  return parseDimensionVerdict(raw);
}
```

Note: move the `import type { JudgeCallFn }` line to the top of the file with the other imports rather than mid-file if your formatter requires it.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ../splash-harness && bun test src/dimension-judge.test.ts src/dimension-rubric.test.ts`
Expected: PASS (8 + 1 tests).

- [ ] **Step 5: Commit**

```bash
cd ../splash-harness && git add src/dimension-judge.ts src/dimension-judge.test.ts src/dimension-rubric.test.ts
git commit -m "feat(dimension-judge): runDimensionJudge over the JudgeCallFn seam + dimension drift-guard"
```

---

### Task 5: `scripts/dimension-kappa.mjs` — opt-in CLI (context assembly + report + gated main)

**Files:**
- Create: `scripts/dimension-kappa.mjs`
- Test: `tests/dimension-kappa-cli.test.ts`

**Interfaces:**
- Consumes: `parseTranscript`, `summarizeTranscript` from `src/transcript.ts`/`src/judge.ts`; `DIMENSIONS`, `runDimensionJudge`, `type DimensionLabel` from `src/dimension-judge.ts`; `agreement`, `type KappaResult` from `src/kappa.ts`.
- Produces (exported for test; `main()` gated on `import.meta.main`):
  - `function assembleContextFromRunDir(dir: string): DimensionContext` — reads `transcript.jsonl` (→ `summarizeTranscript(parseTranscript(...))`), `meta.json` (→ `caseSlug` + `metaNote` like `"format=<...>, delivered=<...>"`), and an accepted spec if present alongside (`accepted.json` under the run dir or its `exportsDir`; `null` if absent).
  - `function renderKappaReport(perDim: Array<{ dim: string; result: KappaResult; matrix: string[][] }>): string` — a Markdown report headed with the honesty statement, one section per dimension (κ, band, raters, items, and the raw label matrix).

- [ ] **Step 1: Write the failing test**

```ts
// tests/dimension-kappa-cli.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assembleContextFromRunDir,
  renderKappaReport,
} from "../scripts/dimension-kappa.mjs";

test("assembleContextFromRunDir builds a DimensionContext from a stored run dir", () => {
  const dir = mkdtempSync(join(tmpdir(), "s4c-run-"));
  // one journalist line + one splash line, as real transcript.jsonl user/assistant events
  const jsonl = [
    JSON.stringify({ type: "user", message: { content: "make a chart" } }),
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "delivered a bar chart" }] },
    }),
  ].join("\n");
  writeFileSync(join(dir, "transcript.jsonl"), jsonl);
  writeFileSync(
    join(dir, "meta.json"),
    JSON.stringify({ caseSlug: "demo", delivered: true, deliverableSlug: "demo" }),
  );
  const ctx = assembleContextFromRunDir(dir);
  expect(ctx.caseSlug).toBe("demo");
  expect(ctx.transcriptText).toMatch(/chart/);
  expect(ctx.metaNote).toMatch(/delivered=true/);
});

test("renderKappaReport states the honesty framing and one section per dimension", () => {
  const md = renderKappaReport([
    {
      dim: "encoding-fit",
      result: {
        kappa: 0.625,
        raters: 2,
        items: 4,
        categories: ["pass", "major"],
        observedAgreement: 0.83,
        expectedAgreement: 0.55,
        band: "substantial",
      },
      matrix: [
        ["pass", "pass", "major", "pass"],
        ["pass", "pass", "major", "major"],
      ],
    },
  ]);
  expect(md).toMatch(/self-consistency|not correctness/i);
  expect(md).toMatch(/encoding-fit/);
  expect(md).toMatch(/0\.6/); // kappa printed
  expect(md).toMatch(/substantial/);
});
```

Note on the transcript event shapes: mirror `tests/fixtures/mini-session.jsonl` if the `user`/`assistant` shapes above don't parse — read `src/transcript.ts` `eventsFromLine` for the exact fields it expects, and use those. The assertion only needs the journalist/splash text to survive into `transcriptText`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../splash-harness && bun test tests/dimension-kappa-cli.test.ts`
Expected: FAIL — module/exports missing.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/dimension-kappa.mjs
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseTranscript } from "../src/transcript.ts";
import { summarizeTranscript } from "../src/judge.ts";
import { DIMENSIONS, runDimensionJudge } from "../src/dimension-judge.ts";
import { agreement } from "../src/kappa.ts";

const HARNESS_ROOT = new URL("..", import.meta.url).pathname;

export function assembleContextFromRunDir(dir) {
  const jsonl = readFileSync(join(dir, "transcript.jsonl"), "utf8");
  const transcriptText = summarizeTranscript(parseTranscript(jsonl));
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  const caseSlug = meta.caseSlug ?? "unknown";
  const metaNote = `delivered=${meta.delivered}, exitReason=${meta.exitReason ?? "?"}, format=${meta.deliverableSlug ?? "?"}`;
  // accepted spec: look under the run dir, then meta.exportsDir
  const candidates = [
    join(dir, "accepted.json"),
    meta.exportsDir ? join(meta.exportsDir, "accepted.json") : null,
  ].filter(Boolean);
  let acceptedSpecJson = null;
  for (const c of candidates) {
    if (existsSync(c)) {
      acceptedSpecJson = readFileSync(c, "utf8");
      break;
    }
  }
  return { caseSlug, transcriptText, acceptedSpecJson, metaNote };
}

export function renderKappaReport(perDim) {
  const lines = [
    "# S4c dimension-judge κ report",
    "",
    "> κ here measures **judge self-consistency** across independent passes — **NOT correctness**.",
    "> Substituting human labels for the pass rows turns this into a calibration measure.",
    "",
  ];
  for (const { dim, result, matrix } of perDim) {
    lines.push(`## ${dim}`);
    lines.push(
      `- κ = ${Number.isNaN(result.kappa) ? "undefined" : result.kappa.toFixed(3)} (${result.band})`,
    );
    lines.push(`- raters=${result.raters}, items=${result.items}, categories=${result.categories.join("/")}`);
    lines.push(`- observed=${result.observedAgreement.toFixed(3)}, expected=${result.expectedAgreement.toFixed(3)}`);
    lines.push("- label matrix (rater × item):");
    for (const row of matrix) lines.push(`  - ${row.join(", ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

function recentRunDirs(n) {
  const runsDir = join(HARNESS_ROOT, "runs");
  const dirs = readdirSync(runsDir)
    .map((name) => join(runsDir, name))
    .filter((p) => statSync(p).isDirectory() && existsSync(join(p, "transcript.jsonl")));
  // lexical sort on the ISO-timestamped runId suffix is chronological
  dirs.sort();
  return dirs.slice(-n);
}

function intArg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const raw = process.argv[i + 1];
  if (!raw || !/^\d+$/.test(raw) || Number.parseInt(raw, 10) <= 0) {
    console.error(`${flag} requires a positive integer, got ${JSON.stringify(raw ?? undefined)}`);
    process.exit(1);
  }
  return Number.parseInt(raw, 10);
}

// Real headless model call (the spend). Mirrors materialize-cells.mjs realTranslate.
async function realCall({ prompt, systemPrompt }) {
  const proc = Bun.spawn(["claude", "-p", `${systemPrompt}\n\n${prompt}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out;
}

async function main() {
  const passes = intArg("--passes", 2);
  let runDirs;
  const runsIdx = process.argv.indexOf("--runs");
  if (runsIdx !== -1 && process.argv[runsIdx + 1]) {
    runDirs = process.argv[runsIdx + 1]
      .split(",")
      .map((s) => join(HARNESS_ROOT, "runs", s.trim()));
  } else {
    runDirs = recentRunDirs(intArg("--latest", 3));
  }
  if (runDirs.length === 0) {
    console.log("no run dirs selected (use --runs <id,id> or --latest N)");
    return;
  }
  const contexts = runDirs.map((d) => ({ dir: d, ctx: assembleContextFromRunDir(d) }));
  const perDim = [];
  for (const dim of DIMENSIONS) {
    // matrix: passes (raters) × runs (items)
    const matrix = [];
    for (let pass = 0; pass < passes; pass++) {
      const row = [];
      for (const { ctx } of contexts) {
        const label = await runDimensionJudge(dim, ctx, realCall, {
          model: "claude-sonnet-5",
          harnessDir: HARNESS_ROOT,
          passIndex: pass,
        });
        row.push(label ?? "unparseable");
      }
      matrix.push(row);
    }
    perDim.push({ dim, result: agreement(matrix), matrix });
  }
  const report = renderKappaReport(perDim);
  const outDir = join(HARNESS_ROOT, "dimension-kappa");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "dimension-kappa-report.md");
  writeFileSync(outPath, report);
  console.log(`wrote ${outPath}`);
  console.log("NOTE: κ measures judge self-consistency, not correctness.");
}

if (import.meta.main) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ../splash-harness && bun test tests/dimension-kappa-cli.test.ts`
Expected: PASS (2 tests). Confirm the CLI's `main()` did NOT run during tests (no model spawn).

- [ ] **Step 5: Add the output dir to `.gitignore` and commit**

Add `/dimension-kappa/` to `../splash-harness/.gitignore` (anchored, next to `/materialize/`).

```bash
cd ../splash-harness && git add scripts/dimension-kappa.mjs tests/dimension-kappa-cli.test.ts .gitignore
git commit -m "feat(dimension-kappa): opt-in CLI — re-judge stored runs per dimension, emit kappa report"
```

- [ ] **Step 6: Full-suite regression**

Run: `cd ../splash-harness && bun test`
Expected: PASS — the prior 437 + the new S4c tests, 0 fail. No test triggers a real model call.

---

## Self-Review

**Spec coverage:**
- Four semantic dimensions + ordinal labels → Task 3 (`DIMENSIONS`, `DIMENSION_LABELS`, `DIMENSION_RUBRIC`).
- Generic Cohen/Fleiss κ + Landis–Koch, rater-agnostic → Tasks 1–2.
- Offline layer over stored transcripts, no live-pipeline change → Task 5 (`assembleContextFromRunDir`); no task touches `run-e2e.mjs`/`judge.ts`/`gate.ts`.
- Autonomous inter-judge proof (passes × runs matrix) → Task 5 `main()`.
- Honesty framing → Task 5 `renderKappaReport` header + stdout note; asserted in test.
- Degenerate-vs-malformed distinction → Task 1 (NaN/undefined vs throw) + Task 2 (ragged throw).
- Unparseable verdict → null, never `pass` → Task 3 `parseDimensionVerdict` + test.
- CLI excluded from gate/CI → Task 5 `main()` gated on `import.meta.main`; only pure exports tested.
- Drift-guard (4 dimensions each have a prompt branch) → Task 4 `dimension-rubric.test.ts`.

**Placeholder scan:** none — every code step carries full code; every run step names the command + expected result.

**Type consistency:** `DimensionContext` fields (`caseSlug`, `transcriptText`, `acceptedSpecJson`, `metaNote`) identical across Tasks 3/4/5. `KappaResult` shape identical across Tasks 1/2/5 (incl. the fixture object in Task 5's `renderKappaReport` test). `runDimensionJudge` signature matches its call site in Task 5. `agreement(matrix)` returns `KappaResult` consumed by `renderKappaReport`. `JudgeCallArgs` fields used in Task 4/5 (`prompt`/`model`/`systemPrompt`/`harnessDir`) match `src/judge.ts`.

**One open verification for the implementer:** confirm `summarizeTranscript` is exported from `src/judge.ts` (grounded: it is, line 125) and `parseTranscript` from `src/transcript.ts` (grounded: line 122). If Task 5's fixture `user`/`assistant` JSONL shapes don't parse through `eventsFromLine`, copy the exact shapes from `tests/fixtures/mini-session.jsonl`.
