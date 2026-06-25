import { describe, it, expect } from "bun:test";
import {
  computeHistogramLayout,
  growHistBar,
  type HistogramData,
} from "../src/histogram-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 20, bottom: 40, left: 50 },
};

// values that fall into 10-wide bins: [0,10):1, [10,20):3, [20,30):2
const data: HistogramData = {
  valueField: "v",
  rows: [{ v: 5 }, { v: 11 }, { v: 14 }, { v: 18 }, { v: 22 }, { v: 27 }],
};

describe("computeHistogramLayout", () => {
  it("bins the values into contiguous bars", () => {
    const l = computeHistogramLayout(data, dims, { binWidth: 10 });
    expect(l.bars.length).toBeGreaterThanOrEqual(3);
    const counts = l.bars.map((b) => b.count);
    expect(counts).toContain(3); // the [10,20) bin
  });

  it("bars TOUCH — each bar's right edge meets the next bar's left edge", () => {
    const l = computeHistogramLayout(data, dims, { binWidth: 10 });
    for (let i = 1; i < l.bars.length; i++)
      expect(l.bars[i].x).toBeCloseTo(l.bars[i - 1].x + l.bars[i - 1].w, 5);
  });

  it("count axis includes 0 (baseline rule)", () => {
    const l = computeHistogramLayout(data, dims, { binWidth: 10 });
    expect(l.countDomain[0]).toBe(0);
  });

  it("computes the median value and its screen x", () => {
    const l = computeHistogramLayout(data, dims, { binWidth: 10 });
    expect(l.median).toBeCloseTo(16, 5); // median of [5,11,14,18,22,27] = 16
    expect(l.medianX).toBeGreaterThan(0);
  });

  it("derives a nice bin width when none is given", () => {
    const l = computeHistogramLayout(data, dims);
    const w = l.bars[0].x1 - l.bars[0].x0;
    expect(w).toBeGreaterThan(0);
  });

  it("throws on a non-numeric value", () => {
    const bad: HistogramData = { valueField: "v", rows: [{ v: "n/a" }] };
    expect(() => computeHistogramLayout(bad, dims)).toThrow(/invalid value/);
  });
});

describe("growHistBar — grows from the zero baseline", () => {
  it("is empty at progress 0 and full at progress 1", () => {
    const l = computeHistogramLayout(data, dims, { binWidth: 10 });
    const b = l.bars.find((x) => x.count > 0)!;
    const g0 = growHistBar(b, 0);
    const g1 = growHistBar(b, 1);
    expect(g0.h).toBeCloseTo(0, 5);
    expect(g1.h).toBeCloseTo(b.h, 5);
    expect(g1.y + g1.h).toBeCloseTo(b.base, 5); // anchored on the zero line
  });
});
