import { createHash } from "node:crypto";
import type { ProduceReport } from "./producer-spec";

// The ONLY writer of renderApproved. `approvedHash` (sha256 of the approved artifact bytes)
// is recorded as an audit marker of exactly what was approved — nothing re-reads or compares
// it later, so it is NOT enforcement. The actual accident-resistance in this spine comes from
// produce-all: every run writes a FRESH report with renderApproved=false for every result, so
// a re-produce forces re-approval before export/deploy-embed will ship it. Binding the shipped
// bytes to approvedHash at export time (to catch a produce-without-a-fresh-report edge case) is
// a deferred follow-on — see 2026-07-06-deterministic-orchestration-design.md.
export function applyRenderGate(
  report: ProduceReport,
  id: string,
  artifactBytes: Uint8Array,
): ProduceReport {
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    if (r.status !== "produced")
      throw new Error(
        `cannot approve proposal ${id}: not produced (status=${r.status})`,
      );
    // Enforce 3a → 3b: the render-review must be recorded before an approval can be, so a
    // journalist never approves without the review's concerns having been surfaced.
    if (!r.reviewed)
      throw new Error(
        `cannot approve proposal ${id}: not render-reviewed — run review-gate first (Gate 3a before 3b)`,
      );
    const approvedHash = createHash("sha256")
      .update(artifactBytes)
      .digest("hex");
    return { ...r, renderApproved: true, approvedHash };
  });
  if (!results.some((r) => r.id === id))
    throw new Error(`unknown proposal ${id}`);
  return { results };
}
