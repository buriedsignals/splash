# Deterministic orchestration — design

> Status: design approved (post adversarial validation, 2026-07-06). Next: `writing-plans`.
> Scope: the production-time mechanical spine of the atelier pipeline. NOT the whole pipeline —
> `②` (the agent) stays the host that reads, judges, dialogues, and asks the human gates.

## Problem

The atelier pipeline (`skills/atelier/SKILL.md`) is entirely LLM prose. The audit + an adversarial
design review found four concrete reliability holes, all grounded in the code:

1. **Silent proposal drop** — the agent is told to "produce each accepted proposal", but the loop
   lives only in prose; a forgetful agent produces one and drops the rest. No structural guarantee.
2. **Inert fallback** — `produce-from-spec.mjs:31` exits `2` with `FALLBACK_TO_DW`, but nothing
   downstream catches it; the graceful dw-chart recovery only happens if the agent notices stderr.
3. **Unenforced human gates** — provenance-confirm (2b) and render-approval (3) are social
   contracts; nothing prevents export before them (`skills/atelier/scripts/export-code.mjs:53` is
   even a warn-only no-op on the ephemeral-path check).
4. **Convention-only `producer` discriminant** — every routed spec carries `producer` by prose
   convention; no spec type declares it, so a typed round-trip drops it (backlog-flagged).

## Principle (locked)

`②` is the host agent. There is no server to pause-for-human. Reliability therefore comes NOT from
taking hosting/judgment away from the agent, but from three moves:

- **(a) Put the MECHANICAL LOOP in code**, not in the agent's diligence. The single reliability win
  is that "produce every accepted proposal" becomes an in-code loop with a structured report, so it
  cannot silently drop.
- **(b) One real mechanical gate** — export-completeness — enforced by a non-zero exit *inside the
  irreversible-action script*, where it cannot be bypassed by calling a lower-level command.
- **(c) Honestly surface** the human gates (provenance, render) as loud status in the report; do not
  dress a self-written boolean up as enforcement.

### Explicitly rejected (validation found these counterproductive)

- **A `run.json` threaded from INPUT across the whole dialogue.** Asking the LLM to reliably carry
  and mutate durable cross-step state over an 8–12-turn dialogue is a known weak spot and adds
  desync/corruption failure surface. Prefer stateless commands that RETURN structured JSON.
- **Gate tokens as "enforcement".** A boolean written by the same agent that must ask the human adds
  ~nothing against the only failure that matters (the agent skipping the human). Tokens are audit
  markers + accident-resistance, never enforcement.
- **Unifying the two choropleth shapes behind one config.** map-dw and map-native have disjoint
  basemap registries and different join-key semantics (`skills/map-native/src/basemaps.ts:15` ships
  only `world`/`us-states`; map-dw binds DW cloud basemaps) and even diverge on `lng` vs `lon`. Only
  the DATA payload (CSV-string ↔ rows-array) is mechanically derivable; the geo binding is not.

## Design

### 1. Typed `producer` + `format` discriminant (additive)

Add `producer: "dw-chart" | "chart-native" | "map-dw" | "map-native" | "scrolly"` and
`format: "static" | "interactive" | "video" | "scrolly"` as declared fields on each routed spec
type (`ChartSpec`, `NativeSpec`, `MapSpec`, the map-native config shapes). Additive — the validators
already accept extra fields at runtime; `eval/score.ts:42` already reads `producer`. This makes the
`VisualSpec` union discriminate at the type level (ties into the tsc floor already in place).

The union members stay DISTINCT (dw-chart's `ChartSpec` and chart-native's `NativeSpec` are
alternatives, not two views of one thing). Only the map DATA layer gets a shared derivation helper
`toRows(csv)` / `toCsv(rows)`; the geo binding stays producer-specific and is supplied by the agent.

### 2. `produce-all` — the in-code batch loop (fixes drop + inert fallback)

A single stateless command:

```
bun skills/atelier/scripts/produce-all.mjs <accepted.json> <outDir>
```

`accepted.json` = the array of accepted proposals, each `{ id, producer, format, spec, provenance,
confirmedTable? }`. `produce-all`:

- iterates EVERY accepted proposal in code (not the agent),
- dispatches by `producer` + `format` through a **per-producer adapter** (see §3),
- on a chart-native `exit 2` (`FALLBACK_TO_DW`), marks that proposal `status: "needs-fallback"` and
  continues — it does NOT auto-translate NativeSpec→ChartSpec (no such mapper exists, and an
  auto-fallback would silently downgrade a format the human chose at CADRAGE). The agent re-emits a
  dw `ChartSpec` via suggest-chart and re-runs that one proposal.
- returns a structured report on stdout (the existing `PRODUCE_RESULT` idiom, extended):

```json
{ "results": [
  { "id": "p1", "producer": "chart-native", "format": "video", "status": "produced",
    "outputs": ["exports/x/p1/landscape.mp4"], "confirmedTable": null, "renderApproved": false },
  { "id": "p2", "producer": "chart-native", "format": "interactive", "status": "needs-fallback",
    "reason": "UnsupportedNativeType: sankey" },
  { "id": "p3", "producer": "map-dw", "format": "static", "status": "failed", "error": "..." }
] }
```

The agent reads this in-turn and acts (re-emit the fallback, retry the failure, proceed). Because the
loop is in code, a dropped secondary proposal is now structurally impossible — every accepted id
appears in `results` with a status.

### 3. Per-producer adapters (the 5 producers split two ways)

`produce-all` dispatches through adapters because the producers have two incompatible execution
models — do NOT pretend they are uniform:

- **File-based** (`chart-native`, `map-native`, `scrolly`): `.mjs <config> <outDir> <format>` CLIs
  that write local files. Adapter shells out, collects the output paths.
- **Cloud-publishing** (`dw-chart`, `map-dw`): async `produceChart(spec, pngPath)` /
  `produceMap(spec, pngPath)` that publish to Datawrapper and return `{ publicUrl, pngPath, embed }`.
  Adapter records the deliverable as `{ publicUrl (hosted iframe), pngPath }` — a DW chart has NO
  self-contained `interactive.html`, so its "interactive" delivery form is the embed URL + PNG, not
  a file for `export-code.mjs`.

Idempotency: each proposal writes to a per-proposal `outDir/<id>/`, cleared on retry; DW resources
are keyed by a recorded chart id (patch/reuse, not re-POST) so a retry does not duplicate remote
charts.

### 4. `export` — the one real mechanical gate

Export-completeness is genuinely enforceable (a code check over produced artifacts, not a
self-written boolean). The refusal lives INSIDE the irreversible-action scripts so it cannot be
bypassed by calling a lower-level command:

- `export-code.mjs` and `deploy-embed.mjs` take the `produce-all` report (`--results <file>`) and
  **refuse (non-zero exit)** unless the proposal being shipped has `status: "produced"`. Convert the
  existing warn-only ephemeral-path no-op (`export-code.mjs:53`) to a hard exit.
- This is the spine's one hard guarantee: nothing ships that was not produced.

### 5. Human gates — honest surfacing, not fake tokens

Gates 2b (provenance confirm) and 3 (render approval) stay agent-asked prose, BUT their status is
surfaced loudly in the report so an unconfirmed/unapproved proposal is visible, not silent:

- `produce-all` REFUSES to produce any `provenance: "prose"` proposal that arrives without
  `confirmedTable: true`, reporting it as `status: "needs-confirmation"` (so it stays visible in the
  drop-proof report, never silently skipped). A prose figure must be human-confirmed before it is
  charted — this gate IS mechanical because the trigger, `provenance: "prose"`, is set by
  suggest-article from the data, not free-declared by the shipping step. (Report `status` set:
  `produced | failed | needs-fallback | needs-confirmation`.)
- `renderApproved` is surfaced (`false` until the agent runs `gate render <id> <results>` after the
  human says "ship it"). `gate render` is the ONLY writer of that field, schema-validates the write,
  and stores the sha256 of the approved artifact; `produce-all` clears `renderApproved` whenever it
  rewrites a proposal's output, so a post-approval re-produce forces re-approval. This is
  accident-resistance + an honest audit marker — NOT enforcement against a deliberate skip.

### 6. Warning taxonomy (validate must not over-block)

Producer validators today return warnings that coexist with `ok: true` and are meant to be READ /
auto-remediated at produce time (e.g. `chart-spec.ts:211` warns after auto-normalising a bad
numberFormat; `map-spec.ts:271` advises "prefer map-native" for a tight locator). Classify:

- `blocking` warnings (title-looks-like-a-label, missing source) → `validate` fails.
- `advisory` / `self-healing` warnings → surfaced, not blocking.

Give each validator warning a `severity: "blocking" | "advisory"`; `validate` fails only on blocking.

## What is OUT of this spec (separate plans, seams defined here)

- **Conformance-at-produce** — needs a shared color-resolver extracted first (the checks need
  render-resolved colors). `produce-all`'s adapter is where it will hook. Separate plan.
- **The full 4→41 native dispatch table + completeness test** — `spec-to-config.ts`'s switch is the
  seam; a completeness test asserting every advertised native type has a case belongs with that plan.
- **Any change to the interactive human dialogue** (CADRAGE questions, PROPOSITION presentation) —
  unchanged; this spec only makes PRODUCTION→EXPORT mechanical.

## Testing

- `produce-all` iterates ALL accepted proposals → a 3-proposal fixture where the middle one fails
  still reports the other two (drop-proof).
- exit-2 on an unmapped native type → `status: "needs-fallback"`, loop continues.
- `export`/`deploy-embed` refuse (non-zero) a proposal whose status ≠ `produced`.
- a `provenance: "prose"` proposal without `confirmedTable` is refused by `produce-all`.
- `gate render` is the only writer of `renderApproved`; a re-produce clears it.
- warning taxonomy: a self-healing numberFormat warning does NOT fail `validate`; a
  title-looks-like-a-label warning DOES.
- map data derivation round-trips (`toRows(toCsv(rows))` ≍ rows); geo binding is NOT derived.

## Why this is the reliable/best-practice shape

The loop that was unreliable (in the agent) is now in code with a structured report → the two
genuinely-broken bugs (silent drop, inert fallback) are fixed mechanically. The one gate that can be
enforced (export-completeness) is enforced in the irreversible script. The gates that cannot be
mechanically enforced (human judgment) are surfaced honestly instead of faked. State the agent must
thread is minimized (stateless structured-return commands, not a run.json fil-rouge). No green
producer is refactored. This is more reliable AND more skill-idiomatic than a full state machine.
