import { describe, it, expect } from "bun:test";
import {
  dataShape,
  labelColumnValues,
  parseCsvRecords,
  renameColumns,
  sortCsv,
  valueAt,
} from "../src/csv";

describe("dataShape", () => {
  it("counts columns and data rows", () => {
    const s = dataShape("year,value\n2018,5\n2019,6\n");
    expect(s.columns).toEqual(["year", "value"]);
    expect(s.rows).toBe(2);
  });
  it("handles a trailing newline and multiple value columns", () => {
    const s = dataShape("year,A,B,C\n2018,1,2,3");
    expect(s.columns).toEqual(["year", "A", "B", "C"]);
    expect(s.rows).toBe(1);
  });
});

describe("sortCsv", () => {
  it("sorts data rows by the last column descending, keeping the header", () => {
    const out = sortCsv(
      "cause,count\nFalls,3100\nRoad,4200\nFire,1800",
      "desc",
    );
    expect(out).toBe("cause,count\nRoad,4200\nFalls,3100\nFire,1800");
  });
});

describe("renameColumns", () => {
  it("renames a machine column header to a human label, keeping the data", () => {
    const out = renameColumns("period,median_home_price_usd\n2020-Q1,322600", {
      median_home_price_usd: "Median home price",
    });
    expect(out).toBe("period,Median home price\n2020-Q1,322600");
  });
  it("leaves columns without a mapping untouched", () => {
    const out = renameColumns("year,value\n2020,5", { nope: "X" });
    expect(out).toBe("year,value\n2020,5");
  });
});

describe("valueAt", () => {
  it("returns the numeric value of the first value column at an x label", () => {
    const csv = "period,price\n2020-Q1,322600\n2022-Q4,442600";
    expect(valueAt(csv, "2022-Q4")).toBe(442600);
  });
  it("returns undefined when the x label is absent", () => {
    expect(valueAt("year,v\n2020,5", "1999")).toBeUndefined();
  });
});

describe("parseCsvRecords (RFC 4180)", () => {
  it("keeps a comma inside a quoted field literal and strips the quotes", () => {
    expect(parseCsvRecords('a,b\n"x, y",1')).toEqual([
      ["a", "b"],
      ["x, y", "1"],
    ]);
  });
  it("unescapes a doubled quote and keeps a newline inside quotes literal", () => {
    expect(parseCsvRecords('a,b\n"He said ""hi""\ntwice",2')).toEqual([
      ["a", "b"],
      ['He said "hi"\ntwice', "2"],
    ]);
  });
  it("trims unquoted cells but preserves a quoted interior verbatim", () => {
    expect(parseCsvRecords('a,b\n  plain  ," padded "')).toEqual([
      ["a", "b"],
      ["plain", " padded "],
    ]);
  });
});

describe("labelColumnValues", () => {
  it("returns the first-column data values, header skipped", () => {
    expect(labelColumnValues("city,beds\nBasel,812\nBern,431")).toEqual([
      "Basel",
      "Bern",
    ]);
  });
  it("keeps an RFC4180-quoted, comma-containing category as ONE label", () => {
    const ministry =
      "Ministère de l'Économie, des Finances et de la Souveraineté industrielle et numérique";
    expect(
      labelColumnValues(
        `ministère,budget\n"${ministry}",320\nMinistère des Armées,47`,
      ),
    ).toEqual([ministry, "Ministère des Armées"]);
  });
  it("drops empty labels and never throws on headerless/empty text", () => {
    expect(labelColumnValues("a,b\n,1\nx,2")).toEqual(["x"]);
    expect(labelColumnValues("")).toEqual([]);
    expect(labelColumnValues("a,b")).toEqual([]);
  });
});
