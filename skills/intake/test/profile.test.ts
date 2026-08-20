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
    expect(profileTable([])).toEqual({ rowCount: 0, columns: [] });
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
});
