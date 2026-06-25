import { describe, it, expect } from "bun:test";
import { checkStackedAreaConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import { computeStackedAreaLayout } from "../src/stacked-area-geometry";
import sample from "../assets/sample-data/stacked-area.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [
  OKABE_ITO.skyblue,
  OKABE_ITO.orange,
  OKABE_ITO.blue,
  OKABE_ITO.green,
];
const layout = computeStackedAreaLayout(
  {
    xField: sample.xField,
    seriesFields: sample.seriesFields,
    rows: sample.rows,
  },
  {
    width: 840,
    height: 480,
    padding: { top: 90, right: 116, bottom: 40, left: 44 },
  },
);

describe("the shipped stacked area is conformant (global ++ stacked-area)", () => {
  it("passes with zero violations (4 bands, baseline 0, CVD-safe)", () => {
    const v = checkStackedAreaConformance(
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
    const v = checkStackedAreaConformance(
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

  it("flags an off-palette band colour", () => {
    const v = checkStackedAreaConformance(
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
