# A5 — Mechanical `skillsInvoked` Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** "invoke suggest-chart as a real Skill call" stops being trust-only prose — every
guided-branch accepted proposal mechanically carries the sub-skills that produced it, verified
at the spine (Spotlight practice A5, `docs/splash/spotlight-learnings.md`; spec
`2026-07-16-tom-feedback-flow-redesign-design.md` §C4).

**Architecture:** `AcceptedProposal` gains `skillsInvoked?: string[]` (emitted by the
orchestrator at §5b exactly like `channel`/`confirmedTakeaway` — prose-enforced emission,
CODE-enforced consequence); `validate-gate` warns when the field is absent (observability,
legacy-safe) and FAILS a proposal that declares the guided branch without `suggest-chart` in
the list. Branch declaration rides the same field: the orchestrator emits
`"splash:cadrage-guided"` or `"splash:cadrage-direct"` as the first entry, so the gate needs no
new field to know the branch.

**Tech Stack:** TypeScript, Bun, bun:test.

## Global Constraints

- Code, comments, commits: English. No vendor mention. Bun, bun:test, TDD.
- Legacy-safe: an absent `skillsInvoked` is a WARNING, never a failure (old accepted.json files
  keep producing). Only a PRESENT list that declares guided without `suggest-chart` fails.
- Depends on: nothing (independent of C1-C6; merges any time). The SKILL.md §5b emission line
  can land with C3+C4's rewrite or standalone — this plan includes it standalone.

---

### Task 1: The field + the gate rule

**Files:**
- Modify: `skills/splash/src/producer-spec.ts` (the `AcceptedProposal` interface)
- Modify: `skills/splash/src/validate-gate.ts` (new guard beside the source guards)
- Test: `skills/splash/tests/validate-gate.test.ts` (extend)

**Interfaces:**
- Consumes: existing `validateAccepted` composition.
- Produces: `skillsInvokedIssues(p: AcceptedProposal): { errors: string[]; warnings: string[] }`
  (module-private, wired into `validateAccepted`).

- [ ] **Step 1: Write the failing tests**

Append to `validate-gate.test.ts` (reuse the file's minimal-valid-proposal builder):

```ts
describe("skillsInvoked (mechanical sub-skill proof)", () => {
  it("should warn (not fail) when skillsInvoked is absent — legacy proposals keep working", () => {
    const p = minimalValidProposal(); // no skillsInvoked
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
    if (outcome.ok)
      expect(outcome.warnings.some((w) => w.includes("skillsInvoked"))).toBe(true);
  });

  it("should FAIL a guided-branch proposal whose skillsInvoked lacks suggest-chart", () => {
    const p = {
      ...minimalValidProposal(),
      skillsInvoked: ["splash:cadrage-guided", "suggest-article"],
    };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok)
      expect(outcome.errors.some((e) => e.includes("suggest-chart"))).toBe(true);
  });

  it("should pass a guided-branch proposal that lists suggest-chart", () => {
    const p = {
      ...minimalValidProposal(),
      skillsInvoked: ["splash:cadrage-guided", "suggest-article", "suggest-chart"],
    };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
  });

  it("should pass a DIRECT-branch proposal without suggest-chart in the list", () => {
    // DIRECT still calls suggest-chart for validation in practice, but the GATE only
    // enforces the guided-branch invariant (the journalist chose from candidates that
    // ONLY suggest-chart can have produced).
    const p = {
      ...minimalValidProposal(),
      skillsInvoked: ["splash:cadrage-direct"],
    };
    const outcome = validateAccepted(p, [p]);
    expect(outcome.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd skills/splash && bun test tests/validate-gate.test.ts`
Expected: FAIL (no warning emitted; guided-without-suggest-chart passes today).

- [ ] **Step 3: Implement**

In `producer-spec.ts`, add to `AcceptedProposal` (beside `sourceHint`):

```ts
  // Mechanical sub-skill proof (Spotlight practice A5): which skills the orchestrator
  // actually invoked to build this proposal, emitted at §5b like channel/confirmedTakeaway.
  // First entry declares the branch ("splash:cadrage-guided" | "splash:cadrage-direct").
  // OPTIONAL and legacy-safe: absent ⇒ observability warning only. A PRESENT list that
  // declares guided without "suggest-chart" fails the gate — a guided proposal can only
  // come from suggest-chart's candidates, so its absence means the orchestrator re-decided
  // what the sub-skill owns.
  skillsInvoked?: string[];
```

In `validate-gate.ts`, add beside the source guards:

```ts
// GUARD 5 — skillsInvoked (mechanical sub-skill proof, Spotlight A5). Absent ⇒ warning
// (legacy accepted.json). Present + guided branch declared without "suggest-chart" ⇒ error:
// the ranked candidates only suggest-chart can emit were bypassed.
function skillsInvokedIssues(p: AcceptedProposal): {
  errors: string[];
  warnings: string[];
} {
  const list = p.skillsInvoked;
  if (!Array.isArray(list) || list.length === 0) {
    return {
      errors: [],
      warnings: [
        "skillsInvoked missing — cannot mechanically prove suggest-chart produced this proposal (emit it at §5b like channel/confirmedTakeaway)",
      ],
    };
  }
  const guided = list.includes("splash:cadrage-guided");
  if (guided && !list.includes("suggest-chart")) {
    return {
      errors: [
        "skillsInvoked declares the guided branch but does not list suggest-chart — a guided proposal must come from suggest-chart's candidates, never a host re-decision",
      ],
      warnings: [],
    };
  }
  return { errors: [], warnings: [] };
}
```

Wire into `validateAccepted` where the other guards compose (follow the file's existing
error/warning accumulation pattern).

- [ ] **Step 4: Run the suite — green** (`cd skills/splash && bun test`)

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/producer-spec.ts skills/splash/src/validate-gate.ts skills/splash/tests/validate-gate.test.ts
git commit -m "feat(splash): skillsInvoked mechanical proof — guided proposals must come from suggest-chart (GUARD 5)"
```

---

### Task 2: The §5b emission line (SKILL.md) + doc-parity pin

**Files:**
- Modify: `skills/splash/SKILL.md` — the §5b accepted.json assembly block (where
  `channel`/`confirmedTakeaway`/`sourceHint` emission is prescribed; grep `sourceHint` to find
  it)
- Test: `skills/splash/tests/skill-doc-parity.test.ts` (extend — file exists after C3+C4
  Task 1; if executing this plan FIRST, create it with just this describe block)

- [ ] **Step 1: Failing doc test**

```ts
describe("A5 — skillsInvoked emission", () => {
  it("§5b prescribes emitting skillsInvoked like channel/confirmedTakeaway", () => {
    expect(splash).toContain("skillsInvoked");
    expect(splash).toContain("splash:cadrage-guided");
  });
});
```

- [ ] **Step 2: Add the emission line to §5b**

```markdown
- **`skillsInvoked`** (REQUIRED on new proposals): the skills you actually invoked for this
  element, first entry declaring the branch — `"splash:cadrage-guided"` or
  `"splash:cadrage-direct"` — then e.g. `"suggest-article"`, `"suggest-chart"`. Copied across
  like `channel`/`confirmedTakeaway`; the spine gate warns when absent and FAILS a guided
  entry without `suggest-chart` (GUARD 5).
```

- [ ] **Step 3: Tests green + commit**

```bash
git add skills/splash/SKILL.md skills/splash/tests/skill-doc-parity.test.ts
git commit -m "docs(splash): SKILL.md emits skillsInvoked at 5b (mechanical sub-skill proof)"
```

---

### Task 3: Gate

- [ ] **Step 1:** `bun run check` — green. The harness's transcript-based
  `checkSuggesterInvoked` stays as the belt (transcript view); GUARD 5 is the suspenders
  (artifact view).
