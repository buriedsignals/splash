import { describe, it, expect } from "bun:test";
import {
  computeLorenzLayout,
  giniOf,
  type LorenzData,
} from "../src/lorenz-geometry";

const dims = {
  width: 400,
  height: 400,
  padding: { top: 20, right: 20, bottom: 30, left: 40 },
};

const equalityLine = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

const market = [
  { x: 0, y: 0 },
  { x: 0.1, y: 0.02 },
  { x: 0.2, y: 0.05 },
  { x: 0.3, y: 0.09 },
  { x: 0.4, y: 0.14 },
  { x: 0.5, y: 0.2 },
  { x: 0.6, y: 0.28 },
  { x: 0.7, y: 0.38 },
  { x: 0.8, y: 0.51 },
  { x: 0.9, y: 0.68 },
  { x: 1, y: 1 },
];

describe("giniOf", () => {
  it("is 0 for perfect equality (the diagonal)", () => {
    expect(giniOf(equalityLine)).toBeCloseTo(0, 6);
  });

  it("is ~1 for total inequality (one taker)", () => {
    const total = [
      { x: 0, y: 0 },
      { x: 0.999, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(giniOf(total)).toBeGreaterThan(0.99);
  });

  it("matches the hand-computed Gini for the market-income curve (~0.43)", () => {
    expect(giniOf(market)).toBeCloseTo(0.43, 2);
  });
});

describe("computeLorenzLayout", () => {
  const data: LorenzData = {
    xLabel: "households",
    yLabel: "income",
    series: [{ label: "Market", points: market }],
  };

  it("maps (0,0) to the bottom-left and (1,1) to the top-right", () => {
    const l = computeLorenzLayout(data, dims);
    const pts = l.series[0].points;
    expect(pts[0].y).toBeGreaterThan(pts[pts.length - 1].y); // (0,0) lower on screen
    expect(pts[0].x).toBeLessThan(pts[pts.length - 1].x);
  });

  it("draws the line of equality corner to corner", () => {
    const l = computeLorenzLayout(data, dims);
    expect(l.equality.x0).toBeCloseTo(0, 5);
    expect(l.equality.y1).toBeCloseTo(0, 5); // (1,1) → top
  });

  it("throws when a series doesn't end at (1,1)", () => {
    expect(() =>
      computeLorenzLayout(
        {
          xLabel: "h",
          yLabel: "i",
          series: [
            {
              label: "bad",
              points: [
                { x: 0, y: 0 },
                { x: 1, y: 0.8 },
              ],
            },
          ],
        },
        dims,
      ),
    ).toThrow(/must end at \(1,1\)/);
  });
});
