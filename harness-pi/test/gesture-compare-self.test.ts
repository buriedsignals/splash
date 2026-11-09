import { describe, expect, it } from "bun:test";
import { GestureRefusal, validateGestures } from "../craft/_shared/gesture-core.mjs";

const ROWS = [
  { name: "Lisboa", value: 214 },
  { name: "Porto", value: 96 },
  { name: "Braga", value: 31 },
];
const CLAIM = { takeaway: "Lisboa carries more than twice Porto's trips." };
// Run 10 on Osaurus (2026-11-09) wrote marks: ["2015 · Africa", "2015 · Africa"]: the plate drew the row against itself,
// two rules and two labels on one spot.
const SELF = [{ do: "compare", marks: ["Lisboa", "Lisboa"], note: "World peak: 1,148,499" }];
const refusal = (): GestureRefusal | undefined => {
  try {
    validateGestures({ gestures: SELF, rows: ROWS, family: "length", format: "static", claim: CLAIM });
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
};

describe("compare against itself", () => {
  it("should refuse a compare whose marks name the same row twice", () => {
    expect(refusal()?.message).toContain("the same row twice");
  });

  it("should offer the compare against the whole as the value that works", () => {
    expect((refusal() as any)?.fix?.set?.value).toEqual({ do: "compare", mark: "Lisboa", of: "whole", note: "World peak: 1,148,499" });
  });
});
