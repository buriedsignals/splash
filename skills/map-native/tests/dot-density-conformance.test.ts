import { describe, it, expect } from "bun:test";
import { validateDotDensityConfig } from "../src/validate-config";
import { checkDotDensityConformance } from "../src/conformance";
import { univariateAccent } from "../src/dot-density-geo";

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };
const good = {
  title: "Where the population actually lives",
  description: "One dot = 1,000 residents, 2026",
  source: { name: "INSEE", url: "https://x" },
  hasCategories: false,
  hasCategoryLegend: false,
  hasDotValueLegend: true,
  boundsNonEmpty: true,
  totalDots: 4200,
  capped: false,
  mapStyle: "dataviz-light",
};

describe("validateDotDensityConfig", () => {
  it("accepts a univariate config", () => {
    const r = validateDotDensityConfig({
      type: "dot-density",
      regionKey: "dept",
      boundaries: "world",
      valueField: "pop",
      rows: [{ dept: "FRA", pop: 100 }],
      basemap: "world",
      title: "Where the population actually lives",
    });
    expect(r.ok).toBe(true);
  });
  it("rejects a config with neither valueField nor categories", () => {
    const r = validateDotDensityConfig({
      type: "dot-density",
      regionKey: "dept",
      boundaries: "world",
      rows: [{ dept: "FRA", pop: 100 }],
      basemap: "world",
      title: "Where the population actually lives",
    });
    expect(r.ok).toBe(false);
  });
});

describe("checkDotDensityConformance", () => {
  it("passes a well-formed univariate dot map", () => {
    expect(checkDotDensityConformance(good, okColors)).toEqual([]);
  });
  it("flags a missing '1 dot = N' legend", () => {
    expect(
      checkDotDensityConformance(
        { ...good, hasDotValueLegend: false },
        okColors,
      ).join(" "),
    ).toContain("1 dot");
  });
  it("flags a multivariate map missing its category legend", () => {
    expect(
      checkDotDensityConformance(
        { ...good, hasCategories: true, hasCategoryLegend: false },
        okColors,
      ).join(" "),
    ).toContain("legend");
  });

  describe("univariate legend swatch / dot colour parity", () => {
    it("passes light-theme when the swatch and dot colours match (single-sourced token)", () => {
      const c = univariateAccent(false);
      expect(
        checkDotDensityConformance(
          { ...good, univariateDotColor: c, univariateSwatchColor: c },
          okColors,
        ),
      ).toEqual([]);
    });
    it("passes dark-theme when the swatch and dot colours match (single-sourced token)", () => {
      const c = univariateAccent(true);
      expect(
        checkDotDensityConformance(
          { ...good, univariateDotColor: c, univariateSwatchColor: c },
          okColors,
        ),
      ).toEqual([]);
    });
    it("flags a mismatched swatch — the exact one-sided-theme-edit regression this guards against", () => {
      expect(
        checkDotDensityConformance(
          {
            ...good,
            univariateDotColor: univariateAccent(true), // dot fixed for dark…
            univariateSwatchColor: "#e8e8ec", // …but swatch left on the stale near-white literal
          },
          okColors,
        ).join(" "),
      ).toContain("swatch");
    });
    it("does not apply the parity check to multivariate maps (colour comes from the category palette)", () => {
      expect(
        checkDotDensityConformance(
          {
            ...good,
            hasCategories: true,
            hasCategoryLegend: true,
            univariateDotColor: "#111111",
            univariateSwatchColor: "#222222",
          },
          okColors,
        ),
      ).toEqual([]);
    });
    it("skips the check when the colours are not supplied (back-compat with existing callers)", () => {
      expect(checkDotDensityConformance(good, okColors)).toEqual([]);
    });
  });
});
