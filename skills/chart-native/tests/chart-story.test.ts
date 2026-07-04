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
  it("throws a clear error for an unsupported native type (e.g. pie)", () => {
    expect(() =>
      deriveChartStory({ ...lineSpec, nativeType: "pie" } as any),
    ).toThrow(/chart-scrolly supports line, bar, scatter/i);
  });
});

describe("deriveChartStory (bar) — ranked highlight walk", () => {
  const barSpec = {
    nativeType: "bar",
    title: "CO₂ per capita",
    unit: "t",
    source: { name: "X" },
    data: "country,co2\nQatar,35\nUSA,15\nChina,8\nFrance,5\nKenya,1",
  };
  const beats = deriveChartStory(barSpec as any, "The gap is vast");
  it("emits title → establish → reveals → takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
  });
  it("reveals the leaders then the tail, each with a post-sort highlightIndex + rank", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    // desc: Qatar(35) USA(15) China(8) France(5) Kenya(1) → top-3 + tail(Kenya idx 4)
    expect(reveals.map((b) => b.highlightIndex)).toEqual([0, 1, 2, 4]);
    expect(reveals[0].copy).toBe("Qatar leads — 35 t");
    expect(reveals[1].copy).toBe("USA — 15 t, 2nd");
    expect(reveals[reveals.length - 1].rankRole).toBe("tail");
    expect(reveals[reveals.length - 1].copy).toContain("The lowest");
  });
});

describe("deriveChartStory (scatter) — outlier highlight walk", () => {
  const scatterSpec = {
    nativeType: "scatter",
    title: "Spend vs longevity",
    unit: "",
    source: { name: "X" },
    data: "country,spend,years\nUSA,12500,76\nJapan,4700,84\nMexico,1200,75\nGermany,7400,81",
  };
  const beats = deriveChartStory(scatterSpec as any);
  it("reveals story points by labelKey (the outliers)", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBeGreaterThanOrEqual(2);
    for (const b of reveals) expect(typeof b.labelKey).toBe("string");
    // max spend = USA (the headline outlier), max years = Japan
    const keys = reveals.map((b) => b.labelKey);
    expect(keys).toContain("USA");
    expect(keys).toContain("Japan");
  });
});

describe("deriveChartStory — path-length progress", () => {
  // A flat run, a cliff (2010→2011), then a flat run. The reveal head advances by
  // PATH LENGTH, so the point at the bottom of the cliff sits FURTHER along the drawn
  // line than its x-fraction — the steep vertical drop adds length that a plain Δx
  // ignores. Progress must reflect the polyline the LineChart actually draws.
  const cliffSpec = {
    nativeType: "line",
    title: "Test path-length",
    unit: "",
    source: { name: "test" },
    data: "year,extent\n2000,7\n2010,7\n2011,1\n2020,1",
    directLabel: "extent",
  };
  it("reveal at the cliff bottom (2011) has progress > its x-fraction 0.55", () => {
    const beats = deriveChartStory(cliffSpec as any);
    const reveals = beats.filter((b) => b.kind === "reveal");
    const beat2011 = reveals.find((b) => b.callout?.name === "2011");
    expect(beat2011).toBeDefined();
    const xFraction = (2011 - 2000) / (2020 - 2000); // 0.55
    expect(beat2011!.progress!).toBeGreaterThan(xFraction);
  });
  it("progress starts ≈ 0, ends ≈ 1, and strictly increases", () => {
    const beats = deriveChartStory(cliffSpec as any);
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].progress).toBeCloseTo(0, 5);
    expect(reveals[reveals.length - 1].progress).toBeCloseTo(1, 5);
    for (let i = 1; i < reveals.length; i++)
      expect(reveals[i].progress!).toBeGreaterThan(reveals[i - 1].progress!);
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
