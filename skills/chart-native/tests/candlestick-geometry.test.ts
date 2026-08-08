import { describe, it, expect } from "bun:test";
import {
  computeCandlestickLayout,
  growCandleBody,
  type CandlestickData,
} from "../src/candlestick-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 20, right: 20, bottom: 30, left: 50 },
};

const data: CandlestickData = {
  periods: [
    { date: "Jan", open: 100, high: 112, low: 98, close: 108 }, // up
    { date: "Feb", open: 108, high: 110, low: 96, close: 100 }, // down
    { date: "Mar", open: 100, high: 104, low: 92, close: 102 }, // up
  ],
};

describe("computeCandlestickLayout", () => {
  it("classifies up (close ≥ open) vs down candles", () => {
    const l = computeCandlestickLayout(data, dims);
    expect(l.candles[0].up).toBe(true);
    expect(l.candles[1].up).toBe(false);
  });

  it("puts the wick (high→low) outside the body (open→close)", () => {
    const l = computeCandlestickLayout(data, dims);
    const c = l.candles[0];
    // screen y inverted: high is the smallest y, low the largest
    expect(c.highY).toBeLessThanOrEqual(c.bodyTop + 0.001);
    expect(c.lowY).toBeGreaterThanOrEqual(c.bodyBottom - 0.001);
  });

  it("throws on invalid OHLC (high below the body)", () => {
    expect(() =>
      computeCandlestickLayout(
        {
          periods: [
            { date: "x", open: 100, high: 105, low: 90, close: 100 },
            { date: "y", open: 100, high: 95, low: 90, close: 102 }, // high < close
          ],
        },
        dims,
      ),
    ).toThrow(/invalid OHLC/);
  });

  it("does NOT force the price axis through 0", () => {
    const l = computeCandlestickLayout(data, dims);
    expect(l.priceDomain[0]).toBeGreaterThan(0);
  });
});

describe("growCandleBody — grows from the open", () => {
  it("has zero height at progress 0 and the full body at progress 1", () => {
    const l = computeCandlestickLayout(data, dims);
    const c = l.candles[0]; // up
    const g0 = growCandleBody(c, 0);
    expect(Math.abs(g0.top - g0.bottom)).toBeCloseTo(0, 5);
    const g1 = growCandleBody(c, 1);
    expect(g1.top).toBeCloseTo(c.bodyTop, 5);
    expect(g1.bottom).toBeCloseTo(c.bodyBottom, 5);
  });
});

describe("the date axis keeps its labels a step apart", () => {
  // Found by RENDERING, not by review: with 12 monthly periods and a step of 2, keeping both
  // "every 2nd" and "the last" put ticks at index 10 and 11 — adjacent — and snap-contrast
  // failed at 1:1 because one label was sampling the other as its background.
  // MUTATION: restoring the old `i % step === 0 || i === n - 1` filter → this fails.
  const twelve = {
    periods: Array.from({ length: 12 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, "0")}`,
      open: 5000,
      high: 5100,
      low: 4900,
      close: 5050,
    })),
  };

  it("never places the forced last label beside a stepped one", () => {
    const l = computeCandlestickLayout(twelve, dims);
    const gaps = l.dateTicks
      .slice(1)
      .map((t, i) => t.pos - l.dateTicks[i].pos);
    const bandWidth = dims.width - dims.padding.left - dims.padding.right;
    // a step of 2 over 12 periods ⇒ every surviving pair is ≥ ~2 bands apart
    for (const g of gaps) expect(g).toBeGreaterThan((bandWidth / 12) * 1.5);
  });

  it("still dates the last period, and writes the month by NAME", () => {
    const l = computeCandlestickLayout(twelve, dims, { lang: "de" });
    expect(l.dateTicks[l.dateTicks.length - 1].label).toContain("Dez");
    for (const t of l.dateTicks) expect(t.label).not.toMatch(/^\d+\/\d+/);
  });
});
