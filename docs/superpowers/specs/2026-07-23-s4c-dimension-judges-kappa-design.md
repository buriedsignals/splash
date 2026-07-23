# S4c — Per-dimension judges + κ (inter-rater agreement)

> AUDIT #2 capstone, sub-project 3 of S4. Lives in `../splash-harness` (Bun, `bun:test`).
> Depends on: S4a (flow rubric A1-A8), T4 (mechanical-vs-judge-opinion severity split).

## Problem

The harness certifies a driven splash run with **one monolithic judge** (`src/judge.ts` +
`judge.md`). That judge conflates five concerns (flow, question, editorial, free bug/gap list,
delivery-format match) into one findings list, and its verdict is **unauditable and uncalibrated**:
there is no measure of how *reliable* a judge opinion is, nor of *where* it is noisy. The 2026-07-11
audit found the tool weakest exactly on the **semantic axes with no mechanical backstop** —
title↔takeaway fidelity, palette subject-fit — which are precisely the judge-opinion axes. T4
already split findings into mechanical (`check:*`, trustworthy) vs judge-opinion (`"judge"`,
fallible). S4c decomposes the judge-opinion half into **named dimensions** and makes each dimension's
reliability **measurable** via inter-rater agreement (κ).

## Goals

1. Decompose judge opinion into **five semantic dimensions** (four at build + `colour-semantics` per review #5), each judged independently.
2. Provide **generic agreement math** (Cohen's κ for 2 raters, Fleiss' κ for N) over a label matrix,
   **rater-source-agnostic** — rows may be independent judge passes (inter-judge, autonomous) or
   human labels (calibration, later) with no code change.
3. Run entirely as an **offline audit layer** over already-persisted run transcripts — **zero change
   to the live run pipeline**, re-runnable on demand (the S4b-1 pattern).
4. Prove autonomously with **inter-judge (test-retest) κ** on a small set of stored transcripts:
   surface which dimensions are reliable vs noisy.
5. Frame honestly: κ measures **judge self-consistency**, not correctness, until human labels exist.

## Non-goals

- **Not** replacing or modifying the live monolithic judge, its consensus pass, or the gate.
- **Not** running per-dimension judges inside `run-e2e.mjs` (no per-run spend inflation).
- **Not** computing human-vs-judge κ in this sub-project (that is S4d-adjacent — requires Rémy/
  Yvan/Rinny labels; the machinery is built to accept them, but producing them is out of scope).
- **Not** re-judging flow (S4a mechanizes it) or the format gate (mechanical).
- **Not** weighting, aggregating, or re-scoring the tool from κ — κ is diagnostic, not a gate.

## Architecture

An offline layer of three units in `../splash-harness`, consuming stored `runs/<runId>/` dirs
(each already holds `transcript.jsonl`, `meta.json`, `dialogue.txt`). The live pipeline is untouched.

```
runs/<runId>/{transcript.jsonl,meta.json}   (existing, persisted by a normal run)
        │
        ▼
  src/dimension-judge.ts   ── 4 dimension prompt-builders (pure) + a runner that re-judges
        │                     one stored transcript on one dimension → an ordinal label
        ▼
  src/kappa.ts             ── generic Cohen/Fleiss κ over a label matrix (raters × items)
        │                     + Landis–Koch band; rater-source-agnostic
        ▼
  scripts/dimension-kappa.mjs ── CLI: N runs × 4 dimensions × R passes → matrix → report md
        │
        ▼
  dimension-kappa-report.md   (gitignored output, like materialize-report.md)
```

### Unit 1 — `src/dimension-judge.ts`

The five dimensions, each with a focused prompt and an **ordinal label scale** shared across all
dimensions so κ operates on a common categorical domain. (Dimensions 1-4 shipped in the initial
build; `colour-semantics` was added per whole-branch-review finding #5 — the audit's named weak
axis + the F2 water-subject bug class had no home, since `encoding-fit` excludes colour and `craft`
is legibility beyond mechanical contrast.)

```ts
export const DIMENSION_LABELS = ["pass", "minor", "major", "critical"] as const;
export type DimensionLabel = (typeof DIMENSION_LABELS)[number];

export type DimensionKey =
  | "encoding-fit"       // chart/map type ↔ data intent (FT Visual Vocabulary)
  | "editorial-fidelity" // title↔takeaway, claim-grounding, source honesty
  | "narrative"          // framing / arc / scrolly beats
  | "craft"              // legibility, labels, polish beyond mechanical contrast
  | "colour-semantics";  // palette subject-fit, convention, seq-vs-diverging, CVD — SEMANTIC, not mechanical contrast

export const DIMENSIONS: readonly DimensionKey[] = [
  "encoding-fit", "editorial-fidelity", "narrative", "craft", "colour-semantics",
] as const;
```

- `buildDimensionPrompt(dim: DimensionKey, ctx: DimensionContext): string` — a **pure function**
  (mirrors `buildJudgePrompt`): given the condensed transcript summary + shipped-spec/report context
  (reused from `summarizeTranscript`), produces a prompt that asks the model to judge **only** that
  one dimension and return STRICT JSON `{ "label": "pass|minor|major|critical", "reason": "..." }`.
  The prompt names the dimension's specific rubric anchors (e.g. editorial-fidelity → FT title
  discipline + claim-grounding; encoding-fit → FT Visual Vocabulary category match).
- `parseDimensionVerdict(raw: string): DimensionLabel | null` — tolerant parse (reuse `extractJson`
  from `judge.ts`; coerce out-of-enum labels to `null` = unparseable, never silently to `pass`).
- `runDimensionJudge(dim, ctx, call: JudgeCallFn): Promise<DimensionLabel | null>` — builds the
  prompt, calls the model, parses. Deterministic given `call`; the caller injects the real headless
  model (CLI) or a stub (tests).

`DimensionContext` is assembled by the CLI from a stored run dir — it does NOT read the clock or
spawn anything itself (pure, testable), matching the `judge.ts` separation.

### Unit 2 — `src/kappa.ts`

Generic inter-rater agreement over a **label matrix**: `raters × items`, each cell a label from a
fixed category set. Rater-source-agnostic — the matrix does not know whether a row is a judge pass
or a human.

```ts
export interface KappaResult {
  kappa: number;            // NaN when undefined (e.g. single category, <2 raters)
  raters: number;
  items: number;
  categories: string[];
  observedAgreement: number;
  expectedAgreement: number;
  band: KappaBand;          // Landis–Koch interpretation
}
export type KappaBand =
  | "poor" | "slight" | "fair" | "moderate" | "substantial" | "almost-perfect" | "undefined";

// Cohen's κ — exactly 2 raters, complete labelling.
export function cohenKappa(raterA: string[], raterB: string[], categories?: string[]): KappaResult;
// Fleiss' κ — N raters (N ≥ 2), fixed number of ratings per item.
export function fleissKappa(matrix: string[][], categories?: string[]): KappaResult;
// Convenience: choose Cohen (2 raters) vs Fleiss (>2) from the matrix shape.
export function agreement(matrix: string[][], categories?: string[]): KappaResult;
```

- **Cohen's κ** = (p₀ − pₑ) / (1 − pₑ), p₀ = observed agreement fraction, pₑ = Σ (marginal_A ·
  marginal_B) over categories. Two raters, paired labels.
- **Fleiss' κ** = (P̄ − P̄ₑ) / (1 − P̄ₑ) over the item-by-category count table (n raters per item).
- **Degenerate cases** (defined behaviour, not a throw): a single observed category, or 1 − pₑ = 0
  (perfect chance-expected agreement) → `kappa: NaN`, `band: "undefined"`. Perfect agreement with ≥2
  categories → `kappa: 1`, `band: "almost-perfect"`. Bands per Landis–Koch: <0 poor, 0–.20 slight,
  .21–.40 fair, .41–.60 moderate, .61–.80 substantial, .81–1 almost-perfect.
- Input validation: unequal-length rater vectors (Cohen) / ragged matrix (Fleiss) → **throw** a
  clear error (fail loud, never silently pad).

### Unit 3 — `scripts/dimension-kappa.mjs` (CLI — the real spend event, opt-in)

- Args: `--runs <runId,runId,...>` (explicit) or `--latest N` (the N most recent `runs/` dirs), and
  `--passes R` (independent judge passes per dimension, default 2). Fail loud on a non-numeric
  `--passes`/`--latest` (mirror `materialize-cells.mjs --limit`).
- For each selected run × each of the 4 dimensions × R passes: assemble `DimensionContext` from the
  stored dir, call `runDimensionJudge` with the real headless model. Vary each pass's prompt suffix
  by pass index so passes are independent samples (no `Math.random` — unavailable in-harness anyway).
- Build, per dimension, a matrix `passes × runs` and compute `agreement(matrix)`.
- Emit `dimension-kappa-report.md`: a per-dimension κ + band + items/raters + the raw label matrix,
  under a header stating **κ measures judge self-consistency across independent passes — NOT
  correctness. Substituting human labels for the pass rows yields calibration κ.**
- Excluded from `bun test` / CI (real model spend), exactly like `verify-source-bundle.mjs`.

## Data flow

1. A normal harness run already writes `runs/<runId>/transcript.jsonl` + `meta.json`.
2. `dimension-kappa.mjs` reads a chosen set of those dirs (no live run needed).
3. Per (run, dimension, pass) it produces one ordinal label via a real model call.
4. `kappa.ts` reduces each dimension's label matrix to a `KappaResult`.
5. The report ranks dimensions by reliability, exposing where judge opinion is noisy.

## Testing (TEST-ONLY on tool behaviour; zero spend in the suite)

`src/kappa.test.ts`:
- Cohen κ against a **hand-computed textbook fixture** (known p₀, pₑ, κ to 3 dp).
- Fleiss κ against a **published worked example** (the standard 10-subject / 5-rater table).
- Edge cases: perfect agreement (κ=1, almost-perfect), pure chance (κ≈0, slight/poor),
  single-category degenerate (κ=NaN, undefined), 1−pₑ=0 degenerate (NaN, undefined).
- Validation throws: unequal Cohen vectors; ragged Fleiss matrix.
- `agreement()` dispatch: on a 2-rater matrix it returns exactly `cohenKappa(...)`; on a 3-rater
  matrix exactly `fleissKappa(...)` (dispatch check — Cohen and Fleiss use different expected-
  agreement models and do NOT coincide for 2 raters in general, so the test asserts the routed
  function's own value, not cross-equality).

`src/dimension-judge.test.ts`:
- `buildDimensionPrompt` is pure: each of the 4 dimensions yields a prompt containing that
  dimension's rubric anchor and the STRICT-JSON instruction; the prompt for dimension X does **not**
  ask about dimension Y's concern (isolation).
- `parseDimensionVerdict`: valid label parses; out-of-enum / prose-wrapped-JSON / empty → coerced
  correctly (valid→label, invalid→null), never silently `pass`.
- `runDimensionJudge` with a **stub `JudgeCallFn`** returns the stubbed label; a stub returning
  garbage yields `null`.

`src/dimension-rubric.test.ts` (drift-guard):
- `DIMENSIONS` enumerates exactly the five keys (drift-guard asserts `.length === 5`); every key has a working prompt-builder branch
  (no key falls through to a default/throw); `DIMENSION_LABELS` is the shared 4-level ordinal.

## Honest-framing invariant

The report and any stdout state that S4c κ, seeded with judge passes, is a **reliability** metric
(self-consistency), not a **validity** metric (correctness). This is the same discipline as T4:
never present a judge-derived number as ground truth. When human labels replace the pass rows, the
same machinery yields calibration κ — that transition is a documented follow-up (S4d-adjacent),
not code change.

## Follow-ups (out of scope)

- Produce a real inter-judge κ over the pilot's stored transcripts (small spend, on Rémy's go).
- Human-label collection → calibration κ (needs Rémy/Yvan/Rinny; feeds S4d).
- If a dimension proves reliably high-κ AND high-signal, consider promoting it into the live judge
  or a mechanical check — a future decision, not this sub-project.
