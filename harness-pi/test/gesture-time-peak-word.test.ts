import { describe, expect, it } from "bun:test";
import { readPoints, timeModel, validateTime } from "../craft/_shared/gesture-family-time.mjs";

// real-gwis on Osaurus, runs 21–23 (2026-11-10): all three plates wrote "peak" on Africa's 2015 reading (689,651).
// 2015 is the world's peak; Africa's own is 2016 (699,806). No guard read the word "peak".
const rows: [string, number, number][] = [
  ["Africa", 2015, 689651],
  ["Rest of World", 2015, 458848],
  ["Africa", 2016, 699806],
  ["Rest of World", 2016, 387783],
  ["Africa", 2024, 481321],
  ["Rest of World", 2024, 300000],
];
const model = timeModel({ variant: "area-and-stacked-area", points: readPoints(rows.map(([series, t, value]) => ({ series, t, value }))) });
const claim = { takeaway: "Africa accounts for about two-thirds of the world's recorded wildfires", entity: "Africa" };
const name = (mark: string, note: string) => () =>
  validateTime({ gestures: [{ do: "highlight", mark: "Africa" }, { do: "name", mark, note }], model, format: "static", claim });

const compare = (marks: string[], note: string) => () =>
  validateTime({ gestures: [{ do: "highlight", mark: "Africa" }, { do: "compare", marks, note }], model, format: "static", claim });

describe("a note that calls a reading a peak", () => {
  it("should refuse a peak written on a reading that is not its series' highest", () => {
    expect(name("2015 · Africa", "peak: 689,651")).toThrow(/2016/);
  });

  it("should offer the reading's time in place of the word", () => {
    expect(name("2015 · Africa", "peak: 689,651")).toThrow(/"2015: 689,651"/);
  });

  it("should accept a peak written on its series' highest reading", () => {
    expect(name("2016 · Africa", "peak: 699,806")).not.toThrow();
  });

  it("should accept the whole stack's peak stated with the stack's total", () => {
    expect(name("2015 · Africa", "World peak: 689,651 of 1,148,499")).not.toThrow();
  });

  // Run 24: the compare's own note said "since peak" from Africa's 2015, the world's peak, not Africa's.
  it("should refuse a compare's peak word when its earlier reading is not its series' highest", () => {
    expect(compare(["2016 · Africa", "2015 · Africa"], "up 1% since peak")).toThrow(/"up 1% since 2015"/);
  });

  it("should accept a compare's peak word measured from its series' highest", () => {
    expect(compare(["2024 · Africa", "2016 · Africa"], "down 31% since peak")).not.toThrow();
  });
});
