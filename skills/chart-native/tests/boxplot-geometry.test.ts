import { describe, it, expect } from "bun:test";
import {
  computeBoxStats,
  computeBoxplotLayout,
  growBox,
  type BoxplotData,
} from "../src/boxplot-geometry";

const dims = {
  width: 800,
  height: 480,
  padding: { top: 40, right: 40, bottom: 40, left: 120 },
};

describe("computeBoxStats — five-number summary + Tukey whiskers", () => {
  it("computes quartiles, median and whiskers for a clean sample (no outliers)", () => {
    const s = computeBoxStats([9, 1, 8, 2, 7, 3, 6, 4, 5]); // unsorted on purpose
    expect(s.min).toBe(1);
    expect(s.q1).toBe(3);
    expect(s.median).toBe(5);
    expect(s.q3).toBe(7);
    expect(s.max).toBe(9);
    expect(s.outliers).toEqual([]);
    expect(s.whiskerLo).toBe(1);
    expect(s.whiskerHi).toBe(9);
  });

  it("flags a Tukey outlier and pulls the whisker back to the last in-fence point", () => {
    const s = computeBoxStats([1, 2, 3, 4, 5, 100]);
    expect(s.outliers).toEqual([100]);
    expect(s.whiskerHi).toBe(5); // not 100
  });

  it("throws on an empty sample", () => {
    expect(() => computeBoxStats([])).toThrow(/empty sample/);
  });
});

describe("computeBoxplotLayout", () => {
  const data: BoxplotData = {
    valueLabel: "ms",
    categories: [
      { label: "A", values: [10, 12, 14, 16, 18, 20] },
      { label: "B", values: [50, 55, 60, 65, 70] },
    ],
  };

  it("produces one row per category", () => {
    const l = computeBoxplotLayout(data, dims);
    expect(l.rows).toHaveLength(2);
    expect(l.rows[0].label).toBe("A");
  });

  it("orders the box: Q1 ≤ median ≤ Q3 on screen (x grows right)", () => {
    const l = computeBoxplotLayout(data, dims);
    for (const r of l.rows) {
      expect(r.q1x).toBeLessThanOrEqual(r.medianX);
      expect(r.medianX).toBeLessThanOrEqual(r.q3x);
    }
  });

  it("does NOT force the value axis through 0 (position encoding)", () => {
    const l = computeBoxplotLayout(data, dims);
    expect(l.valueDomain[0]).toBeGreaterThan(0); // all values ≥ 10
  });

  it("throws when there are no categories", () => {
    expect(() =>
      computeBoxplotLayout({ valueLabel: "x", categories: [] }, dims),
    ).toThrow(/no categories/);
  });
});

describe("growBox — marks grow from the median", () => {
  const data: BoxplotData = {
    valueLabel: "ms",
    categories: [{ label: "A", values: [10, 12, 14, 16, 18, 20] }],
  };

  it("collapses every mark to the median at progress 0", () => {
    const l = computeBoxplotLayout(data, dims);
    const r = l.rows[0];
    const g = growBox(r, 0);
    expect(g.q1x).toBeCloseTo(r.medianX, 5);
    expect(g.q3x).toBeCloseTo(r.medianX, 5);
    expect(g.whiskerLoX).toBeCloseTo(r.medianX, 5);
    expect(g.whiskerHiX).toBeCloseTo(r.medianX, 5);
  });

  it("reaches the full box at progress 1", () => {
    const l = computeBoxplotLayout(data, dims);
    const r = l.rows[0];
    const g = growBox(r, 1);
    expect(g.q1x).toBeCloseTo(r.q1x, 5);
    expect(g.q3x).toBeCloseTo(r.q3x, 5);
  });
});
