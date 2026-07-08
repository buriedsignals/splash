// produce-time conformance guard for `fan` — reconstructs the per-step forecast
// (central + per-level bands) from the ACTUAL rows the component renders, the
// same shape fan-conformance.test.ts exercises directly against checkFanConformance.
import { describe, it, expect } from "bun:test";
import {
  runProduceConformance,
  PRODUCE_GUARDED_TYPES,
} from "../src/core/produce-conformance";
import fanSample from "../assets/sample-data/fan.json";

describe("fan produce-time conformance", () => {
  it("is in the guarded set", () => {
    expect(PRODUCE_GUARDED_TYPES).toContain("fan");
  });
  it("passes the shipped sample (3 nested levels, labelled axis, one hue)", () => {
    const r = runProduceConformance("fan", fanSample);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it("flags a band that does not bracket the central estimate", () => {
    const r = runProduceConformance("fan", {
      title: fanSample.title,
      source: fanSample.source,
      unit: fanSample.unit,
      xField: fanSample.xField,
      levels: [80],
      rows: [
        { year: 2024, central: 100, lo80: 110, hi80: 120 }, // 100 not in [110,120]
      ],
    });
    expect(r.violations.some((m) => m.includes("bracket the central"))).toBe(
      true,
    );
  });
});
