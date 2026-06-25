import { describe, it, expect } from "bun:test";
import { checkGroupedBarConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import { computeGroupedLayout } from "../src/grouped-bar-geometry";
import sample from "../assets/sample-data/grouped.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];
const layout = computeGroupedLayout(
  {
    catField: sample.catField,
    seriesFields: sample.seriesFields,
    rows: sample.rows,
  },
  {
    width: 840,
    height: 460,
    padding: { top: 90, right: 16, bottom: 90, left: 52 },
  },
);

describe("the shipped grouped bar is conformant (global ++ grouped)", () => {
  it("passes with zero violations (3 series, baseline 0, CVD-safe)", () => {
    const v = checkGroupedBarConformance(
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
    const v = checkGroupedBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: [10, 220],
        seriesCount: 3,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("must include 0"))).toBe(true);
  });

  it("flags > 3 series", () => {
    const v = checkGroupedBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        seriesCount: 5,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 3"))).toBe(true);
  });

  it("flags an off-palette series colour", () => {
    const v = checkGroupedBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        seriesCount: 3,
        seriesColors: [...colors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
