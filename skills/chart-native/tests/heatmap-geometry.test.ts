import { describe, it, expect } from "bun:test";
import {
  computeHeatmapLayout,
  sampleRamp,
  BLUES,
  type HeatmapData,
} from "../src/heatmap-geometry";
import { relativeLuminance, contrastRatio } from "../src/core/conformance";
import {
  themeHeatmapRamp,
  HEATMAP_RAMP_LIGHT,
  HEATMAP_RAMP_DARK,
  COLORS_DARK,
} from "../src/core/tokens";

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

describe("themeHeatmapRamp — the theme-aware ramp resolver", () => {
  it("light branch is the shipped Blues ramp, byte-identical (back-compat)", () => {
    // the exact original literal, verbatim — proves the LIGHT theme never shifts.
    expect(themeHeatmapRamp(false)).toEqual([
      "#deebf7",
      "#c6dbef",
      "#9ecae1",
      "#6baed6",
      "#4292c6",
      "#2171b5",
      "#08306b",
    ]);
    expect(themeHeatmapRamp(undefined)).toEqual(HEATMAP_RAMP_LIGHT);
    expect(BLUES).toEqual(HEATMAP_RAMP_LIGHT); // calendar's re-export still the same
  });

  it("computeHeatmapLayout(dark) uses the dark ramp; default stays the light ramp", () => {
    expect(computeHeatmapLayout(data, dims, true).rampStops).toEqual(
      HEATMAP_RAMP_DARK,
    );
    // default (no flag) is byte-identical to the pre-dark behaviour
    expect(computeHeatmapLayout(data, dims).rampStops).toEqual(
      HEATMAP_RAMP_LIGHT,
    );
  });

  it("dark ramp luminance strictly INCREASES → high values read bright on dark", () => {
    const lums = themeHeatmapRamp(true).map(relativeLuminance);
    for (let i = 1; i < lums.length; i++)
      expect(lums[i]).toBeGreaterThan(lums[i - 1]);
  });

  it("dark: the highest value gets the BRIGHTEST cell (highest luminance)", () => {
    const l = computeHeatmapLayout(data, dims, true);
    const lowCell = l.cells.find((c) => c.value === 2)!;
    const highCell = l.cells.find((c) => c.value === 20)!;
    expect(relativeLuminance(highCell.color)).toBeGreaterThan(
      relativeLuminance(lowCell.color),
    );
  });

  it("every dark ramp stop clears ≥ 3:1 against the dark bg (#18181B)", () => {
    // the ship-blocker: on #18181B the light ramp's deep end is 1.39:1 (invisible);
    // every dark stop — the darkest included — must clear the 3:1 non-text floor.
    for (const stop of HEATMAP_RAMP_DARK)
      expect(contrastRatio(stop, COLORS_DARK.bg)).toBeGreaterThanOrEqual(3);
  });

  it("dark: interpolated ramp samples all clear ≥ 3:1 on the dark bg", () => {
    for (let t = 0; t <= 1.0001; t += 0.1)
      expect(
        contrastRatio(sampleRamp(HEATMAP_RAMP_DARK, t), COLORS_DARK.bg),
      ).toBeGreaterThanOrEqual(3);
  });
});
