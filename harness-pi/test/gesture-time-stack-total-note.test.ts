import { describe, expect, it } from "bun:test";
import { readPoints, timeModel, validateTime } from "../craft/_shared/gesture-family-time.mjs";

// real-gwis on Osaurus, runs 12 and 14 (2026-11-09): "Peak: 1,148,499" on Africa's 2015 mark, whose reading is 689,651.
const rows: [string, number, number][] = [
  ["Africa", 2015, 689651],
  ["Asia", 2015, 458848],
  ["Africa", 2022, 611023],
  ["Asia", 2022, 351596],
];
const model = timeModel({ variant: "area-and-stacked-area", points: readPoints(rows.map(([series, t, value]) => ({ series, t, value }))) });
const claim = { takeaway: "Africa accounts for about two-thirds of the world's recorded wildfires", entity: "Africa" };
const name = (note: string) => () => validateTime({ gestures: [{ do: "name", mark: "2015 · Africa", note }], model, format: "static", claim });

describe("a note on one layer of a stack", () => {
  it("should refuse the stack's total printed alone on one layer", () => {
    expect(name("Peak: 1,148,499")).toThrow(/689,651 of 1,148,499/);
  });

  it("should accept the total next to the layer's own reading", () => {
    expect(name("689,651 of 1,148,499")).not.toThrow();
  });

  it("should accept the layer's own reading alone", () => {
    expect(name("Peak: 689,651")).not.toThrow();
  });
});

// Run 17: the same total written at the million scale, "World peak: 1.15 million", passed as a figure the plate holds.
describe("a stack's total on one layer, written at a scale", () => {
  it("should refuse the total in millions printed alone on one layer", () => {
    expect(name("World peak: 1.15 million")).toThrow(/0\.69 of 1\.15 million/);
  });

  it("should accept the layer's own reading in millions", () => {
    expect(name("Peak: 0.69 million")).not.toThrow();
  });
});
