import { describe, it, expect } from "bun:test";
import { computeComboLayout, type ComboData } from "../src/combo-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 30, right: 60, bottom: 50, left: 60 },
};

const data: ComboData = {
  categoryField: "month",
  columnField: "units",
  lineField: "margin",
  rows: [
    { month: "Jan", units: 200, margin: 24 },
    { month: "Feb", units: 320, margin: 21 },
    { month: "Mar", units: 480, margin: 18 }, // units up, margin down
    { month: "Apr", units: 560, margin: 15 },
  ],
};

describe("computeComboLayout", () => {
  it("produces one column and one line point per row", () => {
    const l = computeComboLayout(data, dims);
    expect(l.columns).toHaveLength(4);
    expect(l.linePoints).toHaveLength(4);
  });

  it("the LEFT (column) axis includes 0 (length encoding)", () => {
    const l = computeComboLayout(data, dims);
    expect(l.leftDomain[0]).toBe(0);
  });

  it("the RIGHT (line) axis is NOT forced to 0 (independent rate)", () => {
    const l = computeComboLayout(data, dims);
    expect(l.rightDomain[0]).toBeGreaterThan(0); // margins 15..24, padded but > 0
  });

  it("a taller column has a smaller y (grows up from the baseline)", () => {
    const l = computeComboLayout(data, dims);
    const tall = l.columns.find((c) => c.value === 560)!;
    const short = l.columns.find((c) => c.value === 200)!;
    expect(tall.y).toBeLessThan(short.y);
    expect(tall.h).toBeGreaterThan(short.h);
  });

  it("line points sit at the band centres of their columns", () => {
    const l = computeComboLayout(data, dims);
    for (let i = 0; i < l.columns.length; i++) {
      const c = l.columns[i];
      expect(l.linePoints[i].cx).toBeCloseTo(c.x + c.w / 2, 0);
    }
  });

  it("a higher rate sits higher on the right axis (smaller y)", () => {
    const l = computeComboLayout(data, dims);
    const hi = l.linePoints.find((p) => p.value === 24)!;
    const lo = l.linePoints.find((p) => p.value === 15)!;
    expect(hi.cy).toBeLessThan(lo.cy);
  });

  it("throws on a negative column value", () => {
    const bad: ComboData = {
      categoryField: "month",
      columnField: "units",
      lineField: "margin",
      rows: [{ month: "X", units: -5, margin: 10 }],
    };
    expect(() => computeComboLayout(bad, dims)).toThrow(/negative/);
  });

  it("throws on a non-numeric line value", () => {
    const bad: ComboData = {
      categoryField: "month",
      columnField: "units",
      lineField: "margin",
      rows: [{ month: "X", units: 5, margin: "n/a" }],
    };
    expect(() => computeComboLayout(bad, dims)).toThrow(/invalid line/);
  });
});
