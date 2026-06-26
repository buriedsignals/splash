import { describe, it, expect } from "bun:test";
import {
  computeMarimekkoLayout,
  type MarimekkoData,
} from "../src/marimekko-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 20, bottom: 30, left: 20 },
};

// two columns, weights 60/40; each split into two series
const data: MarimekkoData = {
  seriesFields: ["A", "B"],
  columns: [
    { label: "Big", weight: 60, values: [75, 25] },
    { label: "Small", weight: 40, values: [50, 50] },
  ],
};

describe("computeMarimekkoLayout", () => {
  it("produces one cell per column × series", () => {
    const l = computeMarimekkoLayout(data, dims);
    expect(l.cells).toHaveLength(4);
    expect(l.cols).toHaveLength(2);
  });

  it("column widths are proportional to weight and sum to the inner width", () => {
    const l = computeMarimekkoLayout(data, dims);
    const big = l.cols.find((c) => c.label === "Big")!;
    const small = l.cols.find((c) => c.label === "Small")!;
    expect(big.w / small.w).toBeCloseTo(60 / 40, 5);
    expect(big.w + small.w).toBeCloseTo(l.innerWidth, 5);
  });

  it("columns are laid left→right with no gaps (x = previous x + w)", () => {
    const l = computeMarimekkoLayout(data, dims);
    expect(l.cols[1].x).toBeCloseTo(l.cols[0].x + l.cols[0].w, 5);
  });

  it("segments fill each column's full height (shares sum to 1)", () => {
    const l = computeMarimekkoLayout(data, dims);
    const bigCells = l.cells.filter((c) => c.colLabel === "Big");
    const sumH = bigCells.reduce((s, c) => s + c.h, 0);
    expect(sumH).toBeCloseTo(l.innerHeight, 5);
    expect(bigCells[0].share + bigCells[1].share).toBeCloseTo(1, 5);
  });

  it("a cell's area encodes the JOINT share (col-share × within-share)", () => {
    const l = computeMarimekkoLayout(data, dims);
    const bigA = l.cells.find(
      (c) => c.colLabel === "Big" && c.seriesKey === "A",
    )!;
    const area = bigA.w * bigA.h;
    const joint = (60 / 100) * 0.75; // col share × within share
    expect(area / (l.innerWidth * l.innerHeight)).toBeCloseTo(joint, 5);
  });

  it("throws when a column's value count mismatches the series", () => {
    const bad: MarimekkoData = {
      seriesFields: ["A", "B"],
      columns: [{ label: "X", weight: 1, values: [1] }],
    };
    expect(() => computeMarimekkoLayout(bad, dims)).toThrow(/expected 2/);
  });
});
