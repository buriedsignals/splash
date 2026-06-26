import { describe, it, expect } from "bun:test";
import {
  computeBeeswarmLayout,
  type BeeswarmData,
} from "../src/beeswarm-geometry";

const dims = {
  width: 900,
  height: 400,
  padding: { top: 40, right: 40, bottom: 40, left: 40 },
};

// a spread of values that fits without vertical scaling
const data: BeeswarmData = {
  valueLabel: "score",
  points: Array.from({ length: 30 }, (_, i) => ({
    value: (i % 10) * 10 + Math.floor(i / 10), // clusters at 0,10,20,…
    category: i % 2 ? "A" : "B",
  })),
};

const RADIUS = 4;

describe("computeBeeswarmLayout", () => {
  it("places every point exactly once", () => {
    const l = computeBeeswarmLayout(data, dims, RADIUS);
    expect(l.nodes).toHaveLength(data.points.length);
  });

  it("positions x by value (a bigger value sits further right)", () => {
    const l = computeBeeswarmLayout(data, dims, RADIUS);
    const lowest = l.nodes.reduce((a, b) => (a.value < b.value ? a : b));
    const highest = l.nodes.reduce((a, b) => (a.value > b.value ? a : b));
    expect(lowest.x).toBeLessThan(highest.x);
  });

  it("dodges so no two dots overlap (centres ≥ 2r apart)", () => {
    const l = computeBeeswarmLayout(data, dims, RADIUS);
    for (let i = 0; i < l.nodes.length; i++)
      for (let j = i + 1; j < l.nodes.length; j++) {
        const dx = l.nodes[i].x - l.nodes[j].x;
        const dy = l.nodes[i].y - l.nodes[j].y;
        expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThanOrEqual(
          2 * RADIUS - 0.5,
        );
      }
  });

  it("keeps every dot inside the plot band", () => {
    const l = computeBeeswarmLayout(data, dims, RADIUS);
    for (const n of l.nodes) {
      expect(n.y - RADIUS).toBeGreaterThanOrEqual(-0.5);
      expect(n.y + RADIUS).toBeLessThanOrEqual(l.innerHeight + 0.5);
    }
  });

  it("does NOT force the value axis through 0 (position encoding)", () => {
    const shifted: BeeswarmData = {
      valueLabel: "score",
      points: [{ value: 50 }, { value: 60 }, { value: 70 }],
    };
    const l = computeBeeswarmLayout(shifted, dims, RADIUS);
    expect(l.valueDomain[0]).toBeGreaterThan(0);
  });

  it("throws on an empty set of points", () => {
    expect(() =>
      computeBeeswarmLayout({ valueLabel: "x", points: [] }, dims, RADIUS),
    ).toThrow(/no points/);
  });
});
