import { describe, it, expect } from "bun:test";
import {
  runProduceConformance,
  PRODUCE_GUARDED_TYPES,
} from "../src/core/produce-conformance";

const cfg = (rows: Record<string, string | number>[]) => ({
  title: "Hire bikes peak twice a day — the commute rush",
  source: {
    name: "Riverton cycle-share telemetry",
    url: "https://example.org/riverton-cycle-share",
  },
  unit: "trips per hour (weekday average)",
  categoryField: "hour",
  valueField: "trips",
  rows,
});

describe("radial-bar produce-time conformance", () => {
  it("is in the guarded set", () => {
    expect(PRODUCE_GUARDED_TYPES).toContain("radial-bar");
  });

  it("passes a normal cyclical (hour-of-day) dataset", () => {
    // the two commute peaks (07-09, 16-18), like the shipped sample data —
    // trips-by-hour is CYCLICAL (hour 23 wraps back to hour 0), not a plain ranking.
    const trips = [
      38, 22, 14, 9, 12, 41, 118, 264, 392, 231, 142, 138, 176, 181, 149, 167,
      248, 371, 318, 196, 124, 92, 71, 54,
    ];
    const rows = trips.map((t, h) => ({
      hour: String(h).padStart(2, "0"),
      trips: t,
    }));
    const r = runProduceConformance("radial-bar", cfg(rows));
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
});
