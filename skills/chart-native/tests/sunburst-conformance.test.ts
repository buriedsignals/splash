import { describe, it, expect } from "bun:test";
import { checkSunburstConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/sunburst.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];
const leafValues = sample.root.children.flatMap((b) =>
  b.children.map((c) => c.value),
);

describe("the shipped sunburst is conformant (global ++ sunburst)", () => {
  it("passes with zero violations (positive leaves, 3 CVD-safe branches)", () => {
    const v = checkSunburstConformance(
      {
        title: sample.title,
        source: sample.source,
        leafValues,
        branchCount: sample.root.children.length,
        branchColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a non-positive leaf value", () => {
    const v = checkSunburstConformance(
      {
        title: sample.title,
        source: sample.source,
        leafValues: [...leafValues, 0],
        branchCount: 3,
        branchColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("must all be > 0"))).toBe(true);
  });

  it("flags more than 7 branches", () => {
    const v = checkSunburstConformance(
      {
        title: sample.title,
        source: sample.source,
        leafValues,
        branchCount: 9,
        branchColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 7"))).toBe(true);
  });

  it("flags an off-palette branch colour", () => {
    const v = checkSunburstConformance(
      {
        title: sample.title,
        source: sample.source,
        leafValues,
        branchCount: 3,
        branchColors: [...colors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
