# Eval runner — measure ②

This eval is **agent-orchestrated**: ② is the host agent, so the runner is a procedure, not a script.
The only code is `scoreSpec` (the deterministic gate). Run it to get ②'s baseline and to verify
improvements to `suggest-chart/SKILL.md`.

## Procedure

For each `cases/<id>.json`:

1. **Act as ②.** Read `../SKILL.md` (the runtime procedure) + `knowledge/references/chart-selection.md`
   + `design-conformance.md`. Given the case `data` + `intent`, emit one `ChartSpec` JSON — or a
   `{ "decision": "no-chart", "reason": "..." }`. Do not peek at `expect`; ② must not know the answer.
2. **Score deterministically.** Call `scoreSpec(emittedSpec, case.expect)` → `{ validates, familyMatch,
   guardrailsOk, pass, notes }`.
3. **Act as the judge.** Apply `judge.md` to `(data, intent, emittedSpec)` → `{ titleIsInsight,
   choiceSound, rationale }`.
4. **Record** the case row: id, emitted type (or `no-chart`), `pass`, `titleIsInsight`, `choiceSound`,
   and any deterministic `notes`.

In practice, run steps 1 and 3 as separate sub-agents per case (one ②, one judge) so the judge does not
see ②'s reasoning — only its output.

## Aggregate

- **Deterministic pass rate** = `pass` count / N.
- **Mean `titleIsInsight`** and **mean `choiceSound`** over all cases.

Write the result to `baseline-report.md` (see `report-example.md` for the shape).

## Improvement loop

If the pass rate is below 1.0 or either editorial mean is weak (< ~0.8), make ONE targeted change to
`../SKILL.md`, re-run the affected cases, and record the delta in the report. Change the skill, not the
cases — the cases are the fixed yardstick.
