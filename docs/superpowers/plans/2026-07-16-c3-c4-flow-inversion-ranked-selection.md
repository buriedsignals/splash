# C3+C4 — Canonical 12-Step Question Flow + Batched Multi-Proposals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** the journalist lives Rémy's canonical 12-step sequence (spec
`2026-07-16-tom-feedback-flow-redesign-design.md`, §"The canonical question sequence"): article
asked if missing → takeaway → data truth (table+source) BEFORE routing → constraints → channel
LAST in CADRAGE → **multiple proposals, batched across opportunities, each with its why** →
produce → ship-it → a/b/c → **proactive other-format offer**.

**Architecture:** a SKILL.md question-model REWRITE (known-sensitive zone: Wave 11 renumbering,
anti-double-ask) + the suggest-chart candidates contract + doc-parity tests; almost no runtime
code changes. Channel stays in CADRAGE (last position) so every candidate is channel-aware at
emission — "only offer what is confirmed producible" keeps holding. GATE 2b (prose table) and
GATE 2c (source) RELOCATE from PROPOSITION into CADRAGE step 5 (table = prose-only, source =
always). No standalone format question exists: format derives from channel × type, announced
for veto with the chosen proposal. Cycle 2 = a NEW accepted.json entry `<id>-<format>` offered
PROACTIVELY after every export (step 12), so `freshOutDir` (keyed by id) never wipes the first
delivery.

**Tech Stack:** Markdown (SKILL.md prose contracts), TypeScript, bun:test.

## Global Constraints

- Code, comments, commits: English. No vendor mention. Bun, bun:test, TDD.
- The locked decision "② proposes just the best visual" (2026-06-23) is reversed ON PURPOSE.
- The single-format model STANDS: one element = ONE pinned format per cycle; more formats =
  step-12 cycles.
- Invariants that must SURVIVE the rewrite: Gate 1b verbatim/non-skippable/one-per-element ·
  one opportunity = one accept decision (presentation batched, decisions per-opportunity) ·
  2b never bundled with the visual accept · never offer-then-retract (reachability before
  presentation) · explicit journalist format signal ("statique", "print") wins.
- `skills/splash/src/channel.ts` is NOT modified by this plan.
- Companion (out of this repo): splash-harness driver migration (answers channel at its new
  position, picks from the batched candidates, answers the step-12 offer) — merge together.

---

### Task 1: Doc-parity tests first (red) — the 12-step model, mechanically pinned

**Files:**
- Test: `skills/splash/tests/skill-doc-parity.test.ts` (create)

**Interfaces:**
- Consumes: `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md` as text.
- Produces: the red tests Tasks 2-4 turn green; stays as the drift guard for the new flow.

- [ ] **Step 1: Write the failing tests**

```ts
// skill-doc-parity.test.ts — mechanical pins for the canonical 12-step question flow
// (Rémy 2026-07-16). SKILL.md is a prose CONTRACT the orchestrator LLM executes; these greps
// are the cheapest tripwire against a partial rewrite regressing to the old order (data truth
// after routing, single proposal, per-opportunity question loops).
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const splash = readFileSync(join(import.meta.dir, "../SKILL.md"), "utf8");
const suggest = readFileSync(
  join(import.meta.dir, "../../suggest-chart/SKILL.md"),
  "utf8",
);

const input = splash.slice(
  splash.indexOf("### 1. INPUT"),
  splash.indexOf("### 2. ANALYSE"),
);
const cadrage = splash.slice(
  splash.indexOf("### 3. CADRAGE"),
  splash.indexOf("### 4. PROPOSITION"),
);
const proposition = splash.slice(
  splash.indexOf("### 4. PROPOSITION"),
  splash.indexOf("### 5. PRODUCTION"),
);

describe("C3 — the canonical 12-step order", () => {
  it("INPUT must ask for the article when none is supplied (step 2)", () => {
    expect(input).toContain("ask for the article");
  });

  it("CADRAGE ends on the channel question (step 7 — after takeaway, table, source, constraints)", () => {
    const posTakeaway = cadrage.indexOf("takeaway");
    const posTable = cadrage.indexOf("GATE 2b");
    const posSource = cadrage.indexOf("GATE 2c");
    const posConstraint = cadrage.indexOf("Constraint");
    const posChannel = cadrage.indexOf("Where will it be published");
    for (const pos of [posTakeaway, posTable, posSource, posConstraint, posChannel])
      expect(pos).toBeGreaterThan(-1);
    expect(posTakeaway).toBeLessThan(posTable);
    expect(posTable).toBeLessThan(posSource);
    expect(posSource).toBeLessThan(posConstraint);
    expect(posConstraint).toBeLessThan(posChannel);
  });

  it("source (GATE 2c) is asked ALWAYS, table (GATE 2b) prose-only, never bundled", () => {
    expect(cadrage).toContain("source is asked on EVERY run");
    expect(cadrage).toContain("two successive prompts");
  });

  it("no standalone format question exists — format derives and is announced for veto", () => {
    expect(splash).not.toContain("Où vivra-t-il");
    expect(proposition).toContain("derived from channel × type");
  });

  it("step 12: after export, splash proactively offers another format", () => {
    expect(splash).toContain("### Step 12 — offer another format");
    expect(splash).toContain("-<format>");
  });
});

describe("C4 — batched multi-proposals, each with its why", () => {
  it("PROPOSITION presents ALL opportunities' candidates in ONE message", () => {
    expect(proposition).toContain("ONE batched message");
    expect(proposition).toContain("never a per-opportunity question loop");
  });

  it("each candidate carries its editorial why, first one recommended", () => {
    expect(proposition).toContain("why it can be interesting");
    expect(proposition).toContain("first one recommended");
  });

  it("suggest-chart emits the candidates contract", () => {
    expect(suggest).toContain("## Output — candidates first");
    expect(suggest).toContain('"candidates"');
  });

  it("stale auto static-fallback prose is purged from suggest-chart", () => {
    expect(suggest).not.toContain(
      "always shipped with a self-contained static HTML",
    );
    expect(suggest).not.toContain(
      "a static fallback that carries the claim on its own is ALSO produced",
    );
  });
});
```

- [ ] **Step 2: Run to verify all red**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: FAIL on every new-text assertion; the ordering test fails on missing anchors
(GATE 2b/2c are not in CADRAGE yet).

- [ ] **Step 3: Commit the red tests**

```bash
git add skills/splash/tests/skill-doc-parity.test.ts
git commit -m "test(splash): doc-parity pins for the canonical 12-step question flow (red)"
```

---

### Task 2: Rewrite INPUT + CADRAGE (SKILL.md) — data truth first, channel last

**Files:**
- Modify: `skills/splash/SKILL.md` — `### 1. INPUT` (line ~17) and the whole `### 3. CADRAGE`
  section (lines ~31-143), plus every later reference to the old positions.

**Interfaces:**
- Consumes: the current text (READ the whole section first — rules that must SURVIVE verbatim:
  Gate 1b takeaway rules, supported-framings rule, F2 newsroom-profile block, DIRECT/GUIDED
  branching, 2b "never bundle", 2c three source states).
- Produces: the new stable Q-labels `Q1 branch (conditional) · Q2 takeaway/Gate 1b ·
  Q3 table (prose-only)/Gate 2b · Q4 source/Gate 2c · Q5 constraint (conditional) ·
  Q6 channel` that Task 3 and the harness driver rely on.

- [ ] **Step 1: INPUT gains the ask-for-the-article step (canonical step 2)**

In `### 1. INPUT`, after the accepted-inputs sentence, add:

```markdown
**No article supplied → ask for the article** before anything else (canonical step 2): a bare
topic or a lone dataset does not start CADRAGE — ask once, plainly (« envoie-moi l'article, ou
dis-moi s'il n'existe pas encore »). Only when the journalist confirms there IS no article does
the bare-topic path (name the real dataset the topic needs) apply.
```

- [ ] **Step 2: Rewrite the CADRAGE heading + stable-positions paragraph**

Heading becomes: `### 3. CADRAGE — GATE 1 (questionnaire, journalist's language, up to 6
questions, one at a time, conditionals skipped)`. The stable-positions sentence (line ~40)
becomes:

```markdown
The Q-labels below are STABLE positions (Q1 branch · Q2 takeaway/Gate 1b · Q3 prose-table/Gate
2b · Q4 source/Gate 2c · Q5 constraint · Q6 channel), not a promise that every one is a fresh
single-select turn: Q1 fires only when the intent is unclear (a named visual keeps the
confirm-back inference), Q3 only on prose-extracted figures, Q5 only if relevant. Announce the
REAL running count — never a hardcoded number the flow did not reach.
```

- [ ] **Step 3: Relocate GATE 2b + GATE 2c into CADRAGE as Q3/Q4**

Move the two blocks from the PROPOSITION section (2b at ~247-257, the 2c block after it) into
CADRAGE after the takeaway item, adapted:

```markdown
3. **Prose table — GATE 2b (prose-extracted figures only):** when the figures come from the
   article's prose, show the reconstructed table (verbatim quotes) and get an explicit
   confirmation BEFORE anything is routed — a wrong table must never invalidate an
   already-routed proposal. Rules unchanged: built from the CURRENT input, never a stale
   export; its own question, never bundled with any later accept.
4. **Source — GATE 2c (EVERY run):** the source is asked on EVERY run — CSV-provided data
   needs its « Source : » line too, not only prose. Free-text prompt (name + URL), never a
   menu. The three resolution states and the never-invent rules are unchanged (name+URL
   verbatim · named org kept name-only · honest "figures from this article"). Q3 and Q4 are
   two successive prompts, never one bundled question.
5. Constraint (only if relevant) — [former item 4, F2 newsroom-profile block moves untouched]
6. **Channel — the LAST CADRAGE question:** « Où sera-t-il publié ? » — the same three options
   (Social vertical Stories/Reels · Social feed post · Article web / embed — interactif, image
   ou vidéo (destination print ⇒ image statique)), asked LAST so the data truth and constraints
   are known, and every PROPOSITION candidate is channel-aware at emission. The pick still maps
   1:1 onto `skills/splash/src/channel.ts`'s `Channel` enum (size + allowed format set,
   mechanics unchanged). The formats named in option (c) describe the channel's allowed SET —
   never a menu, never a second question: NO standalone format question exists anywhere in the
   flow (the format derives from channel × type and is announced for veto with the chosen
   proposal, §4).
```

The old item 3 (channel mid-CADRAGE) is deleted; DIRECT-branch prose updates to "the channel
is asked at the same LAST position on both branches".

- [ ] **Step 4: Sweep every "CADRAGE Q3" / "Q3 (channel)" reference**

Run: `grep -n "CADRAGE Q3\|Q3 (channel)\|Q3 channel" skills/splash/SKILL.md`
Rewrite each hit to the new label ("CADRAGE Q6 channel"). Known sites: adapters/channel prose,
F2 block, GATE 2 prose, the gate table at the bottom (rows 2b/2c move to CADRAGE rows).

- [ ] **Step 5: Run the parity tests — CADRAGE ordering tests green**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: INPUT + CADRAGE-order + source-always tests PASS; PROPOSITION ones still red.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/SKILL.md
git commit -m "feat(splash): canonical CADRAGE — article ask, data truth before routing, channel last"
```

---

### Task 3: Rewrite PROPOSITION (SKILL.md) — batched multi-proposals + step-12 offer

**Files:**
- Modify: `skills/splash/SKILL.md` — the `### 4. PROPOSITION — GATE 2` section, plus a new
  `### Step 12 — offer another format` subsection after the EXPORT section (`### 6. EXPORT`).

**Interfaces:**
- Consumes: Task 2's relocations (2b/2c are gone from this section); C2's preflight annotation
  block (keep it).
- Produces: the batched-candidates presentation Task 4's contract feeds; the `<id>-<format>`
  step-12 convention Task 5 tests.

- [ ] **Step 1: Replace the section opening with the batched multi-proposal model**

Rules that must SURVIVE inside the rewritten section (re-anchor, don't drop): one opportunity =
one accept decision · only-offer-confirmed-producible · chart-scrolly beat model ·
article-web-no-static-fallback + print-signal (reworded: the derived-format announce) · C2
preflight annotation. New opening:

```markdown
### 4. PROPOSITION — GATE 2 (guided path only)

For each `suggest-article` opportunity, invoke `suggest-chart` **as a real Skill call** (never
guess the element/format/producer yourself). Since the canonical 12-step flow (2026-07-16) it
answers in TWO stages, and the presentation is BATCHED:

**Stage 1 — candidates, all opportunities, ONE batched message.** For every opportunity,
`suggest-chart` returns its reachable candidates — charts AND maps — each with its editorial
why ("why it can be interesting" for THIS claim), the first one recommended. Reachable = a
mapper exists × the data shape fits × every deterministic guardrail passes × the channel
(known since CADRAGE Q6) allows at least one of its formats — a barred candidate NEVER
appears. An engine that fails preflight (C2) is annotated, never hidden. Present ALL
opportunities' candidate lists in ONE batched message — never a per-opportunity question loop
— and let the journalist answer per opportunity (pick a candidate, or « aucun » = veto; a
vetoed opportunity emits `no-chart` with the reason). Each kept opportunity remains its OWN
accept decision and its OWN `accepted.json` entry with its OWN confirmedTakeaway — the
batching is presentation, never a merged decision.

**Stage 2 — one spec per kept opportunity.** For each choice, `suggest-chart` emits the full
validated spec. The format is **derived from channel × type** (social ⇒ static or video at
the channel's size; article-web ⇒ interactive by default) and announced for veto in the same
breath — « un chart colonnes INTERACTIF, responsive, calé sur ton canal article web — on part
là-dessus ou tu le veux en image ? ». An explicit journalist format signal (« une image
statique », « pour le print ») WINS over the default. The accepted spec pins exactly ONE
`format`; `assertFormatAllowed(channel, format)` re-checks it at produce time, unchanged.
```

- [ ] **Step 2: Add the step-12 section after EXPORT**

```markdown
### Step 12 — offer another format (proactive, after EVERY export)

Once an element is exported, OFFER another format of the same element — « tu la veux aussi en
vidéo pour Instagram, ou en image pour le print ? » — the journalist doesn't have to know to
ask (canonical step 12). On a yes:
- re-ask ONLY the channel/format pin for the new target (one line, or infer + confirm-back
  when the ask names it — « une vidéo Instagram » ⇒ social-feed/video);
- append a NEW `accepted.json` entry: `id` = `<original-id>-<new-format>` (NEW id ⇒
  `produce-all`'s per-id `freshOutDir` can never wipe the first delivery); `spec`,
  `confirmedTakeaway`, `provenance`/`confirmedTable`, `sourceHint` copied VERBATIM;
- PRODUCTION → Gate 3 → EXPORT run as any cycle (a fresh render is never pre-approved).
No re-CADRAGE, no re-selection. The single-format model is untouched: each cycle produces
exactly ONE pinned format — « chaque graphique aura plusieurs formats » = short journalist
cycles, never a batch.
```

- [ ] **Step 3: Run the parity tests**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: all `splash`-side tests PASS; `suggest-chart`-side still red (Task 4).

- [ ] **Step 4: Commit**

```bash
git add skills/splash/SKILL.md
git commit -m "feat(splash): PROPOSITION = batched multi-proposals with whys + step-12 proactive re-format offer"
```

---

### Task 4: suggest-chart SKILL.md — the channel-aware candidates contract (+ stale-prose purge)

**Files:**
- Modify: `skills/suggest-chart/SKILL.md` — the format section (lines ~77-113) and the
  `## Output` section (lines ~834-846).

**Interfaces:**
- Consumes: the batched PROPOSITION from Task 3 (channel already known at candidate time).
- Produces: the `candidates` JSON contract the orchestrator relays batched. This payload's
  `"tier"` marker is ALSO what flips the harness `check:single-proposal-no-alternatives`
  red → green — keep the field names exactly.

- [ ] **Step 1: Purge the stale static-fallback prose**

Delete from the format section: `always shipped with a self-contained static HTML (no-JS) a11y
fallback — see the channel block below` and `**Whenever interactive is chosen, a static
fallback that carries the claim on its own is ALSO produced** — the interactive layer is
additive, never load-bearing (a11y invariant: most readers never hover/click/scroll).` — both
predate the single-format redesign and contradict `splash/SKILL.md`.

- [ ] **Step 2: Replace the `## Output` section**

````markdown
## Output — candidates first, then ONE spec per kept opportunity

Since the canonical 12-step flow (2026-07-16), suggest-chart answers in two stages. The
channel is KNOWN at both stages (CADRAGE Q6 precedes this call).

**Stage 1: the candidates.** Emit, for the opportunity:

```json
{
  "candidates": [
    { "type": "column-chart", "producer": "dw-chart", "tier": "recommended",
      "why": "three fixed rates, one comparison — a column chart carries the 25% claim at a glance" },
    { "type": "d3-bars", "producer": "chart-native", "tier": "solid",
      "why": "same comparison as a sorted horizontal read — stronger if labels are long" },
    { "type": "dot-plot", "producer": "dw-chart", "tier": "possible",
      "why": "minimal ink for the same two values" }
  ]
}
```

- EVERY reachable candidate appears — reachable = mapper exists × data shape fits × every
  deterministic guardrail (Gates 0-5 above) passes × the channel allows at least one of the
  type's formats. A guard- or channel-barred type NEVER appears.
- Exactly ONE `tier: "recommended"` per opportunity, its `why` grounded in the confirmed
  takeaway. EVERY candidate carries a real one-line `why` ("en quoi elle peut être
  intéressante") — no bare names.
- The orchestrator batches ALL opportunities' candidate lists into ONE journalist message.
- Nothing reachable → emit the `no-chart` decision with a reason, as before.

**Stage 2: ONE validated spec per kept opportunity** — exactly the historical output: a
`ChartSpec` (dw-chart) · a `NativeSpec` (chart-native) · a `MapSpec` (map-dw) · a map-native
config · a scrolly config — with the single pinned `format` derived from channel × type
(`allowedFormats(channel)`, `interactiveDefault` on article-web, explicit journalist signal
wins), announced for veto by the orchestrator.
````

- [ ] **Step 3: Run the parity tests — ALL green**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add skills/suggest-chart/SKILL.md
git commit -m "feat(suggest-chart): channel-aware candidates contract (whys, one recommended) + purge stale fallback prose"
```

---

### Task 5: Step-12 mechanical proof — two formats of one element never collide

**Files:**
- Test: `skills/splash/tests/produce-all.test.ts` (extend)

**Interfaces:**
- Consumes: existing `produceAll` + fake-dispatch helpers in that test file (match its actual
  parameter order; C2 added an optional `preflight` last parameter).
- Produces: the pinned guarantee that `<id>` and `<id>-video` produce into distinct outDirs.

- [ ] **Step 1: Write the test**

```ts
it("should produce a step-12 re-format entry into its own outDir, leaving the first delivery untouched", async () => {
  const outDirs: string[] = [];
  const fakeDispatch = async (_p: unknown, outDir: string) => {
    outDirs.push(outDir);
    return { status: "produced" as const, outputs: [] };
  };
  const alwaysValid = () => ({ ok: true as const, warnings: [] });
  const base = {
    producer: "dw-chart" as const,
    spec: { title: "t", data: "a,b\n1,2" },
    confirmedTakeaway: "the takeaway",
  };
  const report = await produceAll(
    [
      { ...base, id: "el-tariffs", format: "static" as const, channel: "article-web" as const },
      { ...base, id: "el-tariffs-video", format: "video" as const, channel: "social-feed" as const },
    ],
    "/tmp/step12-test-out",
    fakeDispatch,
    alwaysValid,
    undefined, // profile
    () => [], // preflight always-ready: this test pins outDir keying, not machine keys
  );
  expect(report.results.map((r) => r.status)).toEqual(["produced", "produced"]);
  expect(outDirs).toEqual([
    "/tmp/step12-test-out/el-tariffs",
    "/tmp/step12-test-out/el-tariffs-video",
  ]);
});
```

(The fake dispatch bypasses realDispatch's producer-capability gates on purpose: the test pins
OUTDIR KEYING. `assertFormatAllowed("social-feed", "video")` passes — video is in the
social-feed allowed set, `channel.ts:31-53`.)

- [ ] **Step 2: Run, green, commit**

Run: `cd skills/splash && bun test tests/produce-all.test.ts`

```bash
git add skills/splash/tests/produce-all.test.ts
git commit -m "test(splash): step-12 re-format entry keys its own outDir — deliveries never collide"
```

---

### Task 6: Orchestration hardening — context recovery, bounded retry, stall protocol

**Files:**
- Modify: `skills/splash/SKILL.md` (three new subsections; spec §"Orchestration hardening",
  practices from `docs/splash/spotlight-learnings.md` A1/A3/A4)
- Test: `skills/splash/tests/skill-doc-parity.test.ts` (extend)

- [ ] **Step 1: Extend the doc-parity tests (red)**

```ts
describe("orchestration hardening (Spotlight A1/A3/A4)", () => {
  it("has a context-recovery resume table keyed on artifact presence", () => {
    expect(splash).toContain("## Context recovery");
    expect(splash).toContain("accepted.json");
    expect(splash).toContain("report.json");
  });
  it("has the bounded-retry discipline (once, verbatim error, shape-only)", () => {
    expect(splash).toContain("retried ONCE");
    expect(splash).toContain("never worked around");
  });
  it("has the scripted stall protocol", () => {
    expect(splash).toContain("## Stall protocol");
    expect(splash).toContain("Je bloque sur");
  });
});
```

- [ ] **Step 2: Write the three SKILL.md sections**

Context recovery (place near the end, before the gate table):

```markdown
## Context recovery

All flow state lives in files under `exports/<slug>/` — never in conversation memory. On any
interruption (compaction, crash, resumed session), determine the position from artifact
PRESENCE and resume there:

| Present | Resume at |
|---|---|
| nothing / article only | CADRAGE (step 3-7) |
| `accepted.json`, no `report.json` | PRODUCTION (produce-all the accepted entries) |
| `report.json`, no `<id>-export/` | EXPORT (Gate 4 / delivery-form proposal) |
| `<id>-export/` complete | step 12 — offer another format |

A DECLINED choice leaves a marker file (e.g. `<id>-export/DECLINED.txt` with the declined
form and timestamp), so absence-of-action is distinguishable from not-yet-asked.
```

Bounded retry (inside PRODUCTION):

```markdown
**Bounded retry — a failing produce/validate is never worked around.** When produce-all or a
validator exits non-zero, re-run ONCE with the error message quoted verbatim and shape-only
fixes (fix the spec field the error names — never rewrite content to dodge a guard, never
switch tools, never hand-build artifacts). If it fails again: STOP and present the failure to
the journalist honestly (stall protocol below).
```

Stall protocol (own subsection after PRODUCTION):

```markdown
## Stall protocol

After 2 produce failures OR 2 successive Gate-3 rejections on one element, stop with exactly
this shape — never silently retry a third time, never drop the element:

> « Je bloque sur {élément} : {raison concrète}. Options : (a) un autre type de la sélection,
> (b) abandonner cet élément, (c) me donner une consigne précise. »

Wait for the journalist's decision. (a) re-enters step 8 with the remaining candidates; (b)
records the element as abandoned in the recap; (c) applies the instruction then re-produces
(counts toward the same bound).
```

- [ ] **Step 3: Run the parity tests — green. Commit**

```bash
git add skills/splash/SKILL.md skills/splash/tests/skill-doc-parity.test.ts
git commit -m "feat(splash): context recovery + bounded retry + stall protocol (Spotlight practices A1/A3/A4)"
```

---

### Task 7: Full-file coherence sweep + gate

**Files:**
- Modify: `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md` (sweep hits only)
- Modify: `knowledge/references/formats/format-selection.md` (GATE -1 references "CADRAGE Q3")

- [ ] **Step 1: Sweep residual references**

Run: `grep -rn "CADRAGE Q3\|Q3 (channel)\|audience & channel" skills/ knowledge/ --include="*.md" -i`
Every hit updates to the new position ("CADRAGE Q6 channel") or is historical
(CHANGELOG/dated specs — leave those). `format-selection.md`'s GATE -1 wording updates to "the
channel confirmed as the last CADRAGE question".

- [ ] **Step 2: Full gate**

Run: `bun run check`
Expected: green. The gate's SKILL.md-dependent checks (question-count detectors, sign-off
discipline) must pass against the rewritten text — if one fails, the rewrite broke a surviving
rule; fix the TEXT, never the check.

- [ ] **Step 3: Commit + hand to harness companion work**

```bash
git add -A && git commit -m "docs(flow): sweep residual channel-position references after the 12-step rewrite"
```

Companion (private repo, BEFORE merging this branch): update the splash-harness driver — answer
the channel question at its new last-CADRAGE position, answer the batched candidates message
(structural, language-independent arm like the a/b/c one), answer the step-12 offer (decline by
default unless the case opts in); question-count checks follow the new Q-labels. Then run at
least 3 harness cases end-to-end: one guided chart, one DIRECT map, one step-12 video
re-format. The `check:single-proposal-no-alternatives` major must flip green on the first
candidates-payload run.
