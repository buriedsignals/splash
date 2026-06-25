import { describe, it, expect } from "bun:test";
import { checkStackedBarConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import { computeStackedLayout } from "../src/stacked-bar-geometry";
import sample from "../assets/sample-data/stacked.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [
  OKABE_ITO.black,
  OKABE_ITO.orange,
  OKABE_ITO.skyblue,
  OKABE_ITO.green,
];
const layout = computeStackedLayout(
  {
    catField: sample.catField,
    seriesFields: sample.seriesFields,
    rows: sample.rows,
  },
  {
    width: 840,
    height: 460,
    padding: { top: 90, right: 16, bottom: 44, left: 44 },
  },
);

describe("the shipped stacked bar is conformant (global ++ stacked)", () => {
  it("passes with zero violations (4 series, baseline 0, CVD-safe)", () => {
    const v = checkStackedBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        seriesCount: sample.seriesFields.length,
        seriesColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a value axis that does not include 0", () => {
    const v = checkStackedBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: [10, 100],
        seriesCount: 4,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("must include 0"))).toBe(true);
  });

  it("flags > 5 series", () => {
    const v = checkStackedBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        seriesCount: 7,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 5"))).toBe(true);
  });

  it("flags an off-palette series colour", () => {
    const v = checkStackedBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        seriesCount: 4,
        seriesColors: [...colors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
