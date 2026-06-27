import { describe, it, expect } from "bun:test";
import { checkComboConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/combo.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const base = {
  title: sample.title,
  source: sample.source,
  columnColor: OKABE_ITO.blue,
  lineColor: OKABE_ITO.orange,
  columnAxisIncludesZero: true,
  leftAxisLabel: sample.leftAxisLabel,
  rightAxisLabel: sample.rightAxisLabel,
};

describe("the shipped combo is conformant (global ++ combo)", () => {
  it("passes with zero violations (0-baseline columns, 2 labelled axes)", () => {
    expect(checkComboConformance(base, text)).toEqual([]);
  });

  it("flags a column axis that does not include 0", () => {
    const v = checkComboConformance(
      { ...base, columnAxisIncludesZero: false },
      text,
    );
    expect(v.some((m) => m.includes("must include 0"))).toBe(true);
  });

  it("flags a missing right-axis label (dual-axis ambiguity)", () => {
    const v = checkComboConformance({ ...base, rightAxisLabel: "" }, text);
    expect(v.some((m) => m.includes("right-axis label"))).toBe(true);
  });

  it("flags an off-palette line colour", () => {
    const v = checkComboConformance({ ...base, lineColor: "#123456" }, text);
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags two series sharing one colour", () => {
    const v = checkComboConformance(
      { ...base, lineColor: OKABE_ITO.blue },
      text,
    );
    expect(v.some((m) => m.includes("distinct colours"))).toBe(true);
  });
});
