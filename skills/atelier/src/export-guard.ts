import type { ProduceReport } from "./producer-spec";

// The one MECHANICAL gate: nothing ships unless it was actually produced AND the human
// approved the render. Lives in the irreversible-action scripts so a lower-level call
// cannot bypass it.
export function assertShippable(report: ProduceReport, id: string): void {
  const r = report.results.find((x) => x.id === id);
  if (!r) throw new Error(`unknown proposal ${id}`);
  if (r.status !== "produced")
    throw new Error(
      `refusing to export ${id}: not produced (status=${r.status})`,
    );
  if (!r.renderApproved)
    throw new Error(
      `refusing to export ${id}: not render-approved (run gate-render first)`,
    );
}
