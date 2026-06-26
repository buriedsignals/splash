import { describe, it, expect } from "bun:test";
import { checkCalendarConformance } from "../src/core/conformance";
import { computeCalendarLayout } from "../src/calendar-geometry";
import sample from "../assets/sample-data/calendar.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const layout = computeCalendarLayout(
  { unit: sample.unit, days: sample.days },
  {
    width: 840,
    height: 360,
    padding: { top: 40, right: 20, bottom: 30, left: 40 },
  },
);

describe("the shipped calendar is conformant (global ++ calendar)", () => {
  it("passes with zero violations (sequential ramp, real range, full year)", () => {
    const v = checkCalendarConformance(
      {
        title: sample.title,
        source: sample.source,
        unit: sample.unit,
        rampStops: layout.rampStops,
        valueDomain: layout.valueDomain,
        dayCount: sample.days.length,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a non-monotonic (rainbow) ramp", () => {
    const v = checkCalendarConformance(
      {
        title: sample.title,
        source: sample.source,
        unit: sample.unit,
        rampStops: ["#0000ff", "#00ff00", "#ff0000"],
        valueDomain: layout.valueDomain,
        dayCount: 366,
      },
      text,
    );
    expect(v.some((m) => m.includes("not monotonic"))).toBe(true);
  });

  it("flags too-few days", () => {
    const v = checkCalendarConformance(
      {
        title: sample.title,
        source: sample.source,
        unit: sample.unit,
        rampStops: layout.rampStops,
        valueDomain: layout.valueDomain,
        dayCount: 5,
      },
      text,
    );
    expect(v.some((m) => m.includes("< 14"))).toBe(true);
  });
});
