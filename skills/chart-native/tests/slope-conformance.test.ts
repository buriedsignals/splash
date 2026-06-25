import { describe, it, expect } from "bun:test";
import { checkSlopeConformance } from "../src/core/conformance";
import { COLORS, OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/slope.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const lineColors = [COLORS.muted, OKABE_ITO.vermillion]; // neutral context + accent

describe("the shipped slope is conformant (global ++ slope)", () => {
  it("passes with zero violations (2 periods, accent in palette, ≤2 colours)", () => {
    const v = checkSlopeConformance(
      {
        title: sample.title,
        source: sample.source,
        leftPeriod: sample.leftPeriod,
        rightPeriod: sample.rightPeriod,
        accentColor: OKABE_ITO.vermillion,
        lineColors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing period caption", () => {
    const v = checkSlopeConformance(
      {
        title: sample.title,
        source: sample.source,
        leftPeriod: "",
        rightPeriod: sample.rightPeriod,
        accentColor: OKABE_ITO.vermillion,
        lineColors,
      },
      text,
    );
    expect(v.some((m) => m.includes("left period"))).toBe(true);
  });

  it("flags an off-palette accent colour", () => {
    const v = checkSlopeConformance(
      {
        title: sample.title,
        source: sample.source,
        leftPeriod: sample.leftPeriod,
        rightPeriod: sample.rightPeriod,
        accentColor: "#FF0000",
        lineColors: [COLORS.muted, "#FF0000"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags more than two line colours", () => {
    const v = checkSlopeConformance(
      {
        title: sample.title,
        source: sample.source,
        leftPeriod: sample.leftPeriod,
        rightPeriod: sample.rightPeriod,
        accentColor: OKABE_ITO.vermillion,
        lineColors: [COLORS.muted, OKABE_ITO.vermillion, OKABE_ITO.green],
      },
      text,
    );
    expect(v.some((m) => m.includes("> 2"))).toBe(true);
  });
});
