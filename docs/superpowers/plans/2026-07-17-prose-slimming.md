# Prose-Slimming — Flow SKILL.md Hot-Path Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** cut the flow prose the orchestrator LLM must hold live from **1 834 lines → ~800
(−55 %)** WITHOUT dropping a single load-bearing rule — so the recurring "rule buried at line
700 gets ignored" failure class (6 emergency levers this session) is cured at the root, not
patched with a 7th lever.

**Why (grounded):** the audit (`artifact` 2026-07-17) + a grounded SKILL.md analysis found ~450
lines irreducible, ~1 380 compressible. The compression is SAFE because the enforcement already
lives in code (validate-gate GUARDs 1-5, produce-all gates, source-guard, channel, export-guard)
AND in an existing 74-line canonical inventory `docs/splash/guardrails.md`. The SKILL.md is a
THIRD copy of the guards, sitting in the LLM's decision ladder where OWASP-style instruction-loss
(>50 % on long prompts) bites hardest.

**Architecture:** split each SKILL.md into a short **HOT PATH** (the 6-phase gate sequence,
accepted.json schema, the ~30 behavioral rules with NO mechanical backstop, a terse Never list)
and a **REFERENCE APPENDIX** consulted on demand (guard explanations → point at `guardrails.md`;
the per-nativeType catalogue → `knowledge/references/chart-selection.md`; runbooks, rationale,
examples). TDD-guarded by `skill-doc-parity.test.ts`: every survivor rule is PINNED before any
prose moves, so the slim cannot silently drop it.

**Tech Stack:** Markdown (the SKILL.md contracts), bun:test (doc-parity pins), the splash-harness
for the live acceptance run.

## Global Constraints

- Code, comments, commits: English. No vendor mention. Bun, bun:test.
- **Zero load-bearing rule lost.** The 5 survivors + honorable mentions (Task 1) are the
  non-negotiable set; every one must be a green doc-parity pin at the end.
- **Behavioral parity is the real acceptance test** (Task 7): a live harness run on the slimmed
  prose must produce equal-or-better flow behavior (same gates hit, candidates emitted, narrative
  considered) — shorter prose must not degrade following. Prose-shortening that breaks a run is a
  failed slim, reverted.
- Line numbers in this plan are APPROXIMATE anchors — a slim shifts them constantly. Always
  `grep` for the rule text, never trust a line number.
- Branch `feat/prose-slimming` off `main`, in a worktree. Do NOT touch the shared checkout.

---

### Task 1: Pin the survivor rules FIRST (the safety net before any cut)

**Files:**
- Modify: `skills/splash/tests/skill-doc-parity.test.ts` (extend — it exists)

**Interfaces:**
- Consumes: `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md` as text.
- Produces: a `describe("survivor rules — must never be slimmed away")` block that pins each
  load-bearing rule by a distinctive phrase. These stay GREEN through the whole slim; the moment
  a cut drops a survivor, its pin goes red.

- [ ] **Step 1: Write the survivor pins (they should pass immediately — the rules exist NOW)**

```ts
describe("survivor rules — load-bearing, no mechanical backstop, MUST survive any slim", () => {
  // 1. Source-uncertainty: a hedged-but-real-looking citation passes every guard; only prose stops it.
  it("keeps the source-uncertainty rule (« je crois » / de mémoire → never a confident citation)", () => {
    expect(splash).toMatch(/je crois|de mémoire|uncertain|incertain/i);
    expect(splash).toContain("Source"); // near the uncertainty rule
  });
  // 2. Takeaway must be EXPLICITLY confirmed, never inferred-and-skipped (GUARD 3 checks presence only).
  it("keeps 'takeaway confirmed EXPLICITLY, never inferred and skipped'", () => {
    expect(splash).toMatch(/EXPLICIT[^.]*confirm|confirm[^.]*EXPLICIT|jamais infér|never infer/i);
  });
  // 3. Never fabricate a value — coordinates/dates/numbers (validators cannot tell real from invented).
  it("keeps never-fabricate-any-value (both files)", () => {
    expect(splash).toMatch(/never fabricate|jamais inventer|ne jamais inventer/i);
    expect(suggest).toMatch(/never invent|coordinate|fabricate/i);
  });
  // 4. Gate-3a render-review six criteria (assertShippable only checks a record EXISTS, not honesty).
  it("keeps the Gate-3a render-review criteria (title↔takeaway part-by-part, comparative caption, interaction-not-from-a-still)", () => {
    expect(splash).toMatch(/render.?review|Gate 3a/i);
    expect(splash).toMatch(/part.by.part|comparative|tooltip|interaction/i);
  });
  // 5. WAIT-means-WAIT delivery gate / never auto-progress a gate (harness check is post-hoc, not in-flow).
  it("keeps WAIT-means-WAIT / never auto-progress a gate", () => {
    expect(splash).toMatch(/WAIT|attends|never auto-progress|jamais auto/i);
  });
  // Honorable mentions — terse but present.
  it("keeps one-element-one-takeaway SEMANTIC (paraphrased shared takeaway escapes GUARD 3b)", () => {
    expect(splash).toMatch(/one .?element.* one|un élément.* un|per accepted element/i);
  });
  it("keeps 'always ask Q6 channel' (absent channel silently defaults to permissive article-web)", () => {
    expect(splash).toMatch(/Où sera-t-il publié|channel.*LAST|Q6/);
  });
});
```

- [ ] **Step 2: Run — all survivor pins GREEN on the current (un-slimmed) prose**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: PASS. If any pin is RED now, the rule's phrasing differs from my regex — fix the regex
to match the REAL current text (do NOT change SKILL.md yet). The pins must lock the rules AS THEY
ARE before Task 3 starts moving prose.

- [ ] **Step 3: Commit the safety net**

```bash
git add skills/splash/tests/skill-doc-parity.test.ts
git commit -m "test(splash): pin the 5 survivor rules + honorable mentions before any prose slim (TDD safety net)"
```

---

### Task 2: Ensure the reference targets exist and are complete

**Files:**
- Verify/extend: `docs/splash/guardrails.md` (the 74-line guard inventory — the pointer target)
- Verify/extend: `knowledge/references/chart-selection.md` (where suggest-chart's per-type
  catalogue moves; suggest-chart already cites it)

**Interfaces:**
- Produces: two reference docs complete enough that the hot-path can POINT at them instead of
  re-explaining.

- [ ] **Step 1: Confirm `guardrails.md` covers every guard the SKILL.md hot-path re-explains**

Run: `grep -c "|" docs/splash/guardrails.md` and read it. Cross-check against the GUARD blocks in
`skills/splash/SKILL.md` (grep `GUARD`, `Spine validation`, `producer-match`, `re-produce`,
`source-guard`). Every guard the SKILL.md explains at length must have a row in `guardrails.md`.
Add any missing row (verify against the code file, per the doc's own discipline — never document
a guard from memory).

- [ ] **Step 2: Confirm/create the per-nativeType catalogue's reference home**

Read `knowledge/references/chart-selection.md` (or `format-selection.md` — grep which one
suggest-chart cites). The per-nativeType shape catalogue currently inline at
`suggest-chart/SKILL.md` (~lines 333-451, grep the type names `bar`, `heatmap`, `dumbbell`) must
have a home there. If the reference lacks it, MOVE the catalogue text there verbatim first (no
loss), so Task 4 can replace the inline block with a one-line pointer.

- [ ] **Step 3: Commit any reference completion**

```bash
git add docs/splash/guardrails.md knowledge/references/*.md
git commit -m "docs(reference): complete guardrails.md + chart-selection catalogue as the slim's pointer targets"
```

---

### Task 3: Collapse the lever-redundant guard-explainer blocks (the biggest, safest cut)

**Files:**
- Modify: `skills/splash/SKILL.md` (Category-2 blocks → pointers)

**Interfaces:**
- Consumes: Task 1's survivor pins (must stay green), Task 2's `guardrails.md`.
- Produces: ~570 lines of guard-documentation prose compressed to ~120 lines of pointers.

**The blocks to collapse (grep the phrase, replace the multi-line explanation with a 1-3 line
pointer to `guardrails.md` + the CODE symbol that enforces it). Each is pure
documentation-of-code:**

- [ ] **Step 1: "Spine validation gate re-applies guardrails"** (grep `Spine validation` /
  `re-applies`, ~490-505) → one line: "Every accepted spec is re-validated at the spine
  (`validate-gate.ts`, GUARDs 1-5) — see `docs/splash/guardrails.md`. A hand-authored spec cannot
  bypass it."
- [ ] **Step 2: Gate-2c source essay** (grep `Gate 2c` / `source`, ~116-183, 68 lines) → collapse
  the mechanics to ~12 lines (the three states a/b/c + the pointer to `source-guard.ts`
  GUARD 2/2b/2c) **BUT keep the source-uncertainty carve-out (survivor #1) verbatim** — it has no
  lever. Run the survivor pins after this step specifically.
- [ ] **Step 3: GUARD 1 producer-match, re-produce-reset, GUARD 3/3b, duplicate-takeaway**
  (grep each) → pointers to `guardrails.md` + the code symbol.
- [ ] **Step 4: Newsroom-profile F2 mega-paragraph** (grep `NEWSROOM-PROFILE` / `mergeProfileDefaults`,
  ~185) → ~5 lines: house style is auto-applied at produce (`mergeProfileDefaults`); announce it,
  don't load it manually; per-element value wins. (The SKILL already says "You do NOT load it
  manually" — the 30-line mechanics are code.)
- [ ] **Step 5: preflight + channel/format mechanics restatements** (grep `preflight`,
  `assertFormatAllowed`) → keep the ONE canonical statement of each, delete the 2-4 restatements
  (Category 3), pointer to code.

- [ ] **Step 6: After EACH sub-step, run the survivor pins + full splash doc-parity**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: ALL green — every survivor pin AND every existing flow pin (candidates, narrative,
12-step order, etc.). A red here = a cut dropped a pinned rule; revert that sub-step's edit and
collapse more conservatively.

- [ ] **Step 7: Commit**

```bash
git add skills/splash/SKILL.md
git commit -m "refactor(splash): collapse lever-redundant guard-explainer blocks to guardrails.md pointers (~570→~120 lines, survivors pinned green)"
```

---

### Task 4: Move suggest-chart's per-nativeType catalogue to the reference

**Files:**
- Modify: `skills/suggest-chart/SKILL.md` (the ~120-line inline catalogue → 1-line pointer)

- [ ] **Step 1: Replace the inline per-type catalogue with a pointer**

Grep the catalogue (the run of per-type paragraphs, ~333-451). Confirm Task 2 moved its content
to `chart-selection.md`. Replace the inline block with: "Per-type spec shapes (bar…heatmap, map
fields, scrolly config): `knowledge/references/chart-selection.md` — consult the entry for the
chosen type when emitting Stage-2." Keep in the hot path ONLY the Stage-1 candidates contract +
the Gate-5 geographic routing semantics + coordinate-provenance (survivors) + the colour
subject→hue choice.

- [ ] **Step 2: Run suggest-chart doc-parity pins (candidates contract, narrative family, etc.)**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts` (it reads suggest-chart too)
Expected: green — the candidates/narrative/whole-family pins must survive the catalogue move.

- [ ] **Step 3: Commit**

```bash
git add skills/suggest-chart/SKILL.md knowledge/references/chart-selection.md
git commit -m "refactor(suggest-chart): move per-nativeType catalogue to chart-selection.md reference (~120→1 line)"
```

---

### Task 5: Strip incident war-stories + de-emphasize

**Files:**
- Modify: `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md`

- [ ] **Step 1: Move incident rationale out of the hot path**

Grep the war-story markers (`an observed`, `real case`, `Wave-9`, `papered over`, `mv`-narration).
Each "Never X — an observed miss where Y happened on date Z" becomes a terse imperative "Never X."
The narration moves to a code comment at the guard OR to the CHANGELOG (it's already there for
most). Keep every Never IMPERATIVE; delete only the story.

- [ ] **Step 2: De-emphasize (restore attention-prioritization)**

The two files carry ~560 emphasis events (bold/★/NEVER) — one every 3.3 lines. Reduce to reserve
emphasis for the ~8 genuine survivor rules ONLY. Concretely: drop bold from routine statements,
keep the ★ on the survivor rules and nowhere else. This saves 0 lines but is the point of the
exercise — when a third of paragraphs are bold, the LLM's attention cannot prioritize.

- [ ] **Step 3: Survivor pins + full doc-parity green; commit**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`

```bash
git add -A && git commit -m "refactor(flow): strip incident war-stories to comments/CHANGELOG + de-emphasize (★ reserved for survivor rules)"
```

---

### Task 6: Structural reorg — hot path first, reference appendix last

**Files:**
- Modify: `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md`

- [ ] **Step 1: Order each file so the HOT PATH is the first screen**

The 6-phase gate sequence + accepted.json schema + the ~30 backstop-less rules + the Never
imperatives come FIRST. Everything a run consults on-demand (pointers, remaining examples, the
export runbook, edge-case handling) goes into a clearly-marked `## Reference (consult on demand)`
section at the END. The OWASP concern is positional: a load-bearing rule must not sit at line 700.

- [ ] **Step 2: Measure the cut**

Run: `wc -l skills/splash/SKILL.md skills/suggest-chart/SKILL.md`
Expected: combined ≈ 800-900 (from 1 834). If still >1 000, another Category-2/3 pass is available
(re-grep for guard-documentation and restatements). Record the before/after in the commit.

- [ ] **Step 3: Full gate + commit**

Run: `bun run check` (repo root) — the SKILL.md-dependent checks (question-count detectors,
sign-off discipline) must pass against the reordered text.

```bash
git add -A && git commit -m "refactor(flow): hot-path-first structure + reference appendix — SKILL.md 1834→~850 lines, 0 load-bearing rule lost"
```

---

### Task 7: Behavioral parity — the real acceptance test

**The whole POINT is that the LLM follows the flow EQUAL-OR-BETTER on shorter prose.** A green
doc-parity suite proves the rules are still PRESENT; only a live run proves they are still
FOLLOWED.

- [ ] **Step 1: Run 3 harness cases on the slimmed prose (sequential, judged)**

From `../splash-harness`, run one guided chart, one narrative (temporal or visual), one text-only
data-poor case (e.g. `peage-urbain-trafic`, `venezia-sovraffollamento`, `bus-de-nuit-datapoor`)
against the slimmed `main`. Compare each run's findings to its pre-slim baseline (the run logs
from 2026-07-17).

- [ ] **Step 2: Assert equal-or-better**

Expected: same gates hit, `candidates.json` still emitted with narrative considered, no NEW class
of flow finding introduced by the slim. A survivor rule that stops being obeyed (e.g. a takeaway
inferred-not-confirmed, a war-story-stripped Never now ignored) is a FAILED slim for that block —
revert it and keep the prose. Record the before/after finding counts.

- [ ] **Step 3: Record + decide**

If parity holds: the slim is validated — record in CHANGELOG + CLAUDE.md. If a specific block
regressed behavior, that block's prose was load-bearing after all (a survivor the analysis
missed) — restore it, add a doc-parity pin for it, and note the lesson.

## Out of scope

- Adding the new mechanical levers (escalationReason, format-question check, etc.) — those are the
  audit's roadmap items 2-3, a separate chantier. This plan ONLY slims; it does not add enforcement.
- Touching the code guards themselves — the slim points AT them, never changes them.

## Verification

- Every survivor pin + every pre-existing flow pin green after every task (Tasks 1-6).
- `bun run check` green (Task 6).
- Behavioral parity on 3 live runs vs baseline (Task 7) — the definitive proof.
- Before/after line count recorded (target ~800 from 1 834).
