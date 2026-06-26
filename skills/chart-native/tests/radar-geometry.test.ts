import { describe, it, expect } from "bun:test";
import {
  computeRadarLayout,
  growRadar,
  type RadarData,
} from "../src/radar-geometry";

const dims = {
  width: 500,
  height: 500,
  padding: { top: 40, right: 40, bottom: 40, left: 40 },
};

const data: RadarData = {
  axes: ["Transport", "Green", "Safety", "Schools"],
  max: 10,
  series: [
    { label: "Riverside", values: [8, 6, 7, 6] },
    { label: "Hillcrest", values: [5, 9, 8, 7] },
  ],
};

describe("computeRadarLayout", () => {
  it("produces one axis per dimension and one polygon per series", () => {
    const l = computeRadarLayout(data, dims);
    expect(l.axes).toHaveLength(4);
    expect(l.series).toHaveLength(2);
    expect(l.series[0].vertices).toHaveLength(4);
  });

  it("the first axis points straight up (12 o'clock)", () => {
    const l = computeRadarLayout(data, dims);
    expect(l.axes[0].ex).toBeCloseTo(0, 5);
    expect(l.axes[0].ey).toBeCloseTo(-l.radius, 5);
  });

  it("shares ONE radial scale from the centre = 0 (equal value → equal radius)", () => {
    const eq: RadarData = {
      axes: ["A", "B", "C"],
      max: 10,
      series: [{ label: "x", values: [5, 5, 5] }],
    };
    const l = computeRadarLayout(eq, dims);
    const radii = l.series[0].vertices.map((v) => Math.hypot(v.x, v.y));
    expect(radii[0]).toBeCloseTo(radii[1], 5);
    expect(radii[1]).toBeCloseTo(radii[2], 5);
    expect(radii[0]).toBeCloseTo(l.radius / 2, 5); // value 5 of max 10 → half radius
  });

  it("a bigger value reaches further from the centre", () => {
    const l = computeRadarLayout(data, dims);
    const rv = Math.hypot(l.series[0].vertices[0].x, l.series[0].vertices[0].y);
    const hv = Math.hypot(l.series[1].vertices[0].x, l.series[1].vertices[0].y);
    expect(rv).toBeGreaterThan(hv); // Transport: Riverside 8 > Hillcrest 5
  });

  it("anchors labels by horizontal position: top centred, right/left sided", () => {
    const l = computeRadarLayout(data, dims); // 4 axes → up, right, down, left
    expect(l.axes[0].side).toBe("center"); // 12 o'clock
    expect(l.axes[1].side).toBe("right"); // 3 o'clock
    expect(l.axes[2].side).toBe("center"); // 6 o'clock
    expect(l.axes[3].side).toBe("left"); // 9 o'clock
  });

  it("throws with fewer than 3 axes", () => {
    const bad: RadarData = {
      axes: ["A", "B"],
      max: 10,
      series: [{ label: "x", values: [1, 2] }],
    };
    expect(() => computeRadarLayout(bad, dims)).toThrow(/≥ 3 axes/);
  });

  it("throws when a series value count mismatches the axes", () => {
    const bad: RadarData = {
      axes: ["A", "B", "C"],
      max: 10,
      series: [{ label: "x", values: [1, 2] }],
    };
    expect(() => computeRadarLayout(bad, dims)).toThrow(/expected 3/);
  });
});

describe("growRadar — vertices grow from the centre", () => {
  it("is all-centre at progress 0 and full at progress 1", () => {
    const l = computeRadarLayout(data, dims);
    const g0 = growRadar(l.series[0], 0);
    const g1 = growRadar(l.series[0], 1);
    for (const p of g0) {
      expect(p.x).toBeCloseTo(0, 5);
      expect(p.y).toBeCloseTo(0, 5);
    }
    expect(g1[0].x).toBeCloseTo(l.series[0].vertices[0].x, 5);
  });
});
