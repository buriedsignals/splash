import { describe, it, expect } from "bun:test";
import {
  computeGroupedLayout,
  type GroupedData,
} from "../src/grouped-bar-geometry";
import { growBar } from "../src/bar-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 40, left: 50 },
};

const data: GroupedData = {
  catField: "area",
  seriesFields: ["2019", "2024"],
  rows: [
    { area: "Urban", "2019": 80, "2024": 220 },
    { area: "Rural", "2019": 12, "2024": 38 },
  ],
};

describe("computeGroupedLayout", () => {
  it("produces one bar per category × series", () => {
    const l = computeGroupedLayout(data, dims);
    expect(l.bars).toHaveLength(4); // 2 cats × 2 series
    expect(l.columns).toHaveLength(2);
  });

  it("places the two series side by side within a group (distinct x, no overlap)", () => {
    const l = computeGroupedLayout(data, dims);
    const urban = l.bars
      .filter((b) => b.catIndex === 0)
      .sort((a, b) => a.x - b.x);
    expect(urban[0].x + urban[0].w).toBeLessThanOrEqual(urban[1].x + 0.01);
  });

  it("value axis always includes 0 (inherited baseline rule)", () => {
    const l = computeGroupedLayout(data, dims);
    expect(l.valueDomain[0]).toBe(0);
    expect(l.valueDomain[1]).toBeGreaterThanOrEqual(220);
  });

  it("keeps a consistent series order in every group", () => {
    const l = computeGroupedLayout(data, dims);
    const k0 = l.bars.filter((b) => b.catIndex === 0).map((b) => b.seriesKey);
    const k1 = l.bars.filter((b) => b.catIndex === 1).map((b) => b.seriesKey);
    expect(k0).toEqual(k1);
    expect(k0).toEqual(["2019", "2024"]);
  });

  it("a taller value sits on a longer bar", () => {
    const l = computeGroupedLayout(data, dims);
    const urban2024 = l.bars.find(
      (b) => b.catIndex === 0 && b.seriesKey === "2024",
    )!;
    const rural2024 = l.bars.find(
      (b) => b.catIndex === 1 && b.seriesKey === "2024",
    )!;
    expect(urban2024.h).toBeGreaterThan(rural2024.h);
  });

  it("bars grow from the zero baseline (reused growBar)", () => {
    const l = computeGroupedLayout(data, dims);
    const b = l.bars[0];
    const g0 = growBar(b, 0, "vertical");
    const g1 = growBar(b, 1, "vertical");
    expect(g0.h).toBeCloseTo(0, 5); // nothing at progress 0
    expect(g1.h).toBeCloseTo(b.h, 5); // full at progress 1
    expect(g1.y + g1.h).toBeCloseTo(b.base, 5); // anchored on the zero line
  });

  it("throws on a non-numeric value", () => {
    const bad: GroupedData = {
      catField: "area",
      seriesFields: ["2019"],
      rows: [{ area: "X", "2019": "n/a" }],
    };
    expect(() => computeGroupedLayout(bad, dims)).toThrow(/invalid grouped/);
  });
});
