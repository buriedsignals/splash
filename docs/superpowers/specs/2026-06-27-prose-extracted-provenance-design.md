# Prose-extracted provenance — design

**Date:** 2026-06-27
**Status:** approved (brainstorming)
**Scope:** `suggest-article`, `suggest-chart`, `knowledge/references/chart-selection.md`

## Goal

Help small newsrooms turn an article into a visual automatically, **including the
common case where the figures live only in the prose and no data table (CSV)
exists**. Today the flow refuses any chart without a cited source table — which
makes it useless for the most frequent real input (a reporter who wrote "cycling
rose from 12% in 2019 to 19% in 2024" with no dataset). We add a disciplined path
to chart figures that the article itself explicitly states, without ever inventing
data.

## The problem (observed)

End-to-end flow test "B″": an article contains a genuine two-point comparison in
prose (12% in 2019 → 19% in 2024) but no CSV. The flow declined at
`suggest-article` on the provenance rule ("every column MUST come from a cited
source table"). Correct against hallucination, but it throws away a legitimate,
clearly-stated comparison the newsroom would want charted.

## Principle: transcription, not inference

Charting values the journalist **literally wrote and stands behind** is
transcription, not fabrication. Fabrication is interpolating between them,
inventing a third value, or guessing a vague figure. The dividing line:

> We chart only literal, explicitly-labelled numeric values already present in the
> article text. Never an inferred, approximated, ranged, or interpolated value.

## Design

### 1. Three provenance tiers (was: two)

`suggest-article` proposals carry `provenance`:

| Tier | Source | Example | Handling |
| --- | --- | --- | --- |
| `table` | a cited newsroom CSV | dataset | auto (unchanged) |
| `prose` | explicit figures in the article text | "19% in 2024, up from 12% in 2019" | **confirm before producing** |
| (none) | vague / approximate / single value | "around a fifth", "50%" alone | **not charted** — stays prose |

### 2. Extraction rule (strict)

A prose comparison becomes a `prose` proposal **only if all hold**:

- **≥2 literal numeric values** present verbatim in the text (`12%`, `19%`);
- each value **attached to an explicit dimension label** in the same sentence/clause
  (a year, period, or category: `2019`, `2024`);
- **no inferred / approximated / ranged value** ("around a fifth", "a marked shift",
  "up by roughly", "10–15%") → not extractable, stays prose;
- a single scalar ("50%") → not extractable (already covered by
  `minClaimComparison = 1`).

The proposal carries the **reconstructed table** as `data` (CSV) plus
`proseEvidence`: for each value, the verbatim text snippet it came from (used by
the anti-hallucination check and shown at the confirmation gate). The CSV's column
names derive from the dimension label (e.g. `year`) and the measured quantity named
in the claim (e.g. `cycling_share`), so the table reads
`year,cycling_share\n2019,12\n2024,19`.

### 3. Confirmation gate (before production)

For `provenance: "prose"`, the proposal sets `needsConfirmation: true`. The flow
orchestrator **stops** and presents the reconstructed table to the journalist:

> "I read from your article: 2019 → 12%, 2024 → 19%. Chart it?"

`suggest-chart` and the producer run **only after an explicit OK**. `provenance:
"table"` proposals do **not** set `needsConfirmation` and stay fully automatic.

This is an orchestration-level contract, not a UI: the caller MUST surface the
reconstructed table and obtain confirmation before producing a `prose` proposal.
Documented in `suggest-article`'s output contract.

### 4. Anti-hallucination check (in the eval)

`eval/score.ts` `provenanceOk` is extended:

- `provenance: "table"` → unchanged (every column must exist in the cited table);
- `provenance: "prose"` → **every numeric value in `data` must appear in the article
  text** as a number, AND `needsConfirmation` must be `true`. The match is on the
  numeric token (the digits), tolerant of the article's formatting — `12` in the CSV
  matches `12%`, `12 %`, or `12,000` in the prose; it is NOT a raw substring match.
  A value the model produced that is not in the text → `provenanceOk = false` (a
  fail). This makes "transcription only" testable.

### 5. Honest provenance label + 2-point chart type

- The produced visual's source line reads **"Figures as reported in this article"**
  (or the source the article itself names), never a fabricated dataset attribution.
- `suggest-chart` (+ `chart-selection.md`): a 2-point comparison is rendered as a
  **slope / dumbbell / paired columns**, never a continuous line (which would imply
  a trend from two points). Producer routing (dw-chart vs chart-native) is
  unchanged.

## Components & data flow

```
article (+ optional CSV)
   │
   ▼  suggest-article
   ├─ table-bound claim     → provenance:"table",  needsConfirmation:false ─┐
   ├─ explicit prose figures → provenance:"prose",  needsConfirmation:true, │
   │                           data:CSV, proseEvidence:{value→snippet}      │
   └─ vague / single value   → not proposed (stays prose)                   │
                                                                            ▼
                          [prose] orchestrator shows reconstructed table → OK? ──no──▶ stop
                                                                            │ yes
                                                                            ▼
                                                          suggest-chart (2-pt → slope/dumbbell)
                                                                            ▼
                                                          producer (dw-chart | chart-native)
```

## Files affected

- `skills/suggest-article/SKILL.md` — the three tiers, the extraction rule, the
  `prose` proposal shape (`provenance`, `needsConfirmation`, `data`,
  `proseEvidence`), the confirmation-gate contract.
- `skills/suggest-article/eval/score.ts` — `provenanceOk` extension + verbatim
  check; a new eval case for a prose comparison and an anti-hallucination case.
- `skills/suggest-chart/SKILL.md` — 2-point chart-type guard (slope/dumbbell/paired
  columns, no continuous line) + the honest source-label note.
- `knowledge/references/chart-selection.md` — the 2-point guidance.

## Testing

| Case | Input | Expected |
| --- | --- | --- |
| Prose comparison | "12% in 2019 → 19% in 2024", no CSV | `prose` proposal + `needsConfirmation`; on OK → slope/dumbbell |
| Anti-hallucination | model emits a value absent from the text | `provenanceOk = false` (eval fail) |
| Vague | "around a fifth" | not proposed (stays prose) |
| Single value | "50%" alone | not proposed (`minClaimComparison`) |
| CSV (regression) | article + data table | unchanged, automatic, no gate |

## Out of scope

- A graphical confirmation UI (the gate is an orchestration prompt, not a widget).
- Fusing multiple prose figures across paragraphs into one series beyond a single
  explicit comparison.
- Extracting figures from embedded images/PDF tables (OCR).
- Changing producer routing (dw-chart vs chart-native) — untouched.
