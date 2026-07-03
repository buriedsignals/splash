import { describe, it, expect } from "bun:test";
import { dataShape, sortCsv, renameColumns, valueAt } from "../src/csv";

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
