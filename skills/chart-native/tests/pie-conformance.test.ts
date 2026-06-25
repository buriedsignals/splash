import { describe, it, expect } from "bun:test";
import { checkPieConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/pie.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green, OKABE_ITO.vermillion];

describe("the shipped pie is conformant (global ++ pie)", () => {
  it("passes with zero violations (4 slices, CVD-safe)", () => {
    const v = checkPieConformance(
      { title: sample.title, source: sample.source, sliceCount: sample.rows.length, sliceColors: colors },
      text,
    );
    expect(v).toEqual([]);
  });
  it("flags > 5 slices", () => {
    const v = checkPieConformance(
      { title: sample.title, source: sample.source, sliceCount: 7, sliceColors: colors },
      text,
    );
    expect(v.some((m) => m.includes("> 5"))).toBe(true);
  });
  it("flags an off-palette slice colour", () => {
    const v = checkPieConformance(
      { title: sample.title, source: sample.source, sliceCount: 4, sliceColors: [...colors, "#123456"] },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
