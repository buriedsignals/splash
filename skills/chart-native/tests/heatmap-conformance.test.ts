import { describe, it, expect } from "bun:test";
import { checkHeatmapConformance } from "../src/core/conformance";
import { computeHeatmapLayout } from "../src/heatmap-geometry";
import { COLORS_DARK, heatmapRamp } from "../src/core/tokens";
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

  it("REJECTS a dark-ground ramp whose low stop vanishes into the ground (< 3:1)", () => {
    // a monotonic-increasing ramp whose darkest (low-value) stop sits below the 3:1 non-text floor
    // on #18181B — the pre-fix hueRamp regression the guard now catches (feedback→système).
    const v = checkHeatmapConformance(
      {
        title: sample.title,
        source: sample.source,
        rampStops: ["#1f2f3a", "#2f7ebe", "#8fc0e8"], // darkest #1f2f3a ≈ 1.5:1 on #18181B
        valueDomain: layout.valueDomain,
      },
      { text: [COLORS_DARK.ink, COLORS_DARK.muted], bg: COLORS_DARK.bg },
    );
    expect(v.some((m) => m.includes("vanish"))).toBe(true);
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
      { themeBg: COLORS_DARK.bg },
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

  it("flags a non-uniform (kinked) ramp", () => {
    const violations = checkHeatmapConformance(
      {
        title: "Heatmap ramp uniformity test", // >= 12 chars — clear of the unrelated title-length rule
        source: { name: "Src" },
        rampStops: ["#f2f2f2", "#ededed", "#e8e8e8", "#111111"], // even-ish then a cliff = kink
        valueDomain: [0, 10],
      },
      { text: ["#18181b"], bg: "#ffffff" },
    );
    expect(violations.some((r) => /step|kink|span/i.test(r))).toBe(true);
  });

  it("passes the derived OKLCH ramp (uniform)", () => {
    const violations = checkHeatmapConformance(
      {
        title: "Heatmap ramp uniformity test", // >= 12 chars — clear of the unrelated title-length rule
        source: { name: "Src" },
        rampStops: heatmapRamp("#0072B2", "#ffffff"),
        valueDomain: [0, 10],
      },
      { text: ["#18181b"], bg: "#ffffff" },
    );
    expect(violations).toEqual([]);
  });
});
