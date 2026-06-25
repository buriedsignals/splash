import { describe, it, expect } from "bun:test";
import { checkHistogramConformance } from "../src/core/conformance";
import { COLORS } from "../src/core/tokens";
import { computeHistogramLayout } from "../src/histogram-geometry";
import sample from "../assets/sample-data/histogram.json";

const colors = {
  data: COLORS.line,
  text: ["#1A1A1A", "#6B6B6B"],
  bg: "#FFFFFF",
};
const layout = computeHistogramLayout(
  { valueField: sample.valueField, rows: sample.rows },
  {
    width: 840,
    height: 480,
    padding: { top: 100, right: 18, bottom: 44, left: 40 },
  },
  { binWidth: sample.binWidth },
);

describe("the shipped histogram is conformant (global ++ histogram)", () => {
  it("passes with zero violations (count axis at 0, sensible bins)", () => {
    const v = checkHistogramConformance(
      {
        title: sample.title,
        source: sample.source,
        countDomain: layout.countDomain,
        binCount: layout.bars.length,
      },
      colors,
    );
    expect(v).toEqual([]);
  });

  it("flags a count axis that does not start at 0", () => {
    const v = checkHistogramConformance(
      {
        title: sample.title,
        source: sample.source,
        countDomain: [5, 20],
        binCount: layout.bars.length,
      },
      colors,
    );
    expect(v.some((m) => m.includes("must start at 0"))).toBe(true);
  });

  it("flags too few bins", () => {
    const v = checkHistogramConformance(
      {
        title: sample.title,
        source: sample.source,
        countDomain: layout.countDomain,
        binCount: 2,
      },
      colors,
    );
    expect(v.some((m) => m.includes("< 3"))).toBe(true);
  });

  it("flags an off-palette data colour", () => {
    const v = checkHistogramConformance(
      {
        title: sample.title,
        source: sample.source,
        countDomain: layout.countDomain,
        binCount: layout.bars.length,
      },
      { data: "#123456", text: ["#1A1A1A"], bg: "#FFFFFF" },
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
