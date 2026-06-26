import { describe, it, expect } from "bun:test";
import { checkPopulationPyramidConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/population-pyramid.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.orange];

describe("the shipped pyramid is conformant (global ++ pyramid)", () => {
  it("passes with zero violations (2 labelled groups, CVD-safe)", () => {
    const v = checkPopulationPyramidConformance(
      {
        title: sample.title,
        source: sample.source,
        leftLabel: sample.leftLabel,
        rightLabel: sample.rightLabel,
        groupColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing group label", () => {
    const v = checkPopulationPyramidConformance(
      {
        title: sample.title,
        source: sample.source,
        leftLabel: "",
        rightLabel: sample.rightLabel,
        groupColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("left group label"))).toBe(true);
  });

  it("flags an off-palette group colour", () => {
    const v = checkPopulationPyramidConformance(
      {
        title: sample.title,
        source: sample.source,
        leftLabel: sample.leftLabel,
        rightLabel: sample.rightLabel,
        groupColors: [OKABE_ITO.blue, "#FF0000"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
