# Flow-decision `required:true` flip (Lever 1b) — design

> Lever 1 (merged, `main` @ dce4571) built the flow-decision manifest with all three first-cut
> decisions shipping `required: false` — the gate WARNS, never blocks. This follow-up flips them
> to `required: true` so the gate actually BITES. It is deliberately its own scoped piece: the
> flip is where a mechanism that only warns starts failing runs, so it must not false-positive on
> legitimate runs. Do NOT flip as a one-line toggle.

## The evidence that unlocks this (and warns against rushing it)

Harness run `co2-secteurs-grouped-2026-07-20T03-52-07-143Z` against the lever-1 branch, run to
delivery (`--no-fix`). Two things happened in the same run:

- The judge flagged **critical**: *"suggest-chart was invoked but never actually ran its own
  routing/decision logic — the spec was hand-authored by the orchestrator itself … while splash
  falsely claimed 'routing réel, pas une improvisation'."*
- Independently, `save-decision.mjs` **refused at write time** with the exact message
  *"candidates.json is absent from the run directory — suggest-chart was not actually invoked
  (routing done from memory)"*, so `suggest-chart-invoked` never reached the journal, and
  `produce-all` emitted `flow decision "suggest-chart-invoked" was never recorded`. `source-fidelity`
  WAS recorded (article + sourceName corroborated). The run still delivered — because the decision
  is `required: false`.

**Read two ways, both load-bearing:**
1. The mechanism works live and caught a real defect the judge independently confirmed. At
   `required: true`, this run would have been **blocked at produce-all** — catching mechanically
   what today only the judge catches. This is the green light.
2. It is ONE run, with a genuine defect. It does not tell us how often a *legitimate* run fails to
   record a decision (the SKILL.md trigger is prose — followed here, not guaranteed). Flipping on
   one run is the "proof qui ment" shortcut this whole effort exists to avoid.

## What the flip requires (three gates, all before any decision flips)

### 1. A harness suite, not a case — measure the false-positive rate
Run a small suite (≥ ~8 delivering cases spanning guided/direct, chart/map, DW/native) at
`--no-fix`, and measure: on runs with **no real defect**, does the orchestrator reliably record
each applicable decision? A decision may flip to `required: true` only if its absence on a
legitimate run is ~never — otherwise `required: true` blocks good runs. This operationalizes the
spec's rule "evidence before obligation" as a measured rate, not a single green run.

### 2. Scope `only` to applicable decisions (final-review Important #2)
`produce-all.mjs` currently calls `evaluateDecisions(runDir, loggedIds)` with no `only` (a comment
already flags this at the call site). Before any flip, compute the applicable set from the accepted
proposals:
- `source-fidelity` — applicable only when a proposal cites a source (has `sourceHint`/a citation).
- `producer-escalation` — applicable only when a proposal escalated to chart-native on a
  dw-reachable type.
- `suggest-chart-invoked` — applicable on the `guided` branch (a direct-branch proposal legitimately
  has no candidates.json).
Requiring a decision on a run where it does not apply would fail a legitimate run. The `only`
capability already exists and is unit-tested; the flip must pass the computed set.

### 3. Strengthen `suggest-chart-invoked` corroboration — presence is a floor, not the ceiling
The run caught the defect because `candidates.json` was **absent**. But the judge described a
subtler variant: suggest-chart *runs* (candidates.json exists) and the orchestrator hand-authors
the spec anyway, **ignoring** the candidates. There, "candidates.json exists" PASSES while the
defect remains. The presence check is a necessary floor; the full class needs one of:
- a spine-side tightening — the shipped spec's `type` must be one of the types in `candidates.json`
  (a hand-authored type that is not among the candidates is the tell), and/or
- the deferred **harness transcript cross-check** — `check:suggest-chart-invoked`, alongside the
  existing `check:hand-authored-spec` (which already fired critical on this run). The harness layer
  is the real teeth for the "invoked but ignored" variant; the spine can only reach the type-match.

## Carried-over Minor findings (address at the flip, not before)

- **M3 — `source-fidelity` uses naive `article.includes(url/name)`.** Brittle to protocol prefix
  (`etsc.eu` vs `https://etsc.eu`), casing, whitespace. While `required:false` a false refusal is a
  harmless warning; at `required:true` it would **block a legitimate citation**. Delegate to a
  `source-guard.ts` predicate (canonicalizing URLs the way `sourceUrlFidelityReason` already does)
  BEFORE flipping `source-fidelity`.
- **M4 — sanctioned-writer is convention, not enforcement.** `chmod 0600` does not stop the file
  owner (the orchestrator host) hand-appending a forged line, and the spine gate only checks
  presence. This is inherent to the accepted trust model — the deferred harness transcript
  cross-check is what catches a forged journal. No spine-side action; it is a reason the harness
  layer (requirement 3) is not optional for a fully-trustworthy flip.

## Suggested order

1. Requirement 2 (`only` scoping) — pure code, unblocks a safe flip of the always-applicable
   `suggest-chart-invoked` on guided runs without touching the others.
2. Requirement 3 (type-match tightening + wire the harness `check:suggest-chart-invoked`).
3. Requirement 1 (the measurement suite) — run it, read the false-positive rate per decision.
4. Flip decisions one at a time, each only after its own rate is clean; `source-fidelity` also
   needs M3 first.

Each flip is a small, independently reviewable change. This doc is the input to a
brainstorm → plan → execute cycle; it is not itself a plan.
