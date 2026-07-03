import { describe, it, expect } from "bun:test";
import {
  deriveChartStory,
  lineNotableIndices,
  mapStepToBeat,
} from "../src/chart-story";

const lineSpec = {
  nativeType: "line",
  title: "Arctic sea ice has shrunk since 1979",
  unit: "million km²",
  source: { name: "NSIDC" },
  data: "year,extent\n1979,7.0\n1995,6.1\n2012,3.6\n2025,4.3",
  directLabel: "extent",
};

describe("lineNotableIndices", () => {
  it("always includes the first and last index", () => {
    const idx = lineNotableIndices([7, 6.1, 3.6, 4.3]);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(3);
  });
  it("includes the biggest drop/jump between (the 2012 minimum here)", () => {
    // 6.1 → 3.6 is the biggest move; index 2 must be a notable point.
    expect(lineNotableIndices([7, 6.1, 3.6, 4.3])).toContain(2);
  });
  it("is sorted ascending and unique", () => {
    const idx = lineNotableIndices([1, 9, 2, 8, 3, 7]);
    expect(idx).toEqual([...new Set(idx)].sort((a, b) => a - b));
  });
});

describe("deriveChartStory (line)", () => {
  const beats = deriveChartStory(lineSpec as any, "The ice keeps thinning");
  it("emits title → establish → reveals → takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    expect(
      beats.filter((b) => b.kind === "reveal").length,
    ).toBeGreaterThanOrEqual(2);
  });
  it("title copy = spec.title; establish has no progress; takeaway copy = insight", () => {
    expect(beats[0].copy).toBe(lineSpec.title);
    expect(beats[1].progress).toBeUndefined();
    expect(beats[beats.length - 1].copy).toBe("The ice keeps thinning");
  });
  it("reveal beats carry an increasing progress in (0,1] and a data-tied callout", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    for (let i = 1; i < reveals.length; i++)
      expect(reveals[i].progress!).toBeGreaterThan(reveals[i - 1].progress!);
    expect(reveals[reveals.length - 1].progress).toBeCloseTo(1, 5); // last point = full reveal
    expect(reveals[0].callout).not.toBeNull();
    expect(reveals[0].copy).toContain("1979"); // the x-label of the first point
  });
  it("throws a clear error for a non-line native type (Slice A)", () => {
    expect(() =>
      deriveChartStory({ ...lineSpec, nativeType: "bar" } as any),
    ).toThrow(/chart-scrolly.*line/i);
  });
});

describe("mapStepToBeat", () => {
  const beats = deriveChartStory(lineSpec as any);
  it("clamps out-of-range steps to the first/last beat", () => {
    expect(mapStepToBeat(beats, -5)).toBe(beats[0]);
    expect(mapStepToBeat(beats, 999)).toBe(beats[beats.length - 1]);
    expect(mapStepToBeat(beats, 2)).toBe(beats[2]);
  });
});
