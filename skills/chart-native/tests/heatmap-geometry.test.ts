import { describe, it, expect } from "bun:test";
import {
  computeHeatmapLayout,
  sampleRamp,
  type HeatmapData,
} from "../src/heatmap-geometry";
import { relativeLuminance } from "../src/core/conformance";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 20, bottom: 60, left: 60 },
};

const data: HeatmapData = {
  rowField: "day",
  colFields: ["am", "pm"],
  rows: [
    { day: "Mon", am: 2, pm: 10 },
    { day: "Tue", am: 4, pm: 20 },
  ],
};

describe("computeHeatmapLayout", () => {
  it("produces one cell per row × column", () => {
    const l = computeHeatmapLayout(data, dims);
    expect(l.cells).toHaveLength(4);
    expect(l.rowLabels).toEqual(["Mon", "Tue"]);
    expect(l.colLabels).toEqual(["am", "pm"]);
  });

  it("tiles the grid without gaps (cell sizes sum to the inner box)", () => {
    const l = computeHeatmapLayout(data, dims);
    expect(l.cellW * 2).toBeCloseTo(l.innerWidth, 5);
    expect(l.cellH * 2).toBeCloseTo(l.innerHeight, 5);
  });

  it("maps the value range to the colour domain", () => {
    const l = computeHeatmapLayout(data, dims);
    expect(l.valueDomain).toEqual([2, 20]);
  });

  it("gives the highest value the darkest colour (lowest luminance)", () => {
    const l = computeHeatmapLayout(data, dims);
    const lowCell = l.cells.find((c) => c.value === 2)!;
    const highCell = l.cells.find((c) => c.value === 20)!;
    expect(relativeLuminance(highCell.color)).toBeLessThan(
      relativeLuminance(lowCell.color),
    );
  });

  it("throws on a non-numeric value", () => {
    const bad: HeatmapData = {
      rowField: "day",
      colFields: ["am"],
      rows: [{ day: "Mon", am: "n/a" }],
    };
    expect(() => computeHeatmapLayout(bad, dims)).toThrow(/invalid heatmap/);
  });
});

describe("sampleRamp", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    const stops = ["#deebf7", "#08306b"];
    expect(sampleRamp(stops, 0).toLowerCase()).toBe("#deebf7");
    expect(sampleRamp(stops, 1).toLowerCase()).toBe("#08306b");
  });

  it("the ramp luminance is monotonically decreasing (CVD-safe sequential)", () => {
    const l = computeHeatmapLayout(data, dims);
    const lums = l.rampStops.map(relativeLuminance);
    for (let i = 1; i < lums.length; i++)
      expect(lums[i]).toBeLessThan(lums[i - 1]);
  });
});
