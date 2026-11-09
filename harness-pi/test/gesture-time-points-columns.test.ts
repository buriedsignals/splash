import { describe, expect, it } from "bun:test";
import { readPoints } from "../craft/_shared/gesture-family-time.mjs";

// real-gwis on Osaurus, run 16 (2026-11-09): beat.mjs read data.json by "Entity" and "Year" where its columns are
// "entity" and "year"; every point came out empty or timeless, and the refusal never said what the columns are.
const columns = ["entity", "code", "year", "events"];

describe("points that read no column of data.json", () => {
  it("should name data.json's columns when no point is left", () => {
    expect(() => readPoints([], { columns })).toThrow(/"entity", "code", "year", "events"/);
  });

  it("should name data.json's columns when a point has no time", () => {
    expect(() => readPoints([{ series: undefined, t: null, value: 49 }], { columns })).toThrow(/"entity", "code", "year", "events"/);
  });
});
