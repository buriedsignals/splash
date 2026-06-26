import { describe, it, expect } from "bun:test";
import { checkDivergingStackedConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/diverging-stacked.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
// the non-neutral sentiment colours (warm negative → cool positive)
const sentiment = [
  OKABE_ITO.vermillion,
  OKABE_ITO.orange,
  OKABE_ITO.skyblue,
  OKABE_ITO.blue,
];
const rows = sample.items.map((i) => i.values);

describe("the shipped diverging stacked bar is conformant (global ++ likert)", () => {
  it("passes with zero violations (5 responses, rows compose to 100%, CVD-safe)", () => {
    const v = checkDivergingStackedConformance(
      {
        title: sample.title,
        source: sample.source,
        responseCount: sample.responses.length,
        rows,
        sentimentColors: sentiment,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a row that does not sum to ~100%", () => {
    const v = checkDivergingStackedConformance(
      {
        title: sample.title,
        source: sample.source,
        responseCount: 5,
        rows: [[10, 10, 10, 10, 10]], // sums to 50
        sentimentColors: sentiment,
      },
      text,
    );
    expect(v.some((m) => m.includes("compose to ~100%"))).toBe(true);
  });

  it("flags an off-palette sentiment colour", () => {
    const v = checkDivergingStackedConformance(
      {
        title: sample.title,
        source: sample.source,
        responseCount: 5,
        rows,
        sentimentColors: [...sentiment, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
