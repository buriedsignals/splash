import { describe, it, expect } from "bun:test";
import {
  computeStackedLayout,
  growSegment,
  type StackedData,
} from "../src/stacked-bar-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 40, left: 50 },
};

const data: StackedData = {
  catField: "year",
  seriesFields: ["Coal", "Gas", "Renewables"],
  rows: [
    { year: 2010, Coal: 50, Gas: 30, Renewables: 20 }, // total 100
    { year: 2020, Coal: 20, Gas: 30, Renewables: 50 }, // total 100
  ],
};

describe("computeStackedLayout", () => {
  it("produces one column per row with all series as segments", () => {
    const l = computeStackedLayout(data, dims);
    expect(l.columns).toHaveLength(2);
    expect(l.columns[0].segments).toHaveLength(3);
  });

  it("each column total is the sum of its series", () => {
    const l = computeStackedLayout(data, dims);
    expect(l.columns[0].total).toBe(100);
    expect(l.columns[1].total).toBe(100);
  });

  it("stacks segments cumulatively — segment bottoms ascend the baseline", () => {
    const l = computeStackedLayout(data, dims);
    const segs = l.columns[0].segments;
    // bottom segment sits on the baseline; each next segment sits on top of it
    const bottoms = segs.map((s) => s.y + s.h);
    expect(bottoms[0]).toBeCloseTo(l.base, 5); // first segment bottom = zero line
    expect(segs[1].y + segs[1].h).toBeCloseTo(segs[0].y, 5); // touch, no gap
  });

  it("value axis always includes 0 (inherited baseline rule)", () => {
    const l = computeStackedLayout(data, dims);
    expect(l.valueDomain[0]).toBe(0);
    expect(l.valueDomain[1]).toBeGreaterThanOrEqual(100);
  });

  it("keeps a consistent series order across every column", () => {
    const l = computeStackedLayout(data, dims);
    const keys0 = l.columns[0].segments.map((s) => s.seriesKey);
    const keys1 = l.columns[1].segments.map((s) => s.seriesKey);
    expect(keys0).toEqual(keys1);
    expect(keys0).toEqual(["Coal", "Gas", "Renewables"]);
  });

  it("throws on a negative series value", () => {
    const bad: StackedData = {
      catField: "year",
      seriesFields: ["Coal"],
      rows: [{ year: 2010, Coal: -5 }],
    };
    expect(() => computeStackedLayout(bad, dims)).toThrow(/invalid stacked/);
  });
});

describe("growSegment — the stack rises from the baseline", () => {
  it("draws nothing for an upper segment at low progress", () => {
    const l = computeStackedLayout(data, dims);
    const col = l.columns[0];
    const top = col.segments[2]; // Renewables, the top segment
    expect(growSegment(top, col, l.base, 0.1)).toBeNull();
  });

  it("draws the baseline segment first (low progress reveals the bottom)", () => {
    const l = computeStackedLayout(data, dims);
    const col = l.columns[0];
    const bottom = col.segments[0];
    const r = growSegment(bottom, col, l.base, 0.2);
    expect(r).not.toBeNull();
    expect(r!.y + r!.h).toBeCloseTo(l.base, 5); // still anchored on the zero line
  });

  it("at progress=1 every segment is fully drawn at its final rect", () => {
    const l = computeStackedLayout(data, dims);
    const col = l.columns[0];
    for (const s of col.segments) {
      const r = growSegment(s, col, l.base, 1)!;
      expect(r.y).toBeCloseTo(s.y, 5);
      expect(r.h).toBeCloseTo(s.h, 5);
    }
  });
});
