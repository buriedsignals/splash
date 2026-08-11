# Known residuals — Data2Story human-gated production

Accepted for canonical-lineage promotion on 2026-08-10 after adversarial review
of `feat/data2story-human-gated-production`, based directly on `rd-dev` at
`542e9f9a`. These are planned Phase 0 follow-ups, not evidence that the completed
delivery-hardening slice is untested.

## Resolved 2026-08-11 — approval and QA binding

`skills/deliver/scripts/output-review.mjs` now owns versioned
`OUTPUT-REVIEW.json` records and a deterministic SHA-256 digest of the complete
render tree. Approval and a passing QA run must both match the output ID, exact
current digest, current plan version, and current finding IDs. `offerForms` and
direct `materialise` calls independently fail closed on missing, legacy, stale,
copied, malformed, or mismatched records; `materialise` checks again after
staging before it publishes. Contract and entry-point tests cover render, plan,
finding, output, QA, decision, and schema mismatches while preserving the last
good export.

## P1 — interrupted replacement recovery

The two-rename local publication sequence preserves the last good export across
ordinary validation, build, handover, network, and rename errors, but a process
termination between renames can strand a backup. Add a durable replacement
journal or versioned delivery manifest, reconcile staging/backup state before a
new delivery, and serialize concurrent delivery for the same output.

## P1 — hosted deployment timeout and reconciliation

Cloudflare requests do not yet have a hard deadline or a persisted operation
record. Add bounded abort signals, an idempotency/deployment identifier, and a
reconciliation record that survives an ambiguous response or a successful
remote deployment followed by local publication failure.

## P1 — compatibility contract

The hardened API requires the observed canonical
`stories/<slug>/beats/<beat>` layout so it can derive the only legal recursive
replacement target. Add a versioned compatibility adapter for any legacy caller
that must be retained; do not restore a caller-selected deletion path.

The current API also derives its story from `beatDir`; it does not yet receive a
separately declared Splash stories root. Add that explicit trust boundary,
canonicalize every relevant ancestor against it, and accept stable story/output
IDs rather than allowing a caller-controlled absolute beat root to establish the
recursive replacement scope.

## Review verification still required

- Fault injection at both publish renames, backup cleanup, and process restart.
- Concurrent `materialise` calls for one output.
- Cloudflare timeout, response loss, and remote-success/local-failure cases.
- The credential-gated MapTiler browser smoke remains manual. On the 2026-08-10
  Ubuntu hosted runner it reached the keyed temporary page but timed out waiting
  for the page's `mw-live` readiness marker. Diagnose the external map/style load
  before promoting that smoke to an every-push release gate; do not treat the
  secretless contract lane as evidence that the live map was driven.

The broader evidence-package, context-acquisition, claim-trace, production-plan,
and per-output state work remains tracked by
`docs/splash/2026-08-10-data2story-human-gated-production-prd.md`.
