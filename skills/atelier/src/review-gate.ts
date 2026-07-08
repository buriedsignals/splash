import type { ProduceReport } from "./producer-spec";

// The ONLY writer of the render-review record (Layer 2 — the editorial "second pair of
// eyes"). A produced visual must be reviewed against its ACTUAL render + the article/data
// BEFORE it can ship: the review flags what deterministic code cannot — a title that
// misstates the metric (rate-as-count), a fabricated source, a misleading encoding, a
// chart that adds nothing over a sentence. The `concerns` are ADVISORY (surfaced to the
// journalist at Gate 3, never a hard block); what is MANDATORY is that the review ran —
// assertShippable refuses to export a visual with no review record, so the host cannot
// skip it the way it skipped ②'s self-check in 4/5 manual sessions.
export function applyReviewGate(
  report: ProduceReport,
  id: string,
  concerns: string[],
): ProduceReport {
  let found = false;
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    found = true;
    if (r.status !== "produced")
      throw new Error(
        `cannot review proposal ${id}: not produced (status=${r.status})`,
      );
    return { ...r, reviewed: true, reviewConcerns: concerns };
  });
  if (!found) throw new Error(`unknown proposal ${id}`);
  return { results };
}
