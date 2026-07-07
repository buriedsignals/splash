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

  // The ramp (DIVERGING_STACKED_COLORS) only has 2 hues per side, so it is
  // collision-free only up to 5 responses (2 negative + neutral + 2 positive).
  // A 6-point forced-choice Likert (no neutral, 3/3 split) or a 7-point scale
  // (3 + neutral + 3) overloads a side and two response levels silently share
  // a hue — a real render defect the OLD `> 7` cap let through for 6. This
  // proves the tightened cap now catches 6, where the old one would not have.
  it("rejects a 6-point scale (ramp only has 2 hues/side — the old > 7 cap missed this)", () => {
    const v = checkDivergingStackedConformance(
      {
        title: sample.title,
        source: sample.source,
        responseCount: 6,
        rows: [[10, 10, 20, 20, 20, 20]],
        sentimentColors: sentiment,
      },
      text,
    );
    expect(v.some((m) => m.includes("at most 5 response levels"))).toBe(true);
    // sanity: the old threshold (> 7) would NOT have flagged 6 responses.
    expect(6 > 7).toBe(false);
  });

  it("rejects a 7-point scale", () => {
    const v = checkDivergingStackedConformance(
      {
        title: sample.title,
        source: sample.source,
        responseCount: 7,
        rows: [[5, 10, 10, 20, 20, 15, 20]],
        sentimentColors: sentiment,
      },
      text,
    );
    expect(v.some((m) => m.includes("at most 5 response levels"))).toBe(true);
  });

  it("still accepts a 5-point scale (the ramp's real capacity)", () => {
    const v = checkDivergingStackedConformance(
      {
        title: sample.title,
        source: sample.source,
        responseCount: 5,
        rows,
        sentimentColors: sentiment,
      },
      text,
    );
    expect(v.some((m) => m.includes("at most 5 response levels"))).toBe(false);
  });
});
