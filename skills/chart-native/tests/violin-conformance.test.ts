import { describe, it, expect } from "bun:test";
import { checkViolinConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/violin.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const counts = sample.categories.map((c) => c.values.length);

describe("the shipped violin is conformant (global ++ violin)", () => {
  it("passes with zero violations (one CVD-safe fill + a median marker)", () => {
    const v = checkViolinConformance(
      {
        title: sample.title,
        source: sample.source,
        fillColor: OKABE_ITO.blue,
        hasMedianMarker: true,
        categoryCounts: counts,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing median marker", () => {
    const v = checkViolinConformance(
      {
        title: sample.title,
        source: sample.source,
        fillColor: OKABE_ITO.blue,
        hasMedianMarker: false,
        categoryCounts: counts,
      },
      text,
    );
    expect(v.some((m) => m.includes("median marker"))).toBe(true);
  });

  it("flags an off-palette fill colour", () => {
    const v = checkViolinConformance(
      {
        title: sample.title,
        source: sample.source,
        fillColor: "#123456",
        hasMedianMarker: true,
        categoryCounts: counts,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags a category with fewer than 2 observations", () => {
    const v = checkViolinConformance(
      {
        title: sample.title,
        source: sample.source,
        fillColor: OKABE_ITO.blue,
        hasMedianMarker: true,
        categoryCounts: [20, 1, 16],
      },
      text,
    );
    expect(v.some((m) => m.includes("fewer than 2"))).toBe(true);
  });
});
