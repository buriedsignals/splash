# Eval baseline — ② suggester (first cut)

> Run date: 2026-06-23. Branch `feat/suggester-runtime`. Procedure: `run.md`.
> ② = the host agent applying `../SKILL.md` + `knowledge/references/chart-selection.md`
> + `design-conformance.md`. Deterministic gate = `scoreSpec` (calls the real `validateChartSpec`).
> Editorial scores = a separate judge sub-agent applying `judge.md` (it saw only ②'s output, not its reasoning).

## Per case

| id | emitted type | pass | titleIsInsight | choiceSound | notes |
|---|---|---|---|---|---|
| unemployment-trend | d3-lines | yes | 1.00 | 1.00 | line + Covid annotation |
| city-budgets | column-chart | yes | 0.90 | 1.00 | sorted desc, value labels |
| region-rents | d3-bars | yes | 1.00 | 1.00 | ranking, sorted desc |
| income-life | d3-scatter-plot | yes | 0.85 | 1.00 | trendline would help |
| commute-distribution | column-chart | yes | 0.95 | 0.90 | ordered bins as histogram |
| energy-mix | d3-donuts | yes | 1.00 | 0.85 | sorted bars read shares better |
| cross-border-workers | multiple-lines | yes | 0.85 | 1.00 | soft title (no magnitude) |
| mayor-quote | no-chart | yes | 0.90 | 1.00 | correct decline |

## Aggregate

- Deterministic pass rate: 8/8 = 1.00
- Mean titleIsInsight: 0.93
- Mean choiceSound: 0.96

## Reading

All eight cases pass the deterministic gate (valid spec, correct family, zero guardrail warnings),
including the `no-chart` case where ② correctly declined to visualise a structureless quote.
Both editorial means sit well above the 0.8 weak-threshold from `run.md`.

The judge's only soft spots are stylistic, not structural: two titles report a direction without a
magnitude (`income-life`, `cross-border-workers`), and one chart-family pick is "good not optimal"
(`energy-mix` donut vs sorted bars — both are inside the part-to-whole family the guardrails allow).

## Iteration

None taken. The baseline clears the bar on every axis (pass 1.00, both editorial means > 0.9). A skill
change to chase the residual 0.07 would tune `SKILL.md` to this fixed eight-case yardstick rather than
improve ② generally — the honest call is to bank the baseline and revisit when the corpus grows or a
real weakness (a failing case, a mean below 0.8) appears.
