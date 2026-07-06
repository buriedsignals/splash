// resolveConformanceColors is the SINGLE source of truth for the colours a
// chart-native component actually PAINTS for a given config — so the produce-time
// conformance gate (scripts/produce.mjs) validates the REAL render, not a guess.
// Each case below is grounded in the component's own colour-derivation code (see
// src/core/resolve-conformance-colors.ts comments for the exact line refs).
import { describe, it, expect } from "bun:test";
import { resolveConformanceColors } from "../src/core/resolve-conformance-colors";
import { COLORS, OKABE_ITO } from "../src/core/tokens";

describe("resolveConformanceColors — line", () => {
  it("defaults the data colour to COLORS.line when config.baseColor is absent", () => {
    const c = resolveConformanceColors("line", { title: "t" });
    expect(c.data).toBe(COLORS.line);
    expect(c.bg).toBe(COLORS.bg);
  });
  it("uses config.baseColor when present (the direct label renders in it too)", () => {
    const c = resolveConformanceColors("line", { baseColor: OKABE_ITO.orange });
    expect(c.data).toBe(OKABE_ITO.orange);
    // the direct-label TEXT is drawn in the series colour — must be checked too
    expect(c.text).toContain(OKABE_ITO.orange);
  });
});

describe("resolveConformanceColors — bar", () => {
  it("defaults to COLORS.line and includes it in text (the value label is fill-coloured)", () => {
    const c = resolveConformanceColors("bar", {});
    expect(c.data).toBe(COLORS.line);
    expect(c.text).toContain(COLORS.line);
  });
  it("honours config.baseColor", () => {
    const c = resolveConformanceColors("bar", { baseColor: OKABE_ITO.green });
    expect(c.data).toBe(OKABE_ITO.green);
    expect(c.text).toContain(OKABE_ITO.green);
  });
});

describe("resolveConformanceColors — scatter", () => {
  it("defaults to COLORS.line, and includes it in text by default (the headline outlier is labelled)", () => {
    const c = resolveConformanceColors("scatter", {});
    expect(c.data).toBe(COLORS.line);
    expect(c.text).toContain(COLORS.line);
  });
  it("honours config.baseColor", () => {
    const c = resolveConformanceColors("scatter", {
      baseColor: OKABE_ITO.purple,
    });
    expect(c.data).toBe(OKABE_ITO.purple);
  });
  it("drops the data colour from text when labelPoints is 'none' and no annotate", () => {
    const c = resolveConformanceColors("scatter", { labelPoints: "none" });
    expect(c.text).not.toContain(COLORS.line);
  });
  it("keeps the data colour in text when annotate is set, even if labelPoints is 'none'", () => {
    const c = resolveConformanceColors("scatter", {
      labelPoints: "none",
      annotate: ["A"],
    });
    expect(c.text).toContain(COLORS.line);
  });
});

describe("resolveConformanceColors — histogram", () => {
  it("is a fixed COLORS.line bar colour (no baseColor field); the median label text is WCAG-safe ink, not the vermillion accent", () => {
    const c = resolveConformanceColors("histogram", { baseColor: "#123456" });
    // histogram has no baseColor knob — config.baseColor must NOT leak through
    expect(c.data).toBe(COLORS.line);
    expect(c.text).not.toContain(OKABE_ITO.vermillion);
  });
});

describe("resolveConformanceColors — beeswarm", () => {
  it("is a fixed OKABE_ITO.blue dot colour; category colour never renders as text", () => {
    const c = resolveConformanceColors("beeswarm", { categories: ["A", "B"] });
    expect(c.data).toBe(OKABE_ITO.blue);
    expect(c.text).not.toContain(OKABE_ITO.orange);
  });
});

describe("resolveConformanceColors — connected-scatter", () => {
  it("is a fixed OKABE_ITO.blue accent (no baseColor field), never rendered as text", () => {
    const c = resolveConformanceColors("connected-scatter", {
      baseColor: "#123456",
    });
    expect(c.data).toBe(OKABE_ITO.blue);
    expect(c.text).toEqual([COLORS.ink, COLORS.muted]);
  });
});

describe("resolveConformanceColors — lollipop", () => {
  it("is a fixed OKABE_ITO.blue stem/dot colour; no highlight → text excludes the accent", () => {
    const c = resolveConformanceColors("lollipop", {});
    expect(c.data).toBe(OKABE_ITO.blue);
    expect(c.text).not.toContain(OKABE_ITO.vermillion);
  });
  it("keeps label text WCAG-safe even when highlightLabel is set (vermillion stays on the mark)", () => {
    const c = resolveConformanceColors("lollipop", {
      highlightLabel: "Riverside",
    });
    expect(c.text).not.toContain(OKABE_ITO.vermillion);
  });
});

describe("every resolved colour set shares the same bg token", () => {
  it("bg is always COLORS.bg regardless of type", () => {
    for (const type of [
      "line",
      "bar",
      "scatter",
      "histogram",
      "beeswarm",
      "connected-scatter",
      "lollipop",
    ] as const) {
      expect(resolveConformanceColors(type, {}).bg).toBe(COLORS.bg);
    }
  });
});
