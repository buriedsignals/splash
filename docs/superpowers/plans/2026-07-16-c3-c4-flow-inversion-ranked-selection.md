# C3+C4 — Flow Inversion + Ranked Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** the journalist picks the chart TYPE first (from a ranked list of every reachable
type, #1 recommended with the editorial why), THEN answers one late "where will it live?"
question (channel+format), then cycle 1 produces that one format; a cycle-2 path re-formats the
same element without re-CADRAGE (Tom's #1 + #2).

**Architecture:** CADRAGE loses the channel question (Q3) on both branches; PROPOSITION becomes
ranked-selection → type choice → one channel/format turn → pin → produce. Everything mechanical
downstream is UNCHANGED (`normalizeChannel` fail-closed, `assertFormatAllowed` at produce,
channel sizes, off-embed ⇒ never interactive) — the guards simply receive the channel later.
Cycle 2 = a NEW accepted.json entry `<id>-<format>` (same spec + takeaway, new format+channel),
so `freshOutDir` (keyed by id) never wipes the first format's delivery. This is a SKILL.md
question-model REWRITE (known-sensitive zone: Wave 11 renumbering, anti-double-ask) plus
doc-parity tests; almost no runtime code changes.

**Tech Stack:** Markdown (SKILL.md prose contracts), TypeScript, bun:test.

## Global Constraints

- Code, comments, commits: English. No vendor mention. Bun, bun:test, TDD.
- Two locked decisions are being reversed ON PURPOSE (spec §"Locked decisions reversed"):
  single-recommendation (2026-06-23) and CADRAGE-Q3-channel. Do not "helpfully" preserve them.
- The single-format model STANDS: one element = ONE pinned format, produced and delivered alone.
- Q-labels, question COUNT announcements, and the anti-double-ask rule must stay coherent —
  rewrite the question model as a whole, never patch a number.
- `skills/splash/src/channel.ts` is NOT modified by this plan.
- Companion (out of this repo): splash-harness driver answers Q3-in-CADRAGE today — migrate its
  cases together with this merge.

---

### Task 1: Doc-parity tests first (red) — the new question model, mechanically pinned

**Files:**
- Test: `skills/splash/tests/skill-doc-parity.test.ts` (create)

**Interfaces:**
- Consumes: `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md` as text.
- Produces: the red tests Tasks 2-4 turn green; stays as the drift guard for the new flow.

- [ ] **Step 1: Write the failing tests**

```ts
// skill-doc-parity.test.ts — mechanical pins for the C3+C4 flow inversion. SKILL.md is a
// prose CONTRACT the orchestrator LLM executes; these greps are the cheapest tripwire
// against a partial rewrite re-introducing the old flow (channel asked in CADRAGE, single
// proposal, static-fallback prose).
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const splash = readFileSync(join(import.meta.dir, "../SKILL.md"), "utf8");
const suggest = readFileSync(
  join(import.meta.dir, "../../suggest-chart/SKILL.md"),
  "utf8",
);

// The CADRAGE section = between its heading and the PROPOSITION heading.
const cadrage = splash.slice(
  splash.indexOf("### 3. CADRAGE"),
  splash.indexOf("### 4. PROPOSITION"),
);
const proposition = splash.slice(
  splash.indexOf("### 4. PROPOSITION"),
  splash.indexOf("### 5."),
);

describe("C3 — channel question moved out of CADRAGE", () => {
  it("should not ask audience & channel inside CADRAGE anymore", () => {
    expect(cadrage).not.toContain("Audience & channel");
    expect(cadrage).not.toContain("Q3 channel");
  });

  it("should ask the single late channel/format question at PROPOSITION", () => {
    expect(proposition).toContain("Où vivra-t-il ?");
  });

  it("should keep the off-embed hard rule at the new question site", () => {
    expect(proposition).toContain("NEVER interactive or scrolly");
  });

  it("should document the cycle-2 re-format path", () => {
    expect(splash).toContain("### Cycle 2 — re-format");
    expect(splash).toContain("-<format>");
  });
});

describe("C4 — ranked selection replaces the single recommendation", () => {
  it("should present a ranked list of ALL reachable types in tiers", () => {
    expect(proposition).toContain("EVERY reachable type");
    expect(proposition).toContain("★ Recommended");
  });

  it("suggest-chart should emit the candidates contract", () => {
    expect(suggest).toContain("## Output — candidates first");
    expect(suggest).toContain('"candidates"');
  });

  it("should purge the stale auto static-fallback prose from suggest-chart", () => {
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
Expected: FAIL on every assertion touching new text; the two `not.toContain` CADRAGE ones fail
too (channel text is still there).

- [ ] **Step 3: Commit the red tests**

```bash
git add skills/splash/tests/skill-doc-parity.test.ts
git commit -m "test(splash): doc-parity pins for flow inversion + ranked selection (red)"
```

---

### Task 2: Rewrite CADRAGE (SKILL.md) — channel question removed, question model renumbered

**Files:**
- Modify: `skills/splash/SKILL.md` — the `### 3. CADRAGE` section (currently lines 31-143) and
  every later reference to "Q3 (channel)" / "CADRAGE Q3".

**Interfaces:**
- Consumes: the current section text (READ it fully before editing — it interleaves rules that
  must SURVIVE: Gate 1b takeaway verbatim rules, supported-framings rule, newsroom-profile F2
  block, DIRECT/GUIDED branching).
- Produces: the new stable Q-labels `Q1 branch · Q2 takeaway/Gate 1b · Q3 constraint` that
  Task 3's PROPOSITION text and the harness driver rely on.

- [ ] **Step 0: Update the section heading (line 31)**

`### 3. CADRAGE — GATE 1 (questionnaire, journalist's language, ≤4 questions, one at a time)`
becomes `≤3 questions` (the channel question leaves CADRAGE).

- [ ] **Step 1: Replace the stable-positions sentence (line ~40)**

Old:
```
The Q-labels below are STABLE positions (Q1 branch · Q2 takeaway/Gate 1b · Q3 channel · Q4 constraint), not a
```
New:
```
The Q-labels below are STABLE positions (Q1 branch · Q2 takeaway/Gate 1b · Q3 constraint), not a
```
And in the same paragraph, replace `Q4 is conditional, and DIRECT fires at Q1 then skips Q2–Q4`
with `Q3 is conditional, and DIRECT fires at Q1 then skips Q2–Q3` (keep the "announce the REAL
running count" rule verbatim — it is exactly what makes renumbering safe).

- [ ] **Step 2: Delete item 3 (Audience & channel) entirely — lines 89-123**

Remove the whole numbered item, from `3. Audience & channel: a STRUCTURED single-select…`
through `…the two never double-ask.` (inclusive). In its place, insert a pointer so no future
reader "restores" it:

```markdown
   *(The distribution channel is NO LONGER a CADRAGE question — since the 2026-07-16 flow
   inversion it is asked ONCE, late, at PROPOSITION, AFTER the journalist has chosen the
   visual type: see « Où vivra-t-il ? » in §4. CADRAGE captures the editorial intent only.)*
```

- [ ] **Step 3: Renumber item 4 (Constraint) to 3, keeping the F2 newsroom-profile block intact**

`4. Constraint (only if relevant): …` becomes `3. Constraint (only if relevant): …` — the F2
paragraph under it moves untouched.

- [ ] **Step 4: Rewrite the DIRECT branch prose (lines 127-142)**

Replace `Still ask Q3 (audience & channel) before PRODUCTION — it is REQUIRED on both branches.`
and the later `**Q3 (channel) is likewise always asked, on both branches**, because the
format/aspect routing downstream (PRODUCTION's aspect defaulting, `suggest-chart`'s Gate 1–4
ladder) depends on it.` with:

```markdown
  The channel is asked on DIRECT too — but at the SAME late position as GUIDED: the single
  « Où vivra-t-il ? » turn (see §4) fires after the named visual's type is confirmed reachable
  and BEFORE production. A DIRECT-named visual carries a chart TYPE, never a channel — "a bar
  chart" does not say feed→square vs web→landscape, so the turn is never skipped, just never
  asked at CADRAGE.
```

- [ ] **Step 5: Sweep every remaining "CADRAGE Q3" reference in the file**

Run: `grep -n "CADRAGE Q3\|Q3 (channel)\|Q3 channel" skills/splash/SKILL.md`
Rewrite each hit to reference « the PROPOSITION channel/format turn (« Où vivra-t-il ? ») ».
Known sites (verify against the grep — the file is long): the adapters/channel-threading
mentions, the F2 block, GATE 2 prose, the gate table at the bottom.

- [ ] **Step 6: Run the parity tests — CADRAGE assertions green**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: the two CADRAGE `not.toContain` tests PASS; PROPOSITION ones still red (Task 3).

- [ ] **Step 7: Commit**

```bash
git add skills/splash/SKILL.md
git commit -m "feat(splash): CADRAGE loses the channel question — flow inversion, type before format"
```

---

### Task 3: Rewrite PROPOSITION (SKILL.md) — ranked selection, late channel/format turn, cycle 2

**Files:**
- Modify: `skills/splash/SKILL.md` — the `### 4. PROPOSITION — GATE 2` section (currently lines
  145-257) plus a new `### Cycle 2 — re-format` subsection after the EXPORT section.

**Interfaces:**
- Consumes: Task 2's renumbered CADRAGE; C2's preflight annotation block (already merged —
  keep it inside the new section).
- Produces: the « Où vivra-t-il ? » turn and the tiered-list presentation Task 4's
  suggest-chart contract feeds; the `<id>-<format>` cycle-2 convention Task 5 tests.

- [ ] **Step 1: Replace the section opening (lines 147-171) with the ranked-selection model**

The rules that must SURVIVE inside the rewritten section (re-anchor them, don't drop them):
one-opportunity-one-accept-decision (line 230-239) · only-offer-confirmed-producible
(241-245) · GATE 2b prose-provenance (247-257) · GATE 2c source attribution · chart-scrolly
beat model (183-213) · article-web-no-static-fallback + print-signal rule (215-228, reworded
for the new turn) · C2's preflight annotation. New opening text:

```markdown
### 4. PROPOSITION — GATE 2 (guided path only)

For each `suggest-article` opportunity, invoke `suggest-chart` **as a real Skill call** (never
guess the element/format/producer yourself). Since the 2026-07-16 flow inversion it answers in
TWO stages:

**Stage 1 — the ranked list (type choice).** `suggest-chart` returns EVERY reachable type for
this opportunity (reachable = a mapper exists × the data shape fits × every deterministic
guardrail passes — a type barred by a guard NEVER appears), ranked, in tiers:
- **★ Recommended** — exactly one, with the full editorial WHY (what it shows, why it serves
  the confirmed takeaway best);
- **Solides** — up to three, one line each;
- **Possibles** — the rest, names only.
Present the tiers in the journalist's language and let them pick — « aucun » = veto (then
`no-chart` with the reason, or reframe). An engine that fails preflight is annotated, never
hidden (C2). Picking from this list IS the accept decision — one opportunity = one choice =
one `suggest-chart` call, exactly as before.

**Stage 2 — « Où vivra-t-il ? » (channel+format, ONE turn).** Once the type is chosen, ask the
single structured turn — journalist's language, exactly three options:
**Social vertical (Stories/Reels)** · **Social feed (post Instagram/Facebook)** · **Article
web / embed — interactif, image ou vidéo (destination print ⇒ image statique)**.
The pick maps 1:1 onto `skills/splash/src/channel.ts`'s `Channel` enum (size + allowed format
set, unchanged). The format is DERIVED and announced for veto, never a second question:
social ⇒ static or video at the channel's size (type-appropriate default, say which); article
web ⇒ interactive by default (`interactiveDefault`), an explicit journalist signal (« une image
statique », « pour le print ») WINS and pins `static`. **Hard rule: not article/embed ⇒ image
or video only — NEVER interactive or scrolly.** Then `suggest-chart` emits the full validated
spec for {type, channel, format} and the accepted spec pins exactly ONE `format` — what
`accepted.json` carries and `assertFormatAllowed(channel, format)` re-checks at produce time.
```

- [ ] **Step 2: Re-anchor the surviving rules under the new stages**

Move (verbatim where possible) the beat model, 2b, 2c, no-static-fallback/print, preflight
annotation, one-accept-decision blocks under the two-stage text. The no-static-fallback block's
first sentence changes from "For the article-web channel, `suggest-chart` routing DEFAULTS to
interactive" framing to reference Stage 2 (the default now surfaces inside « Où vivra-t-il ? »).

- [ ] **Step 3: Add the cycle-2 section (after the EXPORT section — locate `### 6` or the
export heading and insert after its end)**

```markdown
### Cycle 2 — re-format an already-delivered element

Any delivered element can be re-run in another format WITHOUT re-CADRAGE and WITHOUT
re-selection: the journalist asks (« maintenant une version vidéo »), splash re-asks ONLY
« Où vivra-t-il ? » for the new target (or infers it when the ask names it — « une vidéo pour
Instagram » ⇒ social-feed/video — and confirms back), then appends a NEW `accepted.json` entry:

- `id`: `<original-id>-<new-format>` (e.g. `el-tariffs-video`) — a NEW id, so `produce-all`'s
  per-id outDir (`freshOutDir`) can NEVER wipe the first delivery;
- `spec`, `confirmedTakeaway`, `provenance`/`confirmedTable`, `sourceHint`: copied VERBATIM
  from the original entry (the takeaway was confirmed once; it does not expire);
- `format` + `channel`: the new pin (Gate 2's veto applies to the announce, as in cycle 1).

Then PRODUCTION → EXPORT run exactly as cycle 1 (Gate 3 review runs on the NEW render — a
prior sign-off never carries over). The single-format model is untouched: each cycle produces
exactly ONE pinned format; "all the formats" is journalist-driven cycles, never a batch.
```

- [ ] **Step 4: Run the parity tests**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: all `splash`-side tests PASS; `suggest-chart`-side still red (Task 4).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/SKILL.md
git commit -m "feat(splash): PROPOSITION = ranked type selection + late channel/format turn + cycle-2 re-format"
```

---

### Task 4: suggest-chart SKILL.md — the candidates contract (+ stale-prose purge)

**Files:**
- Modify: `skills/suggest-chart/SKILL.md` — the format section (lines ~77-113) and the
  `## Output` section (lines ~834-846).

**Interfaces:**
- Consumes: the two-stage PROPOSITION from Task 3.
- Produces: the `candidates` JSON contract the orchestrator relays as tiers.

- [ ] **Step 1: Purge the stale static-fallback prose (single-format contradiction)**

In the format section (lines ~77-96): delete `always shipped with a self-contained static HTML
(no-JS) a11y fallback — see the channel block below` and the sentence `**Whenever interactive
is chosen, a static fallback that carries the claim on its own is ALSO produced** — the
interactive layer is additive, never load-bearing (a11y invariant: most readers never
hover/click/scroll).` — both predate the single-format redesign and contradict
`splash/SKILL.md` §PROPOSITION (no auto fallback; a11y = choosing the `static` format).

- [ ] **Step 2: Replace the `## Output` section**

Old (lines ~834-846): `## Output — One of: a ChartSpec… or a no-chart decision with a reason.`
New:

````markdown
## Output — candidates first, then ONE spec

Since the 2026-07-16 flow inversion, suggest-chart answers in two stages:

**Stage 1 (no channel yet): the ranked candidates.** Emit:

```json
{
  "candidates": [
    { "type": "column-chart", "producer": "dw-chart", "tier": "recommended",
      "why": "three fixed rates, one comparison — a column chart carries the 25% claim at a glance" },
    { "type": "d3-bars", "producer": "chart-native", "tier": "solid",
      "why": "same comparison, sorted horizontal read" },
    { "type": "dot-plot", "producer": "dw-chart", "tier": "possible", "why": "" }
  ]
}
```

- EVERY reachable type appears — reachable = mapper exists × data shape fits × every
  deterministic guardrail (the same Gates 1-5 above) passes. A guard-barred type NEVER
  appears (it is not a "possible with caveats" — it is out).
- Exactly ONE `tier: "recommended"`, its `why` grounded in the confirmed takeaway. `solid` =
  up to 3, one-line `why`. `possible` = names, empty `why` allowed.
- Format gates (channel restriction, aspect↔type, interactiveDefault) do NOT run here — no
  channel exists yet. They run in Stage 2.
- Nothing reachable → emit the `no-chart` decision with a reason, as before.

**Stage 2 (type + channel + format known): ONE validated spec** — exactly the historical
output, unchanged: a `ChartSpec` (dw-chart) · a `NativeSpec` (chart-native) · a `MapSpec`
(map-dw) · a map-native config · a scrolly config — with the single pinned `format` chosen
from `allowedFormats(channel)`, every existing guardrail (aspect↔type, Gate 5, channel
restriction) applied at THIS stage against the now-known channel.
````

- [ ] **Step 3: Re-anchor the channel-dependent gate prose**

In the format section (lines ~88-106), the rule `Channel restricts the format set FIRST —
before any gate below` keeps its content but gains one sentence up front: `These gates run at
Stage 2 — when PROPOSITION's « Où vivra-t-il ? » turn has fixed the channel — never during
Stage 1's type ranking.`

- [ ] **Step 4: Run the parity tests — ALL green**

Run: `cd skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: PASS (9/9).

- [ ] **Step 5: Commit**

```bash
git add skills/suggest-chart/SKILL.md
git commit -m "feat(suggest-chart): two-stage output — ranked candidates then one pinned spec; purge stale fallback prose"
```

---

### Task 5: Cycle-2 mechanical proof — two formats of one element never collide

**Files:**
- Test: `skills/splash/tests/produce-all.test.ts` (extend)

**Interfaces:**
- Consumes: existing `produceAll` + fake-dispatch helpers in that test file.
- Produces: the pinned guarantee that `<id>` and `<id>-video` produce into distinct outDirs.

- [ ] **Step 1: Write the test**

```ts
it("should produce a cycle-2 re-format entry into its own outDir, leaving cycle 1 untouched", async () => {
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
    "/tmp/cycle2-test-out",
    fakeDispatch,
    alwaysValid,
    undefined, // profile
    () => [], // preflight always-ready (C2's gate is merged before this plan): the test
    // pins outDir keying, not key presence on the dev machine
  );
  expect(report.results.map((r) => r.status)).toEqual(["produced", "produced"]);
  expect(outDirs).toEqual([
    "/tmp/cycle2-test-out/el-tariffs",
    "/tmp/cycle2-test-out/el-tariffs-video",
  ]);
});
```

(dw-chart cannot build `video` — the fake dispatch bypasses realDispatch's format gate, which
is fine: this test pins the OUTDIR KEYING, not producer capability. If `produceAll` itself
rejects the combination before dispatch — e.g. `assertFormatAllowed("social-feed", "video")`
passes, it is in the allowed set — adjust the second entry to a combination that reaches
dispatch: check `CHANNELS` in `channel.ts:31-53`.)

- [ ] **Step 2: Run, adjust the placeholder assertion to real behavior, green, commit**

Run: `cd skills/splash && bun test tests/produce-all.test.ts`

```bash
git add skills/splash/tests/produce-all.test.ts
git commit -m "test(splash): cycle-2 re-format entry keys its own outDir — deliveries never collide"
```

---

### Task 6: Full-file coherence sweep + gate

**Files:**
- Modify: `skills/splash/SKILL.md`, `skills/suggest-chart/SKILL.md` (sweep hits only)
- Modify: `knowledge/references/formats/format-selection.md` (GATE -1 references CADRAGE Q3)

- [ ] **Step 1: Sweep residual references**

Run: `grep -rn "CADRAGE Q3\|Q3 (channel)\|audience & channel" skills/ knowledge/ --include="*.md" -i`
Every hit must either reference the new PROPOSITION turn or be inside a dated
CHANGELOG/spec (historical — leave those). `format-selection.md`'s GATE -1 wording updates to
"the channel confirmed at PROPOSITION (« Où vivra-t-il ? »)".

- [ ] **Step 2: Full gate**

Run: `bun run check`
Expected: green. The gate's SKILL.md-dependent checks (question-count detectors, sign-off
discipline) must pass against the rewritten text — if one fails, the rewrite broke a surviving
rule; fix the TEXT, never the check.

- [ ] **Step 3: Commit + hand to harness companion work**

```bash
git add -A && git commit -m "docs(flow): sweep residual channel-question references after the inversion"
```

Companion: update splash-harness driver (answers the channel at the new PROPOSITION turn;
question-count checks expect ≤3 CADRAGE questions) BEFORE merging this branch, and run at least
3 harness cases (guided chart, DIRECT map, cycle-2 video re-format) end-to-end.
