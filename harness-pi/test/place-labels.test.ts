import { describe, expect, it } from "bun:test";
import { sourceSpelling } from "../craft/_shared/place-labels.mjs";

const BUCHAREST = { lat: 44.43, lon: 26.1 };
const KYIV = { lat: 50.45, lon: 30.52 };

describe("sourceSpelling — a locator place left in the source's spelling on a non-English page", () => {
  it("should refuse a bare English exonym on a French page", () => {
    expect(() => sourceSpelling(["Bucharest"], [{ name: "Bucharest", ...BUCHAREST }], "fr")).toThrow(/places\[0\]/);
  });
  it("should hand the French name as a value that works", () => {
    expect(() => sourceSpelling(["Bucharest"], [{ name: "Bucharest", ...BUCHAREST }], "fr")).toThrow('{ name: "Bucharest", label: "Bucarest" }');
  });
  it("should offer the source spelling as the other value that works", () => {
    expect(() => sourceSpelling(["Kyiv"], [{ name: "Kyiv", ...KYIV }], "fr")).toThrow('{ name: "Kyiv", label: "Kyiv" }');
  });
  it("should accept a label the beat chose, even the source spelling", () => {
    expect(sourceSpelling([{ name: "Kyiv", label: "Kyiv" }], [{ name: "Kyiv", ...KYIV }], "fr")).toBeUndefined();
  });
  it("should accept the same place on an English page", () => {
    expect(sourceSpelling(["Bucharest"], [{ name: "Bucharest", ...BUCHAREST }], "en")).toBeUndefined();
  });
  it("should accept a place the table does not know", () => {
    expect(sourceSpelling(["Chisinau"], [{ name: "Chisinau", lat: 47.0, lon: 28.86 }], "fr")).toBeUndefined();
  });
  it("should accept a data name that is not the table's name for the nearby city", () => {
    expect(sourceSpelling(["Ilfov"], [{ name: "Ilfov", ...BUCHAREST }], "fr")).toBeUndefined();
  });
  it("should accept a page with no language", () => {
    expect(sourceSpelling(["Bucharest"], [{ name: "Bucharest", ...BUCHAREST }], null)).toBeUndefined();
  });
});
