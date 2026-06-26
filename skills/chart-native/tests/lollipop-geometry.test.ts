import { describe, it, expect } from "bun:test";
import {
  computeLollipopLayout,
  growStem,
  type LollipopData,
} from "../src/lollipop-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 60, bottom: 20, left: 120 },
};

const data: LollipopData = {
  catField: "branch",
  valField: "loans",
  rows: [
    { branch: "Harbour", loans: 7.3 },
    { branch: "Riverside", loans: 14.2 },
    { branch: "Westhill", loans: 9.1 },
  ],
};

describe("computeLollipopLayout", () => {
  it("produces one row per category, sorted desc by value", () => {
    const l = computeLollipopLayout(data, dims);
    expect(l.rows.map((r) => r.rawCat)).toEqual([
      "Riverside",
      "Westhill",
      "Harbour",
    ]);
  });

  it("value domain includes 0 (baseline rule)", () => {
    const l = computeLollipopLayout(data, dims);
    expect(l.valueDomain[0]).toBe(0);
    expect(l.valueDomain[1]).toBeGreaterThanOrEqual(14.2);
  });

  it("the stem starts at the zero baseline; a bigger value reaches further right", () => {
    const l = computeLollipopLayout(data, dims);
    const riverside = l.rows.find((r) => r.rawCat === "Riverside")!;
    const harbour = l.rows.find((r) => r.rawCat === "Harbour")!;
    expect(riverside.baseX).toBeCloseTo(0, 5); // value 0 → x 0
    expect(riverside.dotX).toBeGreaterThan(harbour.dotX);
  });

  it("insets the right so the dot leaves room for its value label", () => {
    const l = computeLollipopLayout(data, dims, "desc", 40);
    const maxDot = Math.max(...l.rows.map((r) => r.dotX));
    expect(maxDot).toBeLessThanOrEqual(l.innerWidth - 40 + 0.01);
  });

  it("throws on a non-numeric value", () => {
    const bad: LollipopData = {
      catField: "branch",
      valField: "loans",
      rows: [{ branch: "X", loans: "n/a" }],
    };
    expect(() => computeLollipopLayout(bad, dims)).toThrow(/invalid value/);
  });
});

describe("growStem — grows from the zero baseline to the dot", () => {
  it("is at the baseline at progress 0 and the dot at progress 1", () => {
    const l = computeLollipopLayout(data, dims);
    const r = l.rows[0];
    expect(growStem(r, 0)).toBeCloseTo(r.baseX, 5);
    expect(growStem(r, 1)).toBeCloseTo(r.dotX, 5);
  });
});
