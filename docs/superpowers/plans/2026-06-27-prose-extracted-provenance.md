# Prose-extracted provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the flow chart figures the article explicitly states (no CSV needed), via a new `prose` provenance tier with a confirmation gate and a testable anti-hallucination check.

**Architecture:** Extend `suggest-article`'s proposal model with a third provenance tier (`prose`) alongside `table`. The testable core is `eval/score.ts`'s `provenanceOk`: for `prose` proposals it requires `needsConfirmation: true` and that every numeric value in the reconstructed CSV appears as a number in the article text. The skill docs (`suggest-article`, `suggest-chart`, `chart-selection.md`) carry the procedure, the strict extraction rule, the gate contract, the honest source label, and the 2-point chart-type guard.

**Tech Stack:** TypeScript, `bun:test`. Run tests from `skills/suggest-article` with `bun test`.

## Global Constraints

- Transcription only: chart only literal numeric values present verbatim in the article text; never inferred, approximated, ranged, or interpolated values.
- `prose` proposals MUST set `needsConfirmation: true`; the flow MUST confirm the reconstructed table with the journalist before producing.
- `table` provenance behaviour is unchanged (fully automatic, no gate).
- The produced visual's source line for a prose chart reads "Figures as reported in this article" (or the source the article itself names), never a fabricated dataset attribution.
- A 2-point comparison renders as slope / dumbbell / paired columns — never a continuous line.
- Numeric match is on the numeric token (digits), tolerant of `%`, spaces, and thousands commas (`12` matches `12%`, `12 %`, `12,000`); not a raw substring match.

---

### Task 1: Prose provenance in `eval/score.ts` (the testable core)

**Files:**
- Modify: `skills/suggest-article/eval/score.ts`
- Test: `skills/suggest-article/eval/tests/score-prose.test.ts` (create)

**Interfaces:**
- Consumes: existing `scoreProposalSet(set, expect, sourceTables, tau)` and `VisualProposal`.
- Produces:
  - `VisualProposal` gains `provenance?: "table" | "prose"` (default `"table"`) and `needsConfirmation?: boolean`.
  - `scoreProposalSet` signature becomes `scoreProposalSet(set, expect, sourceTables, articleText = "", tau = DEFAULT_TAU)`.
  - Helpers `articleNumbers(text: string): Set<string>` and `dataNumbers(csv: string): string[]`.

- [ ] **Step 1: Write the failing tests**

Create `skills/suggest-article/eval/tests/score-prose.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { scoreProposalSet, type ProposalSet, type CaseExpect } from "../score";

const expect0: CaseExpect = {
  opportunities: [],
  minProposals: 0,
  maxProposals: 2,
  noChartClaims: [],
};
const article =
  "Cycling accounted for 19% of all commuting trips in 2024, up from 12% in 2019.";

function proseSet(over: Partial<ProposalSet["proposals"][number]> = {}): ProposalSet {
  return {
    proposals: [
      {
        anchor: { paragraphIndex: 0, quote: "19% ... up from 12% in 2019" },
        claim: "Cycling's commute share rose from 12% in 2019 to 19% in 2024",
        intent: "How did cycling's commute share change from 2019 to 2024?",
        data: "year,cycling_share\n2019,12\n2024,19",
        dataSource: { table: "article-prose", columns: ["year", "cycling_share"] },
        provenance: "prose",
        needsConfirmation: true,
        confidence: "medium",
        rationale: "An explicit two-point comparison stated in the article.",
        ...over,
      },
    ],
    notes: "",
  };
}

describe("provenanceOk — prose tier", () => {
  it("passes when every value is in the text and needsConfirmation is set", () => {
    const s = scoreProposalSet(proseSet(), expect0, {}, article);
    expect(s.provenanceOk).toBe(true);
  });

  it("fails when a value is NOT present in the article text (anti-hallucination)", () => {
    const s = scoreProposalSet(
      proseSet({ data: "year,cycling_share\n2019,12\n2024,31" }),
      expect0,
      {},
      article,
    );
    expect(s.provenanceOk).toBe(false);
    expect(s.notes.some((m) => m.includes("31"))).toBe(true);
  });

  it("fails a prose proposal that does not set needsConfirmation", () => {
    const s = scoreProposalSet(
      proseSet({ needsConfirmation: undefined }),
      expect0,
      {},
      article,
    );
    expect(s.provenanceOk).toBe(false);
    expect(s.notes.some((m) => m.includes("needsConfirmation"))).toBe(true);
  });

  it("still enforces the table tier (regression): unknown table fails", () => {
    const tableSet: ProposalSet = {
      proposals: [
        {
          anchor: { paragraphIndex: 0, quote: "x" },
          claim: "x",
          intent: "x",
          data: "a,b\n1,2",
          dataSource: { table: "missing.csv", columns: ["a", "b"] },
          confidence: "high",
          rationale: "x",
        },
      ],
      notes: "",
    };
    const s = scoreProposalSet(tableSet, expect0, {}, "");
    expect(s.provenanceOk).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/suggest-article && bun test eval/tests/score-prose.test.ts`
Expected: FAIL — `provenance`/`needsConfirmation` are not on `VisualProposal`, and `scoreProposalSet` ignores `articleText` (the prose branch does not exist), so the prose cases do not behave as asserted.

- [ ] **Step 3: Extend the `VisualProposal` interface**

In `skills/suggest-article/eval/score.ts`, add the two optional fields to `VisualProposal` (after `dataSource`):

```ts
export interface VisualProposal {
  anchor: { paragraphIndex: number; quote: string };
  claim: string;
  intent: string;
  data: string; // CSV subset
  dataSource: { table: string; columns: string[] };
  provenance?: "table" | "prose"; // default "table"; "prose" = figures stated in the article
  needsConfirmation?: boolean; // prose proposals MUST set true (gate before producing)
  proseEvidence?: Record<string, string>; // prose only: value -> the verbatim text snippet it came from
  confidence: "high" | "medium" | "low";
  rationale: string;
}
```

- [ ] **Step 4: Add the two numeric helpers**

In `skills/suggest-article/eval/score.ts`, add above `scoreProposalSet`:

```ts
// numeric tokens present in the article text, normalised (commas stripped).
// "19% ... 12% in 2019" -> {"19","12","2019"}. Tolerant of %, spaces, thousands commas.
function articleNumbers(text: string): Set<string> {
  const tokens = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return new Set(tokens.map((t) => t.replace(/,/g, "")));
}

// every numeric cell in the CSV's data rows (header skipped), normalised.
function dataNumbers(csv: string): string[] {
  if (typeof csv !== "string") return [];
  const out: string[] = [];
  for (const line of csv.trim().split("\n").slice(1))
    for (const cell of line.split(",")) {
      const t = cell.trim();
      if (t !== "" && Number.isFinite(Number(t))) out.push(t.replace(/,/g, ""));
    }
  return out;
}
```

- [ ] **Step 5: Add `articleText` to the signature**

In `skills/suggest-article/eval/score.ts`, change the `scoreProposalSet` signature (add `articleText` before `tau`):

```ts
export function scoreProposalSet(
  set: unknown,
  expect: CaseExpect,
  sourceTables: Record<string, string>,
  articleText: string = "",
  tau: { r: number; p: number } = DEFAULT_TAU,
): ProposalScore {
```

- [ ] **Step 6: Branch `provenanceOk` for the prose tier**

In `skills/suggest-article/eval/score.ts`, replace the `provenanceOk` loop body so prose proposals take the verbatim path and table proposals keep the existing check. Replace:

```ts
  let provenanceOk = true;
  for (const p of proposals) {
    const tableCsv = sourceTables[p.dataSource.table];
```

with:

```ts
  let provenanceOk = true;
  for (const p of proposals) {
    if ((p.provenance ?? "table") === "prose") {
      // transcription only: every value must be a number stated in the article,
      // and the proposal must flag the confirmation gate.
      if (p.needsConfirmation !== true) {
        provenanceOk = false;
        notes.push(
          `provenance(prose): "${p.claim}" must set needsConfirmation: true`,
        );
      }
      const present = articleNumbers(articleText);
      for (const num of dataNumbers(p.data)) {
        if (!present.has(num)) {
          provenanceOk = false;
          notes.push(
            `provenance(prose): value "${num}" is not stated in the article text`,
          );
        }
      }
      continue;
    }
    const tableCsv = sourceTables[p.dataSource.table];
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd skills/suggest-article && bun test eval/tests/score-prose.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Run the full eval test suite (no regression)**

Run: `cd skills/suggest-article && bun test`
Expected: PASS — `eval/tests/score.test.ts` (table-tier cases) still green; existing 3-arg `scoreProposalSet(set, expect, sourceTables)` calls are unaffected because `articleText` defaults to `""` and only the prose branch reads it.

- [ ] **Step 9: Commit**

```bash
git add skills/suggest-article/eval/score.ts skills/suggest-article/eval/tests/score-prose.test.ts
git commit -m "feat(suggest-article): prose provenance tier in scorer — verbatim-in-text check + needsConfirmation gate"
```

---

### Task 2: `suggest-article` SKILL.md — tiers, extraction rule, gate contract

**Files:**
- Modify: `skills/suggest-article/SKILL.md`

**Interfaces:**
- Consumes: the `VisualProposal` shape from Task 1 (`provenance`, `needsConfirmation`).
- Produces: the documented procedure a faithful agent follows to emit `prose` proposals.

- [ ] **Step 1: Add the provenance-tier + extraction-rule section**

In `skills/suggest-article/SKILL.md`, after the existing "Gotcha" section, add:

```markdown
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
```

- [ ] **Step 2: Add the confirmation-gate contract to the Output section**

In `skills/suggest-article/SKILL.md`, in the section describing the emitted
`ProposalSet`/output, add this paragraph:

```markdown
**Confirmation gate (prose only).** A `prose` proposal sets `needsConfirmation: true`.
The caller MUST present the reconstructed table to the journalist and obtain an
explicit OK BEFORE running suggest-chart or producing anything — e.g. "I read from
your article: 2019 → 12%, 2024 → 19%. Chart it?". `table` proposals do not set
`needsConfirmation` and proceed automatically.
```

- [ ] **Step 3: Verify the additions read consistently**

Run: `grep -n "provenance\|needsConfirmation\|proseEvidence\|Confirmation gate" skills/suggest-article/SKILL.md`
Expected: the new section and the gate paragraph are present; the terms match the field names from Task 1 (`provenance`, `needsConfirmation`).

- [ ] **Step 4: Commit**

```bash
git add skills/suggest-article/SKILL.md
git commit -m "docs(suggest-article): document prose provenance tier, strict extraction rule, and the confirmation gate"
```

---

### Task 3: `suggest-chart` + `chart-selection.md` — 2-point guard & honest label

**Files:**
- Modify: `skills/suggest-chart/SKILL.md`
- Modify: `knowledge/references/chart-selection.md`

**Interfaces:**
- Consumes: a confirmed `prose` proposal (a 2-point comparison) handed to suggest-chart.
- Produces: the type-choice guard and the honest source-label rule.

- [ ] **Step 1: Add the 2-point guard + source label to suggest-chart**

In `skills/suggest-chart/SKILL.md`, inside the "Guardrails" section, add two bullets:

```markdown
- **Two-point comparison (prose-extracted):** a claim with exactly two values
  (e.g. 2019 vs 2024) renders as a **slope**, **dumbbell**, or **paired columns** —
  NEVER a continuous line, which would imply a trend from two points.
- **Honest source label (prose):** when the data is `provenance: "prose"`, the
  chart's source reads "Figures as reported in this article" (or the source the
  article itself names) — never a fabricated dataset attribution.
```

- [ ] **Step 2: Add the 2-point guidance to chart-selection.md**

In `knowledge/references/chart-selection.md`, under the "Producer" section added
earlier (end of file), append:

```markdown
## Two-point comparisons (a value then vs now)

A claim that compares exactly two values (e.g. "12% in 2019 → 19% in 2024") is a
**slope**, a **dumbbell**, or **paired columns** — never a continuous line (two
points do not make a trend). This is common for prose-extracted figures, where the
article states a before and an after.
```

- [ ] **Step 3: Verify**

Run: `grep -n "Two-point\|slope\|Honest source label" skills/suggest-chart/SKILL.md knowledge/references/chart-selection.md`
Expected: the guard appears in both files; wording is consistent (slope / dumbbell / paired columns; no continuous line).

- [ ] **Step 4: Commit**

```bash
git add skills/suggest-chart/SKILL.md knowledge/references/chart-selection.md
git commit -m "docs(suggest-chart): 2-point comparison renders as slope/dumbbell, not a line; honest prose source label"
```

---

## Notes for the implementer

- All paths are relative to the repo root `/Users/rmdms/Sites/Professional/splash`.
- Tasks 2 and 3 are documentation/contract changes (no unit test); their "test" is the `grep` verification that the exact terms/field-names match Task 1's code.
- Do not change producer routing (dw-chart vs chart-native) — out of scope.
- The confirmation gate is an orchestration contract (a prompt the caller issues), not a UI widget — out of scope to build a UI.
