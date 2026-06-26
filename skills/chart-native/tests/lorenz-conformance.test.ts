import { describe, it, expect } from "bun:test";
import { checkLorenzConformance } from "../src/core/conformance";
import { giniOf } from "../src/lorenz-geometry";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/lorenz.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.vermillion, OKABE_ITO.blue];
const series = sample.series.map((s) => {
  const last = s.points[s.points.length - 1];
  return { endsX: last.x, endsY: last.y, gini: giniOf(s.points) };
});

describe("the shipped lorenz is conformant (global ++ lorenz)", () => {
  it("passes with zero violations (anchored curves, labelled axes, CVD-safe)", () => {
    const v = checkLorenzConformance(
      {
        title: sample.title,
        source: sample.source,
        xLabel: sample.xLabel,
        yLabel: sample.yLabel,
        series,
        seriesColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a curve that doesn't end at (1,1)", () => {
    const v = checkLorenzConformance(
      {
        title: sample.title,
        source: sample.source,
        xLabel: sample.xLabel,
        yLabel: sample.yLabel,
        series: [{ endsX: 1, endsY: 0.8, gini: 0.4 }],
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("end at (1,1)"))).toBe(true);
  });

  it("flags a missing axis label", () => {
    const v = checkLorenzConformance(
      {
        title: sample.title,
        source: sample.source,
        xLabel: "",
        yLabel: sample.yLabel,
        series,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("x-axis label"))).toBe(true);
  });

  it("flags an off-palette curve colour", () => {
    const v = checkLorenzConformance(
      {
        title: sample.title,
        source: sample.source,
        xLabel: sample.xLabel,
        yLabel: sample.yLabel,
        series,
        seriesColors: [...colors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
