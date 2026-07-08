import { describe, it, expect } from "bun:test";
import {
  isFrench,
  formatLocaleNumber,
  localizeNumberString,
  sourceLabel,
} from "../src/core/locale";
import { fmtBin } from "../src/core/legend-format";

const NBSP = " ";

describe("locale — detection + full number formatting", () => {
  it("detects French language tags", () => {
    expect(isFrench("fr")).toBe(true);
    expect(isFrench("fr-CH")).toBe(true);
    expect(isFrench("en")).toBe(false);
    expect(isFrench(undefined)).toBe(false);
  });

  it("formats full numbers per locale (deterministic, replaces toLocaleString)", () => {
    expect(formatLocaleNumber(1900, "fr")).toBe(`1${NBSP}900`);
    expect(formatLocaleNumber(1900, "en")).toBe("1,900");
    expect(formatLocaleNumber(12345.6, "fr")).toBe(`12${NBSP}345,6`);
    expect(formatLocaleNumber(19.3, "fr")).toBe("19,3");
    expect(formatLocaleNumber(1900)).toBe("1,900"); // default en
  });

  it("preserves decimal places when localizing a formatted string", () => {
    expect(localizeNumberString("0.00", "fr")).toBe("0,00");
    expect(localizeNumberString("0.00", "en")).toBe("0.00");
  });
});

describe("sourceLabel", () => {
  it("localizes the Source furniture", () => {
    expect(sourceLabel("fr")).toBe("Source :");
    expect(sourceLabel("en")).toBe("Source:");
  });
});

describe("fmtBin — locale-aware, English unchanged", () => {
  it("keeps English output byte-identical (regression guard)", () => {
    expect(fmtBin(2)).toBe("2");
    expect(fmtBin(12000)).toBe("12,000"); // now grouped in English too
    expect(fmtBin(2.5)).toBe("2.5");
    expect(fmtBin(0, { minGap: 0.02 })).toBe("0.00");
  });

  it("groups + comma-decimals bin boundaries in French", () => {
    expect(fmtBin(12000, { lang: "fr" })).toBe(`12${NBSP}000`);
    expect(fmtBin(2.5, { lang: "fr" })).toBe("2,5");
    expect(fmtBin(0.02, { minGap: 0.02, lang: "fr" })).toBe("0,02");
  });
});
