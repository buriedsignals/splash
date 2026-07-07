import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Hire bikes peak twice a day — the commute rush",
  source: {
    name: "Riverton cycle-share telemetry",
    url: "https://example.org/riverton-cycle-share",
  },
  unit: "trips per hour (weekday average)",
};

describe("specToNativeConfig — radial-bar (single, CYCLICAL — no sort)", () => {
  it("maps category + value and keeps rows in CSV order (cyclical, not ranked)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "radial-bar",
      data: "hour,trips\n06,118\n07,264\n08,392\n09,231\n10,142",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("radial-bar");
    expect(config.categoryField).toBe("hour");
    expect(config.valueField).toBe("trips");
    // NOT sorted by value — angle encodes cyclical hour-of-day position, so row
    // order (06,07,08,09,10) must survive untouched. (parseCsv coerces the numeric-
    // looking "06"/"07"/... strings to numbers 6/7/... — that's the shared parser's
    // real behaviour, not something this mapper does; the order is what matters here.)
    expect(config.rows).toEqual([
      { hour: 6, trips: 118 },
      { hour: 7, trips: 264 },
      { hour: 8, trips: 392 },
      { hour: 9, trips: 231 },
      { hour: 10, trips: 142 },
    ]);
  });
});
