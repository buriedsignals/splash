import { describe, expect, it } from "bun:test";
import { readPoints, timeModel, validateTime } from "../craft/_shared/gesture-family-time.mjs";

// real-gwis on Osaurus, run 17 (2026-11-09): "Africa's count down 1%" on a compare of 2015 (689,651) and 2016
// (699,806), where Africa rose 1.5%: the size passed, the direction was never read.
const rows: [string, number, number][] = [
  ["Africa", 2015, 689651],
  ["Africa", 2016, 699806],
  ["Africa", 2024, 481321],
];
const model = timeModel({ variant: "line", points: readPoints(rows.map(([series, t, value]) => ({ series, t, value }))) });
const claim = { takeaway: "Africa accounts for about two-thirds of the world's recorded wildfires", entity: "Africa" };
const compare = (marks: string[], note: string) => () =>
  validateTime({ gestures: [{ do: "compare", marks, note }], model, format: "static", claim });

describe("a change a compare's note names in words", () => {
  it("should refuse a fall named where the readings rose", () => {
    expect(compare(["2016 · Africa", "2015 · Africa"], "Africa's count down 1%")).toThrow(/up 1%/);
  });

  it("should accept a rise named where the readings rose", () => {
    expect(compare(["2016 · Africa", "2015 · Africa"], "Africa's count up 1%")).not.toThrow();
  });

  it("should accept a fall named where the readings fell", () => {
    expect(compare(["2024 · Africa", "2015 · Africa"], "Africa's count fell 30%")).not.toThrow();
  });
});
