import { describe, it, expect } from "bun:test";
import {
  computeHeatmapLayout,
  sampleRamp,
  BLUES,
  type HeatmapData,
} from "../src/heatmap-geometry";
import { relativeLuminance, contrastRatio } from "../src/core/conformance";
import {
  heatmapRamp,
  HEATMAP_RAMP_LIGHT,
  COLORS_DARK,
  OKABE_ITO,
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

describe("heatmapRamp — the baseColor-derived, theme-oriented ramp", () => {
  const DARK_BG = "#18181B";

  it("light default ramp: monotonically DECREASING luminance (pale→deep, CVD-safe)", () => {
    const lums = heatmapRamp().map(relativeLuminance);
    for (let i = 1; i < lums.length; i++)
      expect(lums[i]).toBeLessThan(lums[i - 1]);
  });

  it("BLUES re-export stays the ColorBrewer literal (calendar back-ref unchanged)", () => {
    // the heatmap ramp is now baseColor-DERIVED, but the calendar still binds BLUES
    // directly — so the fixed ColorBrewer literal is preserved for that back-ref.
    expect(BLUES).toEqual(HEATMAP_RAMP_LIGHT);
    expect(heatmapRamp()).not.toEqual(HEATMAP_RAMP_LIGHT); // derived, not the literal
  });

  it("derives the ramp FROM the baseColor (a green base → a green-dominant deep stop)", () => {
    const ramp = heatmapRamp(OKABE_ITO.green);
    const deep = ramp[ramp.length - 1];
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(deep.slice(i, i + 2), 16));
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it("computeHeatmapLayout(themeBg dark) uses the dark ramp; default stays the light ramp", () => {
    expect(
      computeHeatmapLayout(data, dims, { themeBg: DARK_BG }).rampStops,
    ).toEqual(heatmapRamp(undefined, DARK_BG));
    expect(computeHeatmapLayout(data, dims).rampStops).toEqual(heatmapRamp());
  });

  it("dark ramp luminance strictly INCREASES → high values read bright on dark", () => {
    const lums = heatmapRamp(undefined, DARK_BG).map(relativeLuminance);
    for (let i = 1; i < lums.length; i++)
      expect(lums[i]).toBeGreaterThan(lums[i - 1]);
  });

  it("dark: the highest value gets the BRIGHTEST cell (highest luminance)", () => {
    const l = computeHeatmapLayout(data, dims, { themeBg: DARK_BG });
    const lowCell = l.cells.find((c) => c.value === 2)!;
    const highCell = l.cells.find((c) => c.value === 20)!;
    expect(relativeLuminance(highCell.color)).toBeGreaterThan(
      relativeLuminance(lowCell.color),
    );
  });

  it("dark: EVERY stop clears the 3:1 non-text floor on #18181B (low cells never vanish)", () => {
    // the low-value end is a VISIBLE MID (a tint of the base), not the base darkened — so even the
    // lowest-value cells read against the near-black ground, the a11y guarantee the old hand-tuned
    // dark ramp held. Enforced for any base hue, not just the default blue.
    for (const base of [
      undefined,
      OKABE_ITO.green,
      OKABE_ITO.purple,
      OKABE_ITO.orange,
    ]) {
      const stops = heatmapRamp(base, DARK_BG);
      for (const stop of stops)
        expect(contrastRatio(stop, COLORS_DARK.bg)).toBeGreaterThanOrEqual(3);
    }
  });
});
