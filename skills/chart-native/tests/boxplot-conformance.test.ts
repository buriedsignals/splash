import { describe, it, expect } from "bun:test";
import { checkBoxplotConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/boxplot.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };

describe("the shipped box plot is conformant (global ++ boxplot)", () => {
  it("passes with zero violations (labelled axis, one Okabe-Ito hue)", () => {
    const v = checkBoxplotConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.valueLabel,
        categoryCount: sample.categories.length,
        boxColors: [OKABE_ITO.blue],
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing value-axis label", () => {
    const v = checkBoxplotConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: "",
        categoryCount: 4,
        boxColors: [OKABE_ITO.blue],
      },
      text,
    );
    expect(v.some((m) => m.includes("value-axis label"))).toBe(true);
  });

  it("flags an off-palette box colour", () => {
    const v = checkBoxplotConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.valueLabel,
        categoryCount: 4,
        boxColors: ["#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags more than 2 box hues", () => {
    const v = checkBoxplotConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.valueLabel,
        categoryCount: 4,
        boxColors: [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green],
      },
      text,
    );
    expect(v.some((m) => m.includes("> 2"))).toBe(true);
  });
});
