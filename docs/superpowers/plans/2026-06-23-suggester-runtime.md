# Implementation plan — ② Suggester runtime + eval harness (first cut)

> Implements `docs/superpowers/specs/2026-06-23-suggester-runtime-design.md`.
> Branch `feat/suggester-runtime` (from `main`). Runtime Bun, tests `bun:test`, TDD, English only,
> no Claude/Anthropic mention. No tiers. `scoreSpec` calls the real `validateChartSpec`.

## Eval folder location decision

Eval lives at **`skills/suggest-chart/eval/`** (the eval measures ②, not the producer). The spec offered
`skills/dw-chart/eval/` or `skills/suggest-chart/eval/`; we pick the latter and note it. `score.ts` imports
`validateChartSpec` + `CHART_TYPES` from `../../dw-chart/src/chart-spec`.

## Tasks

### T1 — `suggest-chart/SKILL.md` gains the "Runtime procedure"
Add a `## Runtime procedure` section: the 6 explicit steps (profile → choose → fill → self-check → produce →
or `no-chart`) plus the `{ decision:"no-chart", reason }` escape. Pure doc; no test.

### T2 — `eval/family-types.ts` (`FAMILY_TYPES`, pure) + unit test
Export `FAMILY_TYPES: Record<string,string[]>` per the spec. Test (TDD, failing first):
every type listed in every family ∈ `CHART_TYPES`. (Catches drift against the producer.)

### T3 — `eval/score.ts` (`scoreSpec`, pure) + unit test
`scoreSpec(spec, expect): Score` with `{ validates, familyMatch, guardrailsOk, pass, notes }`.
`expect.family === "none"` path: pass iff spec is `{decision:"no-chart"}`. Imports real `validateChartSpec`.
Tests (TDD): valid+family+0-warn → pass; invalid → fail+note; wrong family → fail; over-warnings → fail;
no-chart case → pass when decision emitted, fail when a chart is emitted.

### T4 — `eval/cases/*.json` — ≥8 cases incl. one `no-chart`
Families covered: change-over-time, magnitude, ranking, correlation, distribution, part-to-whole,
multi-series (change-over-time multi), and one `no-chart` (`expect.family:"none"`). Real CSV data + intent.

### T5 — `eval/judge.md` — judge prompt + schema
Prompt scoring editorial quality `{ titleIsInsight, choiceSound, rationale }` (0.0–1.0 + string).

### T6 — `eval/run.md` — runner procedure (agent-orchestrated)
Per case: agent plays ② (emit ChartSpec) → `scoreSpec` → agent plays judge → collect → aggregate
(deterministic pass rate + mean titleIsInsight + mean choiceSound). + `report-example.md` shape.

### T7 — Baseline eval run + report
Act as ② for each case (apply suggest-chart + KB references → ChartSpec), run `scoreSpec`, act as judge.
Aggregate into `eval/baseline-report.md`.

### T8 — One improvement iteration if baseline weak
If pass rate or editorial means are low, strengthen `suggest-chart/SKILL.md`, re-run affected cases,
document the delta in the report.

## Verification
- `bun test` in `skills/dw-chart` → still 32 (with token); new pure tests in `skills/suggest-chart` green.
- Baseline report saved with per-case + aggregate numbers.
