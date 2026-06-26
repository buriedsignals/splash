import { describe, it, expect } from "bun:test";
import { checkCandlestickConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/candlestick.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [OKABE_ITO.blue, OKABE_ITO.orange];
const ohlc = sample.periods.map((c) => ({
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
}));

describe("the shipped candlestick is conformant (global ++ candlestick)", () => {
  it("passes with zero violations (valid OHLC, labelled axis, 2 CVD-safe colours)", () => {
    const v = checkCandlestickConformance(
      {
        title: sample.title,
        source: sample.source,
        priceLabel: sample.priceLabel,
        ohlc,
        directionColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags invalid OHLC", () => {
    const v = checkCandlestickConformance(
      {
        title: sample.title,
        source: sample.source,
        priceLabel: sample.priceLabel,
        ohlc: [{ open: 100, high: 95, low: 90, close: 102 }],
        directionColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("invalid OHLC"))).toBe(true);
  });

  it("flags a missing price-axis label", () => {
    const v = checkCandlestickConformance(
      {
        title: sample.title,
        source: sample.source,
        priceLabel: "",
        ohlc,
        directionColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("price-axis label"))).toBe(true);
  });

  it("flags an off-palette direction colour", () => {
    const v = checkCandlestickConformance(
      {
        title: sample.title,
        source: sample.source,
        priceLabel: sample.priceLabel,
        ohlc,
        directionColors: [OKABE_ITO.blue, "#FF0000"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
