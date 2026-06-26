import { describe, it, expect } from "bun:test";
import {
  computeDivergingLayout,
  growDivBar,
  type DivergingData,
} from "../src/diverging-bar-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 20, bottom: 20, left: 120 },
};

const data: DivergingData = {
  catField: "sector",
  valField: "change",
  rows: [
    { sector: "Retail", change: -9 },
    { sector: "Tech", change: 18 },
    { sector: "Health", change: 12 },
  ],
};

describe("computeDivergingLayout", () => {
  it("produces one bar per row, sorted desc by value", () => {
    const l = computeDivergingLayout(data, dims);
    expect(l.bars.map((b) => b.rawCat)).toEqual(["Tech", "Health", "Retail"]);
  });

  it("tags the sign of each value", () => {
    const l = computeDivergingLayout(data, dims);
    expect(l.bars.find((b) => b.rawCat === "Tech")!.sign).toBe(1);
    expect(l.bars.find((b) => b.rawCat === "Retail")!.sign).toBe(-1);
  });

  it("value domain includes 0 (baseline rule)", () => {
    const l = computeDivergingLayout(data, dims);
    expect(l.valueDomain[0]).toBeLessThan(0);
    expect(l.valueDomain[1]).toBeGreaterThan(0);
  });

  it("positive bars sit right of the zero line, negative left", () => {
    const l = computeDivergingLayout(data, dims);
    const tech = l.bars.find((b) => b.rawCat === "Tech")!;
    const retail = l.bars.find((b) => b.rawCat === "Retail")!;
    expect(tech.xTip).toBeGreaterThan(l.zeroX);
    expect(retail.xTip).toBeLessThan(l.zeroX);
  });

  it("insets the range so bars leave room for the outer labels", () => {
    const l = computeDivergingLayout(data, dims, "desc", 30);
    const tips = l.bars.map((b) => b.xTip);
    expect(Math.min(...tips)).toBeGreaterThanOrEqual(30 - 0.01);
    expect(Math.max(...tips)).toBeLessThanOrEqual(l.innerWidth - 30 + 0.01);
  });

  it("throws on a non-numeric value", () => {
    const bad: DivergingData = {
      catField: "sector",
      valField: "change",
      rows: [{ sector: "X", change: "n/a" }],
    };
    expect(() => computeDivergingLayout(bad, dims)).toThrow(
      /invalid diverging/,
    );
  });
});

describe("growDivBar — grows from the zero line outward", () => {
  it("is empty at progress 0 and full at progress 1", () => {
    const l = computeDivergingLayout(data, dims);
    const tech = l.bars.find((b) => b.rawCat === "Tech")!;
    expect(growDivBar(tech, 0).w).toBeCloseTo(0, 5);
    expect(growDivBar(tech, 1).w).toBeCloseTo(tech.w, 5);
  });

  it("a negative bar's growing edge stays anchored at the zero line", () => {
    const l = computeDivergingLayout(data, dims);
    const retail = l.bars.find((b) => b.rawCat === "Retail")!;
    const g = growDivBar(retail, 0.5);
    expect(g.x + g.w).toBeCloseTo(retail.xZero, 5); // right edge = zero line
  });
});
