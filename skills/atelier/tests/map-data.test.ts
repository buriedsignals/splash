import { describe, it, expect } from "bun:test";
import { toCsv, toRows } from "../src/map-data";

describe("map-data derivation", () => {
  it("round-trips rows -> csv -> rows (numbers stay numbers)", () => {
    const rows = [
      { code: "FRA", value: 10 },
      { code: "SWE", value: 70 },
    ];
    expect(toRows(toCsv(rows))).toEqual(rows);
  });
  it("toCsv emits a header from the first row's keys", () => {
    expect(toCsv([{ code: "FRA", value: 10 }])).toBe("code,value\nFRA,10");
  });
  it("toRows keeps non-numeric cells as strings", () => {
    expect(toRows("city,pop\nParis,2100")).toEqual([
      { city: "Paris", pop: 2100 },
    ]);
  });
  it("toCsv of an empty array is an empty string", () => {
    expect(toCsv([])).toBe("");
  });
  it("round-trips a cell value containing a comma", () => {
    expect(toRows(toCsv([{ city: "Washington, D.C.", pop: 700 }]))).toEqual([
      { city: "Washington, D.C.", pop: 700 },
    ]);
  });
  it("keeps a leading-zero code as a string", () => {
    expect(toRows("code,value\n08,5")).toEqual([{ code: "08", value: 5 }]);
  });
  it("round-trips a cell value containing an embedded double-quote", () => {
    expect(toRows(toCsv([{ note: 'she said "hi"' }]))).toEqual([
      { note: 'she said "hi"' },
    ]);
  });
});
