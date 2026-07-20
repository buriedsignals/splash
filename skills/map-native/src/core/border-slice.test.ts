import { describe, it, expect } from "bun:test";
import { buildDraw, sliceBorder, EMPTY_FEATURE } from "./border-slice.ts";

// A single 2-segment border: a 1°-ish horizontal line then a vertical one.
const segments: number[][][] = [
  [
    [0, 0],
    [1, 0],
  ],
  [
    [1, 0],
    [1, 1],
  ],
];

describe("buildDraw / sliceBorder", () => {
  it("accumulates per-segment lengths and a running total", () => {
    const d = buildDraw(segments);
    expect(d.segLines.length).toBe(2);
    expect(d.cum[0]).toBe(0);
    expect(d.cum[1]).toBeCloseTo(d.segLen[0], 6);
    expect(d.total).toBeCloseTo(d.segLen[0] + d.segLen[1], 6);
  });

  it("returns empty geometry when the window has no length", () => {
    const d = buildDraw(segments);
    const f = sliceBorder(d, 0, 0);
    expect(f.geometry.coordinates.length).toBe(0);
  });

  it("reveals only the first segment when toKm sits inside it", () => {
    const d = buildDraw(segments);
    const half = d.segLen[0] / 2;
    const f = sliceBorder(d, 0, half);
    // Only the first segment contributes.
    expect(f.geometry.coordinates.length).toBe(1);
  });

  it("reveals both segments when toKm passes the join", () => {
    const d = buildDraw(segments);
    const f = sliceBorder(d, 0, d.total);
    expect(f.geometry.coordinates.length).toBe(2);
  });

  it("EMPTY_FEATURE is an empty MultiLineString feature", () => {
    expect(EMPTY_FEATURE.geometry.type).toBe("MultiLineString");
    expect(EMPTY_FEATURE.geometry.coordinates.length).toBe(0);
  });
});
