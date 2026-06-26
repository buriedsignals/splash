import { describe, it, expect } from "bun:test";
import { checkBeeswarmConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/beeswarm.json";

const colors = {
  data: OKABE_ITO.blue,
  text: ["#1A1A1A", "#6B6B6B"],
  bg: "#FFFFFF",
};
const catColors = [OKABE_ITO.blue, OKABE_ITO.orange];

describe("the shipped beeswarm is conformant (global ++ beeswarm)", () => {
  it("passes with zero violations (labelled axis, 2 CVD-safe categories)", () => {
    const v = checkBeeswarmConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.valueLabel,
        pointCount: sample.points.length,
        categoryColors: catColors,
      },
      colors,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing value-axis label", () => {
    const v = checkBeeswarmConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: "",
        pointCount: 42,
        categoryColors: catColors,
      },
      colors,
    );
    expect(v.some((m) => m.includes("value-axis label"))).toBe(true);
  });

  it("flags an off-palette category colour", () => {
    const v = checkBeeswarmConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.valueLabel,
        pointCount: 42,
        categoryColors: [...catColors, "#123456"],
      },
      colors,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
