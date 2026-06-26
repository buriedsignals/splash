import { describe, it, expect } from "bun:test";
import { checkMarimekkoConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/marimekko.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [
  OKABE_ITO.green,
  OKABE_ITO.orange,
  OKABE_ITO.blue,
  OKABE_ITO.purple,
];
const columns = sample.columns.map((c) => c.values);

describe("the shipped marimekko is conformant (global ++ marimekko)", () => {
  it("passes with zero violations (4 series, real compositions, CVD-safe)", () => {
    const v = checkMarimekkoConformance(
      {
        title: sample.title,
        source: sample.source,
        seriesCount: sample.seriesFields.length,
        seriesColors: colors,
        columns,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags > 5 series", () => {
    const v = checkMarimekkoConformance(
      {
        title: sample.title,
        source: sample.source,
        seriesCount: 7,
        seriesColors: colors,
        columns,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 5"))).toBe(true);
  });

  it("flags an off-palette series colour", () => {
    const v = checkMarimekkoConformance(
      {
        title: sample.title,
        source: sample.source,
        seriesCount: 4,
        seriesColors: [...colors, "#123456"],
        columns,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags a column with no positive composition", () => {
    const v = checkMarimekkoConformance(
      {
        title: sample.title,
        source: sample.source,
        seriesCount: 4,
        seriesColors: colors,
        columns: [[0, 0, 0, 0]],
      },
      text,
    );
    expect(v.some((m) => m.includes("no positive composition"))).toBe(true);
  });
});
