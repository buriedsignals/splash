import { describe, it, expect } from "bun:test";
import { checkTreemapConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/treemap.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const groupColors = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];
const values = sample.items.map((i) => i.value);

describe("the shipped treemap is conformant (global ++ treemap)", () => {
  it("passes with zero violations (positive values, 3 CVD-safe groups)", () => {
    const v = checkTreemapConformance(
      { title: sample.title, source: sample.source, values, groupColors },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a non-positive value", () => {
    const v = checkTreemapConformance(
      {
        title: sample.title,
        source: sample.source,
        values: [...values, -5],
        groupColors,
      },
      text,
    );
    expect(v.some((m) => m.includes("must all be > 0"))).toBe(true);
  });

  it("flags more than 5 group colours", () => {
    const v = checkTreemapConformance(
      {
        title: sample.title,
        source: sample.source,
        values,
        groupColors: [
          OKABE_ITO.blue,
          OKABE_ITO.orange,
          OKABE_ITO.green,
          OKABE_ITO.purple,
          OKABE_ITO.vermillion,
          OKABE_ITO.skyblue,
        ],
      },
      text,
    );
    expect(v.some((m) => m.includes("> 5"))).toBe(true);
  });

  it("flags an off-palette group colour", () => {
    const v = checkTreemapConformance(
      {
        title: sample.title,
        source: sample.source,
        values,
        groupColors: [...groupColors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
