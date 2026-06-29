import { describe, it, expect } from "bun:test";
import {
  checkChoroplethConformance,
  checkSymbolConformance,
} from "../src/conformance";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const ok = {
  title: "Renewables power most of Europe's north, less of its south",
  description: "Share of electricity from renewables, by country, 2024",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  scaleColors: ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"],
  scaleType: "sequential" as const,
  hasLegend: true,
  regionsWithData: 24,
  regionsTotal: 27,
  boundsNonEmpty: true,
};

describe("checkChoroplethConformance", () => {
  it("passes a conformant choropleth", () => {
    expect(checkChoroplethConformance(ok, text)).toEqual([]);
  });
  it("flags a missing legend", () => {
    expect(
      checkChoroplethConformance({ ...ok, hasLegend: false }, text).some((m) =>
        m.includes("legend"),
      ),
    ).toBe(true);
  });
  it("flags empty bounds (basemap-fit impossible)", () => {
    expect(
      checkChoroplethConformance({ ...ok, boundsNonEmpty: false }, text).some(
        (m) => m.includes("bounds"),
      ),
    ).toBe(true);
  });
  it("flags zero regions with data", () => {
    expect(
      checkChoroplethConformance({ ...ok, regionsWithData: 0 }, text).some(
        (m) => m.includes("no region"),
      ),
    ).toBe(true);
  });
  it("flags a non-CVD-safe (too few) scale", () => {
    expect(
      checkChoroplethConformance(
        { ...ok, scaleColors: ["#ff0000"] },
        text,
      ).some((m) => m.includes("scale")),
    ).toBe(true);
  });
  it("flags a year-range title (not an insight)", () => {
    expect(
      checkChoroplethConformance({ ...ok, title: "2015–2024" }, text).some(
        (m) => m.includes("insight") || m.includes("year range"),
      ),
    ).toBe(true);
  });
  it("flags a map with fewer than 3 story beats", () => {
    expect(
      checkChoroplethConformance({ ...ok, storyBeats: 2 }, text).some((m) =>
        /story/i.test(m),
      ),
    ).toBe(true);
  });
  it("passes when a story has at least 3 beats", () => {
    expect(checkChoroplethConformance({ ...ok, storyBeats: 4 }, text)).toEqual(
      [],
    );
  });
  it("flags a missing description (a module must state what/when/where)", () => {
    const r = checkChoroplethConformance(
      { ...ok, description: undefined },
      text,
    );
    expect(r.some((v) => /description/i.test(v))).toBe(true);
  });
});

const symText = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const okSymbol = {
  title: "Madrid dwarfs Paris and Berlin on this measure",
  description: "Value by city, 2024",
  source: { name: "Source 2025", url: "https://example.org/x" },
  sizingMode: "area" as const,
  hasLegend: true,
  legendStops: 3,
  maxRadiusPx: 40,
  viewportMinPx: 720,
  pointsWithData: 3,
  boundsNonEmpty: true,
  strokeContrast: 4,
};

describe("checkSymbolConformance", () => {
  it("passes a conformant symbol map", () => {
    expect(checkSymbolConformance(okSymbol, symText)).toEqual([]);
  });
  it("flags radius-proportional sizing", () => {
    expect(
      checkSymbolConformance(
        { ...okSymbol, sizingMode: "radius" },
        symText,
      ).some((m) => /area-proportional/.test(m)),
    ).toBe(true);
  });
  it("flags a missing legend", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, hasLegend: false }, symText).some(
        (m) => /legend/.test(m),
      ),
    ).toBe(true);
  });
  it("flags fewer than two legend stops", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, legendStops: 1 }, symText).some(
        (m) => /legend/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a symbol that swallows the map", () => {
    expect(
      checkSymbolConformance(
        { ...okSymbol, maxRadiusPx: 300, viewportMinPx: 720 },
        symText,
      ).some((m) => /too large|swallows|viewport/.test(m)),
    ).toBe(true);
  });
  it("flags a faint stroke (symbol not separable from basemap)", () => {
    expect(
      checkSymbolConformance(
        { ...okSymbol, strokeContrast: 1.2 },
        symText,
      ).some((m) => /stroke/.test(m)),
    ).toBe(true);
  });
  it("flags a year-range title", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, title: "2024" }, symText).some(
        (m) => /title/.test(m),
      ),
    ).toBe(true);
  });
});
