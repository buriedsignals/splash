# Eval baseline — ② suggester, article reading (first cut)

> Run date: 2026-06-23. Branch `feat/suggester-article-reading`. Procedure: `run.md`.
> ② = the host agent applying `../SKILL.md` + `knowledge/references/chart-selection.md` +
> `design-conformance.md`, given `article + data` and **never** the case `expect`. Deterministic gate =
> `scoreProposalSet` (calls the real `validateChartSpec` for the data-shape probe + provenance/count/no-chart
> + recall/precision vs the gold marks, τr=0.7, τp=0.5). Editorial scores = a separate judge sub-agent per
> case applying `judge.md` (it saw only ②'s emitted `ProposalSet` + the gold marks, not ②'s reasoning).

## Per case

| id | N | pass | recall | precision | rightPlace | rightKind | rightDose | dataFit | notes |
|---|---|---|---|---|---|---|---|---|---|
| town-growth (multi-table) | 2 | yes | 1.00 | 1.00 | 0.95 | 1.00 | 0.90 | 0.75 | growth trend + rent ranking; mayor quote left as prose |
| school-budget (over-proposing trap) | 1 | yes | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | one spending breakdown; chair quote + meeting-time both declined |
| clinic-waits | 1 | yes | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | single clear trend; "recruiting" response left as prose |
| festival-recap (multi-table) | 2 | yes | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.90 | attendance trend + area ranking; 300 volunteers left as prose |

## Aggregate

- Deterministic pass rate: **4/4 = 1.00**
- Mean recall: **1.00** · Mean precision: **1.00**
- Mean rightPlace: **0.99** · Mean rightKind: **1.00** · Mean rightDose: **0.98** · Mean dataFit: **0.91**

## Reading

All four cases clear the deterministic gate: every proposed data subset is downstream-producible
(`validateChartSpec` data-shape probe), provenance-clean (every column ⊆ its cited source table — no
invented data), within the count bounds, and respects every no-chart claim. Recall and precision are 1.00
on every case — ② found each marked opportunity and proposed nothing spurious.

The **over-proposing trap** (`school-budget`) is the headline result: ② lifted the one real breakdown
claim and declined all three traps — the 4.2-million single total, the chair's opinion quote, and the
parent group's meeting-time request — recording each refusal in `notes`. This is the behaviour the cut
exists to prove: ② resists charting noise.

Both editorial means clear the 0.8 weak-threshold from `run.md` comfortably. The only sub-0.8 mark is
`town-growth`'s `dataFit` (0.75): the judge flagged that `cross-border.csv` holds the series in **thousands**
(`12+6 = 18` for 2015, reconciling with the prose's "18,000") so the unit scaling is implicit. That is a
case-authoring nuance (the sample data uses an unstated ×1000 unit), not a ② failure — ② cut the correct
table and columns, and the claim ("more than doubled", 18k→38k) is genuinely backed. At the aggregate
(`dataFit` mean 0.91) it is well inside tolerance.

## Iteration

**None taken.** The baseline clears the bar on every axis (deterministic pass 4/4; all four judge means
≥ 0.91; no individual axis mean below 0.8). The single 0.75 cell is a data-authoring unit nuance, not a
skill weakness — editing `SKILL.md` to chase it would tune the skill to this four-case yardstick rather
than improve ② generally. The honest call is to bank the baseline and revisit when the corpus grows or a
real weakness (a failing case, or an axis mean below 0.8) appears.

## Honesty caveat (self-referential harness)

We authored both the sample articles **and** their gold marks, on **generic small-newsroom stories**
(not the grant's Annemasse pilot). The harness is therefore **self-referential**: we set the yardstick and
grade ② against it. We accept this explicitly. Mitigation, per the design spec §4.5:

1. The gold marks are **derived from documented journalism best-practice** (the KB references
   `chart-selection.md` / `design-conformance.md` — a claim earns a visual when it carries a comparison,
   trend, ranking or part-to-whole shape), not personal taste, so the yardstick is defensible and
   reproducible.
2. The harness is a **relative-improvement instrument** — it tells us whether a change to `suggest-article`
   makes ② *better against a fixed bar*, not whether ② is *absolutely* right.
3. Keyword-not-exact matching, lenient thresholds (τr=0.7, τp=0.5), and the LLM-judge's final say on
   defensible extras all loosen the grip of the marks.

The corpus is a **yardstick, not ground truth**. The first baseline is **directional**: four cases is a
tiny, low-variance-favouring sample, and the cases were authored by the same party that grades them. The
priority next step is to grow and diversify the generic corpus and re-validate on cases ② was **not**
written to pass — the same caveat the prior cut flagged honestly.
