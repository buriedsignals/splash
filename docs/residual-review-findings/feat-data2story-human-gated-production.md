# Known residuals — Data2Story human-gated production

Accepted for canonical-lineage promotion on 2026-08-10 after adversarial review
of `feat/data2story-human-gated-production`, based directly on `rd-dev` at
`542e9f9a`. These are planned Phase 0 follow-ups, not evidence that the completed
delivery-hardening slice is untested.

## P1 — approval and QA binding

`skills/deliver/scripts/deliver.mjs` currently requires a regular
`APPROVED.md` file, but does not yet parse an `OutputReview` bound to the output
ID, current render digest, plan version, finding IDs, and a passing QA run.
Implement the versioned review record and reject missing, stale, or mismatched
records inside every delivery entry point.

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
- Render mutation after approval and QA receipt mismatch.
- Cloudflare timeout, response loss, and remote-success/local-failure cases.

The broader evidence-package, context-acquisition, claim-trace, production-plan,
and per-output state work remains tracked by
`docs/splash/2026-08-10-data2story-human-gated-production-prd.md`.
