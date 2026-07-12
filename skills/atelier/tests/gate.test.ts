import { describe, it, expect } from "bun:test";
import { applyRenderGate } from "../src/gate";
import type { ProduceReport } from "../src/producer-spec";

const report = (): ProduceReport => ({
  results: [
    {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      reviewed: true,
      renderApproved: false,
    },
  ],
});

describe("applyRenderGate", () => {
  it("sets renderApproved + a content hash on the named produced proposal", () => {
    const out = applyRenderGate(
      report(),
      "p1",
      new TextEncoder().encode("PNGDATA"),
    );
    expect(out.results[0].renderApproved).toBe(true);
    expect(out.results[0].approvedHash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("refuses to approve a proposal that is not produced", () => {
    const r = report();
    r.results[0].status = "failed";
    expect(() => applyRenderGate(r, "p1", new Uint8Array())).toThrow(
      /not produced/,
    );
  });
  it("throws on an unknown id", () => {
    expect(() => applyRenderGate(report(), "nope", new Uint8Array())).toThrow(
      /unknown proposal/,
    );
  });
  it("refuses to approve a produced-but-unreviewed proposal (Gate 3a before 3b)", () => {
    const r = report();
    r.results[0].reviewed = false;
    expect(() => applyRenderGate(r, "p1", new Uint8Array())).toThrow(
      /not render-reviewed/,
    );
  });
  it("preserves the report's generatedAt across the approval write (the provenance anchor)", () => {
    const r: ProduceReport = {
      generatedAt: "2026-07-12T08:00:00.000Z",
      ...report(),
    };
    const out = applyRenderGate(r, "p1", new TextEncoder().encode("PNGDATA"));
    expect(out.generatedAt).toBe("2026-07-12T08:00:00.000Z");
  });
});
