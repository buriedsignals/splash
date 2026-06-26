import { describe, it, expect } from "bun:test";
import {
  computePyramidLayout,
  growPyramidBar,
  type PyramidData,
} from "../src/population-pyramid-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 20, bottom: 40, left: 20 },
};

const data: PyramidData = {
  bandField: "age",
  leftField: "male",
  rightField: "female",
  rows: [
    { age: "65+", male: 6, female: 9 },
    { age: "30-64", male: 20, female: 21 },
    { age: "0-29", male: 16, female: 15 },
  ],
};

describe("computePyramidLayout", () => {
  it("produces one band per row, keeping the natural order (no sort)", () => {
    const l = computePyramidLayout(data, dims);
    expect(l.bands.map((b) => b.bandLabel)).toEqual(["65+", "30-64", "0-29"]);
  });

  it("left bars sit left of centre, right bars right of centre", () => {
    const l = computePyramidLayout(data, dims);
    const b = l.bands[0];
    expect(b.leftX + b.leftW).toBeLessThanOrEqual(l.leftEdge + 0.01);
    expect(b.rightX).toBeGreaterThanOrEqual(l.rightEdge - 0.01);
  });

  it("uses the SAME magnitude scale on both sides (equal value → equal width)", () => {
    const equal: PyramidData = {
      bandField: "age",
      leftField: "male",
      rightField: "female",
      rows: [{ age: "x", male: 10, female: 10 }],
    };
    const l = computePyramidLayout(equal, dims);
    expect(l.bands[0].leftW).toBeCloseTo(l.bands[0].rightW, 5);
  });

  it("a bigger magnitude makes a longer bar", () => {
    const l = computePyramidLayout(data, dims);
    const mid = l.bands.find((b) => b.bandLabel === "30-64")!;
    const old = l.bands.find((b) => b.bandLabel === "65+")!;
    expect(mid.leftW).toBeGreaterThan(old.leftW);
  });

  it("throws on a negative value", () => {
    const bad: PyramidData = {
      bandField: "age",
      leftField: "male",
      rightField: "female",
      rows: [{ age: "x", male: -1, female: 5 }],
    };
    expect(() => computePyramidLayout(bad, dims)).toThrow(/invalid pyramid/);
  });
});

describe("growPyramidBar — grows from the central zero outward", () => {
  it("left bar's centre edge stays fixed; full width at progress 1", () => {
    const l = computePyramidLayout(data, dims);
    const b = l.bands[1];
    const g0 = growPyramidBar(b, "left", 0);
    const g1 = growPyramidBar(b, "left", 1);
    expect(g0.w).toBeCloseTo(0, 5);
    expect(g1.w).toBeCloseTo(b.leftW, 5);
    expect(g1.x + g1.w).toBeCloseTo(b.leftX + b.leftW, 5); // centre edge fixed
  });

  it("right bar grows rightward from the centre edge", () => {
    const l = computePyramidLayout(data, dims);
    const b = l.bands[1];
    const g = growPyramidBar(b, "right", 0.5);
    expect(g.x).toBeCloseTo(b.rightX, 5); // centre edge fixed
    expect(g.w).toBeCloseTo(b.rightW * 0.5, 5);
  });
});
