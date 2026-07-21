# S1 — Strict production seam (chain-verified export) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make a hand-authored / pipeline-bypassing production artifact UNSHIPPABLE by verifying, at the export gate, that the delivered artifact traces the full sanctioned chain `candidates.json (suggest-chart) → accepted.json → produce-all → outputs` — killing the certification's improvisation critical mechanically, on the back-end only.

**Architecture:** Splash cannot revoke the actor's shell (runtime concern — the belt). The enforceable lever Splash owns is the EXPORT gate. The existing `render-provenance.ts` already refuses artifacts not in the pipeline's `outputs` and stale/hand-planted files. This plan ADDS the missing link: the artifact's *spec* must trace to a suggest-chart-emitted candidate, not a hand-authored one. No new crypto (a token is forgeable by a shell-actor and needs a runtime secret Splash lacks); chain-verification of on-disk provenance is what's actually enforceable.

**Tech Stack:** Bun, TypeScript, `bun:test`.

## Global Constraints
- Runtime **Bun** only. Tests `bun:test`. TDD: failing test before impl.
- Code/comments/commits: **English**. NO Claude/Anthropic mention; no `Co-Authored-By`. No new `any`.
- **Gate green each task**: `bun run check` (token-free) passes before every commit. Typecheck via `cd skills/<skill> && bunx tsc --noEmit` (NEVER `-p` from repo root — stale global tsc).
- **Behaviour-preserving for the happy path**: a real `produce-all` → gate-render → export delivers byte-identically. Only bypass/hand-authored paths newly fail.
- **No hard-refuse of direct script invocation** (dev/`check:render`/`verify-source-bundle` stay runnable) — only un-chained output is non-deliverable.
- Work on a dedicated branch off `main` (created in Task 0).
- **Refines the spec** (`2026-07-21-strict-production-seam-design.md` §3.1-3.2): the HMAC/nonce token is SUPERSEDED by chain-verification (honest — no unavailable runtime secret); the export refuses via provenance-chain, not a forgeable token.

---

### Task 0: Branch + read the existing chain

**Files:** none (setup + read).

- [ ] **Step 1: Create the branch off main**
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && git checkout -b feat/strict-production-seam
```
- [ ] **Step 2: Read the existing enforcement chain (the implementer MUST read these before Task 1):**
  - `skills/splash/src/produce-all.ts` — `produceAll(...)`: the loop, `results: ProposalResult[]`, `report.generatedAt`. Where each result is pushed (find the `dispatch(...)` call ~line 208 and the `results.push({...})` sites).
  - `skills/splash/src/producer-spec.ts` — `AcceptedProposal` (has `id`, `producer`, `format`, `spec`, `confirmedTakeaway`, …), `ProposalResult` (`id`, `producer`, `status`, `outputs`, `reviewed`, `renderApproved`, `approvedHash`), `ProduceReport` (`generatedAt`, `results`).
  - `skills/splash/src/export-guard.ts` — `assertShippable(report, id)` (refuses unless produced+reviewed+renderApproved), `assertDelivered(files, {format, form, dir})`.
  - `skills/splash/src/render-provenance.ts` — `assertArtifactProvenance(...)`: already refuses artifacts not in `outputs` + stale (mtime > generation anchor). THIS is what you extend, not duplicate.
  - `skills/splash/scripts/gate-render.mjs` + `skills/splash/src/gate.ts` — the ONLY writer of `renderApproved`/`approvedHash`; calls `assertArtifactProvenance`.
  - How the sanctioned chain is enforced today: `rg -n "candidates" skills/splash/src skills/splash/scripts` — `produce-all` resolves `candidates.json` beside `accepted.json` and REFUSES a non-direct proposal whose producer is not in the menu. Find WHERE (`produce-all.mjs` / `produce-all.ts`) and its exact function.
  - Where `accepted.json` + `candidates.json` live: `exports/<slug>/{accepted.json,candidates.json}` (confirm the paths).

---

### Task 1: produce-all records the accepted-spec provenance on each result

**Files:**
- Modify: `skills/splash/src/produce-all.ts` (add `acceptedConfigHash` to each `ProposalResult`)
- Modify: `skills/splash/src/producer-spec.ts` (add the field to `ProposalResult`)
- Test: `skills/splash/src/produce-all.test.ts` (or the existing produce-all test file)

**Interfaces:**
- Produces: `ProposalResult.acceptedConfigHash?: string` — `sha256` of the canonicalized accepted `spec` that produced this result. Set by `produceAll` from the `AcceptedProposal.spec` it dispatched. Optional only for legacy-report back-compat; `produceAll` always sets it.

- [ ] **Step 1: Write the failing test** — `produceAll` with a fake dispatch returns a report whose result carries `acceptedConfigHash === sha256(JSON.stringify(acceptedProposal.spec))`. Run → FAIL (field absent).
- [ ] **Step 2: Add the field** to `ProposalResult` in `producer-spec.ts` (`acceptedConfigHash?: string;`, documented as the sanctioned-spec provenance).
- [ ] **Step 3: Set it in `produceAll`** — at each `results.push({...})` for a produced result, compute `createHash("sha256").update(canonicalJson(p.spec)).digest("hex")` (use a stable key-sorted stringify — add a tiny `canonicalJson` helper, or `JSON.stringify` if the spec key order is already stable; document the choice). Import `createHash` from `node:crypto`.
- [ ] **Step 4: Run the test → PASS.** `bun test skills/splash/src/produce-all.test.ts`
- [ ] **Step 5: Gate + commit.** `cd skills/splash && bunx tsc --noEmit`; `git commit -am "feat(splash): record accepted-spec provenance hash on each produce result"`

---

### Task 2: the export gate verifies the sanctioned chain

**Files:**
- Modify: `skills/splash/src/render-provenance.ts` (add `assertChainProvenance`) OR `export-guard.ts` (whichever owns the export-stage check — decide by where `assertShippable` is called from `export-code.mjs`)
- Modify: `skills/splash/src/export-guard.ts` (`assertShippable` also asserts chain provenance)
- Test: `skills/splash/src/export-guard.test.ts` (or render-provenance test)

**Interfaces:**
- Produces: `assertChainProvenance(report, id, exportDir): void` — throws (a clean refusal string, NOT a raw error) unless:
  1. the result's `producer`/`type` traces to `candidates.json` in `exportDir` (suggest-chart emitted it — reuse the existing candidates-menu check from Task 0's read; a DIRECT-declared proposal is exempt exactly as produce-all already exempts it), AND
  2. `accepted.json` in `exportDir` exists and the accepted spec's `sha256` equals the result's `acceptedConfigHash` (the shipped artifact came from the accepted spec, not a later hand-edit), AND
  3. `assertArtifactProvenance` already-passed conditions hold (outputs traceable + fresh — call it, don't duplicate).
- Consumes: `report` (Task 1's `acceptedConfigHash`), the on-disk `candidates.json`/`accepted.json`.

- [ ] **Step 1: Write the failing tests (4 refusal cases + 1 happy):**
  - a valid chain (candidates lists the producer, accepted spec hashes to `acceptedConfigHash`, outputs fresh) → `assertChainProvenance` does NOT throw;
  - producer NOT in `candidates.json` (hand-authored, non-direct) → throws `refusing to export … not in the candidate menu (hand-authored?)`;
  - `accepted.json` spec hash ≠ result's `acceptedConfigHash` (spec swapped after acceptance) → throws;
  - `accepted.json` missing → throws;
  - (reuse render-provenance for the planted/stale case — assert `assertChainProvenance` calls it).
  Run → FAIL (fn absent).
- [ ] **Step 2: Implement `assertChainProvenance`** per the interface. Reuse the Task-0 candidates-menu logic and `assertArtifactProvenance`; add the accepted-spec-hash check. NEVER throw a raw Error object into an unguarded path — return-style refusal is not possible here (it throws by contract, like `assertShippable`), but ensure its callers (`export-code.mjs`, which is reachable from produce-all top-level) catch it into `status:"failed"` — verify the call site wraps it.
- [ ] **Step 3: Wire into `assertShippable`** (or call `assertChainProvenance` right beside it in `export-code.mjs`) so the export stage runs it.
- [ ] **Step 4: Run tests → PASS.** `bun test skills/splash/src/export-guard.test.ts skills/splash/src/render-provenance.test.ts`
- [ ] **Step 5: Gate + commit.** `cd skills/splash && bunx tsc --noEmit`; `bun test skills/splash`; `git commit -am "feat(splash): export gate verifies the sanctioned candidates→accepted→produce chain (kill hand-authored bypass)"`

---

### Task 3: regression test — replay the certification critical

**Files:**
- Test: `skills/splash/src/anti-improvisation.test.ts` (new)

**Interfaces:** Consumes Task 1+2. Produces: a pinned regression proving the exact observed maneuver is now unshippable.

- [ ] **Step 1: Write the regression test.** Construct the exact critical scenario in a tmp `exportDir`: a `candidates.json` that does NOT list `chart-native` for this opportunity + a hand-authored `accepted.json` whose producer is `chart-native` + a produced artifact (fresh outputs). Assert the export path (`assertShippable` + `assertChainProvenance`) REFUSES it — the hand-authored spec has no candidate provenance. Then a control: the SAME artifact WITH a candidates.json that lists it + matching `acceptedConfigHash` → ships. Red-if-the-guard-is-removed.
- [ ] **Step 2: Run → PASS.** `bun test skills/splash/src/anti-improvisation.test.ts`
- [ ] **Step 3: Gate + commit.** `git commit -am "test(splash): pin the anti-improvisation invariant — hand-authored spec is unshippable"`

---

### Task 4: SKILL.md — lookup-not-grep, demote the Never list, document the runtime belt

**Files:**
- Modify: `skills/splash/SKILL.md` (the "Never hand-author" section ≈685-737)
- Create: `docs/splash/runtime-capability-belt.md`

- [ ] **Step 1:** In `skills/splash/SKILL.md`, add one hard rule to the production section: "the component for a visual type is a REGISTRY LOOKUP (`register-producers`), never a `src/` inspection — do not grep engine `src/` to author a spec." Reframe the "Never hand-author" list from primary-defense prose to guidance, noting the structural defense is now the chain-verified export (a hand-authored artifact is mechanically unshippable). Do NOT delete the guidance; do NOT weaken any other gate rule. Keep the #15 split/reference structure intact.
- [ ] **Step 2:** Create `docs/splash/runtime-capability-belt.md` documenting the belt: Splash (a skill) cannot revoke the actor's Bash/Grep; the integration/harness should restrict the actor's tool allowlist during the production phase (Claude-Code `--permission-mode`, OS sandbox) as the backstop to the chain-verified export. Cite the audit §1 (OWASP: allowlist must be an execution boundary, not a prompt request).
- [ ] **Step 3:** Confirm SKILL.md frontmatter still parses (`head -4 skills/splash/SKILL.md` → `---`). Commit: `git commit -am "docs(splash): registry-lookup rule + demote Never-list to guidance + document the runtime capability belt"`

---

## Self-Review
- **Spec coverage:** §3.1 provenance marker → Task 1 (accepted-spec hash; the HMAC-token is superseded by chain-verification, flagged in the header + Task-2 interface — a documented refinement, not a gap). §3.2 export refuses without provenance → Task 2 + Task 3. §3.3 registry-only reach → Task 4 Step 1 (reinforced; the mechanism already exists via the import-guard). §3.4 demote Nevers → Task 4. §3.5 runtime belt → Task 4 Step 2 (documented, out of code scope as the spec states). §4 migration order → Tasks 1→2→3→4. §5 tests → Task 2 (4 refusal + happy) + Task 3 (critical replay). §6 risks (forgeability) → addressed by the honest chain-verification refinement (no fake crypto).
- **Placeholder scan:** Task 0 Step 2 and Task 2 Step 1 tell the implementer to READ the exact candidates-menu function before coding — legitimate for a chain that spans files not fully quoted here; the interfaces and file targets are concrete. No silent TODOs.
- **Type consistency:** `acceptedConfigHash` (Task 1) is consumed by `assertChainProvenance` (Task 2) and the regression test (Task 3) under the same name.
