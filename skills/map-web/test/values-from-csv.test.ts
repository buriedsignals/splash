// THE READER THAT DECIDES WHAT A CHOROPLETH IS COLOURED BY.
//
// `valuesFromCsv` turns the journalist's own CSV into the map from region code to value that every
// fill on the plate and every fill on the live layer is drawn from. It is the single most
// consequential reader in this format, and until 2026-08-22 nothing exercised it: the tree-wide
// sweep in `skills/splash/test/csv-readers-parse-their-fixtures.test.ts` walks a reader against a
// frozen CSV sitting under its own beat root, and this one lives in `assets/` — a template a beat
// copies — where there is no beat and no CSV by construction. The sweep reported it as an offender
// for having no fixture, which was the right complaint about the wrong thing: the fixture is not
// what was missing, a test was.
//
// It is written here, in the format's own suite, rather than fixed by dropping a CSV beside the
// template — a fixture that only makes a sweep stop complaining, without the sweep proving anything
// new, is a green light bought rather than earned.

import { describe, it, expect } from "bun:test";
import { valuesFromCsv } from "../assets/geo-choropleth.ts";

const CSV = [
  "Entity,Code,Year,value",
  "France,FRA,2023,11.0",
  "United Kingdom,GBR,2023,9.5",
  '"Bonaire Sint Eustatius and Saba",BES,2023,4.9',
  "Germany,DEU,2023,",
  "Sweden,SWE,2023,3.7",
].join("\n");

describe("valuesFromCsv", () => {
  it("should key each reading by its own region code", () => {
    const values = valuesFromCsv(CSV);
    expect(values.get("FRA")).toBe(11.0);
    expect(values.get("GBR")).toBe(9.5);
    expect(values.get("SWE")).toBe(3.7);
  });

  it("should read a quoted name carrying its own commas without losing the row", () => {
    // The reason this format tokenises rather than splitting on ",". Three of the entity names in
    // the real Our World in Data country list carry a comma of their own.
    expect(valuesFromCsv(CSV).get("BES")).toBe(4.9);
  });

  it("should leave a region with no reading OUT rather than colouring it zero", () => {
    // A blank is "did not report", and a no-data fill says so on the map. Reading it as 0 paints
    // the lowest class over a country nobody measured, which is the one lie a choropleth tells
    // most easily.
    const values = valuesFromCsv(CSV);
    expect(values.has("DEU")).toBe(false);
  });

  it("should refuse a value it cannot read honestly, naming the region and the text", () => {
    const dirty = "Entity,Code,Year,value\nFrance,FRA,2023,about eleven";
    expect(() => valuesFromCsv(dirty)).toThrow(/FRA.*about eleven/);
  });

  it("should refuse a table with no Code or no value column", () => {
    expect(() => valuesFromCsv("Entity,Year,amount\nFrance,2023,11")).toThrow(/Code \/ value/);
  });

  it("should read a thousands-grouped number as one number", () => {
    const grouped = 'Entity,Code,Year,value\nFrance,FRA,2023,"1,234.5"';
    expect(valuesFromCsv(grouped).get("FRA")).toBe(1234.5);
  });
});
