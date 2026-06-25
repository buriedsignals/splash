import { describe, it, expect } from "bun:test";
import { checkScatterConformance } from "../src/core/conformance";
import { COLORS } from "../src/core/tokens";
import sample from "../assets/sample-data/scatter.json";

const colors = { data: COLORS.line, text: [COLORS.ink, COLORS.muted, COLORS.line], bg: COLORS.bg };

describe("the shipped scatter is conformant (global ++ scatter)", () => {
  it("passes with zero violations", () => {
    const v = checkScatterConformance(
      { title: sample.title, source: sample.source, xLabel: sample.xLabel, yLabel: sample.yLabel },
      colors,
    );
    expect(v).toEqual([]);
  });
  it("flags missing axis labels", () => {
    const v = checkScatterConformance(
      { title: sample.title, source: sample.source, xLabel: "", yLabel: "" },
      colors,
    );
    expect(v.filter((m) => m.includes("axis label")).length).toBe(2);
  });
});
