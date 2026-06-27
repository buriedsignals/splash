import { describe, it, expect } from "bun:test";
import { checkRadialBarConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/radial-bar.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };

describe("the shipped radial bar is conformant (global ++ radial-bar)", () => {
  it("passes with zero violations (0 baseline, CVD-safe colour, tick rings)", () => {
    const v = checkRadialBarConformance(
      {
        title: sample.title,
        source: sample.source,
        dataColor: OKABE_ITO.blue,
        radialBaseline: 0,
        tickCount: 3,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a non-zero radial baseline (length encoding lies)", () => {
    const v = checkRadialBarConformance(
      {
        title: sample.title,
        source: sample.source,
        dataColor: OKABE_ITO.blue,
        radialBaseline: 50,
        tickCount: 3,
      },
      text,
    );
    expect(v.some((m) => m.includes("not 0"))).toBe(true);
  });

  it("flags an off-palette data colour", () => {
    const v = checkRadialBarConformance(
      {
        title: sample.title,
        source: sample.source,
        dataColor: "#123456",
        radialBaseline: 0,
        tickCount: 3,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags a missing value axis", () => {
    const v = checkRadialBarConformance(
      {
        title: sample.title,
        source: sample.source,
        dataColor: OKABE_ITO.blue,
        radialBaseline: 0,
        tickCount: 0,
      },
      text,
    );
    expect(v.some((m) => m.includes("value axis"))).toBe(true);
  });
});
