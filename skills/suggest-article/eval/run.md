# Eval runner — measure ② (article reading)

This eval is **agent-orchestrated**: ② is the host agent, so the runner is a procedure, not a script.
The only code is `scoreProposalSet` (the deterministic gate). Run it to get ②'s baseline and to verify
improvements to `suggest-article/SKILL.md`.

## Procedure

For each `cases/<id>.json`:

1. **Act as ②.** Read `../SKILL.md` (the runtime procedure) + `knowledge/references/chart-selection.md`
   + `design-conformance.md` for *which claims warrant a visual*. Given the case `article` + `data`,
   emit one `ProposalSet` JSON. Do NOT peek at `expect`; ② must not know the answer.
2. **Score deterministically.** Call `scoreProposalSet(emittedSet, case.expect, case.data)` →
   `{ countOk, dataValid, provenanceOk, noChartRespected, recall, precision, pass, notes }`. `case.data`
   is the named-CSV source set used for the provenance check.
3. **Act as the judge.** Apply `judge.md` to `(article, data, emittedSet, case.expect.opportunities)` →
   `{ rightPlace, rightKind, rightDose, dataFit, rationale }`.
4. **Record** the case row: id, N proposals, `pass`, recall, precision, the four judge axes, and any
   deterministic `notes`.

In practice, run steps 1 and 3 as separate sub-agents per case (one ②, one judge) so the judge does not
see ②'s reasoning — only its output and the gold marks.

## Aggregate

- **Deterministic pass rate** = `pass` count / N.
- **Mean recall** and **mean precision**.
- **Means of the four judge axes** (`rightPlace`, `rightKind`, `rightDose`, `dataFit`).

Write the result to `baseline-report.md`. State the **self-referential caveat**: we authored the gold
marks, so the harness measures *relative improvement against a fixed best-practice-grounded bar*, not
absolute truth.

## Improvement loop

If the pass rate is below 1.0 or any judge mean is weak (< ~0.8), make ONE targeted change to
`../SKILL.md`, re-run the affected cases, and record the delta in the report. **Change the skill, not the
cases** — the cases are the fixed yardstick.
