import { describe, it, expect } from "bun:test";
import { checkBarConformance } from "../src/conformance";
import {
  computeBarLayout,
  type BarData,
  type BarDims,
} from "../src/bar-geometry";
import { COLORS } from "../src/tokens";
import sample from "../assets/sample-data/bars.json";

const colors = {
  data: COLORS.line,
  text: [COLORS.ink, COLORS.muted, COLORS.line],
  bg: COLORS.bg,
};
const data: BarData = {
  catField: sample.catField,
  valField: sample.valField,
  rows: sample.rows,
};
const dims: BarDims = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 64, bottom: 40, left: 124 },
};

describe("the shipped bar chart is conformant (global ++ bar)", () => {
  const layout = computeBarLayout(data, dims, {
    orientation: sample.orientation as "horizontal",
    sort: sample.sort as "desc",
  });

  it("passes every conformance rule with zero violations", () => {
    const v = checkBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
      },
      colors,
    );
    expect(v).toEqual([]);
  });

  it("flags a truncated baseline (value axis not including 0)", () => {
    const v = checkBarConformance(
      { title: sample.title, source: sample.source, valueDomain: [80, 100] },
      colors,
    );
    expect(v.some((m) => m.includes("must include 0"))).toBe(true);
  });

  it("inherits the global rules (catches a year-range title + off-palette colour)", () => {
    const v = checkBarConformance(
      {
        title: "2019-2024",
        source: { name: "X", url: "" },
        valueDomain: [0, 100],
      },
      { ...colors, data: "#1f77b4" },
    );
    expect(v.length).toBeGreaterThanOrEqual(3);
  });
});
