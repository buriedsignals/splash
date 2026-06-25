import { describe, it, expect } from "bun:test";
import { checkDumbbellConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/dumbbell.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const dots = [OKABE_ITO.orange, OKABE_ITO.blue];

describe("the shipped dumbbell is conformant (global ++ dumbbell)", () => {
  it("passes with zero violations (2 labelled series, CVD-safe dots)", () => {
    const v = checkDumbbellConformance(
      {
        title: sample.title,
        source: sample.source,
        leftLabel: sample.leftLabel,
        rightLabel: sample.rightLabel,
        dotColors: dots,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing series label", () => {
    const v = checkDumbbellConformance(
      {
        title: sample.title,
        source: sample.source,
        leftLabel: "",
        rightLabel: sample.rightLabel,
        dotColors: dots,
      },
      text,
    );
    expect(v.some((m) => m.includes("left series label"))).toBe(true);
  });

  it("flags an off-palette dot colour", () => {
    const v = checkDumbbellConformance(
      {
        title: sample.title,
        source: sample.source,
        leftLabel: sample.leftLabel,
        rightLabel: sample.rightLabel,
        dotColors: [OKABE_ITO.orange, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags more than two dot colours", () => {
    const v = checkDumbbellConformance(
      {
        title: sample.title,
        source: sample.source,
        leftLabel: sample.leftLabel,
        rightLabel: sample.rightLabel,
        dotColors: [OKABE_ITO.orange, OKABE_ITO.blue, OKABE_ITO.green],
      },
      text,
    );
    expect(v.some((m) => m.includes("> 2"))).toBe(true);
  });
});
