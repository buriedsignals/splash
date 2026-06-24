# ② Suggester — Article Reading (first cut) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first cut of ②'s ANALYSE+PROPOSITION stage: given an `article + data`, ② emits a vetoable `ProposalSet` of visual opportunities (`claim + data + intent + anchor + provenance + confidence`, NO chart family), each accepted proposal feeding the unchanged `suggest-chart → dw-chart` runtime.

**Architecture:** A pure, unit-tested deterministic scorer (`scoreProposalSet`) that reuses the prior cut's `validateChartSpec` as a neutral data-shape probe plus a provenance check against the cited source table; an agent-orchestrated runtime procedure (`SKILL.md`); an authored generic small-newsroom eval corpus (≥4 cases incl. a no-chart trap and a multi-table article); an LLM-judge; an agent runner; a baseline run; and a live e2e proof through the existing Datawrapper producer.

**Tech Stack:** Bun, TypeScript, `bun:test`, the existing `dw-chart` skill (`validateChartSpec`, `produceChart`), Datawrapper API.

## Global Constraints

- Runtime **Bun**; tests **`bun:test`**; **TDD** (failing test first).
- **English only** in all artefacts (code, comments, identifiers, docs, commits, branch).
- **No Claude/Anthropic mention** in any artefact (code, docs, commits, reports).
- **No tiers.** ② = the host agent (no separate LLM call at runtime).
- **Do NOT modify** `validateChartSpec`, `dw-chart`, or `suggest-chart/eval/*`. This cut is purely additive under a new `skills/suggest-article/`.
- Keep main's existing **40 tests green** (8 suggest-chart eval + 32 dw-chart).
- Thresholds are tuning knobs: **`τr = 0.7`, `τp = 0.5`** (lenient, start).
- KB references live at repo-root `knowledge/references/chart-selection.md` + `design-conformance.md` (referenced from skills as `knowledge/references/...`).
- Branch: `feat/suggester-article-reading` (from `main`). Do NOT merge.
- Commit frequently, conventional messages.

---

## File Structure

- `skills/suggest-article/SKILL.md` — the ANALYSE+PROPOSITION runtime procedure (8-section skill-autonome canon).
- `skills/suggest-article/eval/score.ts` — `scoreProposalSet` + `VisualProposal`/`ProposalSet`/`CaseExpect`/`ProposalScore` types; PURE; reuses `validateChartSpec` and `dataShape`.
- `skills/suggest-article/eval/tests/score.test.ts` — unit tests for `scoreProposalSet`.
- `skills/suggest-article/eval/package.json` — `{ type: module }` so `bun test` runs the eval tests (mirror the prior cut).
- `skills/suggest-article/eval/cases/*.json` — ≥4 authored generic cases (incl. a no-chart trap + a multi-table article).
- `skills/suggest-article/eval/judge.md` — judge prompt + 4-axis schema (`rightPlace`, `rightKind`, `rightDose`, `dataFit`).
- `skills/suggest-article/eval/run.md` — agent-orchestrated runner.
- `skills/suggest-article/eval/baseline-report.md` — written from the baseline run.
- `skills/suggest-article/eval/e2e-proof.md` — the live published-chart proof.

---

## Task 1: `scoreProposalSet` — the pure deterministic gate

**Files:**
- Create: `skills/suggest-article/eval/score.ts`
- Create: `skills/suggest-article/eval/package.json`
- Test: `skills/suggest-article/eval/tests/score.test.ts`

**Interfaces:**
- Consumes: `validateChartSpec` from `../../dw-chart/src/chart-spec` (returns `{ok:true,spec,warnings} | {ok:false,errors}`); `dataShape` from `../../dw-chart/src/csv` (returns `{columns:string[],rows:number}`).
- Produces:
  - `interface VisualProposal { anchor: { paragraphIndex: number; quote: string }; claim: string; intent: string; data: string; dataSource: { table: string; columns: string[] }; confidence: "high"|"medium"|"low"; rationale: string }`
  - `interface ProposalSet { proposals: VisualProposal[]; notes: string }`
  - `interface Opportunity { claimMatches: string[]; dataTable: string; dataColumns: string[] }`
  - `interface CaseExpect { opportunities: Opportunity[]; minProposals: number; maxProposals: number; noChartClaims: string[] }`
  - `interface ProposalScore { countOk: boolean; dataValid: boolean; provenanceOk: boolean; noChartRespected: boolean; recall: number; precision: number; pass: boolean; notes: string[] }`
  - `function scoreProposalSet(set: unknown, expect: CaseExpect, sourceTables: Record<string,string>, tau?: { r: number; p: number }): ProposalScore`

The data-shape probe: for each proposal, wrap `proposal.data` in the *simplest valid type* `column-chart` with placeholder `title`/`altInsight`, run `validateChartSpec`. `column-chart` is single-series (needs ≥2 columns, ≥1 value) — a neutral data-shape probe, NOT a chart-type choice. `dataValid` = every proposal's probe returns `ok:true`.

`provenanceOk`: for each proposal, every column in `proposal.dataSource.columns` must exist in `sourceTables[proposal.dataSource.table]`'s header (via `dataShape`), AND every column in the proposal's own `data` header must be a subset of that table's columns. Catches invented data.

`recall`: a gold opportunity is *matched* if some proposal has the same `dataSource.table` AND every keyword in the opportunity's `claimMatches` appears (case-insensitive substring) in the proposal's `claim + anchor.quote`. recall = matched gold / total gold.

`precision`: a proposal is *good* if it matches some gold opportunity (same predicate). precision = good proposals / total proposals (1.0 if zero proposals AND zero gold).

`countOk`: `minProposals ≤ N ≤ maxProposals`.

`noChartRespected`: no proposal's `claim + anchor.quote` contains any `noChartClaims` entry (case-insensitive substring).

`pass = countOk && dataValid && provenanceOk && noChartRespected && recall ≥ τr && precision ≥ τp` (defaults `τr=0.7`, `τp=0.5`).

- [ ] **Step 1: Write the `package.json`**

```json
{
  "name": "suggest-article-eval",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "bun test"
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `skills/suggest-article/eval/tests/score.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { scoreProposalSet, type ProposalSet, type CaseExpect } from "../score";

const sourceTables = {
  "cross-border.csv": "year,France,Switzerland\n2015,18,22\n2017,21,25\n2019,26,29",
  "rents.csv": "district,rent\nNorth,1450\nSouth,1200",
};

const goodSet: ProposalSet = {
  proposals: [
    {
      anchor: { paragraphIndex: 1, quote: "cross-border workers nearly doubled since 2015" },
      claim: "Cross-border workers grew on both sides since 2015",
      intent: "How did cross-border worker numbers grow since 2015?",
      data: "year,France,Switzerland\n2015,18,22\n2017,21,25\n2019,26,29",
      dataSource: { table: "cross-border.csv", columns: ["year", "France", "Switzerland"] },
      confidence: "high",
      rationale: "Two-side growth over a continuous period is the spine of the story.",
    },
    {
      anchor: { paragraphIndex: 2, quote: "rents are highest in the North district" },
      claim: "Rent varies by district, highest in the North",
      intent: "How does rent compare across districts?",
      data: "district,rent\nNorth,1450\nSouth,1200",
      dataSource: { table: "rents.csv", columns: ["district", "rent"] },
      confidence: "medium",
      rationale: "A magnitude comparison across districts reads well as bars.",
    },
  ],
  notes: "The mayor's declined comment carries no data and is left as prose.",
};

const expect2: CaseExpect = {
  opportunities: [
    { claimMatches: ["cross-border", "2015"], dataTable: "cross-border.csv", dataColumns: ["year", "France", "Switzerland"] },
    { claimMatches: ["rent", "district"], dataTable: "rents.csv", dataColumns: ["district", "rent"] },
  ],
  minProposals: 2,
  maxProposals: 3,
  noChartClaims: ["mayor declined to comment"],
};

describe("scoreProposalSet", () => {
  it("passes a well-formed set that hits both gold opportunities", () => {
    const r = scoreProposalSet(goodSet, expect2, sourceTables);
    expect(r.countOk).toBe(true);
    expect(r.dataValid).toBe(true);
    expect(r.provenanceOk).toBe(true);
    expect(r.noChartRespected).toBe(true);
    expect(r.recall).toBe(1);
    expect(r.precision).toBe(1);
    expect(r.pass).toBe(true);
  });

  it("flags invented data via provenanceOk when a column is not in the source table", () => {
    const bad: ProposalSet = {
      proposals: [
        {
          ...goodSet.proposals[0],
          data: "year,Germany\n2015,99\n2017,120",
          dataSource: { table: "cross-border.csv", columns: ["year", "Germany"] },
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(bad, { ...expect2, minProposals: 1, maxProposals: 3 }, sourceTables);
    expect(r.provenanceOk).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/provenance|not in source/i);
  });

  it("flags a non-producible data subset via dataValid (single column, no value)", () => {
    const bad: ProposalSet = {
      proposals: [
        {
          ...goodSet.proposals[0],
          data: "district\nNorth\nSouth",
          dataSource: { table: "rents.csv", columns: ["district"] },
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(bad, { ...expect2, minProposals: 1, maxProposals: 3 }, sourceTables);
    expect(r.dataValid).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("flags over-proposing onto a no-chart claim", () => {
    const bad: ProposalSet = {
      proposals: [
        goodSet.proposals[0],
        goodSet.proposals[1],
        {
          anchor: { paragraphIndex: 3, quote: "the mayor declined to comment on the overrun" },
          claim: "The mayor declined to comment",
          intent: "Visualise the mayor's refusal",
          data: "year,France\n2015,18",
          dataSource: { table: "cross-border.csv", columns: ["year", "France"] },
          confidence: "low",
          rationale: "n/a",
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(bad, expect2, sourceTables);
    expect(r.noChartRespected).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("computes recall below 1 when a gold opportunity is missed", () => {
    const partial: ProposalSet = { proposals: [goodSet.proposals[0]], notes: "" };
    const r = scoreProposalSet(partial, { ...expect2, minProposals: 1, maxProposals: 3 }, sourceTables);
    expect(r.recall).toBe(0.5);
    expect(r.pass).toBe(false); // recall 0.5 < τr 0.7
  });

  it("computes precision below 1 when a proposal matches no gold opportunity", () => {
    const spurious: ProposalSet = {
      proposals: [
        goodSet.proposals[0],
        goodSet.proposals[1],
        {
          anchor: { paragraphIndex: 4, quote: "an unrelated aside about parking" },
          claim: "Parking spaces something",
          intent: "Show parking",
          data: "year,France\n2015,18\n2017,21",
          dataSource: { table: "cross-border.csv", columns: ["year", "France"] },
          confidence: "low",
          rationale: "spurious",
        },
      ],
      notes: "",
    };
    const r = scoreProposalSet(spurious, { ...expect2, maxProposals: 3 }, sourceTables);
    expect(r.precision).toBeCloseTo(2 / 3, 5);
    expect(r.recall).toBe(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd skills/suggest-article/eval && bun test tests/score.test.ts`
Expected: FAIL — `Cannot find module "../score"` (score.ts not written).

- [ ] **Step 4: Write `score.ts`**

```ts
import { validateChartSpec } from "../../dw-chart/src/chart-spec";
import { dataShape } from "../../dw-chart/src/csv";

export interface VisualProposal {
  anchor: { paragraphIndex: number; quote: string };
  claim: string;
  intent: string;
  data: string; // CSV subset
  dataSource: { table: string; columns: string[] };
  confidence: "high" | "medium" | "low";
  rationale: string;
}

export interface ProposalSet {
  proposals: VisualProposal[];
  notes: string;
}

export interface Opportunity {
  claimMatches: string[];
  dataTable: string;
  dataColumns: string[];
}

export interface CaseExpect {
  opportunities: Opportunity[];
  minProposals: number;
  maxProposals: number;
  noChartClaims: string[];
}

export interface ProposalScore {
  countOk: boolean;
  dataValid: boolean;
  provenanceOk: boolean;
  noChartRespected: boolean;
  recall: number;
  precision: number;
  pass: boolean;
  notes: string[];
}

const DEFAULT_TAU = { r: 0.7, p: 0.5 };

// A gold opportunity is matched by a proposal iff same source table AND every
// keyword appears (case-insensitive substring) in the proposal's claim+quote.
function matches(p: VisualProposal, o: Opportunity): boolean {
  if (p.dataSource.table !== o.dataTable) return false;
  const hay = (p.claim + " " + p.anchor.quote).toLowerCase();
  return o.claimMatches.every((k) => hay.includes(k.toLowerCase()));
}

export function scoreProposalSet(
  set: unknown,
  expect: CaseExpect,
  sourceTables: Record<string, string>,
  tau: { r: number; p: number } = DEFAULT_TAU,
): ProposalScore {
  const notes: string[] = [];
  const proposals =
    set && typeof set === "object" && Array.isArray((set as ProposalSet).proposals)
      ? (set as ProposalSet).proposals
      : [];
  const n = proposals.length;

  // countOk
  const countOk = n >= expect.minProposals && n <= expect.maxProposals;
  if (!countOk)
    notes.push(`count ${n} outside [${expect.minProposals},${expect.maxProposals}]`);

  // dataValid — neutral data-shape probe via the prior cut's validator.
  // Wrap each subset in the simplest valid type (column-chart); this is a
  // data-shape probe, NOT a chart-type choice (the prior cut owns type).
  let dataValid = n > 0;
  for (const p of proposals) {
    const probe = {
      type: "column-chart",
      title: "probe",
      data: p.data,
      altInsight: "probe",
    };
    const v = validateChartSpec(probe);
    if (!v.ok) {
      dataValid = false;
      notes.push(`dataValid: proposal "${p.claim}" not producible: ${v.errors.join("; ")}`);
    }
  }

  // provenanceOk — proposal columns ⊆ cited source table columns (no invented data).
  let provenanceOk = true;
  for (const p of proposals) {
    const tableCsv = sourceTables[p.dataSource.table];
    if (!tableCsv) {
      provenanceOk = false;
      notes.push(`provenance: cited table "${p.dataSource.table}" not in source set`);
      continue;
    }
    const tableCols = dataShape(tableCsv).columns.map((c) => c.toLowerCase());
    const declared = p.dataSource.columns.map((c) => c.toLowerCase());
    const subsetCols =
      typeof p.data === "string" && p.data.includes(",")
        ? dataShape(p.data).columns.map((c) => c.toLowerCase())
        : [];
    for (const c of [...declared, ...subsetCols]) {
      if (!tableCols.includes(c)) {
        provenanceOk = false;
        notes.push(`provenance: column "${c}" not in source table "${p.dataSource.table}"`);
      }
    }
  }

  // noChartRespected — no proposal anchors onto a forbidden claim.
  let noChartRespected = true;
  for (const p of proposals) {
    const hay = (p.claim + " " + p.anchor.quote).toLowerCase();
    for (const nc of expect.noChartClaims) {
      if (hay.includes(nc.toLowerCase())) {
        noChartRespected = false;
        notes.push(`noChart: proposal touches a no-chart claim "${nc}"`);
      }
    }
  }

  // recall / precision vs gold
  const gold = expect.opportunities;
  const matchedGold = gold.filter((o) => proposals.some((p) => matches(p, o))).length;
  const recall = gold.length === 0 ? 1 : matchedGold / gold.length;
  const goodProposals = proposals.filter((p) => gold.some((o) => matches(p, o))).length;
  const precision = n === 0 ? (gold.length === 0 ? 1 : 0) : goodProposals / n;

  const pass =
    countOk &&
    dataValid &&
    provenanceOk &&
    noChartRespected &&
    recall >= tau.r &&
    precision >= tau.p;

  return { countOk, dataValid, provenanceOk, noChartRespected, recall, precision, pass, notes };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd skills/suggest-article/eval && bun test tests/score.test.ts`
Expected: PASS — 6 tests pass.

- [ ] **Step 6: Run the full repo suite to confirm nothing regressed**

Run: `cd /Users/rmdms/Sites/Professional/atelier && bun test`
Expected: 46 pass (40 prior + 6 new), 0 fail.

- [ ] **Step 7: Commit**

```bash
git add skills/suggest-article/eval/score.ts skills/suggest-article/eval/package.json skills/suggest-article/eval/tests/score.test.ts
git commit -m "feat(suggest-article): scoreProposalSet pure deterministic gate (dataValid/provenance/count/recall/precision)"
```

---

## Task 2: `SKILL.md` — the ANALYSE+PROPOSITION runtime procedure

**Files:**
- Create: `skills/suggest-article/SKILL.md`

**Interfaces:**
- Consumes: `knowledge/references/chart-selection.md` + `design-conformance.md` (for *which claims warrant a visual*, NOT for picking a type); the `VisualProposal`/`ProposalSet` shape from Task 1.
- Produces: the documented runtime an agent follows to turn `article + data` into a `ProposalSet`. Each accepted proposal's `(data, intent)` is byte-for-byte the prior cut's input.

- [ ] **Step 1: Write `SKILL.md`** (8-section skill-autonome canon; the proposal carries NO chart family)

```markdown
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

\`\`\`jsonc
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
\`\`\`

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
```

- [ ] **Step 2: Verify the file is valid Markdown and self-consistent**

Run: `cd /Users/rmdms/Sites/Professional/atelier && head -5 skills/suggest-article/SKILL.md && grep -c "^##" skills/suggest-article/SKILL.md`
Expected: frontmatter present; ≥8 second-level headings.

- [ ] **Step 3: Commit**

```bash
git add skills/suggest-article/SKILL.md
git commit -m "docs(suggest-article): ANALYSE+PROPOSITION runtime procedure (proposals carry no chart family)"
```

---

## Task 3: The eval corpus — ≥4 authored generic cases

**Files:**
- Create: `skills/suggest-article/eval/cases/town-growth.json`
- Create: `skills/suggest-article/eval/cases/school-budget.json`
- Create: `skills/suggest-article/eval/cases/clinic-waits.json`
- Create: `skills/suggest-article/eval/cases/festival-recap.json`

**Interfaces:**
- Consumes: the `CaseExpect` shape from Task 1 (`opportunities`, `minProposals`, `maxProposals`, `noChartClaims`) plus `article` (string) and `data` (`Record<string,string>`).
- Produces: 4 generic small-newsroom cases. Best-practice grounded (a claim earns a visual when it carries a comparison/trend/shape — `chart-selection.md`). One case (`school-budget`) is the **over-proposing/no-chart trap** (a declined-comment quote that must NOT be charted). One case (`town-growth`) is **multi-table**.

Each case is a complete `{ id, article, data, expect }`. Articles are 2–4 short paragraphs of a typical local story — NOT Annemasse.

- [ ] **Step 1: Write `town-growth.json`** (multi-table: a growth trend + a rent ranking; a no-chart aside)

```json
{
  "id": "town-growth",
  "article": "## A town under pressure\n\nLakeside has grown fast. The number of cross-border workers commuting out each day rose from about 18,000 in 2015 to 38,000 in 2023, with the steepest climb on the French side.\n\nHousing has not kept pace. Average monthly rent is now highest in the North district at 1,450 euros, well above the 1,200 euros in the South and 1,050 in the East.\n\nThe deputy mayor said the council was 'aware of residents' frustration' but declined to give a timeline.",
  "data": {
    "cross-border.csv": "year,France,Switzerland\n2015,12,6\n2017,15,8\n2019,19,10\n2021,24,12\n2023,26,12",
    "rents.csv": "district,rent\nNorth,1450\nSouth,1200\nEast,1050"
  },
  "expect": {
    "opportunities": [
      { "claimMatches": ["cross-border", "2015"], "dataTable": "cross-border.csv", "dataColumns": ["year", "France", "Switzerland"] },
      { "claimMatches": ["rent", "district"], "dataTable": "rents.csv", "dataColumns": ["district", "rent"] }
    ],
    "minProposals": 2,
    "maxProposals": 3,
    "noChartClaims": ["declined to give a timeline"]
  }
}
```

- [ ] **Step 2: Write `school-budget.json`** (the over-proposing TRAP: one real magnitude claim + a quote that must not be charted + a lone number)

```json
{
  "id": "school-budget",
  "article": "## Where the school money went\n\nThe district spent 4.2 million euros on schools last year. Maintenance took the largest share at 1.8 million euros, ahead of salaries at 1.3 million, supplies at 0.6 million and transport at 0.5 million.\n\nThe budget was approved unanimously, the chair noted, calling it 'a responsible plan for our children'.\n\nOne parent group has asked for the next meeting to be held in the evening.",
  "data": {
    "spending.csv": "category,euros_millions\nMaintenance,1.8\nSalaries,1.3\nSupplies,0.6\nTransport,0.5"
  },
  "expect": {
    "opportunities": [
      { "claimMatches": ["maintenance", "largest"], "dataTable": "spending.csv", "dataColumns": ["category", "euros_millions"] }
    ],
    "minProposals": 1,
    "maxProposals": 1,
    "noChartClaims": ["responsible plan for our children", "evening"]
  }
}
```

- [ ] **Step 3: Write `clinic-waits.json`** (a single clear trend claim)

```json
{
  "id": "clinic-waits",
  "article": "## The wait gets longer\n\nThe average wait for a first appointment at the regional clinic has climbed every year since 2019, from 11 days to 31 days in 2024.\n\nManagers blame a shortage of specialists; the regional health board says it is recruiting.",
  "data": {
    "waits.csv": "year,wait_days\n2019,11\n2020,14\n2021,19\n2022,24\n2023,28\n2024,31"
  },
  "expect": {
    "opportunities": [
      { "claimMatches": ["wait", "2019"], "dataTable": "waits.csv", "dataColumns": ["year", "wait_days"] }
    ],
    "minProposals": 1,
    "maxProposals": 1,
    "noChartClaims": ["recruiting"]
  }
}
```

- [ ] **Step 4: Write `festival-recap.json`** (a magnitude ranking + an attendance trend)

```json
{
  "id": "festival-recap",
  "article": "## A bigger year for the festival\n\nThe summer festival drew 42,000 visitors this year, up from 28,000 in 2019 — its strongest turnout since it began.\n\nMusic was the biggest draw, accounting for 19,000 visitors, ahead of food stalls at 12,000, crafts at 7,000 and the children's area at 4,000.\n\nOrganisers thanked the 300 volunteers who made it possible.",
  "data": {
    "attendance.csv": "year,visitors\n2019,28000\n2021,33000\n2022,38000\n2023,42000",
    "by_area.csv": "area,visitors\nMusic,19000\nFood,12000\nCrafts,7000\nChildren,4000"
  },
  "expect": {
    "opportunities": [
      { "claimMatches": ["visitors", "2019"], "dataTable": "attendance.csv", "dataColumns": ["year", "visitors"] },
      { "claimMatches": ["music", "biggest"], "dataTable": "by_area.csv", "dataColumns": ["area", "visitors"] }
    ],
    "minProposals": 2,
    "maxProposals": 3,
    "noChartClaims": ["thanked the 300 volunteers"]
  }
}
```

- [ ] **Step 5: Validate every case file parses as JSON**

Run: `cd /Users/rmdms/Sites/Professional/atelier && for f in skills/suggest-article/eval/cases/*.json; do bun -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('ok $f')"; done`
Expected: `ok ...` for all 4 files, no parse error.

- [ ] **Step 6: Commit**

```bash
git add skills/suggest-article/eval/cases/
git commit -m "feat(suggest-article): eval corpus — 4 generic small-newsroom cases (multi-table + over-proposing trap)"
```

---

## Task 4: `judge.md` — the editorial LLM-judge

**Files:**
- Create: `skills/suggest-article/eval/judge.md`

**Interfaces:**
- Consumes: `(article, data, ProposalSet, gold)`.
- Produces: a 4-axis JSON verdict `{ rightPlace, rightKind, rightDose, dataFit, rationale }`, each `0.0`–`1.0`.

- [ ] **Step 1: Write `judge.md`**

```markdown
# Eval judge — editorial soundness of a ②-emitted ProposalSet

You are an experienced data-journalism editor. The deterministic gate (`scoreProposalSet`) has already
checked that the set is the right size, the data is producible and provenance-clean, no forbidden claim
was charted, and recall/precision against the gold marks. Your job is the part code cannot judge: **were
these the right opportunities, in the right places, in the right dose, backed by the right data?**

## Input

You are given:

- `article` — the text the journalist supplied.
- `data` — the named CSV tables.
- `proposalSet` — the `{ proposals, notes }` ② produced.
- `gold` — the case's authored opportunities (for reference; the marks are best-practice-grounded, not absolute truth).

## What you score

Four axes, each `0.0`–`1.0` (continuous, not pass/fail):

- **`rightPlace`** — are the `anchor`s near where the visual actually serves the narrative? A proposal
  anchored to the paragraph that makes the claim scores high; one anchored to an unrelated paragraph scores low.
- **`rightKind`** — **does this claim deserve a visual at all** (versus being better left as prose)? A
  comparison, a trend, a ranking, or a part-to-whole earns a visual; a single number, an opinion, or a
  declined comment does not. `1.0` = every proposal is a claim a visual genuinely serves; `0.0` =
  proposals that should have stayed prose. You judge *whether it deserves a visual*, NOT which chart type
  (that is the downstream cut's call).
- **`rightDose`** — not over- or under-proposing. Were the **strongest** claims lifted and the noise left
  alone? Check `notes` for what was deliberately not proposed. `1.0` = the few right claims; `0.0` =
  charted everything, or missed the spine of the story.
- **`dataFit`** — does each proposal's `data` subset genuinely **back its claim** (right cut of the right
  table), not merely validate? A subset that is the wrong columns or wrong rows for the claim scores low
  even if it parses.

## Output

Emit exactly this JSON, nothing else:

```json
{ "rightPlace": 0.0, "rightKind": 0.0, "rightDose": 0.0, "dataFit": 0.0, "rationale": "one or two sentences" }
```

Be candid. Do not inflate scores. The `rationale` must name the concrete reason for each number.
```

- [ ] **Step 2: Verify schema keys present**

Run: `cd /Users/rmdms/Sites/Professional/atelier && grep -E "rightPlace|rightKind|rightDose|dataFit" skills/suggest-article/eval/judge.md | head`
Expected: each of the 4 axes appears.

- [ ] **Step 3: Commit**

```bash
git add skills/suggest-article/eval/judge.md
git commit -m "docs(suggest-article): LLM-judge prompt + 4-axis schema (rightPlace/rightKind/rightDose/dataFit)"
```

---

## Task 5: `run.md` — the agent-orchestrated runner

**Files:**
- Create: `skills/suggest-article/eval/run.md`

**Interfaces:**
- Consumes: `cases/*.json`, `../SKILL.md`, `knowledge/references/*`, `scoreProposalSet` (Task 1), `judge.md` (Task 4).
- Produces: the procedure that yields `baseline-report.md`.

- [ ] **Step 1: Write `run.md`** (same pattern as `suggest-chart/eval/run.md`)

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add skills/suggest-article/eval/run.md
git commit -m "docs(suggest-article): agent-orchestrated eval runner (scoreProposalSet + judge + aggregate)"
```

---

## Task 6: Baseline run + report

**Files:**
- Create: `skills/suggest-article/eval/baseline-report.md`

**Interfaces:**
- Consumes: Tasks 1–5. The implementer (acting as ② then as judge per `run.md`) produces real ProposalSets, scores them, and aggregates.

- [ ] **Step 1: For each of the 4 cases, act as ②** — read `SKILL.md` + the two KB refs, read ONLY the case `article` + `data` (NOT `expect`), and emit a `ProposalSet` JSON. Save each to a scratch file (e.g. `/private/tmp/.../emit-<id>.json`).

- [ ] **Step 2: Score each emitted set deterministically** with a one-off harness that calls `scoreProposalSet`. Create a throwaway script in the scratchpad (NOT committed):

```ts
// scratch: score-all.ts
import { scoreProposalSet } from "/Users/rmdms/Sites/Professional/atelier/skills/suggest-article/eval/score";
import { readFileSync } from "fs";
const dir = "/Users/rmdms/Sites/Professional/atelier/skills/suggest-article/eval/cases";
for (const id of ["town-growth", "school-budget", "clinic-waits", "festival-recap"]) {
  const c = JSON.parse(readFileSync(`${dir}/${id}.json`, "utf8"));
  const emitted = JSON.parse(readFileSync(`/path/to/emit-${id}.json`, "utf8"));
  const r = scoreProposalSet(emitted, c.expect, c.data);
  console.log(id, JSON.stringify(r));
}
```

Run: `bun /private/tmp/.../score-all.ts`
Expected: a `ProposalScore` line per case.

- [ ] **Step 3: Act as the judge** per `judge.md` for each `(article, data, emittedSet, gold)` → record the 4 axes. Run as a separate sub-agent that sees only ②'s output + the gold, not ②'s reasoning.

- [ ] **Step 4: Aggregate and write `baseline-report.md`** — per-case table (id, N, pass, recall, precision, rightPlace, rightKind, rightDose, dataFit, notes), the aggregate (pass rate, mean recall/precision, mean of each judge axis), a "Reading" section, and the **self-referential caveat** verbatim from the spec §4.5.

- [ ] **Step 5: Improvement loop (conditional).** If pass rate < 1.0 OR any judge mean < ~0.8: make ONE targeted edit to `SKILL.md`, re-run the affected cases, record the delta in the report under an "Iteration" section. Otherwise write "None taken" with the honest reasoning (chasing residuals tunes to the yardstick).

- [ ] **Step 6: Commit**

```bash
git add skills/suggest-article/eval/baseline-report.md skills/suggest-article/SKILL.md
git commit -m "eval(suggest-article): baseline run — deterministic pass + judge means, self-referential caveat stated"
```

---

## Task 7: Live e2e proof through the real producer

**Files:**
- Create: `skills/suggest-article/eval/e2e-proof.md`

**Interfaces:**
- Consumes: one case's emitted `ProposalSet` (Task 6), one accepted proposal's `(data, intent)`, the prior cut `suggest-chart` (act as ② to choose a type → a `ChartSpec`), `produceChart` from `dw-chart/src/produce.ts`, the real Datawrapper API (token in `/atelier/.env`).
- Produces: a real published chart URL, confirmed, then deleted; the proof file.

- [ ] **Step 1: Pick one accepted proposal** from a baseline case (e.g. `clinic-waits` — a clean single trend). Take its `(proposal.data, proposal.intent)`.

- [ ] **Step 2: Act as the prior cut `suggest-chart`** — read `skills/suggest-chart/SKILL.md` + the KB refs, and from `(data, intent)` emit a valid `ChartSpec` (e.g. `d3-lines`, title = the insight, `altInsight`, `baseColor` Okabe-Ito). Confirm it passes `validateChartSpec`.

- [ ] **Step 3: Produce the real chart.** Create a throwaway script in the scratchpad:

```ts
// scratch: e2e.ts
import { produceChart } from "/Users/rmdms/Sites/Professional/atelier/skills/dw-chart/src/produce";
const spec = { /* the ChartSpec from Step 2 */ };
const r = await produceChart(spec as any, "/private/tmp/.../e2e.png");
console.log(JSON.stringify(r, null, 2));
```

Run: `cd /Users/rmdms/Sites/Professional/atelier && set -a; source .env; set +a; bun /private/tmp/.../e2e.ts`
Expected: a `ProduceResult` with `chartId`, `publicUrl`, `embed`, `pngPath`; the PNG exists on disk.

- [ ] **Step 4: Confirm the chart is real.** `curl -sI` the `publicUrl` (or fetch it) → HTTP 200. Confirm the PNG file is non-empty (`ls -l` the path).

- [ ] **Step 5: Delete the test chart.** DELETE `https://api.datawrapper.de/v3/charts/<chartId>` with the bearer token:

```bash
cd /Users/rmdms/Sites/Professional/atelier && set -a; source .env; set +a; \
curl -s -X DELETE -H "Authorization: Bearer $DATAWRAPPER_API_TOKEN" \
  https://api.datawrapper.de/v3/charts/<chartId> -o /dev/null -w "%{http_code}\n"
```
Expected: `204`.

- [ ] **Step 6: Write `e2e-proof.md`** — the chosen proposal, the derived `ChartSpec`, the published URL (captured before deletion), the HTTP 200 confirmation, the deletion 204, and a one-line statement that the full new loop (`article → ProposalSet → accepted proposal → suggest-chart → dw-chart → real chart`) ran end-to-end.

- [ ] **Step 7: Commit**

```bash
git add skills/suggest-article/eval/e2e-proof.md
git commit -m "test(suggest-article): live e2e — accepted proposal → suggest-chart → dw-chart → real published chart"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the full repo suite**

Run: `cd /Users/rmdms/Sites/Professional/atelier && bun test`
Expected: 46 pass (40 prior + 6 new), 0 fail. The prior 8 suggest-chart eval + 32 dw-chart tests are untouched and green.

- [ ] **Step 2: Confirm no prohibited content**

Run: `cd /Users/rmdms/Sites/Professional/atelier && grep -ri "claude\|anthropic" skills/suggest-article/ || echo "clean"`
Expected: `clean`.

- [ ] **Step 3: Confirm the prior cut + dw-chart are unmodified**

Run: `cd /Users/rmdms/Sites/Professional/atelier && git diff --name-only main -- skills/suggest-chart skills/dw-chart knowledge | grep -v "^skills/suggest-article" || echo "prior cuts untouched"`
Expected: `prior cuts untouched` (no files outside `suggest-article/` changed).

- [ ] **Step 4: Confirm branch state** — all work committed on `feat/suggester-article-reading`, NOT merged to `main`.

Run: `git -C /Users/rmdms/Sites/Professional/atelier status --short && git -C /Users/rmdms/Sites/Professional/atelier log --oneline main..HEAD`
Expected: clean working tree; the new commits listed.

---

## Self-Review

**Spec coverage:** §2.3 proposal shape → Task 1 types + Task 2 SKILL. §4.2 deterministic gate (`dataValid`/`provenanceOk`/`countOk`/`noChartRespected`/recall/precision) → Task 1. §4.1 case shape + R1 generic authorship → Task 3 (4 cases, multi-table `town-growth`, no-chart trap `school-budget`). §4.3 judge 4 axes (rightKind reworded "deserve a visual?") → Task 4. §4.4 runner → Task 5. §5 success criteria (SKILL exists, scoreProposalSet pure+tested, ≥4 cases, judge, e2e, baseline, prior tests green) → Tasks 2,1,3,4,7,6,8. §4.5 caveat → Task 6 Step 4.

**Placeholder scan:** all code shown in full; the only deferred content is the implementer's real ② output in Tasks 6–7 (irreducibly agent-produced at run time — the harness and commands are concrete).

**Type consistency:** `VisualProposal`/`ProposalSet`/`Opportunity`/`CaseExpect`/`ProposalScore`/`scoreProposalSet` names and signatures match between Task 1 definition, Task 1 tests, Task 5 runner, and Task 6 harness. Import paths `../../dw-chart/src/chart-spec` and `../../dw-chart/src/csv` verified against the repo layout.
