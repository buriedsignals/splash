import { describe, it, expect } from "bun:test";
import {
  computeViolinLayout,
  gaussianKDE,
  silvermanBandwidth,
  type ViolinData,
} from "../src/violin-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 30, bottom: 50, left: 120 },
};

const data: ViolinData = {
  categories: [
    { label: "Tight", values: [48, 49, 50, 50, 51, 52] },
    { label: "Wide", values: [10, 25, 40, 55, 70, 85] },
  ],
};

describe("gaussianKDE", () => {
  it("peaks at the mode of a symmetric sample", () => {
    const v = [0, 5, 5, 5, 10]; // symmetric around 5
    const h = silvermanBandwidth(v);
    const atMode = gaussianKDE(v, h, 5);
    const offMode = gaussianKDE(v, h, 9);
    expect(atMode).toBeGreaterThan(offMode);
  });

  it("is symmetric for a sample symmetric about its centre", () => {
    const v = [-2, -1, 0, 1, 2];
    const h = silvermanBandwidth(v);
    expect(gaussianKDE(v, h, -1.5)).toBeCloseTo(gaussianKDE(v, h, 1.5), 9);
  });

  it("returns 0 density for an empty sample", () => {
    expect(gaussianKDE([], 1, 0)).toBe(0);
  });
});

describe("silvermanBandwidth", () => {
  it("is positive even when all values are equal (degenerate spread)", () => {
    expect(silvermanBandwidth([7, 7, 7, 7])).toBeGreaterThan(0);
  });

  it("grows with the spread of the data", () => {
    const tight = silvermanBandwidth([10, 11, 12, 13]);
    const wide = silvermanBandwidth([10, 30, 60, 100]);
    expect(wide).toBeGreaterThan(tight);
  });
});

describe("computeViolinLayout", () => {
  it("produces one violin row per category", () => {
    const l = computeViolinLayout(data, dims);
    expect(l.rows).toHaveLength(2);
  });

  it("uses POSITION encoding — value domain is NOT forced to 0", () => {
    const l = computeViolinLayout(data, dims);
    expect(l.valueDomain[0]).toBeGreaterThan(0); // min 10, padded but > 0
  });

  it("normalises every violin to the same max half-width (the band)", () => {
    const l = computeViolinLayout(data, dims);
    const maxHalf = (r: (typeof l.rows)[number]) =>
      Math.max(...r.silhouette.map((p) => p.halfW));
    expect(maxHalf(l.rows[0])).toBeCloseTo(maxHalf(l.rows[1]), 5);
  });

  it("the tight sample's silhouette is narrower in value-span than the wide one", () => {
    const l = computeViolinLayout(data, dims);
    const span = (r: (typeof l.rows)[number]) =>
      r.silhouette[r.silhouette.length - 1].x - r.silhouette[0].x;
    const tight = l.rows.find((r) => r.label === "Tight")!;
    const wide = l.rows.find((r) => r.label === "Wide")!;
    expect(span(wide)).toBeGreaterThan(span(tight));
  });

  it("computes the median and its screen x", () => {
    const l = computeViolinLayout(data, dims);
    const wide = l.rows.find((r) => r.label === "Wide")!;
    expect(wide.median).toBeCloseTo(47.5, 5); // mean of 40 and 55
  });

  it("half-widths are never negative", () => {
    const l = computeViolinLayout(data, dims);
    for (const r of l.rows)
      for (const p of r.silhouette) expect(p.halfW).toBeGreaterThanOrEqual(0);
  });

  it("throws on a category with no values", () => {
    const bad: ViolinData = { categories: [{ label: "X", values: [] }] };
    expect(() => computeViolinLayout(bad, dims)).toThrow(/no values/);
  });
});
