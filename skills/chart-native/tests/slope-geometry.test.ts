import { describe, it, expect } from "bun:test";
import {
  computeSlopeLayout,
  extendLine,
  spreadLabels,
  type SlopeData,
} from "../src/slope-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 120, bottom: 30, left: 120 },
};

const data: SlopeData = {
  labelField: "town",
  leftField: "y2019",
  rightField: "y2024",
  rows: [
    { town: "Northgate", y2019: 8, y2024: 5 }, // down
    { town: "Easton", y2019: 5, y2024: 6 }, // up
  ],
};

describe("computeSlopeLayout", () => {
  it("produces one line per row with two endpoints", () => {
    const l = computeSlopeLayout(data, dims);
    expect(l.lines).toHaveLength(2);
    expect(l.lines[0].x1).toBe(l.leftX);
    expect(l.lines[0].x2).toBe(l.rightX);
  });

  it("tags direction from the two values", () => {
    const l = computeSlopeLayout(data, dims);
    expect(l.lines[0].direction).toBe("down");
    expect(l.lines[1].direction).toBe("up");
  });

  it("uses POSITION encoding — domain is NOT forced to 0", () => {
    const l = computeSlopeLayout(data, dims);
    expect(l.valueDomain[0]).toBeGreaterThan(0); // min ~4.x, never 0
    expect(l.valueDomain[0]).toBeLessThan(5);
  });

  it("higher value sits higher on screen (smaller y)", () => {
    const l = computeSlopeLayout(data, dims);
    // Northgate left=8 is higher than Easton left=5 → smaller y
    expect(l.lines[0].y1).toBeLessThan(l.lines[1].y1);
  });

  it("throws on a non-numeric value", () => {
    const bad: SlopeData = {
      labelField: "town",
      leftField: "y2019",
      rightField: "y2024",
      rows: [{ town: "X", y2019: "n/a", y2024: 5 }],
    };
    expect(() => computeSlopeLayout(bad, dims)).toThrow(/invalid slope/);
  });
});

describe("extendLine — the line draws left→right", () => {
  it("sits at the left point at progress 0", () => {
    const l = computeSlopeLayout(data, dims);
    const e = extendLine(l.lines[0], 0);
    expect(e.x).toBeCloseTo(l.lines[0].x1, 5);
    expect(e.y).toBeCloseTo(l.lines[0].y1, 5);
  });

  it("reaches the right point at progress 1", () => {
    const l = computeSlopeLayout(data, dims);
    const e = extendLine(l.lines[0], 1);
    expect(e.x).toBeCloseTo(l.lines[0].x2, 5);
    expect(e.y).toBeCloseTo(l.lines[0].y2, 5);
  });
});

describe("spreadLabels — vertical de-collision at a gutter", () => {
  it("pushes apart labels closer than the min gap", () => {
    const out = spreadLabels(
      [
        { index: 0, y: 100 },
        { index: 1, y: 108 },
      ],
      20,
      400,
    );
    expect(Math.abs(out.get(0)! - out.get(1)!)).toBeGreaterThanOrEqual(20);
  });

  it("keeps the stack within the available height", () => {
    const out = spreadLabels(
      [
        { index: 0, y: 395 },
        { index: 1, y: 398 },
      ],
      30,
      400,
    );
    expect(Math.max(out.get(0)!, out.get(1)!)).toBeLessThanOrEqual(400);
  });
});
