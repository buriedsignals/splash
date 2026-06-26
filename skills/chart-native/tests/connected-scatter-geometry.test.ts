import { describe, it, expect } from "bun:test";
import {
  computeConnectedScatterLayout,
  revealPath,
  type ConnectedScatterData,
} from "../src/connected-scatter-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 20, bottom: 50, left: 60 },
};

const data: ConnectedScatterData = {
  labelField: "year",
  xField: "rent",
  yField: "vacancy",
  rows: [
    { year: 2016, rent: 720, vacancy: 6.2 },
    { year: 2020, rent: 900, vacancy: 4.4 },
    { year: 2024, rent: 1180, vacancy: 1.6 },
  ],
};

describe("computeConnectedScatterLayout", () => {
  it("produces one point per row in time order", () => {
    const l = computeConnectedScatterLayout(data, dims);
    expect(l.points.map((p) => p.label)).toEqual(["2016", "2020", "2024"]);
  });

  it("uses POSITION encoding — neither axis is forced to 0", () => {
    const l = computeConnectedScatterLayout(data, dims);
    // x domain min is ~ below 720, never near 0
    expect(l.xTicks[0].pos).toBeGreaterThanOrEqual(0);
    expect(Number(l.xTicks[0].label)).toBeGreaterThan(500);
  });

  it("accumulates path length monotonically along the trajectory", () => {
    const l = computeConnectedScatterLayout(data, dims);
    expect(l.points[0].cum).toBe(0);
    expect(l.points[1].cum).toBeGreaterThan(0);
    expect(l.points[2].cum).toBeGreaterThan(l.points[1].cum);
    expect(l.totalLen).toBeCloseTo(l.points[2].cum, 5);
  });

  it("higher y value sits higher on screen (smaller cy)", () => {
    const l = computeConnectedScatterLayout(data, dims);
    // 2016 vacancy 6.2 is highest → smallest cy
    expect(l.points[0].cy).toBeLessThan(l.points[2].cy);
  });

  it("throws with fewer than two points", () => {
    const bad: ConnectedScatterData = {
      labelField: "year",
      xField: "rent",
      yField: "vacancy",
      rows: [{ year: 2016, rent: 720, vacancy: 6.2 }],
    };
    expect(() => computeConnectedScatterLayout(bad, dims)).toThrow(/≥ 2/);
  });
});

describe("revealPath — the trajectory draws on in time order", () => {
  it("is empty-ish at progress 0 (head at the start)", () => {
    const l = computeConnectedScatterLayout(data, dims);
    const r = revealPath(l, 0);
    expect(r.head.x).toBeCloseTo(l.points[0].cx, 5);
    expect(r.passed).toBe(1);
  });

  it("reaches the last point at progress 1 (all passed)", () => {
    const l = computeConnectedScatterLayout(data, dims);
    const r = revealPath(l, 1);
    expect(r.head.x).toBeCloseTo(l.points[2].cx, 5);
    expect(r.passed).toBe(3);
  });

  it("the head sits between points mid-way through", () => {
    const l = computeConnectedScatterLayout(data, dims);
    const r = revealPath(l, 0.5);
    expect(r.passed).toBeGreaterThanOrEqual(1);
    expect(r.passed).toBeLessThanOrEqual(3);
    expect(r.path.startsWith("M")).toBe(true);
  });
});
