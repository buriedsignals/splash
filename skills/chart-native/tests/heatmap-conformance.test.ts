import { describe, it, expect } from "bun:test";
import { checkHeatmapConformance } from "../src/core/conformance";
import { computeHeatmapLayout } from "../src/heatmap-geometry";
import { COLORS_DARK } from "../src/core/tokens";
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

  it("ACCEPTS the dark ramp (monotonic-INCREASING luminance) on the dark furniture", () => {
    // the dark-theme ramp inverts the luminance direction; the guard must not mistake a
    // strictly-increasing sequential ramp for a non-monotonic one.
    const dark = computeHeatmapLayout(
      {
        rowField: sample.rowField,
        colFields: sample.colFields,
        rows: sample.rows,
      },
      {
        width: 840,
        height: 480,
        padding: { top: 90, right: 16, bottom: 76, left: 52 },
      },
      true,
    );
    const v = checkHeatmapConformance(
      {
        title: sample.title,
        source: sample.source,
        rampStops: dark.rampStops,
        valueDomain: dark.valueDomain,
      },
      {
        text: [COLORS_DARK.ink, COLORS_DARK.muted],
        bg: COLORS_DARK.bg,
      },
    );
    expect(v).toEqual([]);
  });
});
