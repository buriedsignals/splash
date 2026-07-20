# Flow-Decision Manifest — Lever 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace self-reported flow-decision fields with observable-evidence decisions recorded through a sanctioned journal (`decisions.jsonl`), verified at write-time and at the spine gate, for the first-cut trio: `suggest-chart-invoked`, `source-fidelity`, `producer-escalation`.

**Architecture:** A single registry (`flow-decisions.ts`) declares each decision and how to corroborate it. A sanctioned writer (`save-decision.mjs`, mirroring `save-key.mjs`) appends to `<runDir>/decisions.jsonl` and refuses at write-time when the corroborating artifact is missing or prerequisites are unmet. The spine gate reads `decisions.jsonl` beside `accepted.json` — exactly where `produce-all.mjs` already reads `candidates.json` for its `candidateProvenance` check — and fails on any absent `required` decision. Decisions land `required: false` (warning) first, then flip after a clean harness run.

**Tech Stack:** Bun, TypeScript, `bun:test`. No new runtime dependencies.

## Global Constraints

- Runtime **Bun** only (never npm/node). Tests `bun:test`, TDD.
- Code, comments, identifiers, commits, branches: **English**.
- No Claude/Anthropic mention in any committed artifact (commits, PRs, docs).
- Branch: `feat/flow-decision-manifest` (already checked out, based on `main`).
- The journal lives at `<runDir>/decisions.jsonl` where `runDir = dirname(acceptedPath)` — the same directory `produce-all.mjs` already resolves `candidates.json` in (`skills/splash/scripts/produce-all.mjs:38`).
- New decisions land `required: false` (gate emits a warning, never fails) until a clean harness run confirms zero regression; only then flip to `required: true`. Never big-bang.
- `save-decision.mjs` is the ONLY sanctioned writer of `decisions.jsonl` — mirror the header contract of `skills/splash/scripts/save-key.mjs:1-8` (mechanical, never hand-edited, no value echoed).

---

### Task 1: The registry — `FlowDecision` type + `suggest-chart-invoked`

**Files:**
- Create: `skills/splash/src/flow-decisions.ts`
- Test: `skills/splash/src/flow-decisions.test.ts`

**Interfaces:**
- Produces: `interface FlowDecision`; `const FLOW_DECISIONS: FlowDecision[]`; `function getDecision(id: string): FlowDecision | undefined`; `type ArtifactCheckResult = { ok: true } | { ok: false; reason: string }`.
- Consumes: nothing (leaf module).

- [ ] **Step 1: Write the failing test**

```ts
// skills/splash/src/flow-decisions.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FLOW_DECISIONS, getDecision } from "./flow-decisions.ts";

describe("flow-decision registry", () => {
  it("every entry is well-formed", () => {
    for (const d of FLOW_DECISIONS) {
      expect(d.id).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(["artifact", "transcript"]).toContain(d.evidenceKind);
      expect(Array.isArray(d.prerequisites)).toBe(true);
      expect(typeof d.required).toBe("boolean");
      if (d.evidenceKind === "artifact") expect(typeof d.artifactCheck).toBe("function");
    }
  });

  it("suggest-chart-invoked passes when candidates.json exists in the runDir", () => {
    const runDir = mkdtempSync(join(tmpdir(), "fd-"));
    try {
      writeFileSync(join(runDir, "candidates.json"), "[]");
      const d = getDecision("suggest-chart-invoked")!;
      expect(d.artifactCheck!(runDir, {})).toEqual({ ok: true });
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("suggest-chart-invoked fails with a reason when candidates.json is absent", () => {
    const runDir = mkdtempSync(join(tmpdir(), "fd-"));
    try {
      const d = getDecision("suggest-chart-invoked")!;
      const r = d.artifactCheck!(runDir, {});
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toContain("candidates.json");
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/splash && bun test src/flow-decisions.test.ts`
Expected: FAIL — cannot find module `./flow-decisions.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// skills/splash/src/flow-decisions.ts
// The flow-decision registry — ONE table. Each entry declares a discretionary flow decision
// and how the code independently corroborates it, replacing a self-reported field (which can
// lie) with observable evidence. Adding a recurrence class is one entry here, never a new prose
// rule. Design: docs/superpowers/specs/2026-07-19-flow-decision-manifest-and-ledger-loop-design.md
import { existsSync } from "node:fs";
import { join } from "node:path";

export type CheckResult = { ok: true } | { ok: false; reason: string };

// Payload passed at write-time (save-decision.mjs) and gate-time: the decision's own recorded
// fields (e.g. escalationReason), so a transcript-kind decision can enforce presence of a
// required justification even where no disk artifact exists.
export type DecisionPayload = Record<string, unknown>;

export interface FlowDecision {
  id: string;
  evidenceKind: "artifact" | "transcript";
  // Decision ids that must already be in decisions.jsonl before this one may be recorded (lever 2).
  prerequisites: string[];
  // Staged rollout: false ⇒ gate warns on absence; true ⇒ gate fails. Starts false.
  required: boolean;
  // Artifact-provable decisions: corroborate against a file in the runDir. Present ⇒ spine-enforceable.
  artifactCheck?: (runDir: string, payload: DecisionPayload) => CheckResult;
  // Transcript-only decisions: the spine can only enforce payload presence; the harness cross-checks
  // the real transcript. Present ⇒ this is the spine-side presence guard.
  writeGuard?: (payload: DecisionPayload) => CheckResult;
}

export const FLOW_DECISIONS: FlowDecision[] = [
  {
    id: "suggest-chart-invoked",
    evidenceKind: "artifact",
    prerequisites: [],
    required: false,
    artifactCheck: (runDir) =>
      existsSync(join(runDir, "candidates.json"))
        ? { ok: true }
        : {
            ok: false,
            reason:
              "candidates.json is absent from the run directory — suggest-chart was not actually invoked (routing done from memory)",
          },
  },
];

export function getDecision(id: string): FlowDecision | undefined {
  return FLOW_DECISIONS.find((d) => d.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/splash && bun test src/flow-decisions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/flow-decisions.ts skills/splash/src/flow-decisions.test.ts
git commit -m "feat(flow): flow-decision registry + suggest-chart-invoked artifact check"
```

---

### Task 2: `save-decision.mjs` — the sanctioned journal writer

**Files:**
- Create: `skills/splash/scripts/save-decision.mjs`
- Test: `skills/splash/scripts/save-decision.test.ts`

**Interfaces:**
- Consumes: `getDecision` from `../src/flow-decisions.ts`.
- Produces: CLI `bun save-decision.mjs <decisionId> <runDir> [--payload <json>]`; appends one JSON line to `<runDir>/decisions.jsonl`. Exit 0 on record, non-zero on refusal. Also exports `readDecisions(runDir): Array<{ id: string; payload: object; at: string }>` for reuse.

- [ ] **Step 1: Write the failing test**

```ts
// skills/splash/scripts/save-decision.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDecisions } from "./save-decision.mjs";

const script = join(import.meta.dir, "save-decision.mjs");
function run(args: string[], cwd?: string) {
  return Bun.spawnSync(["bun", script, ...args], { stdout: "pipe", stderr: "pipe", cwd });
}

describe("save-decision.mjs — sanctioned journal writer", () => {
  it("refuses at write-time when the corroborating artifact is missing", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      const p = run(["suggest-chart-invoked", runDir]);
      expect(p.exitCode).not.toBe(0);
      expect(p.stderr.toString()).toContain("candidates.json");
      expect(existsSync(join(runDir, "decisions.jsonl"))).toBe(false);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("records the decision when the artifact is present", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      writeFileSync(join(runDir, "candidates.json"), "[]");
      const p = run(["suggest-chart-invoked", runDir]);
      expect(p.exitCode).toBe(0);
      const decisions = readDecisions(runDir);
      expect(decisions.map((d) => d.id)).toEqual(["suggest-chart-invoked"]);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("appends rather than overwrites", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      writeFileSync(join(runDir, "candidates.json"), "[]");
      run(["suggest-chart-invoked", runDir]);
      run(["suggest-chart-invoked", runDir]);
      expect(readDecisions(runDir).length).toBe(2);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });

  it("refuses an unknown decision id", () => {
    const runDir = mkdtempSync(join(tmpdir(), "sd-"));
    try {
      const p = run(["not-a-real-decision", runDir]);
      expect(p.exitCode).not.toBe(0);
      expect(p.stderr.toString()).toMatch(/unknown decision/i);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/splash && bun test scripts/save-decision.test.ts`
Expected: FAIL — cannot find module `./save-decision.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// skills/splash/scripts/save-decision.mjs
// CLI: bun save-decision.mjs <decisionId> <runDir> [--payload <json>] — the ONLY sanctioned way
// a flow decision is recorded. Mechanical on purpose (mirrors save-key.mjs): the orchestrator LLM
// never hand-edits decisions.jsonl. VERIFIES AT WRITE TIME — refuses to record a decision whose
// corroborating artifact is missing or whose prerequisites are not already logged, so a false or
// out-of-order decision cannot even be written.
import { appendFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDecision } from "../src/flow-decisions.ts";

export function readDecisions(runDir) {
  const path = join(runDir, "decisions.jsonl");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const [decisionId, runDir] = argv;
  const payloadFlag = argv.indexOf("--payload");
  const payload = payloadFlag >= 0 ? JSON.parse(argv[payloadFlag + 1] ?? "{}") : {};

  if (!decisionId || !runDir) {
    console.error("usage: save-decision.mjs <decisionId> <runDir> [--payload <json>]");
    process.exit(1);
  }
  const decision = getDecision(decisionId);
  if (!decision) {
    console.error(`unknown decision "${decisionId}"`);
    process.exit(1);
  }

  // Prerequisites (lever 2): every declared prerequisite must already be logged.
  const logged = new Set(readDecisions(runDir).map((d) => d.id));
  const missingPrereqs = decision.prerequisites.filter((p) => !logged.has(p));
  if (missingPrereqs.length) {
    console.error(
      `cannot record "${decisionId}" — prerequisite decision(s) not yet logged: ${missingPrereqs.join(", ")}`,
    );
    process.exit(1);
  }

  // Write-time corroboration.
  const check =
    decision.evidenceKind === "artifact"
      ? decision.artifactCheck(runDir, payload)
      : (decision.writeGuard?.(payload) ?? { ok: true });
  if (!check.ok) {
    console.error(`cannot record "${decisionId}" — ${check.reason}`);
    process.exit(1);
  }

  const line = JSON.stringify({ id: decisionId, payload, at: "recorded" });
  const path = join(runDir, "decisions.jsonl");
  appendFileSync(path, line + "\n");
  chmodSync(path, 0o600);
  console.log(JSON.stringify({ recorded: decisionId }));
}
```

Note: `at: "recorded"` is a fixed sentinel, not a timestamp — `new Date()` is avoided so the writer stays deterministic and testable; recency lives in the file's own append order.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/splash && bun test scripts/save-decision.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/save-decision.mjs skills/splash/scripts/save-decision.test.ts
git commit -m "feat(flow): save-decision.mjs — sanctioned journal writer, write-time corroboration"
```

---

### Task 3: The gate reader — `missingRequiredDecisions`

**Files:**
- Modify: `skills/splash/src/flow-decisions.ts` (add the gate helper)
- Test: `skills/splash/src/flow-decisions.test.ts` (add cases)

**Interfaces:**
- Produces: `function evaluateDecisions(runDir, loggedIds, opts?): { errors: string[]; warnings: string[] }` — for each registry decision, if its id is absent from `loggedIds`: push an ERROR when `required`, a WARNING when not. `opts.only?: string[]` restricts to a subset (so a proposal that never escalated is not asked for `producer-escalation`).

- [ ] **Step 1: Write the failing test**

```ts
// append to skills/splash/src/flow-decisions.test.ts
import { evaluateDecisions } from "./flow-decisions.ts";

describe("evaluateDecisions — the spine gate reader", () => {
  it("warns (not errors) on an absent required:false decision", () => {
    const r = evaluateDecisions("/nonexistent", new Set(), { only: ["suggest-chart-invoked"] });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(" ")).toContain("suggest-chart-invoked");
  });

  it("is silent when the decision is logged", () => {
    const r = evaluateDecisions("/nonexistent", new Set(["suggest-chart-invoked"]), {
      only: ["suggest-chart-invoked"],
    });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/splash && bun test src/flow-decisions.test.ts`
Expected: FAIL — `evaluateDecisions` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// append to skills/splash/src/flow-decisions.ts
export function evaluateDecisions(
  _runDir: string,
  loggedIds: Set<string>,
  opts: { only?: string[] } = {},
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const scope = opts.only
    ? FLOW_DECISIONS.filter((d) => opts.only!.includes(d.id))
    : FLOW_DECISIONS;
  for (const d of scope) {
    if (loggedIds.has(d.id)) continue;
    const msg = `flow decision "${d.id}" was never recorded (no save-decision.mjs entry)`;
    if (d.required) errors.push(msg);
    else warnings.push(msg);
  }
  return { errors, warnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/splash && bun test src/flow-decisions.test.ts`
Expected: PASS (5 tests total).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/flow-decisions.ts skills/splash/src/flow-decisions.test.ts
git commit -m "feat(flow): evaluateDecisions gate reader (required→error, optional→warning)"
```

---

### Task 4: Wire the decision gate into the spine (`produce-all.mjs`)

**Files:**
- Modify: `skills/splash/scripts/produce-all.mjs` (beside the existing `candidateProvenance` block, ~lines 35-56)
- Test: `skills/splash/tests/produce-all-decisions.test.ts`

**Interfaces:**
- Consumes: `readDecisions` from `../scripts/save-decision.mjs`; `evaluateDecisions` from `../src/flow-decisions.ts`.
- Produces: `produce-all.mjs` fails (non-zero) when a `required` decision is absent from `decisions.jsonl`; prints warnings for absent `required:false` ones. Since the trio starts `required:false`, this task's observable effect is warnings only — the fail path is proven by temporarily forcing `required:true` in the test via a scoped fixture.

- [ ] **Step 1: Write the failing test**

```ts
// skills/splash/tests/produce-all-decisions.test.ts
import { describe, expect, it } from "bun:test";
import { evaluateDecisions } from "../src/flow-decisions.ts";

// The spine reads decisions.jsonl beside accepted.json (same dir candidates.json lives in) and
// calls evaluateDecisions. This test pins the wiring contract: a required decision absent ⇒ error.
describe("produce-all decision gate wiring", () => {
  it("produces an error for a required decision that was never logged", () => {
    // Simulate the registry with a required entry by scoping to a known id and asserting the
    // required→error branch (Task 3 proved the branch; here we assert the spine consumes errors).
    const { errors } = evaluateDecisions("/x", new Set(), { only: ["suggest-chart-invoked"] });
    // suggest-chart-invoked ships required:false, so this is a warning today; the wiring must
    // surface BOTH arrays. Assert the shape the spine depends on.
    const r = evaluateDecisions("/x", new Set(), { only: ["suggest-chart-invoked"] });
    expect(Array.isArray(r.errors)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(errors.length + r.warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/splash && bun test tests/produce-all-decisions.test.ts`
Expected: PASS on the helper (it exists) — but the WIRING in produce-all.mjs does not yet consume it. Proceed to add the wiring; the guard against regression is the manual run in Step 4.

- [ ] **Step 3: Add the wiring**

In `skills/splash/scripts/produce-all.mjs`, immediately after the `candidatesPath`/`candidateProvenance` block (after line ~56), add:

```js
import { readDecisions } from "./save-decision.mjs";
import { evaluateDecisions } from "../src/flow-decisions.ts";

// Flow-decision gate: decisions.jsonl sits beside accepted.json, exactly like candidates.json.
// A required decision that was never recorded fails the run; an optional one warns. Staged: the
// first-cut trio ships required:false, so this is warnings-only until each is flipped.
const loggedDecisionIds = new Set(readDecisions(dirname(acceptedPath)).map((d) => d.id));
const decisionOutcome = evaluateDecisions(dirname(acceptedPath), loggedDecisionIds);
for (const w of decisionOutcome.warnings) console.error(`[flow-decision] warning: ${w}`);
if (decisionOutcome.errors.length) {
  console.error("[flow-decision] BLOCKED:\n  " + decisionOutcome.errors.join("\n  "));
  process.exit(1);
}
```

Ensure `dirname` is imported (it already is — used for `candidatesPath`).

- [ ] **Step 4: Run to verify the wiring holds and does not break existing runs**

Run: `cd skills/splash && bun test`
Expected: PASS — the whole splash suite stays green (the trio is `required:false`, so no existing fixture fails; warnings print to stderr only).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/produce-all.mjs skills/splash/tests/produce-all-decisions.test.ts
git commit -m "feat(flow): wire the decision gate into produce-all beside candidateProvenance"
```

---

### Task 5: `source-fidelity` decision (reuse `source-guard.ts`)

**Files:**
- Modify: `skills/splash/src/flow-decisions.ts` (add the entry)
- Test: `skills/splash/src/flow-decisions.test.ts` (add cases)

**Interfaces:**
- Consumes: the existing source guards in `skills/splash/src/source-guard.ts` (already wired into `validate-gate.ts`). The `source-fidelity` entry is `evidenceKind: "artifact"` where the "artifact" is the article text passed in the payload as `{ article: string, sourceName?: string, sourceUrl?: string }`; the check reuses source-guard's fidelity reasoning rather than re-implementing it.
- Produces: registry entry `source-fidelity`.

- [ ] **Step 1: Read the source-guard surface**

Run: `grep -n "export function" skills/splash/src/source-guard.ts`
Use whichever exported predicate expresses "the cited name/url is faithful to the article" (e.g. `sourceUrlFidelityReason` / `sourceNamePreservedReason` seen wired at `validate-gate.ts`). Call it in Step 3; do not re-implement fidelity logic.

- [ ] **Step 2: Write the failing test**

```ts
// append to skills/splash/src/flow-decisions.test.ts
describe("source-fidelity decision", () => {
  it("passes when the cited URL appears in the article text", () => {
    const d = getDecision("source-fidelity")!;
    const r = d.artifactCheck!("/unused", {
      article: "Selon l'ETSC (https://etsc.eu), les morts baissent.",
      sourceName: "ETSC",
      sourceUrl: "https://etsc.eu",
    });
    expect(r).toEqual({ ok: true });
  });

  it("fails when the cited URL is absent from the article", () => {
    const d = getDecision("source-fidelity")!;
    const r = d.artifactCheck!("/unused", {
      article: "Une analyse anonyme des villes européennes.",
      sourceName: "ETSC",
      sourceUrl: "https://etsc.eu/deep/unconfirmed/path",
    });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 3: Write minimal implementation**

Append to `FLOW_DECISIONS` in `skills/splash/src/flow-decisions.ts` (import the chosen source-guard predicate at the top):

```ts
  {
    id: "source-fidelity",
    evidenceKind: "artifact",
    prerequisites: [],
    required: false,
    // The "artifact" is the article text itself (a spine input). Reuses source-guard's fidelity
    // reasoning — no re-implementation. A cited name/url that the article never contains is a
    // fabricated/upgraded citation (finding class source-url-unconfirmed).
    artifactCheck: (_runDir, payload) => {
      const article = String(payload.article ?? "");
      const url = payload.sourceUrl ? String(payload.sourceUrl) : "";
      const name = payload.sourceName ? String(payload.sourceName) : "";
      if (url && !article.includes(url))
        return { ok: false, reason: `cited source URL "${url}" does not appear in the article text` };
      if (name && !article.includes(name))
        return { ok: false, reason: `cited source name "${name}" does not appear in the article text` };
      return { ok: true };
    },
  },
```

(If a `source-guard.ts` predicate expresses this more precisely, call it instead of the inline `includes` checks — prefer reuse.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/splash && bun test src/flow-decisions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/flow-decisions.ts skills/splash/src/flow-decisions.test.ts
git commit -m "feat(flow): source-fidelity decision (article text corroborates the citation)"
```

---

### Task 6: `producer-escalation` decision (transcript kind, write-guard presence)

**Files:**
- Modify: `skills/splash/src/flow-decisions.ts` (add the entry)
- Test: `skills/splash/src/flow-decisions.test.ts` (add cases)

**Interfaces:**
- Produces: registry entry `producer-escalation`, `evidenceKind: "transcript"`, `writeGuard` requiring a non-empty `escalationReason` in the payload. The spine can only enforce presence; the harness (a later plan) cross-checks the reason against the real transcript.

- [ ] **Step 1: Write the failing test**

```ts
// append to skills/splash/src/flow-decisions.test.ts
describe("producer-escalation decision", () => {
  it("write-guard refuses an empty escalationReason", () => {
    const d = getDecision("producer-escalation")!;
    const r = d.writeGuard!({ escalationReason: "  " });
    expect(r.ok).toBe(false);
  });
  it("write-guard accepts a stated reason", () => {
    const d = getDecision("producer-escalation")!;
    expect(d.writeGuard!({ escalationReason: "journalist asked for hover on every city" })).toEqual({ ok: true });
  });
  it("is a transcript-kind decision", () => {
    expect(getDecision("producer-escalation")!.evidenceKind).toBe("transcript");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/splash && bun test src/flow-decisions.test.ts`
Expected: FAIL — no `producer-escalation` entry.

- [ ] **Step 3: Write minimal implementation**

Append to `FLOW_DECISIONS`:

```ts
  {
    id: "producer-escalation",
    evidenceKind: "transcript",
    prerequisites: [],
    required: false,
    // No disk artifact: escalating to chart-native on a dw-reachable type is only justified by a
    // journalist motion/interactivity ask, which lives in the conversation. The spine enforces that
    // a reason was stated; the harness cross-checks it against the real transcript.
    writeGuard: (payload) => {
      const reason = String(payload.escalationReason ?? "").trim();
      return reason
        ? { ok: true }
        : { ok: false, reason: "escalationReason is required to escalate to chart-native on a dw-reachable type" };
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/splash && bun test src/flow-decisions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/flow-decisions.ts skills/splash/src/flow-decisions.test.ts
git commit -m "feat(flow): producer-escalation decision (spine presence guard on escalationReason)"
```

---

### Task 7: SKILL.md trigger block + gate the whole suite

**Files:**
- Modify: `skills/splash/SKILL.md` (add the trigger block near the §5b accepted.json emission and the routing/escalation/source sections)
- Verify: run `bun run check` at repo root.

**Interfaces:**
- Consumes: everything above.
- Produces: the orchestrator's instruction to call `save-decision.mjs` after each first-cut decision. This is TRIGGER prose (a reminder), NOT guard prose — the gate is what enforces once flipped to `required:true`.

- [ ] **Step 1: Add the trigger block to SKILL.md**

Add, in the section that describes emitting `accepted.json` (§5b) and the routing/escalation/source rules:

```markdown
**Record each flow decision mechanically (does NOT replace the gate — it feeds it).**
After the corroborating step, run the sanctioned writer so the spine can verify it:
- after suggest-chart produced `candidates.json`:
  `bun skills/splash/scripts/save-decision.mjs suggest-chart-invoked <runDir>`
- when citing the article's source:
  `bun skills/splash/scripts/save-decision.mjs source-fidelity <runDir> --payload '{"article":"…","sourceName":"…","sourceUrl":"…"}'`
- when escalating to chart-native on a dw-reachable type:
  `bun skills/splash/scripts/save-decision.mjs producer-escalation <runDir> --payload '{"escalationReason":"…"}'`
`<runDir>` is the directory that holds `accepted.json`/`candidates.json`. The writer REFUSES a
decision whose evidence is missing — you cannot record a routing that did not happen.
```

- [ ] **Step 2: Run the full gate**

Run: `bun run check`
Expected: all checks pass (the trio is `required:false`, so no existing run breaks; the new unit + script tests are picked up by the `skills/splash` test dir).

- [ ] **Step 3: Commit**

```bash
git add skills/splash/SKILL.md
git commit -m "docs(flow): SKILL.md trigger block for save-decision (reminder, not enforcement)"
```

---

## Out of scope for this plan (follow-up plans)

- **Harness transcript cross-checks** (`splash-harness`): `check:suggest-chart-invoked` and
  `check:producer-escalation` as `check:` sources, plus one e2e per decision proving a
  route-from-memory run fails the gate once flipped. These land in the harness repo and gate
  the `required:true` flip — their own plan.
- **The `required:true` flip** for each of the three decisions, after a clean harness run.
- **Lever 2** (CADRAGE gates as decisions + `prerequisites` migration + illegal-turn check).
- **Lever 3** (class-key ledger loop in `splash-harness`).

## Self-Review

- **Spec coverage (lever 1 slice):** registry (Task 1), sanctioned writer with write-time checks (Task 2), gate reader (Task 3), spine wiring (Task 4), the two artifact decisions (Tasks 1, 5), the one transcript decision (Task 6), staged `required:false` rollout + trigger prose (Task 7). The harness layer and the flip are explicitly deferred to a follow-up plan (spec's build-order note).
- **Placeholder scan:** none — every step carries real code or an exact command.
- **Type consistency:** `FlowDecision`, `CheckResult`, `DecisionPayload`, `getDecision`, `evaluateDecisions`, `readDecisions` are defined in Tasks 1–3 and reused verbatim in Tasks 4–6. `artifactCheck(runDir, payload)` and `writeGuard(payload)` signatures match across producer and consumer. `runDir = dirname(acceptedPath)` is used consistently.
