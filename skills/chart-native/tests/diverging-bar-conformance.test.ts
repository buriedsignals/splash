import { describe, it, expect } from "bun:test";
import { checkDivergingBarConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import { computeDivergingLayout } from "../src/diverging-bar-geometry";
import sample from "../assets/sample-data/diverging-bar.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.vermillion];
const layout = computeDivergingLayout(
  { catField: sample.catField, valField: sample.valField, rows: sample.rows },
  {
    width: 840,
    height: 480,
    padding: { top: 90, right: 18, bottom: 28, left: 124 },
  },
);

describe("the shipped diverging bar is conformant (global ++ diverging)", () => {
  it("passes with zero violations (spans zero, 2 CVD-safe sign colours)", () => {
    const v = checkDivergingBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        signColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a domain that does not span zero", () => {
    const v = checkDivergingBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: [2, 20], // all positive
        signColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("must span zero"))).toBe(true);
  });

  it("flags an off-palette sign colour", () => {
    const v = checkDivergingBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        signColors: [OKABE_ITO.blue, "#FF0000"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags more than two sign colours", () => {
    const v = checkDivergingBarConformance(
      {
        title: sample.title,
        source: sample.source,
        valueDomain: layout.valueDomain,
        signColors: [OKABE_ITO.blue, OKABE_ITO.vermillion, OKABE_ITO.green],
      },
      text,
    );
    expect(v.some((m) => m.includes("> 2"))).toBe(true);
  });
});
