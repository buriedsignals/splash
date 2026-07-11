// produce-time conformance guard for `stacked` — mirrors produce-conformance-grouped.test.ts.
// The guard must derive series colours from STACKED_SERIES_COLORS (black-first,
// component-private palette), NOT GROUPED_SERIES_COLORS (blue-first) — a wrong
// reuse would still pass isOkabeIto and hide the bug (see tokens.ts + brief).
import { describe, it, expect } from "bun:test";
import {
  runProduceConformance,
  PRODUCE_GUARDED_TYPES,
} from "../src/core/produce-conformance";

const cfg = (
  seriesFields: string[],
  rows: Record<string, string | number>[],
) => ({
  title: "Renewables now supply the biggest slice of the grid",
  source: { name: "Ember 2025", url: "https://ember.org/x" },
  altInsight: "Renewables now supply the biggest slice of the grid.",
  unit: "TWh",
  catField: "year",
  seriesFields,
  rows,
});

describe("stacked produce-time conformance", () => {
  it("is in the guarded set", () => {
    expect(PRODUCE_GUARDED_TYPES).toContain("stacked");
  });
  it("passes a default ≤5-series Okabe-Ito stack (baseline 0)", () => {
    const r = runProduceConformance(
      "stacked",
      cfg(
        ["hydro", "wind", "solar"],
        [
          { year: 2020, hydro: 120, wind: 60, solar: 20 },
          { year: 2024, hydro: 130, wind: 110, solar: 90 },
        ],
      ),
    );
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it("flags more than 5 series", () => {
    const r = runProduceConformance(
      "stacked",
      cfg(
        ["a", "b", "c", "d", "e", "f"],
        [{ year: 2020, a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }],
      ),
    );
    expect(r.violations.join(" ")).toMatch(/series/);
  });
});
