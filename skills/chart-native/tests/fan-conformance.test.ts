import { describe, it, expect } from "bun:test";
import { checkFanConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/fan.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const forecast = sample.rows
  .filter((r) => r.central != null)
  .map((r) => ({
    central: r.central,
    bands: {
      50: [r.lo50, r.hi50],
      80: [r.lo80, r.hi80],
      95: [r.lo95, r.hi95],
    },
  }));

describe("the shipped fan chart is conformant (global ++ fan)", () => {
  it("passes with zero violations (3 nested levels, labelled axis, one hue)", () => {
    const v = checkFanConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.unit,
        levels: sample.levels,
        forecast,
        hue: OKABE_ITO.blue,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a band that does not bracket the central estimate", () => {
    const v = checkFanConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.unit,
        levels: [50, 80, 95],
        forecast: [
          {
            central: 100,
            bands: { 50: [110, 120], 80: [105, 125], 95: [100, 130] },
          },
        ],
        hue: OKABE_ITO.blue,
      },
      text,
    );
    expect(v.some((m) => m.includes("bracket the central"))).toBe(true);
  });

  it("flags an outer band that does not contain the inner", () => {
    const v = checkFanConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.unit,
        levels: [50, 80, 95],
        forecast: [
          {
            central: 100,
            bands: { 50: [90, 110], 80: [95, 105], 95: [85, 115] },
          },
        ],
        hue: OKABE_ITO.blue,
      },
      text,
    );
    expect(v.some((m) => m.includes("does not contain"))).toBe(true);
  });
});
