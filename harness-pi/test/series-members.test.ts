import { describe, expect, it } from "bun:test";
import { members, series } from "../craft/_shared/series.mjs";

// gx-small-multiples web, Qwen3.5-9B, three runs (2026-11-16): every failure was the juggling between code, English
// entity and French entity_fr — a names table keyed by code, rows filtered on entity with a French name — and a
// derived measure (the low-carbon share) computed by hand-indexed columns. members() and a row-function y take both
// decisions out of the beat.
const table = {
  columns: [{ name: "entity", type: "text" }, { name: "code", type: "text" }, { name: "year", type: "number" }, { name: "solar", type: "number" }, { name: "gas", type: "number" }, { name: "entity_fr", type: "text" }],
  rows: [
    ["Austria", "AUT", 2000, 1, 3, "Autriche"],
    ["Austria", "AUT", 2024, 3, 1, "Autriche"],
    ["Germany", "DEU", 2000, 2, 2, "Allemagne"],
    ["Germany", "DEU", 2024, 4, 0, "Allemagne"],
  ],
};

describe("members", () => {
  it("should name each entity in the page's language when data.json carries a localized column", () => {
    expect(members(table).map((m) => m.name)).toEqual(["Autriche", "Allemagne"]);
  });
  it("should give a where that selects that entity's rows", () => {
    expect(series(table, { x: "year", y: "solar", where: members(table)[1].where })).toEqual([{ year: 2000, value: 2 }, { year: 2024, value: 4 }]);
  });
  it("should carry the code", () => {
    expect(members(table)[0].code).toBe("AUT");
  });
  it("should fall back to the entity column when no localized column exists", () => {
    const plain = { columns: table.columns.slice(0, 5), rows: table.rows.map((r) => r.slice(0, 5)) };
    expect(members(plain).map((m) => m.name)).toEqual(["Austria", "Germany"]);
  });
});

describe("series with a row function for y", () => {
  it("should compute a derived measure from the row read by column name", () => {
    const share = (r) => r.solar / (r.solar + r.gas);
    expect(series(table, { x: "year", y: share, where: { code: "AUT" } })).toEqual([{ year: 2000, value: 0.25 }, { year: 2024, value: 0.75 }]);
  });
  it("should refuse a row function that reads a column data.json does not have", () => {
    expect(() => series(table, { x: "year", y: (r) => r.wind, where: { code: "AUT" } })).toThrow(/no column "wind"/);
  });
});
