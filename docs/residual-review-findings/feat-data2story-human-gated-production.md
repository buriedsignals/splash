# Known residuals — Data2Story human-gated production

Accepted for canonical-lineage promotion on 2026-08-10 after adversarial review
of `feat/data2story-human-gated-production`, based directly on `rd-dev` at
`542e9f9a`, and promoted into the consolidated `main` baseline on 2026-08-11.

The delivery-hardening follow-ups recorded below are resolved. The only remaining
verification item in this ledger is the explicitly credential-gated live
MapTiler smoke; the broader product work remains tracked by the PRD.

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

## Resolved 2026-08-11 — interrupted replacement recovery

`skills/deliver/scripts/delivery-replacement.mjs` now serializes same-output
work with an in-process queue and a dead-owner-aware filesystem lock. Each
publication writes a schema-v1 replacement journal and complete delivery
manifest before moving the old export and publishing staging. The next call
reconciles interrupted staging, restores the previous export when publication
did not complete, or keeps the manifest-proven new export and finishes backup
cleanup. Fault-injection tests cover both rename boundaries, deferred cleanup,
both process-restart states, abandoned staging, stale locks, and concurrent
direct `materialise` calls.

## Resolved 2026-08-11 — hosted deployment timeout and reconciliation

Every Cloudflare request and response-body read now has a hard deadline. The
final request carries a deterministic deployment key as `commit_hash`, with a
schema-v1 operation record persisted before the request. A retry reconciles a
lost response by listing and matching remote deployments, fails closed while
the result remains ambiguous, and reuses a completed remote deployment when
local replacement failed. Tests cover ignored abort signals, stalled response
bodies, unreadable 5xx responses, response loss, duplicate-POST prevention, and
remote success followed by local publication failure.

## Resolved 2026-08-11 — compatibility contract

The canonical `offerForms` and `materialise` APIs now accept only a separately
declared `storiesRoot` plus stable `storyId` and `outputId`. Delivery derives its
source and `export/<outputId>/` replacement target from that identity,
canonicalizes the root and every relevant source/export ancestor, and rejects
traversal, symlinked ancestors, and legacy path fields before mutation.

`skills/deliver/scripts/delivery-compat-v1.mjs` retains the observed
`{beatDir, exportDir}` caller shape as an explicitly versioned adapter. It
requires the declared root, validates both old paths against the canonical IDs,
discards them, and delegates to the ID API; the supplied export path is never a
recursive replacement target. Contract tests cover the canonical flow, path
field rejection, traversal and symlink boundaries, a working legacy fixture,
an outside beat, and an alternate export path left untouched.

## Review verification still required

- The credential-gated MapTiler browser smoke remains manual. On the 2026-08-10
  Ubuntu hosted runner it reached the keyed temporary page but timed out waiting
  for the page's `mw-live` readiness marker. Diagnose the external map/style load
  before promoting that smoke to an every-push release gate; do not treat the
  secretless contract lane as evidence that the live map was driven.

The broader evidence-package, context-acquisition, claim-trace, production-plan,
and per-output state work remains tracked by
`docs/splash/2026-08-10-data2story-human-gated-production-prd.md`.
