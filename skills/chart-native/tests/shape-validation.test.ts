import { describe, it, expect } from "bun:test";
import { parseCsv } from "../src/csv";
import { validateShape, ShapeMismatchError } from "../src/shape-validation";

const p = (csv: string) => parseCsv(csv);

describe("validateShape", () => {
  it("accepts a single-shape CSV for bar (category + one value)", () => {
    expect(() =>
      validateShape("bar", p("country,share\nBrazil,87.3\nIndia,19.8")),
    ).not.toThrow();
  });
  it("accepts a paired-shape CSV for scatter (two numeric columns)", () => {
    expect(() =>
      validateShape("scatter", p("school,spend,score\nA,5200,72\nB,3100,58")),
    ).not.toThrow();
  });
  it("accepts a wide-shape CSV for grouped (category + ≥2 numeric series)", () => {
    expect(() =>
      validateShape("grouped", p("region,2019,2020\nNorth,4,6\nSouth,3,5")),
    ).not.toThrow();
  });
  it("rejects a wide-shape CSV with only one numeric series", () => {
    expect(() =>
      validateShape("grouped", p("region,2019\nNorth,4\nSouth,3")),
    ).toThrow(ShapeMismatchError);
  });
  it("names the expected shape and what it got", () => {
    let msg = "";
    try {
      validateShape("grouped", p("region,2019\nNorth,4"));
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/wide/);
    expect(msg).toMatch(/grouped/);
  });
  it("rejects a paired-shape CSV that has fewer than two numeric columns", () => {
    expect(() => validateShape("scatter", p("city,pop\nX,10"))).toThrow(
      ShapeMismatchError,
    );
  });
  it("accepts a distribution-shape CSV (at least one numeric column)", () => {
    expect(() =>
      validateShape("beeswarm", p("group,value\nA,1\nA,2\nB,3")),
    ).not.toThrow();
  });

  // fan is declared "wide" but its CSV is SPARSE by convention (history rows
  // fill `actual` and leave the forecast columns blank; forecast rows are the
  // mirror), so every forecast column fails the generic wide/numeric-density
  // rule — validateShape special-cases it on the magic header names instead.
  it("accepts a sparse fan CSV (actual + central + a matched lo/hi pair)", () => {
    expect(() =>
      validateShape(
        "fan",
        p(
          "year,actual,central,lo80,hi80\n2020,100,,,\n2021,105,,,\n2022,,110,102,118",
        ),
      ),
    ).not.toThrow();
  });
  it("rejects a fan CSV missing the central column", () => {
    expect(() =>
      validateShape(
        "fan",
        p("year,actual,lo80,hi80\n2020,100,,\n2021,,95,105"),
      ),
    ).toThrow(ShapeMismatchError);
  });
  it("rejects a fan CSV with an unmatched lo{n} (no paired hi{n})", () => {
    expect(() =>
      validateShape(
        "fan",
        p("year,actual,central,lo80\n2020,100,,\n2021,,110,102"),
      ),
    ).toThrow(ShapeMismatchError);
  });
});
