# S4a · Flow-process rubric A1-A8 — Design

> Sub-project **S4a** of pillar S4 (Certification rigoureuse) of AUDIT #2. Answers the audit's #1 cert
> weakness — « rien testé du flow » — by making the conversational-flow guarantees a legible, honest
> A1-A8 rubric in the cert report. Implementation lives in the harness repo `../splash-harness`
> (branch `master`); this spec + the plan live in `splash-merge/docs/superpowers/`.

## 0. The reframe (grounded — read first)

The audit (§5) prescribed "assertions de process A1-A8 depuis le transcript." Grounding the harness showed
the audit's "rien testé du flow" is **half-true**: most of the DETERMINISTIC flow guards already exist as
`check:*` in `src/checks.ts` — they were never (a) framed as the explicit A1-A8 rubric, (b) complete (2
deterministic items missing), or (c) run (no harness CI until T3 this session). So S4a is **consolidate + fill
the 2 gaps + route the semantic items to the judge**, NOT build A1-A8 from scratch.

Existing check → rubric mapping (verified against the `src/checks.ts` catalog):

| A-item | Flow guarantee | Backing today |
|---|---|---|
| A1 | bonne-question / bon-moment | — (semantic → judge) |
| A2 | une-question / tour | `check:gate-discipline` |
| A3 | pas-sur-demander (don't re-ask) | — **(new: `check:over-ask`)** |
| A4 | options + reco, vetoable (pas de reco unique) | `check:single-proposal-no-alternatives`, `check:secondary-proposals-dropped` |
| A5 | montrer-avant-valider **(HARD)** | `check:render-shown-before-validation` |
| A6 | adapter à l'expertise | — (semantic → judge) |
| A7 | confirmer le takeaway | — **(new: `check:takeaway-confirmed`)** |
| A8 | pas d'off-road **(HARD)** | `check:real-system`, `check:stray-tool-call`, `check:skills-invoked-not-emitted`, `check:suggester-invoked` |

## 1. Goal

Make the flow's process guarantees a first-class, legible, HONEST rubric in the cert: every A-item is either
mechanically asserted by a deterministic `check:*` (trustworthy) or explicitly marked judge-advisory (fallible).
Fill the 2 deterministic gaps (A3, A7). Never fake a mechanical verdict on a semantic item (A1/A6) — that would
be the exact "theater" T4 just removed.

## 2. Architecture

Three units, each small and independently testable.

### 2.1 The rubric definition — `src/flow-rubric.ts` (new)

A pure, data-only table `FLOW_RUBRIC: FlowRubricItem[]`, one entry per A-item:

```ts
export interface FlowRubricItem {
  id: "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7" | "A8";
  label: string;                    // the flow guarantee, human-readable
  gate: "hard" | "soft";            // A5 & A8 are hard (audit); others soft
  kind: "deterministic" | "judge";  // deterministic = backed by check(s); judge = advisory
  checks: string[];                 // the `check:*` sources that back it ([] for judge items)
}
```

The exact 8 entries per the §0 table. `checks` lists the EXACT source strings emitted by `src/checks.ts`.
This file has no logic — it is the single source of truth for "what the flow rubric is."

### 2.2 Two new deterministic checks — `src/checks.ts`

Both follow the existing `(ctx: CheckContext) => Finding[]` shape (`CheckContext = {events, report}`) and are
registered in the check runner alongside the current checks.

- **`check:takeaway-confirmed` (A7)** — mirrors `check:render-shown-before-validation`'s event-ordering logic.
  Locate the first PRODUCTION event (a `produce.mjs` tool-use, or the first delivered output in `report`).
  Scan the events BEFORE it for the Gate-1b takeaway-confirmation signal: the actor presenting a takeaway for
  confirmation (an `AskUserQuestion`/assistant-text stating the takeaway) followed by a journalist affirmation,
  OR a `confirmedTakeaway` marker in a tool input. Fires **major** (`area: orchestration`) when production
  happened with NO confirmed takeaway upstream. A run that never produced → no finding (nothing to gate).

- **`check:over-ask` (A3)** — fires when the actor RE-ASKS a canonical field the journalist already supplied.
  Built CONSERVATIVELY: only the specific canonical fields whose provision is unambiguous in the transcript —
  the **source**, the **takeaway/insight**, the **data table**, the **article text**. Fires **minor** when a
  later question requests one of these AFTER the same field's content already appeared in an earlier user-text
  event. Conservative matching (a field is "already provided" only on a high-confidence signal), to avoid a
  fragile heuristic that claims mechanical certainty it doesn't have. **Honest fallback:** if implementation
  shows no clean deterministic signal for A3, it is reclassified `kind: "judge"` in `FLOW_RUBRIC` (advisory)
  and `check:over-ask` is NOT shipped — a judge-advisory A3 is honest; a noisy false-positive check is not.

### 2.3 Report legibility — `src/report.ts` + `src/suite-report.ts`

A new "Flow rubric (A1-A8)" section:
- **Per-case (`report.ts`)**: one row per A-item — `id · label · gate(hard/soft) · kind badge · status`.
  Status for a `deterministic` item = pass if none of its `checks` fired for this case, else fail (linking the
  finding). Status for a `judge` item = the judge's advisory verdict if present, else "not assessed". The kind
  badge reuses T4's mechanical-vs-judge-opinion visual language (mechanical = trustworthy, judge = advisory).
- **Suite (`suite-report.ts`)**: an aggregate row per A-item — how many cases passed / failed it (deterministic
  items), so a suite makes flow-conformance legible at a glance. Hard-gate failures (A5, A8) are surfaced
  distinctly (a hard-gate miss is a shippability problem, not a style note).

## 3. Data flow

Transcript + report → `runAllChecks` (now including `checkOverAsk` + `checkTakeawayConfirmed`) → findings →
report render reads `FLOW_RUBRIC`, and for each item resolves status from the findings (deterministic) or the
judge output (advisory). `FLOW_RUBRIC.checks` is the join key between a rubric row and the findings it owns.

## 4. Testing

- **`check:takeaway-confirmed`**: a synthetic transcript with production but no upstream takeaway confirmation →
  fires; a transcript with a confirmed takeaway before production → silent; a no-production run → silent.
- **`check:over-ask`**: a transcript re-asking the source after it was given → fires; a clean single-ask flow →
  silent. (If A3 degrades to judge per §2.2, this test is replaced by a `FLOW_RUBRIC` assertion that A3 is
  `kind: "judge"` with no backing check.)
- **Rubric drift-guard** (`flow-rubric.test.ts`): every `FLOW_RUBRIC` item's `checks` entries are REAL source
  strings emitted somewhere in `src/checks.ts` (grep the source, like the existing harness drift guards) — a
  renamed/removed check can't silently orphan a rubric row. Every A-id A1-A8 present exactly once; hard gates =
  {A5, A8}.
- **Report render**: the flow-rubric section renders all 8 rows with the right kind badge, a deterministic fail
  links its finding, a judge row shows advisory/not-assessed.
- All bun:test; the full harness suite stays 0-fail (currently 389/0 after T3+T4; new tests add to the count).

## 5. Non-goals (deferred)

- A1/A6 as deterministic checks — they are semantic; forcing a mechanical verdict = theater (T4). Judge only.
- κ calibration of the judge vs human labels — **S4c** (needs Yvan/Rinny labels).
- Combinatorial covering-array case generation — **S4b**.
- The human editorial gate — **S4d** (needs the humans).
- Changing any flow BEHAVIOUR in the splash tool — S4a only OBSERVES/reports the flow; it adds no orchestration
  rule. (If a new flow guarantee is desired, that's a tool-side change, not this cert sub-project.)

## 6. Risks

- **A3 noisy** → §2.2 honest fallback (degrade to judge-advisory rather than ship a false-positive check).
- **A7 false-negative** (misses a real skipped-takeaway because the confirmation signal is phrased unusually) →
  conservative: A7 fires only on a clear "produced with no confirmation upstream"; a borderline confirmation is
  given the benefit of the doubt (a missed A7 is a quiet gap, a false A7 is a loud wrong accusation — prefer the
  quiet miss, and the judge advisory A1 covers question-quality around it).
- **Rubric ↔ check drift** → §4 drift-guard makes an orphaned rubric row a failing test.
- **Overlap with existing checks** (A8 spans 4 checks) → the rubric row aggregates them; a fail in ANY backing
  check fails the A-item. No new logic, just the join.
