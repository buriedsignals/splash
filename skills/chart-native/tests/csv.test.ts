import { describe, it, expect } from "bun:test";
import { parseCsv } from "../src/csv";

describe("parseCsv — RFC 4180 quoted fields", () => {
  it("keeps a comma that is inside a double-quoted field as one cell", () => {
    const csv = [
      "source,amount",
      '"Ministère de l\'Économie, des Finances et de la Souveraineté industrielle",42',
    ].join("\n");
    const { columns, rows } = parseCsv(csv);
    expect(columns).toEqual(["source", "amount"]);
    expect(rows[0].source).toBe(
      "Ministère de l'Économie, des Finances et de la Souveraineté industrielle",
    );
    expect(rows[0].amount).toBe(42);
  });

  it("quoted comma-fields do not shift the column count / numeric detection", () => {
    const csv = [
      "ministry,budget",
      '"Économie, Finances",120',
      '"Intérieur, Outre-mer",95',
    ].join("\n");
    const { columns, rows, numericColumns } = parseCsv(csv);
    expect(columns).toEqual(["ministry", "budget"]);
    expect(rows).toHaveLength(2);
    expect(rows[0].ministry).toBe("Économie, Finances");
    expect(rows[1].ministry).toBe("Intérieur, Outre-mer");
    // budget is still detected as numeric despite the commas in column 0
    expect(numericColumns).toEqual(["budget"]);
    expect(rows[0].budget).toBe(120);
  });

  it('un-escapes a doubled double-quote ("") inside a quoted field', () => {
    const csv = ["label,n", '"the ""big"" one",7'].join("\n");
    const { rows } = parseCsv(csv);
    expect(rows[0].label).toBe('the "big" one');
    expect(rows[0].n).toBe(7);
  });

  it("still parses a plain unquoted CSV unchanged (back-compat)", () => {
    const csv = ["year,value", "2020,10", "2021,15"].join("\n");
    const { columns, rows, numericColumns } = parseCsv(csv);
    expect(columns).toEqual(["year", "value"]);
    expect(rows).toEqual([
      { year: 2020, value: 10 },
      { year: 2021, value: 15 },
    ]);
    expect(numericColumns).toEqual(["year", "value"]);
  });

  it("trims surrounding whitespace on unquoted cells but preserves it inside quotes", () => {
    const csv = ["a,b", ' x , "  y, z "'].join("\n");
    const { rows } = parseCsv(csv);
    expect(rows[0].a).toBe("x");
    expect(rows[0].b).toBe("  y, z ");
  });
});
