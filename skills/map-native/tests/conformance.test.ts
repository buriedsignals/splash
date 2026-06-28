import { describe, it, expect } from "bun:test";
import { checkChoroplethConformance } from "../src/conformance";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const ok = {
  title: "Renewables power most of Europe's north, less of its south",
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
});
