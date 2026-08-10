import { describe, it, expect } from "bun:test";
import { toCsv } from "../scripts/csv.mjs";

describe("toCsv", () => {
  it("should throw on an empty array", () => {
    expect(() => toCsv([])).toThrow(/non-empty array/);
  });

  it("should write the header row from the first row's keys", () => {
    const csv = toCsv([{ year: 1950, co2: 10.2 }]);
    expect(csv.split("\n")[0]).toBe("year,co2");
  });

  it("should write one data row per input row, in column order", () => {
    const csv = toCsv([
      { year: 1950, co2: 10.2 },
      { year: 1960, co2: 19.5 },
    ]);
    expect(csv).toBe("year,co2\n1950,10.2\n1960,19.5");
  });

  it("should quote a cell containing a comma", () => {
    const csv = toCsv([{ label: "Geneva, Switzerland", value: 1 }]);
    expect(csv.split("\n")[1]).toBe('"Geneva, Switzerland",1');
  });

  it("should double up an embedded quote inside a quoted cell", () => {
    const csv = toCsv([{ label: 'He said "hi"', value: 1 }]);
    expect(csv.split("\n")[1]).toBe('"He said ""hi""",1');
  });

  it("should quote a cell containing a newline", () => {
    const csv = toCsv([{ label: "line one\nline two", value: 1 }]);
    expect(csv.split("\n")).toEqual([
      "label,value",
      '"line one',
      'line two",1',
    ]);
  });

  it("should render null and undefined as an empty cell", () => {
    const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
    expect(csv.split("\n")[1]).toBe(",,0");
  });
});
