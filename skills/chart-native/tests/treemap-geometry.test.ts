import { describe, it, expect } from "bun:test";
import {
  computeTreemapLayout,
  type TreemapData,
} from "../src/treemap-geometry";

const dims = {
  width: 800,
  height: 500,
  padding: { top: 40, right: 20, bottom: 20, left: 20 },
};

const data: TreemapData = {
  unit: "£m",
  items: [
    { label: "A", value: 50, category: "X" },
    { label: "B", value: 30, category: "X" },
    { label: "C", value: 12, category: "Y" },
    { label: "D", value: 8, category: "Y" },
    { label: "E", value: 6, category: "Z" },
    { label: "F", value: 4, category: "Z" },
  ],
};

describe("computeTreemapLayout", () => {
  it("produces one cell per item", () => {
    const l = computeTreemapLayout(data, dims);
    expect(l.cells).toHaveLength(6);
  });

  it("makes cell AREA proportional to value", () => {
    const l = computeTreemapLayout(data, dims);
    const a = l.cells.find((c) => c.label === "A")!;
    const b = l.cells.find((c) => c.label === "B")!;
    const ratio = (a.w * a.h) / (b.w * b.h);
    expect(ratio).toBeCloseTo(50 / 30, 1); // ≈ 1.67
  });

  it("tiles the whole rectangle (areas sum to the plot area)", () => {
    const l = computeTreemapLayout(data, dims);
    const sum = l.cells.reduce((s, c) => s + c.w * c.h, 0);
    expect(sum).toBeCloseTo(l.innerWidth * l.innerHeight, 0);
  });

  it("keeps every cell inside the plot rectangle", () => {
    const l = computeTreemapLayout(data, dims);
    for (const c of l.cells) {
      expect(c.x).toBeGreaterThanOrEqual(-0.5);
      expect(c.y).toBeGreaterThanOrEqual(-0.5);
      expect(c.x + c.w).toBeLessThanOrEqual(l.innerWidth + 0.5);
      expect(c.y + c.h).toBeLessThanOrEqual(l.innerHeight + 0.5);
    }
  });

  it("does not overlap any two cells", () => {
    const l = computeTreemapLayout(data, dims);
    const cs = l.cells;
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i];
        const b = cs[j];
        const ix = Math.max(
          0,
          Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
        );
        const iy = Math.max(
          0,
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
        );
        expect(ix * iy).toBeLessThan(1); // no meaningful overlap
      }
  });

  it("groups same-category cells contiguously when categories are given", () => {
    const grouped = { ...data, categories: ["X", "Y", "Z"] };
    const l = computeTreemapLayout(grouped, dims);
    // each category's cells share a sub-rectangle that doesn't interleave with
    // another category's: the X bounding box must not overlap the Z bounding box.
    const bbox = (cat: string) => {
      const cs = l.cells.filter((c) => c.category === cat);
      return {
        x0: Math.min(...cs.map((c) => c.x)),
        x1: Math.max(...cs.map((c) => c.x + c.w)),
        y0: Math.min(...cs.map((c) => c.y)),
        y1: Math.max(...cs.map((c) => c.y + c.h)),
      };
    };
    const X = bbox("X");
    const Z = bbox("Z");
    const ix = Math.max(0, Math.min(X.x1, Z.x1) - Math.max(X.x0, Z.x0));
    const iy = Math.max(0, Math.min(X.y1, Z.y1) - Math.max(X.y0, Z.y0));
    expect(ix * iy).toBeLessThan(1); // the two groups occupy disjoint regions
  });

  it("still tiles the whole rectangle when grouped", () => {
    const grouped = { ...data, categories: ["X", "Y", "Z"] };
    const l = computeTreemapLayout(grouped, dims);
    const sum = l.cells.reduce((s, c) => s + c.w * c.h, 0);
    expect(sum).toBeCloseTo(l.innerWidth * l.innerHeight, 0);
  });

  it("throws on a non-positive value", () => {
    expect(() =>
      computeTreemapLayout(
        { unit: "x", items: [{ label: "A", value: 0 }] },
        dims,
      ),
    ).toThrow(/value must be > 0/);
  });

  it("throws on an empty set of items", () => {
    expect(() => computeTreemapLayout({ unit: "x", items: [] }, dims)).toThrow(
      /no items/,
    );
  });
});
