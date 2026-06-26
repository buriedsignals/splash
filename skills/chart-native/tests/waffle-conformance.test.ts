import { describe, it, expect } from "bun:test";
import { checkWaffleConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/waffle.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
];

describe("the shipped waffle is conformant (global ++ waffle)", () => {
  it("passes with zero violations (5 categories, unit stated, CVD-safe)", () => {
    const v = checkWaffleConformance(
      {
        title: sample.title,
        source: sample.source,
        unit: sample.unit,
        categoryCount: sample.items.length,
        categoryColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags more than 6 categories", () => {
    const v = checkWaffleConformance(
      {
        title: sample.title,
        source: sample.source,
        unit: sample.unit,
        categoryCount: 8,
        categoryColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 6"))).toBe(true);
  });

  it("flags a missing unit", () => {
    const v = checkWaffleConformance(
      {
        title: sample.title,
        source: sample.source,
        unit: "",
        categoryCount: 5,
        categoryColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("one square represents"))).toBe(true);
  });

  it("flags an off-palette colour", () => {
    const v = checkWaffleConformance(
      {
        title: sample.title,
        source: sample.source,
        unit: sample.unit,
        categoryCount: 5,
        categoryColors: [...colors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
