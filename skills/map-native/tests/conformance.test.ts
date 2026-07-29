import { describe, it, expect } from "bun:test";
import {
  checkChoroplethConformance,
  checkSymbolConformance,
  checkGlobalMapConformance,
  checkMapFraming,
  checkRevealConformance,
  checkRouteConformance,
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
  it("flags an interactive symbol map whose static a11y fallback is not labeled", () => {
    expect(
      checkSymbolConformance(
        { ...okSymbol, interactive: true, staticFallbackLabeled: false },
        symText,
      ).some((m) => /fallback/i.test(m)),
    ).toBe(true);
  });
  it("passes an interactive symbol map whose static a11y fallback IS labeled", () => {
    expect(
      checkSymbolConformance(
        { ...okSymbol, interactive: true, staticFallbackLabeled: true },
        symText,
      ),
    ).toEqual([]);
  });
  it("does not apply the fallback rule to a non-interactive (pure static) symbol map", () => {
    // staticFallbackLabeled is irrelevant when the map is not interactive — the
    // pure-static map is labeled directly (rule 6, `labeled`), so no fallback rule fires.
    expect(
      checkSymbolConformance(
        { ...okSymbol, interactive: false, staticFallbackLabeled: false },
        symText,
      ),
    ).toEqual([]);
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
  it("flags a missing source name (url is optional — E2)", () => {
    const r = checkGlobalMapConformance({ ...gOk, source: {} }, gText);
    expect(r.some((m) => /source name/.test(m))).toBe(true);
    expect(r.some((m) => /source url/.test(m))).toBe(false); // url no longer required
  });
  it("flags low-contrast text", () => {
    expect(
      checkGlobalMapConformance(gOk, { text: ["#DDDDDD"], bg: "#FFFFFF" }).some(
        (m) => /contrast/.test(m),
      ),
    ).toBe(true);
  });
});

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
  it("flags latitudes outside ±85 (Mercator-unsafe)", () => {
    expect(
      checkRevealConformance({
        ...ok,
        bounds: [-10, -90, 30, 90],
      }).violations.some((m) => /±85|Mercator|latitude/i.test(m)),
    ).toBe(true);
  });
});

describe("checkRouteConformance", () => {
  const ok = {
    routePoints: 12,
    territoryColors: ["#1b9e77", "#d95f02", "#7570b3"],
    mapStyle: "dataviz-dark",
    title: "The river that crosses three lands",
    source: { name: "Natural Earth", url: "https://naturalearthdata.com" },
  };
  it("passes a well-formed route", () => {
    expect(checkRouteConformance(ok).violations).toEqual([]);
  });
  it("flags a degenerate route (< 2 points)", () => {
    expect(
      checkRouteConformance({ ...ok, routePoints: 1 }).violations.some((m) =>
        /route/i.test(m),
      ),
    ).toBe(true);
  });
  it("flags no territories", () => {
    expect(
      checkRouteConformance({ ...ok, territoryColors: [] }).violations.some(
        (m) => /territ/i.test(m),
      ),
    ).toBe(true);
  });
  it("flags duplicate territory colours", () => {
    expect(
      checkRouteConformance({
        ...ok,
        territoryColors: ["#111111", "#111111"],
      }).violations.some((m) => /colour|distinct/i.test(m)),
    ).toBe(true);
  });
  it("flags an unknown mapStyle", () => {
    expect(
      checkRouteConformance({ ...ok, mapStyle: "midnight" }).violations.some(
        (m) => /mapStyle/i.test(m),
      ),
    ).toBe(true);
  });
  it("flags a missing source", () => {
    expect(
      checkRouteConformance({ ...ok, source: { name: "" } }).violations.some(
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

// FRAME_COLORS / FRAME_COLORS_DARK WCAG contrast assertions
import { relativeLuminance, contrastRatio } from "../src/conformance";
import {
  FRAME_COLORS,
  FRAME_COLORS_DARK,
  resolveFrameColors,
} from "../src/theme/map-tokens";

describe("FRAME_COLORS light — WCAG contrast ≥ 4.5:1", () => {
  // pill is translucent; for contrast purposes we use its opaque solid equivalent (#ffffff)
  const pillSolid = "#ffffff";

  it("should satisfy ink-on-pill ≥ 4.5:1 (light theme)", () => {
    const ratio = contrastRatio(FRAME_COLORS.ink, pillSolid);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("should satisfy muted-on-pill ≥ 4.5:1 (light theme)", () => {
    const ratio = contrastRatio(FRAME_COLORS.muted, pillSolid);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe("FRAME_COLORS_DARK — WCAG contrast ≥ 4.5:1", () => {
  // pill is rgba(24,24,27,0.82); opaque solid for contrast check: #18181b
  const pillSolid = "#18181b";

  it("should satisfy ink-on-pill ≥ 4.5:1 (dark theme)", () => {
    const ratio = contrastRatio(FRAME_COLORS_DARK.ink, pillSolid);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("should satisfy muted-on-pill ≥ 4.5:1 (dark theme)", () => {
    const ratio = contrastRatio(FRAME_COLORS_DARK.muted, pillSolid);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("FRAME_COLORS_DARK.ink luminance should be higher than pill (light text on dark)", () => {
    expect(relativeLuminance(FRAME_COLORS_DARK.ink)).toBeGreaterThan(
      relativeLuminance(pillSolid),
    );
  });
});

// furnitureGround — the ground the map furniture text ACTUALLY stands on (the pill,
// composited over the worst basemap it can overlay), not an assumed themeBg.
import { readFileSync } from "fs";
import { join } from "path";
import {
  furnitureGround,
  runProduceMapConformance,
} from "../src/core/map-produce-conformance";

describe("map furniture stands on a ground, not on a basemap tile", () => {
  it("should keep the source text legible over the WORST basemap the pill can sit on", () => {
    // The light pill is rgba(255,255,255,0.92): over a black tile it composites to ~#EBEBEB.
    // muted #5f5f5f must still clear 4.5:1 THERE, not only against the assumed white.
    const g = furnitureGround(undefined);
    const { muted } = resolveFrameColors(undefined);
    expect(contrastRatio(muted, g)).toBeGreaterThanOrEqual(4.5);
  });

  it("should not answer plain white for the light default", () => {
    // furnitureGround returned `resolveThemeBg(bg) ?? "#ffffff"` — the assumption, not the
    // composite. #5f5f5f on pure white is 6.38:1 and PASSES; on a real light tile it does not.
    expect(furnitureGround(undefined).toLowerCase()).not.toBe("#ffffff");
  });

  it("should give the responsive source band the same pill the title band has", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "src", "core", "MapFrame.tsx"),
      "utf8",
    );
    // two spreads of pillStyle now: the title band and the source band
    expect(src.match(/\.\.\.pillStyle/g)?.length).toBe(2);
  });
});

// checkSymbolConformance was written and never called by anything except its own tests and
// a COMMENT (skills/map-dw/src/map-spec.ts:432). This proves runProduceMapConformance now
// actually asks it — a symbol map's legend/sizing/radius rules must be able to REFUSE, not
// just silently pass because the guard was never wired.
describe("runProduceMapConformance actually asks the symbol rules", () => {
  const base = {
    type: "symbol",
    // Long enough / not ALL CAPS / not a bare year range, and carries a description — the
    // furniture rules `checkGlobalMapConformance` already enforces for every guarded type are
    // NOT what this task closes (they were already wired); a "well-formed" fixture has to
    // clear them too, or the last case below could never legitimately equal [].
    title: "Geneva outpaces Bern in this symbol comparison",
    description:
      "Value by point location, sample data for the conformance check",
    altInsight: "a",
    source: { name: "S" },
    points: [
      { lon: 6.1, lat: 46.2, label: "Genève", value: 100 },
      { lon: 7.4, lat: 46.9, label: "Berne", value: 40 },
    ],
    maxRadius: 30,
    format: { width: 1200, height: 675 },
  };

  it("should refuse a symbol map with no legend", () => {
    const r = runProduceMapConformance("symbol", { ...base, hasLegend: false });
    expect(r.checked).toBe(true);
    expect(r.violations.join(" ")).toContain("legend");
  });

  it("should refuse radius-proportional sizing", () => {
    const r = runProduceMapConformance("symbol", {
      ...base,
      sizingMode: "radius",
    });
    expect(r.violations.join(" ")).toContain("area-proportional");
  });

  it("should refuse a symbol that swallows the map", () => {
    // SYMBOL_MAX_VIEWPORT_FRACTION = 0.25 (conformance.ts:198): 30px max radius is fine in a
    // 675px-tall frame, 300px is not.
    const r = runProduceMapConformance("symbol", { ...base, maxRadius: 300 });
    expect(r.violations.join(" ")).toContain("too large");
  });

  it("should pass a well-formed symbol config", () => {
    const r = runProduceMapConformance("symbol", base);
    expect(r.violations).toEqual([]);
  });
});
