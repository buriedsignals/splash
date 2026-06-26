import { describe, it, expect } from "bun:test";
import {
  computeBulletLayout,
  growMeasure,
  type BulletData,
} from "../src/bullet-geometry";

const dims = {
  width: 700,
  height: 400,
  padding: { top: 20, right: 20, bottom: 20, left: 140 },
};

const data: BulletData = {
  rows: [
    {
      label: "Recycling",
      unit: "%",
      value: 47,
      target: 50,
      max: 65,
      bands: [35, 50],
    },
    {
      label: "Potholes",
      unit: "%",
      value: 72,
      target: 70,
      max: 100,
      bands: [55, 70],
    },
  ],
};

describe("computeBulletLayout", () => {
  it("produces one laid-out row per KPI", () => {
    const l = computeBulletLayout(data, dims);
    expect(l.rows).toHaveLength(2);
  });

  it("splits [0,max] into bands by the thresholds", () => {
    const l = computeBulletLayout(data, dims);
    expect(l.rows[0].bands).toHaveLength(3); // edges 0,35,50,65
  });

  it("flags whether each measure hit its target", () => {
    const l = computeBulletLayout(data, dims);
    expect(l.rows.find((r) => r.label === "Recycling")!.hitTarget).toBe(false); // 47<50
    expect(l.rows.find((r) => r.label === "Potholes")!.hitTarget).toBe(true); // 72>=70
  });

  it("places the target marker and measure on the row's OWN scale", () => {
    const l = computeBulletLayout(data, dims);
    const r = l.rows[0];
    // value 47 < target 50 → measure end left of target marker
    expect(r.valueX).toBeLessThan(r.targetX);
  });

  it("insets the right so the value label fits", () => {
    const l = computeBulletLayout(data, dims, 40);
    for (const r of l.rows)
      expect(r.valueX).toBeLessThanOrEqual(l.innerWidth - 40 + 0.01);
  });

  it("throws on a non-positive max", () => {
    const bad: BulletData = {
      rows: [{ label: "X", unit: "%", value: 1, target: 1, max: 0, bands: [] }],
    };
    expect(() => computeBulletLayout(bad, dims)).toThrow(/invalid bullet max/);
  });
});

describe("growMeasure — grows from zero", () => {
  it("is 0 at progress 0 and the value at progress 1", () => {
    const l = computeBulletLayout(data, dims);
    const r = l.rows[0];
    expect(growMeasure(r, 0)).toBeCloseTo(0, 5);
    expect(growMeasure(r, 1)).toBeCloseTo(r.valueX, 5);
  });
});
