import { describe, it, expect } from "bun:test";
import { applyReviewGate } from "../src/review-gate";
import type { ProduceReport } from "../src/producer-spec";

const rep = (
  over: Partial<ProduceReport["results"][0]> = {},
): ProduceReport => ({
  results: [
    {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      renderApproved: false,
      ...over,
    },
  ],
});

describe("applyReviewGate", () => {
  it("records the review (reviewed=true) and the advisory concerns", () => {
    const out = applyReviewGate(rep(), "p1", [
      "title asserts a count but the data is a rate",
    ]);
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toEqual([
      "title asserts a count but the data is a rate",
    ]);
  });

  it("records an empty concerns list (a clean review still counts as reviewed)", () => {
    const out = applyReviewGate(rep(), "p1", []);
    expect(out.results[0].reviewed).toBe(true);
    expect(out.results[0].reviewConcerns).toEqual([]);
  });

  it("refuses to review a proposal that was not produced", () => {
    expect(() => applyReviewGate(rep({ status: "failed" }), "p1", [])).toThrow(
      /not produced/,
    );
  });

  it("throws on an unknown proposal id", () => {
    expect(() => applyReviewGate(rep(), "nope", [])).toThrow(
      /unknown proposal/,
    );
  });

  it("leaves renderApproved untouched (review is a distinct gate)", () => {
    const out = applyReviewGate(rep(), "p1", []);
    expect(out.results[0].renderApproved).toBe(false);
  });
});
