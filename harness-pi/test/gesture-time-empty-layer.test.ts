import { describe, expect, it } from "bun:test";
import { dropEmptyLayers } from "../craft/_shared/gesture-time-run.mjs";

// real-gwis on Osaurus, runs 12 and 13 (2026-11-09): "Rest of World" (World minus six continents) is 0 every year,
// and the plate drew it and labelled it "Rest of World 0".
const at = (series: string, values: number[]) => values.map((value, k) => ({ series, key: String(2012 + k), t: 2012 + k, value }));
const series = (points: { series: string }[]) => [...new Set(points.map((p) => p.series))];

describe("dropEmptyLayers", () => {
  it("should leave out a stack layer that is zero at every time", () => {
    expect(series(dropEmptyLayers([...at("Africa", [5, 6]), ...at("Rest of World", [0, 0])], true))).toEqual(["Africa"]);
  });

  it("should keep a layer that is zero at some times only", () => {
    expect(series(dropEmptyLayers([...at("Africa", [5, 6]), ...at("Oceania", [0, 3])], true))).toEqual(["Africa", "Oceania"]);
  });

  it("should keep a zero series on a chart that does not stack", () => {
    expect(series(dropEmptyLayers([...at("Africa", [5, 6]), ...at("Rest of World", [0, 0])], false))).toEqual(["Africa", "Rest of World"]);
  });
});
