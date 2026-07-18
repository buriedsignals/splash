// resolveConformanceColors is the SINGLE source of truth for the colours a
// chart-native component actually PAINTS for a given config — so the produce-time
// conformance gate (scripts/produce.mjs) validates the REAL render, not a guess.
// Each case below is grounded in the component's own colour-derivation code (see
// src/core/resolve-conformance-colors.ts comments for the exact line refs).
import { describe, it, expect } from "bun:test";
import { resolveConformanceColors } from "../src/core/resolve-conformance-colors";
import { checkGlobalConformance } from "../src/core/conformance";
import { COLORS, OKABE_ITO } from "../src/core/tokens";

// #3 — the subject-fit hues that are BELOW the 4.5:1 text-contrast bar on white, so they
// used to fail the conformance text check when the component painted labels in the mark
// colour → forcing the producer back to the default blue. After the decoupling (label in
// ink, mark in the hue) they must ship as the DATA colour without a text violation.
const SUBJECT_FIT_HUES = [
  OKABE_ITO.vermillion, // heat / decline / warning — the bug report's colour
  OKABE_ITO.orange, // energy / solar
  OKABE_ITO.green, // environment
];

describe("resolveConformanceColors — line (#3 decoupled: mark hue, ink label)", () => {
  it("defaults the data colour to COLORS.line when config.baseColor is absent", () => {
    const c = resolveConformanceColors("line", { title: "t" });
    expect(c.data).toBe(COLORS.line);
    expect(c.bg).toBe(COLORS.bg);
  });
  it("uses config.baseColor as the DATA colour but keeps text ink/muted (never the hue)", () => {
    const c = resolveConformanceColors("line", {
      baseColor: OKABE_ITO.vermillion,
    });
    expect(c.data).toBe(OKABE_ITO.vermillion);
    expect(c.text).toEqual([COLORS.ink, COLORS.muted]);
    expect(c.text).not.toContain(OKABE_ITO.vermillion);
  });
});

describe("resolveConformanceColors — bar (#3 decoupled)", () => {
  it("defaults to COLORS.line; text is ink/muted only (labels render in ink)", () => {
    const c = resolveConformanceColors("bar", {});
    expect(c.data).toBe(COLORS.line);
    expect(c.text).toEqual([COLORS.ink, COLORS.muted]);
  });
  it("honours config.baseColor as the mark hue without putting it in text", () => {
    const c = resolveConformanceColors("bar", { baseColor: OKABE_ITO.green });
    expect(c.data).toBe(OKABE_ITO.green);
    expect(c.text).not.toContain(OKABE_ITO.green);
  });
});

describe("resolveConformanceColors — scatter (#3 decoupled)", () => {
  it("defaults to COLORS.line; text is ink/muted only regardless of labelling", () => {
    const c = resolveConformanceColors("scatter", {});
    expect(c.data).toBe(COLORS.line);
    expect(c.text).toEqual([COLORS.ink, COLORS.muted]);
  });
  it("honours config.baseColor as the dot hue without putting it in text", () => {
    const c = resolveConformanceColors("scatter", {
      baseColor: OKABE_ITO.purple,
    });
    expect(c.data).toBe(OKABE_ITO.purple);
    expect(c.text).not.toContain(OKABE_ITO.purple);
  });
  it("keeps text ink/muted even when annotate names points (labels are ink)", () => {
    const c = resolveConformanceColors("scatter", {
      baseColor: OKABE_ITO.vermillion,
      annotate: ["A"],
    });
    expect(c.text).not.toContain(OKABE_ITO.vermillion);
  });
});

describe("#3 — a subject-fit hue passes conformance instead of defaulting to blue", () => {
  for (const type of ["line", "bar", "scatter"] as const) {
    for (const hue of SUBJECT_FIT_HUES) {
      it(`${type} ships with baseColor ${hue} (mark) with NO text-contrast violation`, () => {
        const colors = resolveConformanceColors(type, { baseColor: hue });
        expect(colors.data).toBe(hue);
        const violations = checkGlobalConformance({
          title: "A clear insight about the subject over time",
          source: { name: "Source" },
          colors,
        });
        // the whole point: no "text colour … < 4.5:1" — the hue lives on the mark, not text.
        expect(violations.some((v) => /contrast .* < 4.5:1/.test(v))).toBe(
          false,
        );
      });
    }
  }

  it("is non-vacuous: a hue placed in TEXT still trips the contrast check", () => {
    const violations = checkGlobalConformance({
      title: "A clear insight about the subject over time",
      source: { name: "Source" },
      colors: {
        data: OKABE_ITO.vermillion,
        text: [COLORS.ink, OKABE_ITO.vermillion], // simulate the old coupled behaviour
        bg: COLORS.bg,
      },
    });
    expect(violations.some((v) => /contrast .* < 4.5:1/.test(v))).toBe(true);
  });
});

describe("resolveConformanceColors — histogram", () => {
  it("resolves config.baseColor as the bar hue (so the WCAG guard validates the REAL painted colour); the median label text stays WCAG-safe ink, not the vermillion accent", () => {
    const c = resolveConformanceColors("histogram", { baseColor: "#123456" });
    expect(c.data).toBe("#123456");
    expect(c.text).not.toContain(OKABE_ITO.vermillion);
  });
  it("defaults the bar hue to COLORS.line when baseColor is absent (byte-identical to before)", () => {
    const c = resolveConformanceColors("histogram", {});
    expect(c.data).toBe(COLORS.line);
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
  it("resolves config.baseColor as the line/dot hue (guard validates the REAL painted colour), never rendered as text", () => {
    const c = resolveConformanceColors("connected-scatter", {
      baseColor: "#123456",
    });
    expect(c.data).toBe("#123456");
    expect(c.text).toEqual([COLORS.ink, COLORS.muted]);
  });
  it("defaults to OKABE_ITO.blue when baseColor is absent", () => {
    const c = resolveConformanceColors("connected-scatter", {});
    expect(c.data).toBe(OKABE_ITO.blue);
  });
});

describe("resolveConformanceColors — lollipop", () => {
  it("resolves config.baseColor as the stem/dot hue when set; defaults to OKABE_ITO.blue; no highlight → text excludes the accent", () => {
    const c = resolveConformanceColors("lollipop", {});
    expect(c.data).toBe(OKABE_ITO.blue);
    expect(c.text).not.toContain(OKABE_ITO.vermillion);
    expect(
      resolveConformanceColors("lollipop", { baseColor: "#123456" }).data,
    ).toBe("#123456");
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
