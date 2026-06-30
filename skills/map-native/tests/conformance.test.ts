import { describe, it, expect } from "bun:test";
import {
  checkChoroplethConformance,
  checkSymbolConformance,
  checkGlobalMapConformance,
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
  labeled: true,
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
        (m) => /needs a legend/.test(m),
      ),
    ).toBe(true);
  });
  it("flags fewer than two legend stops", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, legendStops: 1 }, symText).some(
        (m) => /reference circle/.test(m),
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
      checkSymbolConformance(
        { ...okSymbol, title: "2020   –   2024" },
        symText,
      ).some((m) => /year range/.test(m)),
    ).toBe(true);
  });
  it("flags unlabeled symbols (values undecodable without hover)", () => {
    expect(
      checkSymbolConformance({ ...okSymbol, labeled: false }, symText).some(
        (m) => /label/i.test(m),
      ),
    ).toBe(true);
  });
});

const gText = { text: ["#1A1A1A", "#5f5f5f"], bg: "#FFFFFF" };
const gOk = {
  title: "Renewables power most of Europe's north",
  description: "Share of electricity from renewables, 2024",
  source: { name: "Ember 2025", url: "https://example.org/x" },
};

describe("checkGlobalMapConformance", () => {
  it("passes a conformant header", () => {
    expect(checkGlobalMapConformance(gOk, gText)).toEqual([]);
  });
  it("flags a too-short title", () => {
    expect(
      checkGlobalMapConformance({ ...gOk, title: "Too short" }, gText).some(
        (m) => /too short/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a year-range title", () => {
    expect(
      checkGlobalMapConformance(
        { ...gOk, title: "2020   –   2024" },
        gText,
      ).some((m) => /year range/.test(m)),
    ).toBe(true);
  });
  it("flags an ALL CAPS title", () => {
    expect(
      checkGlobalMapConformance(
        { ...gOk, title: "RENEWABLES POWER EUROPE'S NORTH" },
        gText,
      ).some((m) => /ALL CAPS/.test(m)),
    ).toBe(true);
  });
  it("flags a missing description", () => {
    expect(
      checkGlobalMapConformance({ ...gOk, description: "" }, gText).some((m) =>
        /description/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a missing source name and url", () => {
    const r = checkGlobalMapConformance({ ...gOk, source: {} }, gText);
    expect(r.some((m) => /source name/.test(m))).toBe(true);
    expect(r.some((m) => /source url/.test(m))).toBe(true);
  });
  it("flags low-contrast text", () => {
    expect(
      checkGlobalMapConformance(gOk, { text: ["#DDDDDD"], bg: "#FFFFFF" }).some(
        (m) => /contrast/.test(m),
      ),
    ).toBe(true);
  });
});

import { checkMapFraming } from "../src/conformance";

describe("checkMapFraming", () => {
  it("passes a borderline legend (70px reserved at 720px height)", () => {
    expect(
      checkMapFraming({
        width: 1280,
        height: 720,
        title: "A clear sentence-case insight title",
        hasSource: true,
        legendHeight: 70,
      }).violations,
    ).toEqual([]);
  });
  it("passes a normal landscape title with a source", () => {
    expect(
      checkMapFraming({
        width: 1280,
        height: 720,
        title: "Renewables power Europe's north",
        description: "Share, 2024",
        hasSource: true,
      }).violations,
    ).toEqual([]);
  });
  it("passes a short title on portrait with a source", () => {
    expect(
      checkMapFraming({
        width: 1080,
        height: 1350,
        title: "Europe's renewables divide",
        hasSource: true,
      }).violations,
    ).toEqual([]);
  });
  it("flags a title too long for a portrait frame", () => {
    expect(
      checkMapFraming({
        width: 1080,
        height: 1350,
        title: "T".repeat(160),
        hasSource: true,
      }).violations.some((m) => /too long/.test(m)),
    ).toBe(true);
  });
  it("flags a missing source (the video gap)", () => {
    expect(
      checkMapFraming({
        width: 1280,
        height: 720,
        title: "Renewables power Europe's north",
        hasSource: false,
      }).violations.some((m) => /source band empty/.test(m)),
    ).toBe(true);
  });
  it("reserves the measured title height — no title-band overrun when titleHeightPx is forwarded", () => {
    const { violations } = checkMapFraming({
      width: 360,
      height: 640,
      titleLines: 2,
      titleHeightPx: 220,
    });
    expect(
      violations.some((m) => /title overruns the reserved top band/.test(m)),
    ).toBe(false);
  });
});

describe("checkSymbolConformance — label carries the unit", () => {
  const text = { text: ["#1A1A1A"], bg: "#FFFFFF" };
  const base = {
    title: "Funding by city, sentence-case insight here",
    description: "by city, 2024",
    source: { name: "Dealroom 2025", url: "https://example.org/x" },
    sizingMode: "area" as const,
    hasLegend: true,
    legendStops: 3,
    maxRadiusPx: 40,
    viewportMinPx: 720,
    pointsWithData: 6,
    boundsNonEmpty: true,
    strokeContrast: 4,
    labeled: true,
  };
  it("flags a labelled value with a unit set but missing from the label", () => {
    const r = checkSymbolConformance(
      { ...base, valueUnit: "$bn", labelHasUnit: false },
      text,
    );
    expect(r.some((m) => /label.*unit/i.test(m))).toBe(true);
  });
  it("passes when the label carries the unit", () => {
    const r = checkSymbolConformance(
      { ...base, valueUnit: "$bn", labelHasUnit: true },
      text,
    );
    expect(r).toEqual([]);
  });
  it("does not require a unit when none is set", () => {
    const r = checkSymbolConformance({ ...base, labelHasUnit: false }, text);
    expect(r).toEqual([]);
  });
});

import { checkRevealConformance } from "../src/conformance";

describe("checkRevealConformance", () => {
  const ok = {
    bounds: [-10, 35, 30, 60] as [number, number, number, number],
    title: "Renewables power Europe's north",
    source: { name: "Ember", url: "https://ember-energy.org" },
    hasFurniture: true,
  };
  it("passes a well-formed fixed-camera reveal", () => {
    expect(checkRevealConformance(ok).violations).toEqual([]);
  });
  it("flags degenerate bounds (west ≥ east)", () => {
    expect(
      checkRevealConformance({
        ...ok,
        bounds: [30, 35, 30, 60],
      }).violations.some((m) => /degenerate|bounds/i.test(m)),
    ).toBe(true);
  });
  it("flags missing furniture", () => {
    expect(
      checkRevealConformance({ ...ok, hasFurniture: false }).violations.some(
        (m) => /furniture/i.test(m),
      ),
    ).toBe(true);
  });
  it("flags a missing source", () => {
    expect(
      checkRevealConformance({ ...ok, source: { name: "" } }).violations.some(
        (m) => /source/i.test(m),
      ),
    ).toBe(true);
  });
});

describe("per-type guards — optional format hook", () => {
  const text = { text: ["#1A1A1A"], bg: "#FFFFFF" };
  const choro = {
    title: "Renewables power most of Europe's north",
    description: "Share of electricity from renewables, 2024",
    source: { name: "Ember 2025", url: "https://example.org/x" },
    scaleColors: ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"],
    scaleType: "sequential" as const,
    hasLegend: true,
    regionsWithData: 24,
    regionsTotal: 27,
    boundsNonEmpty: true,
  };
  it("with no format, behaviour is unchanged (conformant → [])", () => {
    expect(checkChoroplethConformance(choro, text)).toEqual([]);
  });
  it("with a format + an over-long title, the framing violation appears", () => {
    const r = checkChoroplethConformance(
      {
        ...choro,
        title: "T".repeat(160),
        format: { width: 1080, height: 1350 },
      },
      text,
    );
    expect(r.some((m) => /too long/.test(m))).toBe(true);
  });
  it("with a conformant format, no framing violation is added", () => {
    const r = checkChoroplethConformance(
      { ...choro, format: { width: 1280, height: 720 } },
      text,
    );
    expect(r).toEqual([]);
  });
});
