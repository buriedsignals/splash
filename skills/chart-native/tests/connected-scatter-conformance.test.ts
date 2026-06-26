import { describe, it, expect } from "bun:test";
// A connected scatter is a scatter variant (position encoding, both axes titled),
// so it REUSES the scatter guard rather than introducing a near-identical one.
import { checkScatterConformance } from "../src/core/conformance";
import { COLORS } from "../src/core/tokens";
import sample from "../assets/sample-data/connected-scatter.json";

const colors = {
  data: COLORS.line,
  text: ["#1A1A1A", "#6B6B6B"],
  bg: "#FFFFFF",
};

describe("the shipped connected scatter is conformant (reuses the scatter guard)", () => {
  it("passes with zero violations (both axes titled, Okabe-Ito)", () => {
    const v = checkScatterConformance(
      {
        title: sample.title,
        source: sample.source,
        xLabel: sample.xLabel,
        yLabel: sample.yLabel,
      },
      colors,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing axis title (the reader must know what x/y mean)", () => {
    const v = checkScatterConformance(
      {
        title: sample.title,
        source: sample.source,
        xLabel: "",
        yLabel: sample.yLabel,
      },
      colors,
    );
    expect(v.some((m) => m.includes("x-axis label"))).toBe(true);
  });

  it("flags an off-palette data colour", () => {
    const v = checkScatterConformance(
      {
        title: sample.title,
        source: sample.source,
        xLabel: sample.xLabel,
        yLabel: sample.yLabel,
      },
      { data: "#123456", text: ["#1A1A1A"], bg: "#FFFFFF" },
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
