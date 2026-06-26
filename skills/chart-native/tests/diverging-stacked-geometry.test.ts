import { describe, it, expect } from "bun:test";
import {
  computeDivergingStackedLayout,
  growSegment,
  type DivergingStackedData,
} from "../src/diverging-stacked-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 40, right: 40, bottom: 40, left: 140 },
};

const data: DivergingStackedData = {
  responses: [
    "Strongly disagree",
    "Disagree",
    "Neutral",
    "Agree",
    "Strongly agree",
  ],
  neutralIndex: 2,
  items: [
    { label: "Q1", values: [10, 20, 30, 25, 15] },
    { label: "Q2", values: [5, 10, 20, 40, 25] },
  ],
};

describe("computeDivergingStackedLayout", () => {
  it("straddles the neutral response across the centre (half each side)", () => {
    const l = computeDivergingStackedLayout(data, dims);
    const n = l.rows[0].segments.find((s) => s.side === "neutral")!;
    expect(n.pctLo).toBeCloseTo(-15, 5); // 30/2
    expect(n.pctHi).toBeCloseTo(15, 5);
  });

  it("stacks negatives left (negative edges) and positives right", () => {
    const l = computeDivergingStackedLayout(data, dims);
    const disagree = l.rows[0].segments.find((s) => s.responseIndex === 1)!;
    const agree = l.rows[0].segments.find((s) => s.responseIndex === 3)!;
    expect(disagree.side).toBe("left");
    expect(disagree.pctHi).toBeCloseTo(-15, 5); // from the neutral's left edge
    expect(disagree.pctLo).toBeCloseTo(-35, 5);
    expect(agree.side).toBe("right");
    expect(agree.pctLo).toBeCloseTo(15, 5);
    expect(agree.pctHi).toBeCloseTo(40, 5);
  });

  it("maps the centre (0%) to the middle of the plot", () => {
    const l = computeDivergingStackedLayout(data, dims);
    expect(l.centerX).toBeCloseTo(l.innerWidth / 2, 5);
  });

  it("throws when an item's value count mismatches the responses", () => {
    expect(() =>
      computeDivergingStackedLayout(
        { responses: ["a", "b", "c"], items: [{ label: "x", values: [1, 2] }] },
        dims,
      ),
    ).toThrow(/expected 3/);
  });
});

describe("growSegment — grows from the centre", () => {
  it("collapses to the centre at progress 0 and is full at progress 1", () => {
    const l = computeDivergingStackedLayout(data, dims);
    const seg = l.rows[0].segments.find((s) => s.responseIndex === 3)!;
    const g0 = growSegment(seg, l.centerX, 0);
    expect(g0.x0).toBeCloseTo(l.centerX, 5);
    expect(g0.x1).toBeCloseTo(l.centerX, 5);
    const g1 = growSegment(seg, l.centerX, 1);
    expect(g1.x0).toBeCloseTo(seg.x0, 5);
    expect(g1.x1).toBeCloseTo(seg.x1, 5);
  });
});
