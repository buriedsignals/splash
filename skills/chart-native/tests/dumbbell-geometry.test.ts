import { describe, it, expect } from "bun:test";
import {
  computeDumbbellLayout,
  extendConnector,
  type DumbbellData,
} from "../src/dumbbell-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 60, bottom: 40, left: 120 },
};

const data: DumbbellData = {
  labelField: "sector",
  leftField: "women",
  rightField: "men",
  rows: [
    { sector: "Retail", women: 14, men: 17 }, // gap 3
    { sector: "Finance", women: 28, men: 41 }, // gap 13
    { sector: "Health", women: 22, men: 27 }, // gap 5
  ],
};

describe("computeDumbbellLayout", () => {
  it("produces one row per category with two endpoints", () => {
    const l = computeDumbbellLayout(data, dims);
    expect(l.rows).toHaveLength(3);
  });

  it("sorts by gap descending by default (widest first)", () => {
    const l = computeDumbbellLayout(data, dims);
    expect(l.rows.map((r) => r.rawLabel)).toEqual([
      "Finance",
      "Health",
      "Retail",
    ]);
  });

  it("uses POSITION encoding — x domain is NOT forced to 0", () => {
    const l = computeDumbbellLayout(data, dims);
    expect(l.valueDomain[0]).toBeGreaterThan(0); // min ~13, never 0
  });

  it("a bigger value sits further right", () => {
    const l = computeDumbbellLayout(data, dims);
    const fin = l.rows.find((r) => r.rawLabel === "Finance")!;
    expect(fin.xRight).toBeGreaterThan(fin.xLeft);
  });

  it("computes the signed gap per row", () => {
    const l = computeDumbbellLayout(data, dims);
    const fin = l.rows.find((r) => r.rawLabel === "Finance")!;
    expect(fin.gap).toBe(13);
  });

  it("throws on a non-numeric value", () => {
    const bad: DumbbellData = {
      labelField: "sector",
      leftField: "women",
      rightField: "men",
      rows: [{ sector: "X", women: "n/a", men: 5 }],
    };
    expect(() => computeDumbbellLayout(bad, dims)).toThrow(/invalid dumbbell/);
  });
});

describe("computeDumbbellLayout — endpoints keyed by column, never by magnitude", () => {
  it("a DECREASING row (leftField value > rightField value) keeps xLeft on leftField and xRight on rightField (no swap)", () => {
    const decreasing: DumbbellData = {
      labelField: "cat",
      leftField: "start",
      rightField: "end",
      rows: [{ cat: "A", start: 4, end: 2.1 }],
    };
    const l = computeDumbbellLayout(decreasing, dims, "none");
    const row = l.rows[0];
    expect(row.leftVal).toBe(4);
    expect(row.rightVal).toBe(2.1);
    // xLeft is ALWAYS x(leftVal) and xRight is ALWAYS x(rightVal) — position on
    // the value axis, keyed by column identity. Since leftVal (4) > rightVal
    // (2.1) here, xLeft must sit at the BIGGER pixel position — if endpoints
    // were instead reordered by magnitude (e.g. min always on xLeft), this
    // would flip and silently read as an increase.
    expect(row.xLeft).toBeGreaterThan(row.xRight);
    expect(row.gap).toBe(-1.9); // signed: rightVal - leftVal, a real decrease
  });
});

describe("extendConnector — the gap opens up", () => {
  it("sits at the left dot at progress 0", () => {
    const l = computeDumbbellLayout(data, dims);
    expect(extendConnector(l.rows[0], 0)).toBeCloseTo(l.rows[0].xLeft, 5);
  });

  it("reaches the right dot at progress 1", () => {
    const l = computeDumbbellLayout(data, dims);
    expect(extendConnector(l.rows[0], 1)).toBeCloseTo(l.rows[0].xRight, 5);
  });
});
