# Flow-decision manifest, CADRAGE state integrity & ledger feedback loop — design

> Three quality levers from the 2026-07-19 audit of the harness findings ledger (790
> findings). They form ONE system: levers 1 & 2 **mechanize** discretionary flow decisions
> (turning prose rules into observable-evidence checks); lever 3 **measures and guards** them
> (closing the ledger loop so a mechanized class stays fixed and a recurrence is loud).
>
> **The audit finding that motivates all three:** 762 of 790 findings are semantic
> (`judge:`), only 28 mechanical. The mechanical layer is won — the correctness tripwires,
> WCAG contrast, channel→format pinning all hold. The live quality gap is in the
> **orchestration** layer (403/790, and 24/39 of the *recent* serious findings), and it is
> governed by prose in `SKILL.md` that the model follows or does not. The team's own
> FIX-BACKLOG says it repeatedly: *"prose lever added … not holding"* (3×), *"prose-only and
> loses"* (4×). Prose cannot force an LLM host; code at the spine can.

## The unifying idea

`AcceptedProposal` is already a partial flow-decision manifest — it threads `confirmedTakeaway`
(fail-hard), `channel`, `sourceHint`, `skillsInvoked`, `anchor` from CADRAGE to the spine. The
weakness is uneven enforcement: `skillsInvoked` exists as a field, yet "routing from memory" is
the single largest finding class (98) — because **absence is only a warning**. The orchestrator
omits the field, takes the warning, ships.

The system replaces self-reported fields with **observable evidence**, recorded through a single
sanctioned mechanism and verified in layers.

## Trust model — observable evidence, not self-report

A self-reported field is a proof that can lie (the "vérifier le livré, pas le proof" principle
this codebase already lives by). Every flow decision is instead tied to evidence the code can
independently observe:

- **Artifact-provable** — an artifact on disk that exists ONLY if the step genuinely ran
  (`candidates.json` ⇒ `suggest-chart` ran; the article text ⇒ a cited source is verifiable).
  Enforceable at the SPINE, so it protects **every** session, live and headless.
- **Transcript-only** — the evidence lives in the conversation (was motion asked? did the
  journalist choose the form?), with no disk artifact. Enforceable only at the HARNESS, which
  records the real tool-call transcript. Live protection is partial (presence + a required
  justification); the harness catches the lie.

This split is accepted knowingly: purely conversational decisions cannot be spine-proven, so
they get spine-level presence enforcement plus harness-level truth enforcement.

## Component 1 — the flow-decision registry (`skills/splash/src/flow-decisions.ts`)

A single table. Each flow decision is one entry:

```ts
interface FlowDecision {
  id: string;                       // kebab: "suggest-chart-invoked"
  evidenceKind: "artifact" | "transcript";
  prerequisites: string[];          // decision ids that must already be logged (lever 2)
  required: boolean;                // the gate fails if absent (staged: starts false)
  artifactCheck?(runDir: string): { ok: true } | { ok: false; reason: string };
  transcriptCheck?(transcript: TranscriptEvent[]): { ok: true } | { ok: false; reason: string };
}
```

**Adding a recurrence class = one entry.** This is what breaks the loop "discover a class →
write a prose rule → it does not hold → re-mechanize it": there is one place, one shape.

## Component 2 — the sanctioned decision journal (`skills/splash/scripts/save-decision.mjs`)

The ONLY sanctioned way a decision is recorded, mirroring `save-key.mjs`. Writes an append-only
`<runDir>/decisions.jsonl`, chmod-restricted, never hand-edited.

**It verifies AT WRITE TIME**, not only at the gate:

1. If the decision declares `artifactCheck`, run it now — refuse to record if the corroborating
   artifact is missing (refuse `suggest-chart-invoked` when `candidates.json` is absent).
2. If the decision declares `prerequisites`, refuse unless all are already in `decisions.jsonl`
   (refuse `proposition-emitted` before `gate-1b` + `channel` are logged).

The orchestrator therefore cannot even *record* a false or out-of-order decision.

## Component 3 — three layered enforcement points

1. **Write-time** (`save-decision.mjs`) — artifact present, prerequisites satisfied, else refuse.
2. **Spine gate** (`validate-gate.ts` / `produce-all`) — every `required` decision must be
   present in `decisions.jsonl`; absence fails the gate. Protects every session including live.
3. **Harness** (post-run) — each logged decision is cross-checked against the real tool-call
   transcript; a forged artifact or a lying transcript-only justification is caught. Regression
   guarantee. Uses the existing `check:` source idiom (e.g. `check:suggester-invoked`).

## Lever 1 — first-cut decisions

| Decision | Kind | Write refuses if… | Gate fails if… | Harness cross-check |
|---|---|---|---|---|
| `suggest-chart-invoked` (98 findings) | artifact | `candidates.json` absent | absent on a `guided` proposal | transcript shows no real `suggest-chart` Skill call |
| `source-fidelity` (51) | artifact | cited name/URL absent from the article text | source diverges from the article | — (spine-provable) |
| `producer-escalation` (backlog urgent, 4×) | transcript | `escalationReason` empty | escalation to chart-native on a dw-reachable type without this entry | transcript shows no journalist motion/interactivity ask |

`source-fidelity` already exists half-built (`source-guard.ts`, wired into `validate-gate.ts`);
it moves under the registry as a uniform entry rather than a special case.

## Lever 2 — CADRAGE state integrity (rides on the journal)

No separate state-machine object. The **state is `decisions.jsonl`**; the **legal transitions
are the `prerequisites` field**.

- The CADRAGE gates become decision entries: `gate-1b` (confirmed takeaway), `gate-2b`
  (confirmed table), `gate-2c` (source), `channel`. These are today's `AcceptedProposal`
  fields, migrated to logged decisions.
- `save-decision.mjs`'s prerequisite check makes "gate skipped" mechanically impossible:
  PROPOSITION-phase decisions declare the full CADRAGE set as prerequisites, so PROPOSITION is
  unreachable without it, in order.
- **Illegal turn** ("format question as its own turn", 3×) is a harness transcript check: an
  `AskUserQuestion` whose options ⊆ format tokens, asked after `candidates.json` exists (the
  detection the backlog already specified).

Not in scope: the timeout class — it is a harness artifact (`turnCap` + `timeoutMs`); a live
session has no timeout.

## Lever 3 — close the ledger loop (`splash-harness`)

The close mechanism exists (`fixer.ts` sets `status`/`resolution`) but is coupled to the
autofixer, which mostly fails ("fixer escaped its worktree → needs-human"), so 790 findings sit
open. And a class recurs as fresh ids each run (same summary 3×), so recurrence is invisible.

- **Class key.** Each finding gets a stable `classKey` from a registry of known classes
  (`skill-routing-from-memory`, `format-question-own-turn`, …), or `unclassified`. Unclassified
  findings are the frontier — what is not yet mechanized. The judge/checks assign it.
- **Class-level resolution registry** — `resolved-classes.jsonl` in the harness:
  `classKey → { pin, resolvedBy, resolvedAt }`. **Closing a class REQUIRES a `pin`**: the id of
  a test or `check:` that guards it. "Resolved" means "guarded", never "we think we fixed it".
  This bridges the two repos: the record lives in the harness but references a product
  commit/test in `splash-merge`.
- **The pin IS levers 1 & 2.** For a class mechanized by lever 1/2, the pin is its `check:` or
  gate test. For a product-quality class fixed in code, the pin is a `bun:test`.
- **Loud regression.** A run producing a finding whose `classKey` is in `resolved-classes` is
  flagged as a REGRESSION at critical level, not filed as a routine new finding. Per-class
  recurrence counts become automatic.

## How the three close the loop together

Mechanize a class (lever 1/2) → its check is the pin → mark the class resolved (lever 3) → if it
recurs, a loud regression. The ledger then reports, on its own, what is live, guarded, or
regressed — no more manual re-audit.

## Migration & legacy-safety

1. **Per-decision toggle, never global.** Each registry entry owns its `required`. New decisions
   land `required: false` (gate warning only, like `skillsInvoked` today); the `SKILL.md` and
   test fixtures are updated to emit them; then flip to `required: true` one at a time once the
   harness confirms zero regression. No big-bang.
2. **Evidence before obligation.** A decision may only flip to `required: true` once its
   artifact/transcript check is green across the existing corpus — never obligate a field the
   mechanism cannot yet corroborate.
3. **`SKILL.md` gains one trigger block** ("after each flow decision, `bun save-decision.mjs
   <id> …`"). This is *trigger* prose, not *guard* prose: if the orchestrator ignores it, the
   gate fails once the decision is `required`. Prose no longer carries enforcement, only the
   reminder.

## Testing

- **Unit** (`flow-decisions.test.ts`): every registry entry is well-formed; `save-decision.mjs`
  refuses on missing artifact and on unmet prerequisites, accepts when both hold; `decisions.jsonl`
  is append-only.
- **Gate** (`validate-gate.test.ts`): a `required` decision absent ⇒ fail; present + corroborated
  ⇒ pass; `required:false` absent ⇒ warning; a PROPOSITION decision before its CADRAGE
  prerequisites ⇒ refused.
- **Harness**: the transcript checks as `check:` sources (existing idiom); one e2e case per
  decision that proves the cross-check — a run routing "from memory" MUST fail the gate. The
  `resolved-classes` regression path: a fixture finding whose classKey is resolved ⇒ flagged as
  regression, not new.

## Build order

Lever 1 first (the mechanism + the 3 first-cut decisions). Lever 2 second (it is a small
extension: the `prerequisites` field + migrating the 4 CADRAGE gates + one illegal-turn check).
Lever 3 third (it makes 1 & 2 measurable; without it, we cannot tell that 1 & 2 worked). Each
lands its decisions `required: false` first, then flips after a clean harness run.
