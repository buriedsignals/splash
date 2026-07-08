import { describe, it, expect } from "bun:test";
import {
  isFrench,
  decimalSep,
  groupSep,
  formatLocaleNumber,
  localizeDecimal,
  sourceLabel,
} from "../src/core/locale";
import { formatNumber } from "../src/core/math";

// French uses a narrow no-break space (U+202F) for thousands and a comma decimal —
// the same output Intl.NumberFormat('fr-FR') produces, but computed by an explicit,
// deterministic formatter (no Intl locale-data drift across Node/Remotion/browser).
const NBSP = " ";

describe("locale — language detection", () => {
  it("treats fr / fr-FR / FR as French, everything else as not", () => {
    expect(isFrench("fr")).toBe(true);
    expect(isFrench("fr-FR")).toBe(true);
    expect(isFrench("FR")).toBe(true);
    expect(isFrench("en")).toBe(false);
    expect(isFrench("en-US")).toBe(false);
    expect(isFrench(undefined)).toBe(false);
  });

  it("picks the right separators per language", () => {
    expect(decimalSep("fr")).toBe(",");
    expect(decimalSep("en")).toBe(".");
    expect(decimalSep(undefined)).toBe(".");
    expect(groupSep("fr")).toBe(NBSP);
    expect(groupSep("en")).toBe(",");
    expect(groupSep(undefined)).toBe(",");
  });
});

describe("formatLocaleNumber — full grouped number", () => {
  it("groups thousands and applies the decimal separator (FR)", () => {
    expect(formatLocaleNumber(1900, "fr")).toBe(`1${NBSP}900`);
    expect(formatLocaleNumber(19.3, "fr")).toBe("19,3");
    expect(formatLocaleNumber(12345.6, "fr")).toBe(`12${NBSP}345,6`);
    expect(formatLocaleNumber(-1900, "fr")).toBe(`-1${NBSP}900`);
    expect(formatLocaleNumber(890.2, "fr")).toBe("890,2");
  });

  it("leaves English formatting unchanged (comma thousands, dot decimal)", () => {
    expect(formatLocaleNumber(1900, "en")).toBe("1,900");
    expect(formatLocaleNumber(19.3, "en")).toBe("19.3");
    expect(formatLocaleNumber(12345.6, "en")).toBe("12,345.6");
    expect(formatLocaleNumber(1900)).toBe("1,900"); // default = en
  });
});

describe("localizeDecimal — decimal separator on an already-formatted string", () => {
  it("swaps the decimal point for a comma in French, leaves English alone", () => {
    expect(localizeDecimal("1.9k", "fr")).toBe("1,9k");
    expect(localizeDecimal("19.3", "fr")).toBe("19,3");
    expect(localizeDecimal("1.8M", "fr")).toBe("1,8M");
    expect(localizeDecimal("1.9k", "en")).toBe("1.9k");
    expect(localizeDecimal("1.9k")).toBe("1.9k");
  });
});

describe("sourceLabel — localized furniture", () => {
  it("uses the French typographic space before the colon", () => {
    expect(sourceLabel("fr")).toBe("Source :");
    expect(sourceLabel("en")).toBe("Source:");
    expect(sourceLabel(undefined)).toBe("Source:");
  });
});

describe("formatNumber — abbreviation stays, decimal becomes locale-aware", () => {
  it("keeps English output byte-identical (regression guard)", () => {
    expect(formatNumber(19.3)).toBe("19.3");
    expect(formatNumber(1900)).toBe("1.9k");
    expect(formatNumber(1_800_000)).toBe("1.8M");
    expect(formatNumber(42)).toBe("42");
  });

  it("uses a comma decimal in French, same abbreviation", () => {
    expect(formatNumber(19.3, "fr")).toBe("19,3");
    expect(formatNumber(1900, "fr")).toBe("1,9k");
    expect(formatNumber(1_800_000, "fr")).toBe("1,8M");
    expect(formatNumber(42, "fr")).toBe("42");
  });
});
