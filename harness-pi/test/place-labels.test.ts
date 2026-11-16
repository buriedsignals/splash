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
  // gx-locator static, 12B and Qwen3.5-9B, 2026-11-16: both wrote places: cities.map((c) => ({ name: c.name, label: c.name })),
  // the example's shape with its table dropped, and the French page printed "Bucharest".
  it("should refuse a label that copies the source spelling", () => {
    expect(() => sourceSpelling([{ name: "Bucharest", label: "Bucharest" }], [{ name: "Bucharest", ...BUCHAREST }], "fr")).toThrow('{ name: "Bucharest", label: "Bucarest" }');
  });
  it("should not offer the source spelling as a value that works", () => {
    let message = "";
    try {
      sourceSpelling(["Kyiv"], [{ name: "Kyiv", ...KYIV }], "fr");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain('label: "Kyiv"');
  });
  // gx-locator static, 12B, 2026-11-16 (gx-locator-seeded-osaurus-1794786931537): "Kyiv" refused, fixed, rendered, then
  // "Rostov" refused — two rounds for one table.
  it("should name every place the page prints in the source's spelling in one refusal", () => {
    expect(() =>
      sourceSpelling(["Kyiv", "Bucharest"], [{ name: "Kyiv", ...KYIV }, { name: "Bucharest", ...BUCHAREST }], "fr"),
    ).toThrow(/places\[0\][\s\S]*places\[1\][\s\S]*label: "Bucarest"/);
  });
  it("should accept a label that is not the source spelling", () => {
    expect(sourceSpelling([{ name: "Kyiv", label: "Kiev" }], [{ name: "Kyiv", ...KYIV }], "fr")).toBeUndefined();
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
