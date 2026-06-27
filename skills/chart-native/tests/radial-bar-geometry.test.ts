import { describe, it, expect } from "bun:test";
import {
  computeRadialBarLayout,
  radialBarPath,
  polar,
  type RadialBarData,
} from "../src/radial-bar-geometry";

const dims = {
  width: 480,
  height: 480,
  padding: { top: 40, right: 40, bottom: 40, left: 40 },
};

const data: RadialBarData = {
  categoryField: "hour",
  valueField: "trips",
  rows: [
    { hour: "0", trips: 10 },
    { hour: "1", trips: 20 },
    { hour: "2", trips: 40 },
    { hour: "3", trips: 80 }, // max
  ],
};

describe("polar (0 = top, clockwise)", () => {
  it("maps angle 0 to straight up", () => {
    const p = polar(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(50, 6); // up = smaller y
  });

  it("maps angle π/2 to the right", () => {
    const p = polar(100, 100, 50, Math.PI / 2);
    expect(p.x).toBeCloseTo(150, 6);
    expect(p.y).toBeCloseTo(100, 6);
  });
});

describe("computeRadialBarLayout", () => {
  it("produces one bar per row", () => {
    const l = computeRadialBarLayout(data, dims);
    expect(l.bars).toHaveLength(4);
  });

  it("uses baseline-0: the radial scale starts at the inner circle", () => {
    const l = computeRadialBarLayout(data, dims);
    // a zero-value bar would have rValue === innerR (length 0)
    const z = computeRadialBarLayout(
      { ...data, rows: [{ hour: "x", trips: 0 }, ...data.rows] },
      dims,
    );
    expect(z.bars[0].rValue).toBeCloseTo(z.innerR, 6);
  });

  it("a bigger value yields a longer bar (larger outer radius)", () => {
    const l = computeRadialBarLayout(data, dims);
    const sorted = [...l.bars].sort((a, b) => a.value - b.value);
    expect(sorted[sorted.length - 1].rValue).toBeGreaterThan(sorted[0].rValue);
  });

  it("divides the full circle into equal angular slices", () => {
    const l = computeRadialBarLayout(data, dims);
    const span = l.bars[0].a1 - l.bars[0].a0;
    const expected = (2 * Math.PI) / 4;
    expect(span).toBeLessThan(expected); // padded, so slightly less
    expect(span).toBeGreaterThan(expected - 0.1);
  });

  it("the longest bar never exceeds the outer radius", () => {
    const l = computeRadialBarLayout(data, dims);
    for (const b of l.bars)
      expect(b.rValue).toBeLessThanOrEqual(l.outerR + 1e-6);
  });

  it("throws on a negative value (length can't encode it)", () => {
    const bad: RadialBarData = {
      categoryField: "hour",
      valueField: "trips",
      rows: [{ hour: "0", trips: -5 }],
    };
    expect(() => computeRadialBarLayout(bad, dims)).toThrow(/negative/);
  });

  it("throws on a non-numeric value", () => {
    const bad: RadialBarData = {
      categoryField: "hour",
      valueField: "trips",
      rows: [{ hour: "0", trips: "n/a" }],
    };
    expect(() => computeRadialBarLayout(bad, dims)).toThrow(
      /invalid radial-bar/,
    );
  });
});

describe("radialBarPath — the bar grows outward from the baseline", () => {
  it("is a zero-length sector at progress 0 (parked at the inner circle)", () => {
    const l = computeRadialBarLayout(data, dims);
    const b = l.bars[3];
    const path = radialBarPath(b, l.cx, l.cy, l.innerR, 0);
    // outer radius equals inner radius → the two arcs coincide
    const pTop = polar(l.cx, l.cy, l.innerR, b.a0);
    expect(path).toContain(`M ${pTop.x} ${pTop.y}`);
  });

  it("reaches the full value radius at progress 1", () => {
    const l = computeRadialBarLayout(data, dims);
    const b = l.bars[3];
    const full = radialBarPath(b, l.cx, l.cy, l.innerR, 1);
    const outer = polar(l.cx, l.cy, b.rValue, b.a1);
    expect(full).toContain(`L ${outer.x} ${outer.y}`);
  });
});
