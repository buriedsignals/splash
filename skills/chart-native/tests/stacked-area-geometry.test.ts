import { describe, it, expect } from "bun:test";
import {
  computeStackedAreaLayout,
  type StackedAreaData,
} from "../src/stacked-area-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 80, bottom: 40, left: 50 },
};

const data: StackedAreaData = {
  xField: "year",
  seriesFields: ["A", "B", "C"],
  rows: [
    { year: 2010, A: 50, B: 30, C: 20 }, // total 100
    { year: 2020, A: 20, B: 30, C: 50 }, // total 100
  ],
};

describe("computeStackedAreaLayout", () => {
  it("produces one band per series with a non-empty path", () => {
    const l = computeStackedAreaLayout(data, dims);
    expect(l.bands).toHaveLength(3);
    for (const b of l.bands) expect(b.path.length).toBeGreaterThan(0);
  });

  it("value axis always includes 0 (inherited baseline rule)", () => {
    const l = computeStackedAreaLayout(data, dims);
    expect(l.valueDomain[0]).toBe(0);
    expect(l.valueDomain[1]).toBeGreaterThanOrEqual(100);
  });

  it("keeps a consistent series order", () => {
    const l = computeStackedAreaLayout(data, dims);
    expect(l.bands.map((b) => b.seriesKey)).toEqual(["A", "B", "C"]);
  });

  it("exposes each band's last value for the right-edge label", () => {
    const l = computeStackedAreaLayout(data, dims);
    expect(l.bands.find((b) => b.seriesKey === "C")!.lastValue).toBe(50);
  });

  it("sorts rows by x ascending before building paths", () => {
    const unsorted: StackedAreaData = {
      xField: "year",
      seriesFields: ["A"],
      rows: [
        { year: 2020, A: 10 },
        { year: 2010, A: 5 },
      ],
    };
    const l = computeStackedAreaLayout(unsorted, dims);
    // last value should be 2020's (10), proving ascending sort
    expect(l.bands[0].lastValue).toBe(10);
  });

  it("throws on a negative series value", () => {
    const bad: StackedAreaData = {
      xField: "year",
      seriesFields: ["A"],
      rows: [{ year: 2010, A: -5 }],
    };
    expect(() => computeStackedAreaLayout(bad, dims)).toThrow(
      /invalid stacked-area/,
    );
  });
});
