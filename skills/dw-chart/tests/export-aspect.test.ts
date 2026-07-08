import { describe, it, expect } from "bun:test";
import {
  channelToAspect,
  channelToExportSize,
  isRowDriven,
  ROW_DRIVEN_TYPES,
  EXPORT_SIZES,
} from "../src/export-aspect";
import { CHANNELS, normalizeChannel } from "../../atelier/src/channel";

describe("channelToExportSize (FINDING 2: static export aspect follows the CADRAGE channel)", () => {
  it("maps feed/square to a ~1:1 square box", () => {
    for (const ch of ["feed", "square", "Feed", " SQUARE "]) {
      const s = channelToExportSize(ch);
      expect(s).toEqual(EXPORT_SIZES.square);
      expect(s.width).toBe(s.height); // 1:1
    }
  });

  it("maps social/vertical/story to a 9:16 portrait box", () => {
    for (const ch of [
      "social",
      "social-vertical",
      "vertical",
      "story",
      "reel",
      "tiktok",
    ]) {
      const s = channelToExportSize(ch);
      expect(s).toEqual(EXPORT_SIZES.portrait);
      // Fixed-aspect box: height is always present (asserted by toEqual above).
      expect(s.height!).toBeGreaterThan(s.width); // taller than wide
      expect(s.width / s.height!).toBeCloseTo(9 / 16, 2);
    }
  });

  it("maps web/article to a 16:9 landscape box", () => {
    for (const ch of ["web", "article", "embed", "landscape"]) {
      const s = channelToExportSize(ch);
      expect(s).toEqual(EXPORT_SIZES.landscape);
      // Fixed-aspect box: height is always present (asserted by toEqual above).
      expect(s.width).toBeGreaterThan(s.height!); // wider than tall
      expect(s.width / s.height!).toBeCloseTo(16 / 9, 2);
    }
  });

  it("defaults an absent or unrecognized channel to the web/landscape aspect", () => {
    expect(channelToExportSize(undefined)).toEqual(EXPORT_SIZES.landscape);
    expect(channelToExportSize("")).toEqual(EXPORT_SIZES.landscape);
    expect(channelToExportSize("something-new")).toEqual(
      EXPORT_SIZES.landscape,
    );
    expect(channelToAspect(undefined)).toBe("landscape");
  });
});

describe("channelToExportSize type-awareness (REGRESSION: row-driven types must not pin height → DW crops rows)", () => {
  it("classifies the horizontal row-driven types and only those", () => {
    for (const t of [
      "d3-bars",
      "d3-bars-grouped",
      "d3-bars-stacked",
      "d3-bars-split",
      "d3-bars-bullet",
      "d3-dot-plot",
      "d3-arrow-plot",
      "d3-range-plot",
      "tables",
    ] as const) {
      expect(isRowDriven(t)).toBe(true);
      expect(ROW_DRIVEN_TYPES.has(t)).toBe(true);
    }
    // Fixed-aspect types (DW scales them into the pinned box) are NOT row-driven.
    for (const t of [
      "column-chart",
      "grouped-column-chart",
      "stacked-column-chart",
      "multiple-columns",
      "d3-lines",
      "multiple-lines",
      "d3-area",
      "d3-pies",
      "d3-donuts",
      "d3-scatter-plot",
    ] as const) {
      expect(isRowDriven(t)).toBe(false);
    }
    expect(isRowDriven(undefined)).toBe(false);
  });

  it("omits the pinned height for a row-driven type on EVERY channel (width follows channel, height follows content)", () => {
    // Default (no channel = web embed = the most common path, where the regression bit).
    const def = channelToExportSize(undefined, "d3-bars");
    expect(def.height).toBeUndefined();
    expect(def.width).toBe(EXPORT_SIZES.landscape.width);
    // Feed/square: width narrows to the feed size but height stays natural — a 45-row
    // bar chart stays tall (no crop) rather than being squashed into a square.
    const feed = channelToExportSize("feed", "d3-dot-plot");
    expect(feed.height).toBeUndefined();
    expect(feed.width).toBe(EXPORT_SIZES.square.width);
    const vertical = channelToExportSize("vertical", "d3-range-plot");
    expect(vertical.height).toBeUndefined();
    expect(vertical.width).toBe(EXPORT_SIZES.portrait.width);
  });

  it("keeps the pinned channel box for a fixed-aspect type (Finding 2 behavior preserved)", () => {
    expect(channelToExportSize("feed", "d3-lines")).toEqual(
      EXPORT_SIZES.square,
    );
    expect(channelToExportSize("web", "d3-scatter-plot")).toEqual(
      EXPORT_SIZES.landscape,
    );
    expect(channelToExportSize(undefined, "d3-pies")).toEqual(
      EXPORT_SIZES.landscape,
    );
  });
});

describe("channelToAspect / channelToExportSize now delegate to the shared atelier channel model (single source of truth)", () => {
  it("matches the plan's literal cases: Stories→portrait, feed→square, undefined+row-driven→width-only landscape", () => {
    expect(channelToExportSize("Stories", "d3-lines")).toEqual(
      EXPORT_SIZES.portrait,
    );
    expect(channelToExportSize("feed", "d3-lines")).toEqual(
      EXPORT_SIZES.square,
    );
    const def = channelToExportSize(undefined, "d3-bars");
    expect(def.height).toBeUndefined();
    expect(def.width).toBe(EXPORT_SIZES.landscape.width);
  });

  it("channelToAspect(x) always equals CHANNELS[normalizeChannel(x)].aspect (no local duplicate keyword table)", () => {
    for (const ch of [
      undefined,
      "",
      "Stories",
      "feed",
      "web",
      "tiktok",
      "something-new",
    ]) {
      expect(channelToAspect(ch)).toBe(CHANNELS[normalizeChannel(ch)].aspect);
    }
  });
});
