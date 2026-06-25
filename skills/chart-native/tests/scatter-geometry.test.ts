import { describe, it, expect } from "bun:test";
import {
  computeScatterLayout,
  popScale,
  type ScatterData,
  type ScatterDims,
} from "../src/scatter-geometry";
import sample from "../assets/sample-data/scatter.json";

const data: ScatterData = {
  xField: sample.xField,
  yField: sample.yField,
  sizeField: sample.sizeField,
  labelField: sample.labelField,
  rows: sample.rows,
};
const dims: ScatterDims = {
  width: 840,
  height: 480,
  padding: { top: 64, right: 40, bottom: 56, left: 64 },
};

describe("computeScatterLayout — axes & projection", () => {
  const layout = computeScatterLayout(data, dims);

  it("emits one point per row", () => {
    expect(layout.points).toHaveLength(sample.rows.length);
  });

  it("axes are NOT forced to 0 (position encoding, unlike bars)", () => {
    // min opening hours is 35 → the x domain stays well above 0
    expect(layout.xDomain[0]).toBeGreaterThan(0);
  });

  it("a higher x maps further right; higher y maps higher (smaller screen y)", () => {
    const central = layout.points[0]; // 72h, 10400
    const oldtown = layout.points[layout.points.length - 1]; // 35h, 1500
    expect(central.x).toBeGreaterThan(oldtown.x);
    expect(central.y).toBeLessThan(oldtown.y);
  });

  it("provides both axis tick sets", () => {
    expect(layout.xTicks.length).toBeGreaterThan(0);
    expect(layout.yTicks.length).toBeGreaterThan(0);
  });

  it("throws on empty rows", () => {
    expect(() => computeScatterLayout({ ...data, rows: [] }, dims)).toThrow();
  });
});

describe("bubble size — area-scaled (r ∝ √value), never radius", () => {
  const layout = computeScatterLayout(data, dims, { minR: 5, maxR: 22 });

  it("a bigger value gives a bigger radius, within [minR, maxR]", () => {
    const central = layout.points[0]; // staff 14 (max)
    const oldtown = layout.points[layout.points.length - 1]; // staff 3
    expect(central.r).toBeGreaterThan(oldtown.r);
    for (const p of layout.points) {
      expect(p.r).toBeGreaterThanOrEqual(5);
      expect(p.r).toBeLessThanOrEqual(22);
    }
  });

  it("scales by AREA not radius: 4× the value is ~2× the radius, not 4×", () => {
    // staff 14 vs ~3.5 would be 4×; compare the max (14) to a quarter-ish (4).
    const r14 = layout.points[0].r; // staff 14
    const eastgate = layout.points.find((p) => p.rawSize === 4)!; // staff 4
    const ratio = r14 / eastgate.r;
    expect(ratio).toBeLessThan(3); // sqrt(14/4)=1.87 ≪ linear 3.5
  });

  it("falls back to a fixed radius when there is no size field", () => {
    const noSize = computeScatterLayout(
      { ...data, sizeField: undefined },
      dims,
      { dotR: 6 },
    );
    for (const p of noSize.points) expect(p.r).toBe(6);
  });
});

describe("popScale (per-point pop-in)", () => {
  it("clamps 0..1", () => {
    expect(popScale(-1)).toBe(0);
    expect(popScale(2)).toBe(1);
    expect(popScale(0.5)).toBe(0.5);
  });
});
