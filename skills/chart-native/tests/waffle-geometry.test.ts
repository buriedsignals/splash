import { describe, it, expect } from "bun:test";
import {
  computeWaffleLayout,
  allocateCells,
  type WaffleData,
} from "../src/waffle-geometry";

const dims = {
  width: 400,
  height: 400,
  padding: { top: 20, right: 20, bottom: 20, left: 20 },
};

const data: WaffleData = {
  items: [
    { label: "Car", value: 52 },
    { label: "Bus", value: 18 },
    { label: "Bike", value: 12 },
    { label: "Walk", value: 11 },
    { label: "Train", value: 7 },
  ],
};

describe("allocateCells — largest remainder", () => {
  it("totals exactly the cell count", () => {
    const c = allocateCells([52, 18, 12, 11, 7], 100);
    expect(c.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it("rounds a tricky split to a clean total", () => {
    const c = allocateCells([1, 1, 1], 100); // 33.33 each
    expect(c.reduce((s, v) => s + v, 0)).toBe(100);
    expect(Math.max(...c) - Math.min(...c)).toBeLessThanOrEqual(1);
  });
});

describe("computeWaffleLayout", () => {
  it("produces exactly gridN² cells", () => {
    const l = computeWaffleLayout(data, dims);
    expect(l.cells).toHaveLength(100);
  });

  it("assigns each category its share of cells (sum to 100)", () => {
    const l = computeWaffleLayout(data, dims);
    const total = l.categories.reduce((s, c) => s + c.cells, 0);
    expect(total).toBe(100);
    expect(l.categories.find((c) => c.label === "Car")!.cells).toBe(52);
  });

  it("fills bottom→top (cell 0 is on the bottom row)", () => {
    const l = computeWaffleLayout(data, dims);
    const c0 = l.cells[0];
    const cTop = l.cells.find((c) => c.index === 90)!; // first cell of the top row
    expect(c0.y).toBeGreaterThan(cTop.y);
  });

  it("keeps every cell inside the plot", () => {
    const l = computeWaffleLayout(data, dims);
    for (const c of l.cells) {
      expect(c.x).toBeGreaterThanOrEqual(-0.5);
      expect(c.y).toBeGreaterThanOrEqual(-0.5);
      expect(c.x + c.size).toBeLessThanOrEqual(dims.width + 0.5);
      expect(c.y + c.size).toBeLessThanOrEqual(dims.height + 0.5);
    }
  });

  it("throws on no items", () => {
    expect(() => computeWaffleLayout({ items: [] }, dims)).toThrow(/no items/);
  });
});
