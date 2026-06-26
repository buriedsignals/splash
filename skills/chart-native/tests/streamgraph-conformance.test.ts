import { describe, it, expect } from "bun:test";
import { checkStreamgraphConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/streamgraph.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
];

describe("the shipped streamgraph is conformant (global ++ streamgraph)", () => {
  it("passes with zero violations (6 series, 6 steps, CVD-safe)", () => {
    const v = checkStreamgraphConformance(
      {
        title: sample.title,
        source: sample.source,
        seriesCount: sample.seriesFields.length,
        seriesColors: colors,
        stepCount: sample.rows.length,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags more than 7 series", () => {
    const v = checkStreamgraphConformance(
      {
        title: sample.title,
        source: sample.source,
        seriesCount: 9,
        seriesColors: colors,
        stepCount: 6,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 7"))).toBe(true);
  });

  it("flags an off-palette band colour", () => {
    const v = checkStreamgraphConformance(
      {
        title: sample.title,
        source: sample.source,
        seriesCount: 6,
        seriesColors: [...colors, "#123456"],
        stepCount: 6,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
