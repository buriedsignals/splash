import { describe, it, expect } from "bun:test";
import { computeFanLayout, type FanData } from "../src/fan-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 30, left: 50 },
};

const data: FanData = {
  xField: "year",
  levels: [50, 80, 95],
  rows: [
    { year: 2022, actual: 100 },
    { year: 2023, actual: 110 },
    {
      year: 2024,
      actual: 120,
      central: 120,
      lo50: 120,
      hi50: 120,
      lo80: 120,
      hi80: 120,
      lo95: 120,
      hi95: 120,
    },
    {
      year: 2025,
      central: 130,
      lo50: 124,
      hi50: 136,
      lo80: 118,
      hi80: 142,
      lo95: 112,
      hi95: 148,
    },
    {
      year: 2026,
      central: 142,
      lo50: 132,
      hi50: 152,
      lo80: 122,
      hi80: 162,
      lo95: 112,
      hi95: 172,
    },
  ],
};

describe("computeFanLayout", () => {
  it("splits history (actual) from the forecast fan (central)", () => {
    const l = computeFanLayout(data, dims);
    expect(l.history).toHaveLength(3); // 2022, 2023, 2024
    expect(l.central).toHaveLength(3); // 2024, 2025, 2026
    expect(l.bands).toHaveLength(3); // 50, 80, 95
  });

  it("nests the bands: 95% contains 80% contains 50% at a forecast step", () => {
    const l = computeFanLayout(data, dims);
    const at = (lv: number) => l.bands.find((b) => b.level === lv)!.points[2]; // 2026
    // screen y is inverted: a HIGHER value → SMALLER y. Outer band has lower loY-floor... use spans.
    const span = (lv: number) => Math.abs(at(lv).loY - at(lv).hiY);
    expect(span(95)).toBeGreaterThan(span(80));
    expect(span(80)).toBeGreaterThan(span(50));
  });

  it("starts the fan at zero width at 'now'", () => {
    const l = computeFanLayout(data, dims);
    for (const b of l.bands)
      expect(Math.abs(b.points[0].loY - b.points[0].hiY)).toBeCloseTo(0, 5);
  });

  it("widens the fan into the future (later step is wider than the first)", () => {
    const l = computeFanLayout(data, dims);
    const b95 = l.bands.find((b) => b.level === 95)!;
    const span = (i: number) => Math.abs(b95.points[i].loY - b95.points[i].hiY);
    expect(span(2)).toBeGreaterThan(span(0));
  });

  it("marks 'now' at the first forecast x", () => {
    const l = computeFanLayout(data, dims);
    expect(l.nowX).toBeCloseTo(l.central[0].x, 5);
  });

  it("throws with fewer than 2 rows", () => {
    expect(() =>
      computeFanLayout(
        { xField: "year", levels: [50], rows: [{ year: 2024, actual: 1 }] },
        dims,
      ),
    ).toThrow(/≥ 2 rows/);
  });
});
