import { describe, it, expect } from "bun:test";
import {
  symbolLabels,
  formatLabelValue,
  LABEL_INSIDE_MIN_RADIUS,
} from "../src/symbol-labels";
import type { PlacedSymbol } from "../src/symbol-geo";

const sym = (over: Partial<PlacedSymbol>): PlacedSymbol => ({
  lon: 0,
  lat: 0,
  value: 100,
  radius: 30,
  ...over,
});

describe("formatLabelValue", () => {
  it("shows small integers as-is", () => {
    expect(formatLabelValue(296)).toBe("296");
    expect(formatLabelValue(5)).toBe("5");
  });
  it("rounds to the nearest integer below 1000", () => {
    expect(formatLabelValue(123.4)).toBe("123");
  });
  it("compacts thousands and millions, trimming a trailing .0", () => {
    expect(formatLabelValue(1500)).toBe("1.5k");
    expect(formatLabelValue(2000)).toBe("2k");
    expect(formatLabelValue(2_300_000)).toBe("2.3M");
  });
});

describe("symbolLabels", () => {
  const symbols: PlacedSymbol[] = [
    sym({ value: 296, radius: 40, label: "London", lon: -0.1, lat: 51.5 }),
    sym({ value: 52, radius: 8, label: "Amsterdam", lon: 4.9, lat: 52.4 }),
  ];
  const labels = symbolLabels(symbols);

  it("returns one label per symbol, preserving order", () => {
    expect(labels.length).toBe(2);
    expect(labels.map((l) => l.name)).toEqual(["London", "Amsterdam"]);
  });
  it("formats the value text and carries coordinates + radius", () => {
    expect(labels[0].valueText).toBe("296");
    expect(labels[0].lon).toBe(-0.1);
    expect(labels[0].radius).toBe(40);
  });
  it("places the value INSIDE a large enough circle, BESIDE a small one", () => {
    expect(labels[0].placement).toBe("inside"); // radius 40 >= threshold
    expect(labels[1].placement).toBe("beside"); // radius 8 < threshold
  });
  it("uses an empty name when the symbol has no label", () => {
    const [l] = symbolLabels([sym({ label: undefined })]);
    expect(l.name).toBe("");
  });
  it("placement boundary is LABEL_INSIDE_MIN_RADIUS (inclusive)", () => {
    const [l] = symbolLabels([sym({ radius: LABEL_INSIDE_MIN_RADIUS })]);
    expect(l.placement).toBe("inside");
  });
  it("is deterministic", () => {
    expect(symbolLabels(symbols)).toEqual(labels);
  });
});
