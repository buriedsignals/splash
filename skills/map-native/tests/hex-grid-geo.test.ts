import { describe, it, expect } from "bun:test";
import { computeHexGrid } from "../src/hex-grid-geo";
import { BLUES } from "../src/theme/scale";

// A tight cluster (many points) + a lone point far away → two populated cell regions.
const cluster = Array.from({ length: 30 }, (_, i) => ({
  lon: 2 + (i % 6) * 0.02,
  lat: 48 + Math.floor(i / 6) * 0.02,
  value: 10,
}));
const lone = [{ lon: 9, lat: 45, value: 100 }];
const points = [...cluster, ...lone];

describe("computeHexGrid — count", () => {
  const layout = computeHexGrid({
    points,
    binShape: "hex",
    aggregate: "count",
  });
  it("produces only populated cells (empty cells dropped)", () => {
    expect(layout.cells.length).toBeGreaterThan(0);
    for (const c of layout.cells) expect(c.count).toBeGreaterThan(0);
  });
  it("colours cells from the BLUES ramp via sequential bins", () => {
    for (const c of layout.cells) expect(BLUES).toContain(c.color);
    expect(layout.bins.length).toBe(5);
  });
  it("count aggregate = number of points in the cell", () => {
    const total = layout.cells.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(points.length); // every point lands in exactly one cell
    for (const c of layout.cells) expect(c.value).toBe(c.count);
  });
  it("is deterministic", () => {
    const a = computeHexGrid({ points, binShape: "hex", aggregate: "count" });
    const b = computeHexGrid({ points, binShape: "hex", aggregate: "count" });
    expect(a.cells.map((c) => [c.count, c.color])).toEqual(
      b.cells.map((c) => [c.count, c.color]),
    );
  });
});

describe("computeHexGrid — sum/mean + shape", () => {
  it("sum aggregate sums point values in each cell", () => {
    const layout = computeHexGrid({
      points,
      binShape: "square",
      aggregate: "sum",
    });
    expect(layout.binShape).toBe("square");
    const total = layout.cells.reduce((s, c) => s + c.value, 0);
    expect(total).toBe(30 * 10 + 100); // 400
  });
  it("mean aggregate averages point values in each cell", () => {
    const layout = computeHexGrid({
      points,
      binShape: "hex",
      aggregate: "mean",
    });
    // the lone cell has one point value 100 → its mean is exactly 100
    const loneCell = layout.cells.find((c) => c.count === 1);
    expect(loneCell?.value).toBe(100);
    expect(layout.aggregateLabel).toContain("mean");
  });
});

describe("computeHexGrid — cap + degenerate", () => {
  it("flags capped when a tiny cellSizeKm would exceed the cell cap", () => {
    const layout = computeHexGrid({
      points,
      binShape: "square",
      aggregate: "count",
      cellSizeKm: 2,
    });
    expect(layout.capped).toBe(true);
    expect(layout.cells.length).toBeLessThanOrEqual(2000);
  });
  it("pads a single-point (degenerate) bbox so a cell still forms", () => {
    const layout = computeHexGrid({
      points: [{ lon: 5, lat: 45 }],
      aggregate: "count",
    });
    expect(layout.cells.length).toBeGreaterThanOrEqual(1);
  });
});
