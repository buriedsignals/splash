import { describe, it, expect } from "bun:test";
import { checkHeatmapConformance } from "../src/core/conformance";
import { computeHeatmapLayout } from "../src/heatmap-geometry";
import sample from "../assets/sample-data/heatmap.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const layout = computeHeatmapLayout(
  { rowField: sample.rowField, colFields: sample.colFields, rows: sample.rows },
  {
    width: 840,
    height: 480,
    padding: { top: 90, right: 16, bottom: 76, left: 52 },
  },
);

describe("the shipped heatmap is conformant (global ++ heatmap)", () => {
  it("passes with zero violations (sequential CVD-safe ramp)", () => {
    const v = checkHeatmapConformance(
      {
        title: sample.title,
        source: sample.source,
        rampStops: layout.rampStops,
        valueDomain: layout.valueDomain,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a non-monotonic (non-sequential) ramp", () => {
    const v = checkHeatmapConformance(
      {
        title: sample.title,
        source: sample.source,
        rampStops: ["#deebf7", "#08306b", "#9ecae1"], // luminance goes down then up
        valueDomain: layout.valueDomain,
      },
      text,
    );
    expect(v.some((m) => m.includes("not monotonic"))).toBe(true);
  });

  it("flags an empty value range", () => {
    const v = checkHeatmapConformance(
      {
        title: sample.title,
        source: sample.source,
        rampStops: layout.rampStops,
        valueDomain: [5, 5],
      },
      text,
    );
    expect(v.some((m) => m.includes("range is empty"))).toBe(true);
  });
});
