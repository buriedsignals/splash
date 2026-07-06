import { describe, it, expect } from "bun:test";
import type { ProposalResult } from "../src/producer-spec";

describe("producer-spec", () => {
  it("models a produced result with the required bookkeeping fields", () => {
    const r: ProposalResult = {
      id: "p1",
      producer: "chart-native",
      format: "video",
      status: "produced",
      outputs: ["out/p1/landscape.mp4"],
      renderApproved: false,
    };
    expect(r.status).toBe("produced");
    expect(r.renderApproved).toBe(false);
  });
});
