import { describe, it, expect } from "bun:test";
import { checkRadarConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/radar.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.orange];

describe("the shipped radar is conformant (global ++ radar)", () => {
  it("passes with zero violations (6 axes, 2 series, max 10, CVD-safe)", () => {
    const v = checkRadarConformance(
      {
        title: sample.title,
        source: sample.source,
        max: sample.max,
        axisCount: sample.axes.length,
        seriesCount: sample.series.length,
        seriesColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags fewer than 3 axes", () => {
    const v = checkRadarConformance(
      {
        title: sample.title,
        source: sample.source,
        max: sample.max,
        axisCount: 2,
        seriesCount: 2,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("< 3"))).toBe(true);
  });

  it("flags more than 3 series", () => {
    const v = checkRadarConformance(
      {
        title: sample.title,
        source: sample.source,
        max: sample.max,
        axisCount: 6,
        seriesCount: 4,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 3"))).toBe(true);
  });

  it("flags a non-positive common max", () => {
    const v = checkRadarConformance(
      {
        title: sample.title,
        source: sample.source,
        max: 0,
        axisCount: 6,
        seriesCount: 2,
        seriesColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("max > 0"))).toBe(true);
  });

  it("flags an off-palette series colour", () => {
    const v = checkRadarConformance(
      {
        title: sample.title,
        source: sample.source,
        max: sample.max,
        axisCount: 6,
        seriesCount: 2,
        seriesColors: [...colors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
