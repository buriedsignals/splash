import { describe, it, expect } from "bun:test";
import { checkParallelConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/parallel.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const accents = [OKABE_ITO.blue, OKABE_ITO.orange];
const dimLabels = sample.dimensions.map((d) => d.label);

describe("the shipped parallel plot is conformant (global ++ parallel)", () => {
  it("passes with zero violations (5 axes, 2 accents, CVD-safe)", () => {
    const v = checkParallelConformance(
      {
        title: sample.title,
        source: sample.source,
        dimensionLabels: dimLabels,
        highlightCount: sample.highlight.length,
        accentColors: accents,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags fewer than 3 axes", () => {
    const v = checkParallelConformance(
      {
        title: sample.title,
        source: sample.source,
        dimensionLabels: ["A", "B"],
        highlightCount: 2,
        accentColors: accents,
      },
      text,
    );
    expect(v.some((m) => m.includes("≥ 3 axes"))).toBe(true);
  });

  it("flags more than 3 highlights", () => {
    const v = checkParallelConformance(
      {
        title: sample.title,
        source: sample.source,
        dimensionLabels: dimLabels,
        highlightCount: 5,
        accentColors: accents,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 3"))).toBe(true);
  });

  it("flags an off-palette accent colour", () => {
    const v = checkParallelConformance(
      {
        title: sample.title,
        source: sample.source,
        dimensionLabels: dimLabels,
        highlightCount: 2,
        accentColors: [...accents, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
