import { describe, it, expect } from "bun:test";
import { checkDotStripConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/dot-strip.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };

// observations per category, derived from the shipped sample
const counts = Object.values(
  sample.rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.school] = (acc[r.school] ?? 0) + 1;
    return acc;
  }, {}),
);

describe("the shipped dot strip is conformant (global ++ dot-strip)", () => {
  it("passes with zero violations (one CVD-safe dot colour + a mean marker)", () => {
    const v = checkDotStripConformance(
      {
        title: sample.title,
        source: sample.source,
        dotColor: OKABE_ITO.blue,
        hasSummaryMarker: true,
        categoryCounts: counts,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing summary marker", () => {
    const v = checkDotStripConformance(
      {
        title: sample.title,
        source: sample.source,
        dotColor: OKABE_ITO.blue,
        hasSummaryMarker: false,
        categoryCounts: counts,
      },
      text,
    );
    expect(v.some((m) => m.includes("summary marker"))).toBe(true);
  });

  it("flags an off-palette dot colour", () => {
    const v = checkDotStripConformance(
      {
        title: sample.title,
        source: sample.source,
        dotColor: "#123456",
        hasSummaryMarker: true,
        categoryCounts: counts,
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags an empty category strip", () => {
    const v = checkDotStripConformance(
      {
        title: sample.title,
        source: sample.source,
        dotColor: OKABE_ITO.blue,
        hasSummaryMarker: true,
        categoryCounts: [7, 0, 6],
      },
      text,
    );
    expect(v.some((m) => m.includes("empty strip"))).toBe(true);
  });
});
