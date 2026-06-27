---
name: suggest-article
description: Use to read an article plus its data and propose where a visual serves the narrative — emits a vetoable ProposalSet of opportunities (claim + data + intent), each feeding suggest-chart. Reads the text, binds claims to data, never invents either. Keywords article, opportunity, propose, narrative, where a chart belongs.
---

# suggest-article — read the article, propose where visuals belong

## Overview

The ANALYSE+PROPOSITION stage of ②. Given an **article** (Markdown/plain text) and its **data**
(one or more named CSV tables the newsroom owns), it reads the narrative, finds the quantified claims,
binds each to the data that substantiates it, and emits a **vetoable** `ProposalSet` of visual
opportunities. It never invents data or text. It carries **no chart type** — choosing the chart is the
downstream `suggest-chart` cut's job. The journalist accepts/edits/rejects; there is no hard gate.

## When to use

When a journalist hands an article and a data file and asks *where* a visual would serve the story.
Upstream of `suggest-chart`: each accepted proposal's `(data, intent)` is exactly what `suggest-chart`
consumes. Not for picking a chart type (that is `suggest-chart`), not for producing one (that is `dw-chart`).

## Gotcha

The hard part — and ②'s core value — is that **② binds data to claim itself**. It is not handed
pre-paired claim↔data: it reads the article, finds the claim, and extracts the supporting CSV subset
from the supplied tables. Two failure modes to avoid: (1) **inventing data** — every column in a
proposal's `data` MUST come from a cited source table (the eval's `provenanceOk` catches this);
(2) **over-proposing** — not every number earns a chart. Propose the strongest 1–3 claims, leave the
rest as prose, and record what you left out (and why) in `notes`.

## Provenance tiers (table, prose, none)

A claim's data can come from one of three sources. Bind to the strongest available:

- **`table`** (default) — a cited newsroom CSV. Every column must exist in that
  table. Fully automatic downstream. `provenance` omitted or `"table"`.
- **`prose`** — figures the article *explicitly states* in its text, with no CSV.
  Allowed ONLY as strict transcription (see rule below). Sets `provenance: "prose"`
  and `needsConfirmation: true`, and reconstructs the table into `data`.
- **none** — vague/approximate ("around a fifth"), a single scalar ("50%"), or any
  inferred value. NOT a proposal — stays prose.

### The prose extraction rule (transcription, never inference)

Emit a `prose` proposal ONLY if ALL hold:
- **≥2 literal numeric values** appear verbatim in the text (e.g. `12%`, `19%`);
- each value is **attached to an explicit dimension label** in the same clause
  (a year, period, or category: `2019`, `2024`);
- **no inferred / approximated / ranged value** ("around a fifth", "a marked shift",
  "10–15%") — those stay prose;
- a **single scalar** ("50%") does not qualify (a claim needs ≥1 comparison).

NEVER interpolate between values, invent a third point, or guess an unstated number.
The reconstructed `data` CSV's columns come from the dimension label and the measured
quantity named in the claim, e.g. `year,cycling_share\n2019,12\n2024,19`.

A `prose` proposal also carries `proseEvidence`: for each value, the verbatim text
snippet it was read from (shown at the confirmation gate; proves transcription).

## Architecture

`article + data → [ANALYSE: extract claims + bind data] → [PROPOSITION: pick the few that earn a visual]
→ ProposalSet`. The proposal is the bridge: it carries `claim + data + intent + anchor + provenance +
confidence`, which is byte-for-byte the prior cut's input plus editorial location. No chart family lives
here — opportunity-finding (here) and chart-choice (`suggest-chart`) stay cleanly separated.

## How it works

② is the host agent. Execute these steps in order; do not skip the provenance self-check.

1. **Segment** the article into paragraphs (blank-line or heading delimited); index them 0-based.
2. **ANALYSE — extract claims.** For each paragraph, list the factual, quantified assertions
   ("cross-border workers nearly doubled since 2015", "the budget overran by 40%"). Record the verbatim
   quote and its `paragraphIndex`. Ignore non-quantified prose (a declined comment, an opinion) — those
   are not visual opportunities.
3. **Bind data.** For each claim, find the supplied CSV table that substantiates it and extract the
   **actual** rows/columns into a self-contained CSV subset. Record `dataSource.table` and the columns
   used. Every column MUST exist in that table — never fabricate a series. If no table backs a claim,
   the claim is **not** a visual proposal.
4. **PROPOSITION — choose the few.** Read `knowledge/references/chart-selection.md` and
   `design-conformance.md` for *which claims warrant a visual* (a magnitude, a trend, a ranking, a
   part-to-whole, a correlation — claims with a comparison or a shape). Keep the **strongest 1–3**;
   a claim that reads fine as a single number or a sentence does not earn a chart.
5. **Write the intent.** For each kept claim, write a one-line editorial question the visual answers
   ("How did cross-border worker numbers grow since 2015?"). This is handed to `suggest-chart` verbatim —
   do NOT name a chart type in it.
6. **Anchor + confidence.** Set `anchor = { paragraphIndex, quote }` (advisory — the journalist places
   the visual). Set `confidence` (high/medium/low) by editorial strength of the opportunity. Write a
   one-line `rationale`.
7. **Self-check (provenance).** For every proposal, confirm each `data` column appears in its
   `dataSource.table` and the subset parses as CSV with ≥1 numeric column. Drop any proposal that fails.
8. **Notes.** In `ProposalSet.notes`, record the claims you deliberately did NOT propose and why
   (e.g. "the mayor's declined comment carries no data"). This is what keeps you honest about
   under-proposing.

Output one `ProposalSet`:

```jsonc
{
  "proposals": [
    {
      "anchor": { "paragraphIndex": 3, "quote": "cross-border workers nearly doubled since 2015" },
      "claim": "Cross-border workers grew from ~40k to ~73k since 2015",
      "intent": "How did cross-border worker numbers grow since 2015?",
      "data": "year,France,Switzerland\n2015,18,22\n2023,35,38",
      "dataSource": { "table": "cross-border.csv", "columns": ["year","France","Switzerland"] },
      "confidence": "high",
      "rationale": "A two-side growth claim over a continuous period is the article's spine."
    }
  ],
  "notes": "The mayor's declined comment carries no data and is left as prose."
}
```

**Confirmation gate (prose only).** A `prose` proposal sets `needsConfirmation: true`.
The caller MUST present the reconstructed table to the journalist and obtain an
explicit OK BEFORE running suggest-chart or producing anything — e.g. "I read from
your article: 2019 → 12%, 2024 → 19%. Chart it?". `table` proposals do not set
`needsConfirmation` and proceed automatically.

## Quick start

Given `article` (text) and `data` (`{ "<name>.csv": "<csv>" }`), follow How it works steps 1–8 and emit
the `ProposalSet`. For each accepted proposal, hand `(proposal.data, proposal.intent)` to `suggest-chart`.

## Tuning knobs (each is a single number)

- **maxProposals = 3** — the soft ceiling on opportunities per article (resist over-proposing).
- **minNumericColumns = 1** — a data subset needs at least this many numeric columns to be producible.
- **minClaimComparison = 1** — a claim needs at least this many comparable values (a shape) to earn a chart.

## Files

- `eval/score.ts` — `scoreProposalSet` (the deterministic gate measuring this skill).
- `eval/cases/*.json` — authored generic small-newsroom cases + gold standard.
- `eval/judge.md`, `eval/run.md`, `eval/baseline-report.md`, `eval/e2e-proof.md`.
