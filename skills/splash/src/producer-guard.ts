import type { Producer } from "./producer-spec";

// GUARD 1 — producer-match. A real QA finding: splash committed to `dw-chart` (the
// journalist accepted it) then SILENTLY produced with `chart-native` without
// renegotiating. This pure check is the mechanical teeth: the producer that ACTUALLY ran
// (recorded by the dispatch, post-dispatch) must equal the accepted proposal's declared
// producer. produce-all turns a non-null reason into a fail-hard result, so a flipped
// produce is never shipped. Mirrors export-guard.ts's pure+tested style.
//
// The ONE sanctioned switch is the native→dw fallback: a native chart type chart-native
// cannot map is re-emitted as a dw-chart ChartSpec (the FALLBACK_TO_DW / needs-fallback
// path, exit-2). That native→dw direction is legitimate. A dw→native switch, or any
// other producer mismatch, is NOT — it is refused.
export function producerMismatchReason(
  accepted: Producer,
  actual: Producer,
): string | null {
  if (accepted === actual) return null;
  // Sanctioned, directional fallback only: chart-native → dw-chart.
  if (accepted === "chart-native" && actual === "dw-chart") return null;
  return (
    `produced with "${actual}" but the accepted proposal committed to "${accepted}" — ` +
    `a producer switch must be renegotiated via suggest-chart (only the native→dw ` +
    `fallback is automatic), never a silent flip`
  );
}
