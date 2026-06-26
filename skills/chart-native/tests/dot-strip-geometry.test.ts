import { describe, it, expect } from "bun:test";
import {
  computeDotStripLayout,
  dotJitter,
  type DotStripData,
} from "../src/dot-strip-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 30, bottom: 50, left: 120 },
};

const data: DotStripData = {
  categoryField: "school",
  valueField: "score",
  rows: [
    { school: "Northgate", score: 50 }, // tight: spread 10
    { school: "Northgate", score: 55 },
    { school: "Northgate", score: 60 },
    { school: "Eastfield", score: 20 }, // wide: spread 70
    { school: "Eastfield", score: 55 },
    { school: "Eastfield", score: 90 },
  ],
};

describe("computeDotStripLayout", () => {
  it("produces one strip row per distinct category", () => {
    const l = computeDotStripLayout(data, dims);
    expect(l.rows).toHaveLength(2);
  });

  it("places one dot per observation in a category", () => {
    const l = computeDotStripLayout(data, dims);
    const ng = l.rows.find((r) => r.category === "Northgate")!;
    expect(ng.dots).toHaveLength(3);
  });

  it("sorts by spread descending by default (widest strip first)", () => {
    const l = computeDotStripLayout(data, dims);
    expect(l.rows.map((r) => r.category)).toEqual(["Eastfield", "Northgate"]);
  });

  it("uses POSITION encoding — x domain is NOT forced to 0", () => {
    const l = computeDotStripLayout(data, dims);
    expect(l.valueDomain[0]).toBeGreaterThan(0); // min 20, padded but never 0
  });

  it("computes the category mean and its screen x", () => {
    const l = computeDotStripLayout(data, dims);
    const ng = l.rows.find((r) => r.category === "Northgate")!;
    expect(ng.mean).toBeCloseTo(55, 5);
  });

  it("a bigger value sits further right", () => {
    const l = computeDotStripLayout(data, dims);
    const ef = l.rows.find((r) => r.category === "Eastfield")!;
    const sorted = [...ef.dots].sort((a, b) => a.value - b.value);
    expect(sorted[sorted.length - 1].x).toBeGreaterThan(sorted[0].x);
  });

  it("reports the per-category spread (max - min)", () => {
    const l = computeDotStripLayout(data, dims);
    const ef = l.rows.find((r) => r.category === "Eastfield")!;
    expect(ef.spread).toBe(70);
  });

  it("throws on a non-numeric value", () => {
    const bad: DotStripData = {
      categoryField: "school",
      valueField: "score",
      rows: [{ school: "X", score: "n/a" }],
    };
    expect(() => computeDotStripLayout(bad, dims)).toThrow(/invalid dot-strip/);
  });
});

describe("dotJitter — deterministic, bounded", () => {
  it("is reproducible for the same value+index", () => {
    expect(dotJitter(42, 1, 30)).toBe(dotJitter(42, 1, 30));
  });

  it("stays within ±20% of the band height", () => {
    for (let v = 0; v < 50; v++) {
      const j = dotJitter(v * 3.1, v, 40);
      expect(Math.abs(j)).toBeLessThanOrEqual(40 * 0.2 + 1e-9);
    }
  });
});
