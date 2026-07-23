# S4a Flow-Process Rubric A1-A8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the conversational-flow guarantees a legible, honest A1-A8 rubric in the cert report — consolidate the existing deterministic flow checks under rubric IDs, fill the 2 deterministic gaps (A3, A7), and mark the semantic items (A1/A6) judge-advisory.

**Architecture:** Two new deterministic checks in `src/checks.ts` (mirroring the existing `checkRenderShownBeforeValidation` event-ordering pattern), a data-only `src/flow-rubric.ts` mapping every A-item to its backing `check:*` sources, and a "Flow rubric A1-A8" section in `src/report.ts` + `src/suite-report.ts` that reuses T4's deterministic-vs-judge visual split. Ordered so the checks exist before the rubric references them.

**Tech Stack:** Bun, TypeScript, bun:test. Repo: `/Users/rmdms/Sites/Professional/splash-harness` (branch `master`).

## Global Constraints

- Runtime **Bun**. Tests `bun:test`. Always `cd /Users/rmdms/Sites/Professional/splash-harness` first. Commit to `master`.
- **TEST-ONLY on the splash TOOL**: S4a only OBSERVES/reports the flow from the transcript. It adds NO orchestration rule and changes NO splash-tool behaviour. All changes are in the harness (`../splash-harness`).
- **Honesty (T4 invariant)**: a deterministic `check:*` is only shipped if its signal is genuinely mechanical; never a fragile heuristic claiming mechanical certainty. A3's honest fallback (Task 2) is part of this.
- Checks follow the existing shape: `(ctx: CheckContext) => Finding[]`, `CheckContext = { events: TranscriptEvent[]; report: ReportJson | null; runId; caseSlug; now }`, built via `stamp(ctx, {...})`.
- The full harness suite is currently **389 pass / 0 fail** — it must stay 0-fail (new tests add to the count).
- English only. Commit messages PLAIN subject, **NO Claude/Anthropic/Co-Authored-By/Claude-Session/Generated-with**.
- Hard gates in the rubric are exactly **{A5, A8}** (audit). A3/A7 are soft.

---

### Task 1: `check:takeaway-confirmed` (A7)

**Files:**
- Modify: `src/checks.ts` (add `checkTakeawayConfirmed`, register it in `runChecks` at ~line 1496-1518)
- Test: `tests/checks.test.ts` (add cases; if the file is large, a new `tests/flow-checks.test.ts` is acceptable — match how the repo groups check tests)

**Interfaces:**
- Consumes: `CheckContext`, `stamp(ctx, FindingInput)`, `PRODUCE_SCRIPT_RE` (= `/produce-all\.mjs|produce-from-spec\.mjs/`, already defined ~line 79), `TranscriptEvent` kinds (`tool-use`{name,input}, `assistant-text`{text}, `user-text`{text}).
- Produces: `checkTakeawayConfirmed(ctx): Finding[]` emitting `source: "check:takeaway-confirmed"`.

- [ ] **Step 1: Write the failing test**

Add to the check test file. Use the repo's existing transcript-fixture style (look at an existing check test, e.g. how `checkRenderShownBeforeValidation` is tested, and mirror its `events` array + `ctx` construction). Three cases:

```ts
// helper mirrors the repo's existing check-test ctx builder — reuse it if one exists
function ctxOf(events: TranscriptEvent[]) {
  return { events, report: null, runId: "r", caseSlug: "c", now: "2026-07-22T00:00:00Z" };
}

test("check:takeaway-confirmed fires when production happened with no confirmed takeaway upstream", () => {
  const events: TranscriptEvent[] = [
    { kind: "user-text", text: "Voici mon article sur le budget." },
    { kind: "tool-use", id: "1", name: "Bash", input: { command: "bun produce-all.mjs spec.json out" } },
  ];
  const out = checkTakeawayConfirmed(ctxOf(events));
  expect(out).toHaveLength(1);
  expect(out[0].source).toBe("check:takeaway-confirmed");
  expect(out[0].severity).toBe("major");
});

test("check:takeaway-confirmed stays silent when a takeaway was confirmed before production", () => {
  const events: TranscriptEvent[] = [
    { kind: "assistant-text", text: "Le takeaway que je retiens : les dépenses culture ont doublé. C'est bien ça ?" },
    { kind: "user-text", text: "Oui c'est ça, on part là-dessus." },
    { kind: "tool-use", id: "1", name: "Bash", input: { command: "bun produce-all.mjs spec.json out" } },
  ];
  expect(checkTakeawayConfirmed(ctxOf(events))).toHaveLength(0);
});

test("check:takeaway-confirmed stays silent when nothing was produced (nothing to gate)", () => {
  const events: TranscriptEvent[] = [
    { kind: "user-text", text: "Voici mon article." },
    { kind: "assistant-text", text: "Quel est le takeaway ?" },
  ];
  expect(checkTakeawayConfirmed(ctxOf(events))).toHaveLength(0);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-harness && bun test tests/checks.test.ts` (or the file you added to)
Expected: FAIL — `checkTakeawayConfirmed` not defined.

- [ ] **Step 3: Implement `checkTakeawayConfirmed`**

Mirror `checkRenderShownBeforeValidation`'s structure (find the production event, then scan events BEFORE it for the required signal). Add near it in `src/checks.ts`:

```ts
// A7 — the takeaway is confirmed (Gate 1b) BEFORE production. Mirrors the render-before-validate
// ordering check: find the first production event, then require a takeaway-confirmation exchange
// upstream of it (the actor states the takeaway and the journalist affirms), else the run produced
// a visual whose editorial point was never pinned. Conservative: a clear "produced with no
// confirmation upstream" only — a borderline confirmation is given the benefit of the doubt.
const TAKEAWAY_STATE_RE =
  /\btakeaway\b|le message (clé|principal)|ce que (?:je retiens|ça (?:dit|montre))|l'insight|à retenir/i;
const AFFIRM_RE = /\b(oui|c'est (?:ça|bon|exact)|exact(?:ement)?|parfait|on part|validé|ok(?:ay)?)\b/i;

function checkTakeawayConfirmed(ctx: CheckContext): Finding[] {
  const events = ctx.events;
  const firstProduceIdx = events.findIndex(
    (e) =>
      e.kind === "tool-use" &&
      e.name === "Bash" &&
      PRODUCE_SCRIPT_RE.test(String(e.input?.command ?? "")),
  );
  if (firstProduceIdx < 0) return []; // nothing produced → nothing to gate

  // A confirmed takeaway = the actor states a takeaway (assistant-text), and the NEXT journalist
  // turn affirms it — all strictly before production. (Also accept a `confirmedTakeaway` marker in
  // any tool input before production, the machine-readable form.)
  const confirmed = events.some((e, i) => {
    if (i >= firstProduceIdx) return false;
    if (e.kind === "tool-use" && /confirmedTakeaway/.test(JSON.stringify(e.input ?? {}))) return true;
    if (e.kind === "assistant-text" && TAKEAWAY_STATE_RE.test(e.text)) {
      const next = events
        .slice(i + 1, firstProduceIdx)
        .find((n) => n.kind === "user-text" || n.kind === "assistant-text");
      return next?.kind === "user-text" && AFFIRM_RE.test(next.text);
    }
    return false;
  });
  if (confirmed) return [];

  return [
    stamp(ctx, {
      source: "check:takeaway-confirmed",
      severity: "major",
      category: "gap",
      area: "orchestration",
      summary:
        "Gate 1b skipped — the run produced a visual with no confirmed takeaway upstream (the editorial point was never pinned with the journalist before production)",
      evidence: JSON.stringify(
        events[firstProduceIdx]?.kind === "tool-use"
          ? events[firstProduceIdx].input?.command ?? ""
          : "",
      ).slice(0, 300),
      rootCauseHypothesis:
        "the orchestrator went to PRODUCTION before the CADRAGE takeaway-confirmation gate (SKILL.md Gate 1b), so the visual's argument is unanchored",
    }),
  ];
}
```

Then register it in `runChecks` (add `...checkTakeawayConfirmed(ctx),` to the array ~line 1496-1518).

Verify the `FindingInput`/`Area` fields you use (`category`, `area`) match the existing checks' allowed values — copy them from a sibling check (e.g. `checkRenderShownBeforeValidation` uses `category: "gap", area: "orchestration"`).

- [ ] **Step 4: Run tests, verify pass**

Run: `cd /Users/rmdms/Sites/Professional/splash-harness && bun test tests/checks.test.ts` → PASS.
Then `bun test` (full suite) → still 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/checks.ts tests/checks.test.ts
git commit -m "feat(checks): check:takeaway-confirmed (A7) — Gate 1b confirmed before production"
```

---

### Task 2: `check:over-ask` (A3) — with the honest fallback

**Files:**
- Modify: `src/checks.ts` (add `checkOverAsk`, register in `runChecks`)
- Test: same check test file as Task 1

**Interfaces:**
- Produces: `checkOverAsk(ctx): Finding[]` emitting `source: "check:over-ask"` — OR, per the fallback, NOT shipped (see Step 3).

- [ ] **Step 1: Write the failing test (the conservative SOURCE re-ask)**

A3's cleanest, lowest-false-positive signal is a **re-ask of the SOURCE** after the journalist already gave one. Implement that one field (it is the highest-confidence canonical "don't make them repeat themselves" case; extend to takeaway/table only if equally clean).

```ts
test("check:over-ask fires when the actor re-asks for the source after it was already provided", () => {
  const events: TranscriptEvent[] = [
    { kind: "user-text", text: "Les données viennent de l'INSEE, source: https://insee.fr/x." },
    { kind: "assistant-text", text: "Merci." },
    { kind: "tool-use", id: "1", name: "AskUserQuestion", input: { questions: [{ question: "Quelle est la source des données ?" }] } },
  ];
  const out = checkOverAsk(ctxOf(events));
  expect(out).toHaveLength(1);
  expect(out[0].source).toBe("check:over-ask");
  expect(out[0].severity).toBe("minor");
});

test("check:over-ask stays silent when the source is asked once and not re-asked", () => {
  const events: TranscriptEvent[] = [
    { kind: "user-text", text: "Voici mon article." },
    { kind: "tool-use", id: "1", name: "AskUserQuestion", input: { questions: [{ question: "Quelle est la source ?" }] } },
    { kind: "user-text", text: "Source: INSEE https://insee.fr/x." },
  ];
  expect(checkOverAsk(ctxOf(events))).toHaveLength(0);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `bun test tests/checks.test.ts` → FAIL (`checkOverAsk` undefined).

- [ ] **Step 3: Implement `checkOverAsk` (conservative) — OR invoke the honest fallback**

```ts
// A3 — pas-sur-demander. Conservative deterministic signal: the actor re-asks for the SOURCE after
// the journalist already provided one earlier (a URL or an explicit "source:" mention). One field,
// highest confidence — a re-ask of already-given information is the exact "don't make them repeat
// themselves" anti-pattern. NOT a general question-count cap (that would false-positive on
// legitimate clarification).
const SOURCE_GIVEN_RE = /\bsource\s*[:=]|https?:\/\/|\b(insee|eurostat|ourworldindata|datawrapper)\b/i;
const SOURCE_ASK_RE = /\bquelle(?:s)? (?:est|sont) (?:la |les )?sources?\b|\bla source des données\b|\bd'où (?:vien|proviennent)/i;

function checkOverAsk(ctx: CheckContext): Finding[] {
  const events = ctx.events;
  const findings: Finding[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const isSourceAsk =
      (e.kind === "tool-use" &&
        e.name === "AskUserQuestion" &&
        SOURCE_ASK_RE.test(JSON.stringify(e.input?.questions ?? ""))) ||
      (e.kind === "assistant-text" && SOURCE_ASK_RE.test(e.text));
    if (!isSourceAsk) continue;
    // was a source already provided by the journalist BEFORE this ask?
    const alreadyGiven = events
      .slice(0, i)
      .some((p) => p.kind === "user-text" && SOURCE_GIVEN_RE.test(p.text));
    if (alreadyGiven) {
      findings.push(
        stamp(ctx, {
          source: "check:over-ask",
          severity: "minor",
          category: "gap",
          area: "orchestration",
          summary:
            "pas-sur-demander (A3): the actor re-asked the journalist for the source after they had already provided one — making them repeat themselves",
          evidence: (e.kind === "tool-use"
            ? JSON.stringify(e.input?.questions ?? "")
            : e.kind === "assistant-text"
              ? e.text
              : ""
          ).slice(0, 300),
          rootCauseHypothesis:
            "the flow did not carry the already-provided source forward, so CADRAGE re-solicited it",
        }),
      );
      break; // one finding per run is enough
    }
  }
  return findings;
}
```

Register `...checkOverAsk(ctx),` in `runChecks`.

**HONEST FALLBACK (invoke ONLY if the two tests cannot be made green without the regexes becoming broad/noisy — i.e. you cannot get a clean, low-false-positive signal):** do NOT ship `checkOverAsk`. Instead, remove it, and record in the Task-2 report that **A3 must be `kind: "judge"` (no backing check) in Task 3's `FLOW_RUBRIC`**. Delete the two `checkOverAsk` tests and replace them with a one-line note in the report. This is the honest outcome per the spec §2.2 — a judge-advisory A3 beats a false-positive check. The controller resolves Task 3's A3 row from your report.

- [ ] **Step 4: Run tests, verify pass** (or fallback recorded)

Run: `bun test tests/checks.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/checks.ts tests/checks.test.ts
git commit -m "feat(checks): check:over-ask (A3) — conservative source re-ask (pas-sur-demander)"
```
(If fallback: no code commit for A3; the decision is carried in the report for Task 3.)

---

### Task 3: `src/flow-rubric.ts` — the A1-A8 rubric + drift guard

**Files:**
- Create: `src/flow-rubric.ts`
- Create: `tests/flow-rubric.test.ts`

**Interfaces:**
- Consumes: the `check:*` source strings — the existing ones + `check:takeaway-confirmed` (Task 1) + `check:over-ask` (Task 2, unless fallback).
- Produces: `FLOW_RUBRIC: FlowRubricItem[]` and `interface FlowRubricItem { id; label; gate; kind; checks }`.

- [ ] **Step 1: Write the failing drift-guard test**

`tests/flow-rubric.test.ts`:

```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FLOW_RUBRIC } from "../src/flow-rubric.ts";

const CHECKS_SRC = readFileSync(
  fileURLToPath(new URL("../src/checks.ts", import.meta.url)),
  "utf8",
);

test("every A-item A1-A8 is present exactly once", () => {
  const ids = FLOW_RUBRIC.map((r) => r.id).sort();
  expect(ids).toEqual(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]);
});

test("hard gates are exactly A5 and A8", () => {
  const hard = FLOW_RUBRIC.filter((r) => r.gate === "hard").map((r) => r.id).sort();
  expect(hard).toEqual(["A5", "A8"]);
});

test("every check referenced by a deterministic rubric item is a REAL source emitted in checks.ts", () => {
  const missing: string[] = [];
  for (const item of FLOW_RUBRIC) {
    if (item.kind === "deterministic") {
      expect(item.checks.length).toBeGreaterThan(0);
      for (const src of item.checks) {
        // the source literal must appear in checks.ts (e.g. `source: "check:gate-discipline"`)
        if (!CHECKS_SRC.includes(`"${src}"`)) missing.push(`${item.id} → ${src}`);
      }
    } else {
      // judge items carry no backing check
      expect(item.checks).toEqual([]);
    }
  }
  expect(missing).toEqual([]);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `bun test tests/flow-rubric.test.ts` → FAIL (`FLOW_RUBRIC` not found).

- [ ] **Step 3: Write `src/flow-rubric.ts`**

```ts
// The conversational-flow rubric (audit A1-A8): the flow guarantees, each either backed by a
// DETERMINISTIC check:* (trustworthy) or marked judge-advisory (fallible/semantic). Data only —
// no logic. Single source of truth for "what the flow rubric is"; the report joins findings/judge
// output to these rows. Hard gates (A5, A8) are shippability blockers, not style notes.
export interface FlowRubricItem {
  id: "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7" | "A8";
  label: string;
  gate: "hard" | "soft";
  kind: "deterministic" | "judge";
  checks: string[];
}

export const FLOW_RUBRIC: FlowRubricItem[] = [
  { id: "A1", label: "bonne question au bon moment", gate: "soft", kind: "judge", checks: [] },
  { id: "A2", label: "une question par tour", gate: "soft", kind: "deterministic", checks: ["check:gate-discipline"] },
  { id: "A3", label: "pas-sur-demander (ne pas faire répéter)", gate: "soft", kind: "deterministic", checks: ["check:over-ask"] },
  { id: "A4", label: "options + reco, vetoable (pas de reco unique)", gate: "soft", kind: "deterministic", checks: ["check:single-proposal-no-alternatives", "check:secondary-proposals-dropped"] },
  { id: "A5", label: "montrer avant de valider", gate: "hard", kind: "deterministic", checks: ["check:render-shown-before-validation"] },
  { id: "A6", label: "adapter à l'expertise du journaliste", gate: "soft", kind: "judge", checks: [] },
  { id: "A7", label: "confirmer le takeaway (Gate 1b)", gate: "soft", kind: "deterministic", checks: ["check:takeaway-confirmed"] },
  { id: "A8", label: "pas d'off-road (outils/skills sanctionnés)", gate: "hard", kind: "deterministic", checks: ["check:real-system", "check:stray-tool-call", "check:skills-invoked-not-emitted", "check:suggester-invoked"] },
];
```

**If Task 2 invoked the fallback:** change A3 to `{ id: "A3", label: "pas-sur-demander (ne pas faire répéter)", gate: "soft", kind: "judge", checks: [] }`.

- [ ] **Step 4: Run tests, verify pass**

Run: `bun test tests/flow-rubric.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/flow-rubric.ts tests/flow-rubric.test.ts
git commit -m "feat(rubric): FLOW_RUBRIC A1-A8 mapping flow guarantees to their backing checks"
```

---

### Task 4: "Flow rubric A1-A8" report section

**Files:**
- Modify: `src/report.ts` (add `renderFlowRubricSection`, wire it into `renderReport` ~line 598-663)
- Modify: `src/suite-report.ts` (add an aggregate flow-rubric block to the suite index)
- Test: `tests/report.test.ts` + `tests/suite-report.test.ts`

**Interfaces:**
- Consumes: `FLOW_RUBRIC` (Task 3), the case `findings: Finding[]` (already passed to `renderReport`), the T4 `isDeterministicSource` helper / source-split language for the kind badge.
- Produces: the rendered section (HTML string).

- [ ] **Step 1: Write the failing render test**

Add to `tests/report.test.ts`:

```ts
test("renderReport includes a Flow rubric A1-A8 section with one row per item and a deterministic fail linking its finding", () => {
  const findings: Finding[] = [
    makeFinding({ runId: "r", case: "c", source: "check:render-shown-before-validation", severity: "major", category: "gap", area: "orchestration", summary: "A5 miss", evidence: "e", rootCauseHypothesis: "h", createdAt: "2026-07-22T00:00:00Z" }),
  ];
  const html = renderReport({ runResult: fakeRunResult("c", "r"), events: [], findings, models: { actor: "m", persona: "m" } });
  expect(html).toContain("Flow rubric");
  // all 8 A-ids appear
  for (const id of ["A1","A2","A3","A4","A5","A6","A7","A8"]) expect(html).toContain(id);
  // A5 is shown as failed (its backing check fired); a judge item (A1) shows advisory/not-assessed
  expect(html).toMatch(/A5[\s\S]*?(fail|✗|not met)/i);
  expect(html).toMatch(/A1[\s\S]*?(advisory|judge|not assessed)/i);
});
```

(Reuse the test file's existing `fakeRunResult`/`makeFinding` helpers — mirror an existing `renderReport` test for the exact `RenderReportOptions` shape.)

- [ ] **Step 2: Run it, verify it fails**

Run: `bun test tests/report.test.ts` → FAIL (no "Flow rubric" section yet).

- [ ] **Step 3: Implement `renderFlowRubricSection` + wire it**

In `src/report.ts`, add a section renderer that, for each `FLOW_RUBRIC` item, computes status: for `deterministic`, PASS if none of `item.checks` appears in `findings.map(f => f.source)`, else FAIL (link the finding(s)); for `judge`, "advisory" (or "not assessed" — the judge dimension wiring is S4c, so for now judge rows render as advisory/not-assessed, NOT as a pass). Render `id · label · gate · kind badge (mechanical✓ / judge~, reusing T4's wording) · status`. Insert it as a new `<section>` in `renderReport` near the findings table (~line 661), titled "Flow rubric (A1-A8)".

```ts
function renderFlowRubricSection(findings: Finding[]): string {
  const fired = new Set(findings.map((f) => f.source));
  const rows = FLOW_RUBRIC.map((item) => {
    let status: string;
    if (item.kind === "judge") {
      status = `<span class="pill">advisory — not assessed (judge, S4c)</span>`;
    } else {
      const hit = item.checks.filter((c) => fired.has(c));
      status = hit.length
        ? `<span class="pill status-open">fail — ${escapeHtml(hit.join(", "))}</span>`
        : `<span class="pill status-fixed">pass</span>`;
    }
    const kindBadge =
      item.kind === "deterministic"
        ? `<span class="pill">mechanical ✓</span>`
        : `<span class="pill">judge ~ advisory</span>`;
    const gateBadge = item.gate === "hard" ? `<strong>HARD</strong>` : "soft";
    return `<tr><td>${item.id}</td><td>${escapeHtml(item.label)}</td><td>${gateBadge}</td><td>${kindBadge}</td><td>${status}</td></tr>`;
  }).join("\n");
  return `<section class="section"><h2>Flow rubric (A1-A8)</h2>
    <p class="muted">Deterministic rows are trustworthy gate signals; judge rows are advisory (semantic — calibrated judge dimension is S4c).</p>
    <table><thead><tr><th>Item</th><th>Guarantee</th><th>Gate</th><th>Kind</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table></section>`;
}
```

Import `FLOW_RUBRIC` at the top of `report.ts`. Wire the call into `renderReport`'s returned template (add `${renderFlowRubricSection(findings)}` as a section). Verify the CSS classes you reuse (`status-open`, `status-fixed`, `pill`, `muted`) exist in report.ts's `<style>` (they do — used by the findings table).

- [ ] **Step 4: Run tests, verify pass**

Run: `bun test tests/report.test.ts` → PASS.

- [ ] **Step 5: Suite-level aggregate + test**

In `src/suite-report.ts`, add a compact aggregate: for each deterministic `FLOW_RUBRIC` item, how many cases failed it (a case fails item X if any of its findings' sources ∈ item.checks). Render a small "Flow rubric — suite" table (item · # cases failed), surfacing hard-gate (A5/A8) failures distinctly. Add a `tests/suite-report.test.ts` case asserting a suite with one A5-failing case shows A5 with a failed-count of 1 and marks it HARD.

```ts
// suite-report.test.ts — sketch; mirror the file's existing SuiteSummary fixture builder
test("suite flow-rubric aggregate counts hard-gate A5 failures across cases", () => {
  const summary = /* build a SuiteSummary with one case whose findings include check:render-shown-before-validation */;
  const html = renderSuiteIndex(summary);
  expect(html).toContain("Flow rubric");
  expect(html).toMatch(/A5[\s\S]*?HARD/);
});
```

Fill the fixture from the existing suite-report tests' `SuiteSummary` shape (the T4 tests added `bySource` — reuse that builder). If the aggregate needs per-case findings not currently on `CaseSummary`, thread the minimum needed (a per-case `failedFlowItems: string[]` computed where counts are built), rather than re-parsing findings in the renderer.

- [ ] **Step 6: Run tests, verify pass, then full suite**

Run: `bun test tests/report.test.ts tests/suite-report.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 7: Commit**

```bash
git add src/report.ts src/suite-report.ts tests/report.test.ts tests/suite-report.test.ts
git commit -m "feat(report): Flow rubric A1-A8 section (per-case + suite), deterministic vs judge-advisory"
```

---

## Notes for the executor

- After all tasks: `cd /Users/rmdms/Sites/Professional/splash-harness && bun test` — full suite 0-fail (389 + the new tests).
- Final whole-branch review on a capable model. This is harness code (private QA repo); do NOT push splash-harness — commits stay on local `master` (push is Rémy's decision, like T3/T4).
- The spec's honesty invariant is the review's key lens: no rubric row claims a mechanical verdict on a semantic item; A3's outcome (shipped check vs judge-fallback) is internally consistent between checks.ts, FLOW_RUBRIC, and the report.
