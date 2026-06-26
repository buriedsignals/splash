import { describe, it, expect } from "bun:test";
import {
  computeStreamgraphLayout,
  growStream,
  type StreamgraphData,
} from "../src/streamgraph-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 30, left: 20 },
};

const data: StreamgraphData = {
  xField: "year",
  seriesFields: ["A", "B", "C"],
  rows: [
    { year: 2000, A: 10, B: 20, C: 5 },
    { year: 2010, A: 30, B: 15, C: 8 },
    { year: 2020, A: 50, B: 10, C: 12 },
  ],
};

describe("computeStreamgraphLayout", () => {
  it("produces one band per series, each with a point per step", () => {
    const l = computeStreamgraphLayout(data, dims);
    expect(l.bands).toHaveLength(3);
    for (const b of l.bands) expect(b.points).toHaveLength(3);
  });

  it("makes a band's thickness proportional to its value", () => {
    const l = computeStreamgraphLayout(data, dims);
    const a = l.bands.find((b) => b.seriesKey === "A")!;
    // A grows 10 → 50; its last step must be thicker than its first
    const thick = (p: { y0: number; y1: number }) => Math.abs(p.y1 - p.y0);
    expect(thick(a.points[2])).toBeGreaterThan(thick(a.points[0]));
  });

  it("keeps the bands contiguous (stacked, no gaps) at each step", () => {
    const l = computeStreamgraphLayout(data, dims);
    // sort bands at step 0 by vertical position, assert each touches the next
    const at = (b: (typeof l.bands)[number]) => b.points[0];
    const sorted = [...l.bands].sort((x, y) => at(x).y1 - at(y).y1);
    for (let i = 0; i < sorted.length - 1; i++)
      expect(Math.abs(at(sorted[i]).y0 - at(sorted[i + 1]).y1)).toBeLessThan(
        0.5,
      );
  });

  it("throws with fewer than 2 time steps", () => {
    expect(() =>
      computeStreamgraphLayout(
        { xField: "year", seriesFields: ["A"], rows: [{ year: 2000, A: 5 }] },
        dims,
      ),
    ).toThrow(/≥ 2 time steps/);
  });
});

describe("growStream — grows from the band's centre-line", () => {
  it("collapses every step to its mid-line at progress 0", () => {
    const l = computeStreamgraphLayout(data, dims);
    const g = growStream(l.bands[0], 0);
    for (const pt of g) expect(Math.abs(pt.y1 - pt.y0)).toBeCloseTo(0, 5);
  });

  it("is the full band at progress 1", () => {
    const l = computeStreamgraphLayout(data, dims);
    const g = growStream(l.bands[0], 1);
    expect(g[0].y0).toBeCloseTo(l.bands[0].points[0].y0, 5);
    expect(g[0].y1).toBeCloseTo(l.bands[0].points[0].y1, 5);
  });
});
