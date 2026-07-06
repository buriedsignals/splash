import { createHash } from "node:crypto";
import type { ProduceReport } from "./producer-spec";

// The ONLY writer of renderApproved. Binds approval to the exact artifact bytes, so a
// later re-produce (which changes the bytes) leaves the old hash mismatched — an honest
// audit marker + accident-resistance, NOT enforcement against a deliberate skip.
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
    const approvedHash = createHash("sha256")
      .update(artifactBytes)
      .digest("hex");
    return { ...r, renderApproved: true, approvedHash };
  });
  if (!results.some((r) => r.id === id))
    throw new Error(`unknown proposal ${id}`);
  return { results };
}
