import { describe, it, expect } from "bun:test";
import { checkArcConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/arc.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
// one colour per distinct group, in order
const groupColors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];

describe("the shipped arc diagram is conformant (global ++ arc)", () => {
  it("passes with zero violations (CVD-safe group colours, weight→width)", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors,
        encodesWeightByWidth: true,
        danglingLinks: 0,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags an off-palette group colour", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors: [OKABE_ITO.blue, "#123456"],
        encodesWeightByWidth: true,
        danglingLinks: 0,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags more than 8 group colours", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors: Object.values(OKABE_ITO).concat(OKABE_ITO.blue),
        encodesWeightByWidth: true,
        danglingLinks: 0,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 8"))).toBe(true);
  });

  it("flags links that do not encode weight by width", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors,
        encodesWeightByWidth: false,
        danglingLinks: 0,
      },
      text,
    );
    expect(v.some((m) => m.includes("stroke width"))).toBe(true);
  });

  it("flags dangling links (missing node)", () => {
    const v = checkArcConformance(
      {
        title: sample.title,
        source: sample.source,
        groupColors,
        encodesWeightByWidth: true,
        danglingLinks: 2,
      },
      text,
    );
    expect(v.some((m) => m.includes("missing node"))).toBe(true);
  });
});
