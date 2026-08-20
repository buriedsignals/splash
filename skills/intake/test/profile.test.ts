// twin/skills/intake/test/profile.test.ts
import { describe, it, expect } from "bun:test";
import { profileTable } from "../scripts/profile.mjs";

const ROWS = [
  ["commune", "year", "rainfall"],
  ["Annemasse", "2015", "912"],
  ["Annemasse", "2025", "604"],
  ["Gaillard", "2015", ""],
];

describe("profileTable", () => {
  it("should count the data rows, excluding the header", () => {
    expect(profileTable(ROWS).rowCount).toBe(3);
  });

  it("should type a numeric column as number and give its range", () => {
    const rainfall = profileTable(ROWS).columns.find(
      (c) => c.name === "rainfall",
    );
    expect(rainfall.type).toBe("number");
    expect(rainfall.min).toBe(604);
    expect(rainfall.max).toBe(912);
  });

  // The column total is what makes a part-to-whole takeaway checkable downstream: a total is by
  // construction outside the range of the column it sums, so a profile carrying only [min, max]
  // gives the grounding check no way to place one. Measured on the real Milan Cortina rows, whose
  // takeaway cited 14 + 11 + 9 = 34 and was refused for exactly that reason.
  it("should give a numeric column its total beside its range", () => {
    const melted = profileTable([
      ["acteur", "glace_fondue_mt"],
      ["Jeux", "14"],
      ["Eni", "11"],
      ["Stellantis + ITA Airways", "9"],
    ]).columns.find((c) => c.name === "glace_fondue_mt");
    expect(melted.sum).toBe(34);
  });

  it("should give a text column no total", () => {
    expect(
      profileTable(ROWS).columns.find((c) => c.name === "commune").sum,
    ).toBe(null);
  });

  it("should count missing values instead of silently dropping them", () => {
    expect(
      profileTable(ROWS).columns.find((c) => c.name === "rainfall").missing,
    ).toBe(1);
  });

  it("should not count a missing value as a distinct value", () => {
    // rainfall has one blank cell alongside two distinct present values (912, 604) —
    // a distinct count that forgets to filter blanks would read 3, not 2.
    expect(
      profileTable(ROWS).columns.find((c) => c.name === "rainfall").distinct,
    ).toBe(2);
  });

  it("should type a text column as text with no range", () => {
    const commune = profileTable(ROWS).columns.find(
      (c) => c.name === "commune",
    );
    expect(commune.type).toBe("text");
    expect(commune.min).toBe(null);
    expect(commune.distinct).toBe(2);
  });

  it("should not crash on an entirely empty table", () => {
    expect(profileTable([])).toEqual({
      rowCount: 0,
      columns: [],
      duplicates: { count: 0, rows: [] },
    });
  });

  it("should not type a hex-looking value as a number", () => {
    const table = profileTable([["v"], ["0x10"], ["10"]]);
    const v = table.columns.find((c) => c.name === "v");
    expect(v.type).toBe("text");
    expect(v.min).toBe(null);
  });

  it("should trim a header name padded with spaces, leaving its own values untouched", () => {
    const table = profileTable([
      [" price_eur ", "country"],
      ["1", "Netherlands, the"],
    ]);
    expect(table.columns.map((c) => c.name)).toEqual(["price_eur", "country"]);
  });

  it("should type a column with a thousands separator as number, once the column settles the convention", () => {
    // "1,234.5" pairs a comma with a later decimal point — that ordering only
    // reads as thousands-then-decimal, so it settles the whole column.
    const table = profileTable([
      ["price"],
      ["1,234.5"],
      ["987.25"],
    ]);
    const price = table.columns.find((c) => c.name === "price");
    expect(price.type).toBe("number");
    expect(price.min).toBe(987.25);
    expect(price.max).toBe(1234.5);
    expect(price.sum).toBeCloseTo(2221.75);
  });

  it("should keep an unsettled thousands-vs-decimal-comma column as text, with the reason recorded", () => {
    // Neither value pairs its comma with a decimal point, so nothing in the
    // column says whether the comma groups thousands or stands for a decimal.
    const table = profileTable([
      ["price"],
      ["1,234"],
      ["2,345"],
    ]);
    const price = table.columns.find((c) => c.name === "price");
    expect(price.type).toBe("text");
    expect(price.min).toBe(null);
    expect(price.reason).toMatch(/ambiguous/);
  });

  it("should not attach a reason to a column that never looked numeric", () => {
    const commune = profileTable(ROWS).columns.find((c) => c.name === "commune");
    expect(commune.reason).toBeUndefined();
  });

  it("should record a reason when a hex-looking value sits beside a plain numeric one", () => {
    const table = profileTable([["v"], [" 12 "], ["0x1F"]]);
    const v = table.columns.find((c) => c.name === "v");
    expect(v.type).toBe("text");
    expect(v.reason).toMatch(/0x1F/);
  });

  it("should report an exact duplicate row: how many, and which", () => {
    const table = profileTable([
      ["country", "price"],
      ["Spain", "712.0"],
      ["France", "987.25"],
      ["Spain", "712.0"],
    ]);
    expect(table.duplicates).toEqual({
      count: 1,
      rows: [{ values: ["Spain", "712.0"], indices: [0, 2], occurrences: 2 }],
    });
  });

  it("should report no duplicates when every row is unique", () => {
    expect(profileTable(ROWS).duplicates).toEqual({ count: 0, rows: [] });
  });

  it("should count a duplicate row exactly once in the report even with three copies", () => {
    const table = profileTable([
      ["a"],
      ["x"],
      ["x"],
      ["x"],
      ["y"],
    ]);
    expect(table.duplicates).toEqual({
      count: 1,
      rows: [{ values: ["x"], indices: [0, 1, 2], occurrences: 3 }],
    });
  });

  it("should read a uniform trailing unit as a number, recording the unit on the column", () => {
    // The stress-f housing-pressure shape: every cell carries the same trailing "%", so the
    // column is unambiguous and reading it (rather than refusing) is the legitimate call.
    const table = profileTable([
      ["pressure"],
      ["12 %"],
      ["9 %"],
      ["143 %"],
    ]);
    const pressure = table.columns.find((c) => c.name === "pressure");
    expect(pressure.type).toBe("number");
    expect(pressure.unit).toBe("%");
    expect(pressure.min).toBe(9);
    expect(pressure.max).toBe(143);
    expect(pressure.sum).toBeCloseTo(164);
    expect(pressure.reason).toBeUndefined();
  });

  it("should refuse a column whose unit is not the same throughout, with the reason recorded", () => {
    const table = profileTable([
      ["mixed"],
      ["12 %"],
      ["9 kg"],
    ]);
    const mixed = table.columns.find((c) => c.name === "mixed");
    expect(mixed.type).toBe("text");
    expect(mixed.min).toBe(null);
    expect(mixed.reason).toBeTruthy();
    expect(mixed.reason).toMatch(/unit/);
  });

  it("should still refuse with a reason when only some values carry a unit", () => {
    const table = profileTable([
      ["partial"],
      ["12 %"],
      ["9"],
    ]);
    const partial = table.columns.find((c) => c.name === "partial");
    expect(partial.type).toBe("text");
    expect(partial.reason).toBeTruthy();
  });

  it("should not read a hex-looking value as a number-with-unit", () => {
    const table = profileTable([["v"], [" 12 "], ["0x1F"]]);
    const v = table.columns.find((c) => c.name === "v");
    expect(v.type).toBe("text");
    expect(v.unit).toBeUndefined();
    expect(v.reason).toMatch(/0x1F/);
  });

  it("should report the gaps in a year column with a hole in the middle", () => {
    // stress-d-asylum-gap's own shape: 2008-2012, then a jump straight to 2015.
    const table = profileTable([
      ["year", "applications"],
      ["2008", "1487"],
      ["2009", "1423"],
      ["2010", "1419"],
      ["2011", "1211"],
      ["2012", "1217"],
      ["2015", "2100"],
      ["2016", "2240"],
      ["2017", "2310"],
    ]);
    const year = table.columns.find((c) => c.name === "year");
    expect(year.gaps).toEqual([2013, 2014]);
  });

  it("should report no gaps for a year column with none", () => {
    const table = profileTable([
      ["year"],
      ["2020"],
      ["2021"],
      ["2022"],
    ]);
    expect(table.columns.find((c) => c.name === "year").gaps).toEqual([]);
  });

  it("should not report gaps for a plain measurement column, even one with integer values and an uneven spacing", () => {
    // A price column is not a sequence with holes — any two rows can legitimately sit any
    // distance apart, so "gaps" is meaningless here and must not be invented.
    const table = profileTable([
      ["price"],
      ["10"],
      ["25"],
      ["4000"],
    ]);
    expect(table.columns.find((c) => c.name === "price").gaps).toBe(null);
  });

  it("should not report gaps for a text column", () => {
    expect(
      profileTable(ROWS).columns.find((c) => c.name === "commune").gaps,
    ).toBe(null);
  });

  it("should respect an evenly-spaced year column's own cadence rather than assuming every year", () => {
    // Every 5 years, no value missing — must not flag 2001-2004, 2006-2009, ... as gaps.
    const table = profileTable([
      ["year"],
      ["2000"],
      ["2005"],
      ["2010"],
      ["2020"],
    ]);
    const year = table.columns.find((c) => c.name === "year");
    // The grain here is 5 (the smallest step actually observed), and 2015 is the one
    // multiple-of-5 slot between 2010 and 2020 that never shows up.
    expect(year.gaps).toEqual([2015]);
  });
});
