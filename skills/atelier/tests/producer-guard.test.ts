import { describe, it, expect } from "bun:test";
import { producerMismatchReason } from "../src/producer-guard";

// GUARD 1 (pure core) — the producer that ACTUALLY ran must equal the producer the
// accepted proposal committed to. The ONE sanctioned switch is the native→dw fallback
// (chart-native's FALLBACK_TO_DW re-emit). Every other divergence is a silent flip-flop.
describe("producerMismatchReason", () => {
  it("returns null when the actual producer equals the accepted one (every producer)", () => {
    for (const producer of [
      "dw-chart",
      "chart-native",
      "map-dw",
      "map-native",
      "scrolly",
    ] as const) {
      expect(producerMismatchReason(producer, producer)).toBeNull();
    }
  });

  it("allows the sanctioned native→dw fallback (chart-native accepted, dw-chart ran)", () => {
    expect(producerMismatchReason("chart-native", "dw-chart")).toBeNull();
  });

  it("REFUSES the observed dw→native flip (dw-chart accepted, chart-native silently ran)", () => {
    const reason = producerMismatchReason("dw-chart", "chart-native");
    expect(reason).not.toBeNull();
    expect(reason).toContain("dw-chart");
    expect(reason).toContain("chart-native");
  });

  it("REFUSES any other mismatch (map-dw accepted, map-native ran)", () => {
    expect(producerMismatchReason("map-dw", "map-native")).not.toBeNull();
  });

  it("does NOT treat dw→chart-native as the fallback (fallback is native→dw only, one-way)", () => {
    // The sanctioned exception is directional: chart-native → dw-chart, never the reverse.
    expect(producerMismatchReason("dw-chart", "chart-native")).not.toBeNull();
  });
});
