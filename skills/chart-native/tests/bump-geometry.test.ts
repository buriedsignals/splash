import { describe, it, expect } from "bun:test";
import {
  computeBumpLayout,
  drawBumpPath,
  type BumpData,
} from "../src/bump-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 40, right: 120, bottom: 40, left: 40 },
};

const data: BumpData = {
  periods: ["2019", "2021", "2023"],
  items: [
    { label: "Streaming", ranks: [3, 2, 1] },
    { label: "Linear TV", ranks: [1, 1, 2] },
    { label: "Radio", ranks: [2, 3, 3] },
  ],
  highlight: ["Streaming"],
};

describe("computeBumpLayout", () => {
  it("places rank 1 at the top (smaller y) and rank N at the bottom", () => {
    const l = computeBumpLayout(data, dims);
    const r1 = l.rankAxis.find((r) => r.rank === 1)!;
    const r3 = l.rankAxis.find((r) => r.rank === 3)!;
    expect(r1.y).toBeLessThan(r3.y);
    expect(r1.y).toBeCloseTo(0, 5);
  });

  it("gives each line one point per period", () => {
    const l = computeBumpLayout(data, dims);
    expect(l.lines).toHaveLength(3);
    expect(l.lines[0].points).toHaveLength(3);
  });

  it("marks only the highlighted items", () => {
    const l = computeBumpLayout(data, dims);
    expect(l.lines.find((x) => x.label === "Streaming")!.highlighted).toBe(
      true,
    );
    expect(l.lines.find((x) => x.label === "Radio")!.highlighted).toBe(false);
  });

  it("treats every line as highlighted when no highlight set is given", () => {
    const l = computeBumpLayout({ ...data, highlight: undefined }, dims);
    expect(l.lines.every((x) => x.highlighted)).toBe(true);
  });

  it("throws when a period count is fewer than 2", () => {
    expect(() =>
      computeBumpLayout({ periods: ["2020"], items: [], highlight: [] }, dims),
    ).toThrow(/≥ 2 periods/);
  });

  it("throws when an item's rank count mismatches the periods", () => {
    expect(() =>
      computeBumpLayout(
        {
          periods: ["a", "b", "c"],
          items: [{ label: "x", ranks: [1, 2] }],
        },
        dims,
      ),
    ).toThrow(/expected 3/);
  });
});

describe("drawBumpPath — draws left → right", () => {
  it("is empty at progress 0 and whole at progress 1", () => {
    const l = computeBumpLayout(data, dims);
    const pts = l.lines[0].points;
    expect(drawBumpPath(pts, 0)).toEqual([]);
    expect(drawBumpPath(pts, 1)).toHaveLength(3);
  });

  it("reaches the horizontal midpoint at progress 0.5", () => {
    const l = computeBumpLayout(data, dims);
    const pts = l.lines[0].points;
    const drawn = drawBumpPath(pts, 0.5);
    const head = drawn[drawn.length - 1];
    const xMid = (pts[0].x + pts[pts.length - 1].x) / 2;
    expect(head.x).toBeCloseTo(xMid, 5);
  });
});
