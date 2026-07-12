// runProduceConformance is what scripts/produce.mjs calls on the REAL config it is
// about to render. This is the enforcement test: a config that violates
// design-conformance.md must be CAUGHT here, not just in the (test-only) guard
// tests — that was the whole gap this change closes.
import { describe, it, expect } from "bun:test";
import { runProduceConformance } from "../src/core/produce-conformance";
import barsSample from "../assets/sample-data/bars.json";
import seriesSample from "../assets/sample-data/series.json";
import scatterSample from "../assets/sample-data/scatter.json";
import histogramSample from "../assets/sample-data/histogram.json";
import beeswarmSample from "../assets/sample-data/beeswarm.json";
import connectedScatterSample from "../assets/sample-data/connected-scatter.json";
import lollipopSample from "../assets/sample-data/lollipop.json";
import waffleSample from "../assets/sample-data/waffle.json";
import treemapSample from "../assets/sample-data/treemap.json";
import boxplotSample from "../assets/sample-data/boxplot.json";
import divergingStackedSample from "../assets/sample-data/diverging-stacked.json";
import bumpSample from "../assets/sample-data/bump.json";
import heatmapSample from "../assets/sample-data/heatmap.json";

describe("runProduceConformance — the 7 wired types pass on their shipped sample", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["bar", barsSample],
    ["line", seriesSample],
    ["scatter", scatterSample],
    ["beeswarm", beeswarmSample],
    ["connected-scatter", connectedScatterSample],
  ];
  for (const [type, sample] of cases) {
    it(`${type}: the shipped sample config is conformant`, () => {
      const r = runProduceConformance(type, sample);
      expect(r.checked).toBe(true);
      expect(r.violations).toEqual([]);
    });
  }
});

// The histogram median label and lollipop highlighted-row label USED to render TEXT in
// OKABE_ITO.vermillion (#D55E00, 3.87:1 on white < 4.5:1) — a real a11y gap the old
// test-only checks missed (their fixture `text` arrays omitted the accent) and that
// conformance-at-produce surfaced. FIXED: those labels now render in COLORS.ink; the
// vermillion stays on the mark (stem/dot, median line). Both types now pass at produce.
describe("runProduceConformance — the vermillion-text a11y fix (labels now WCAG-safe)", () => {
  it("histogram: the median label is now ink — conformant, 0 violations", () => {
    const r = runProduceConformance("histogram", histogramSample);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it("lollipop: the highlighted row's label is now ink — conformant, 0 violations", () => {
    const r = runProduceConformance("lollipop", lollipopSample);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
  });
});

describe("runProduceConformance — catches real violations on the config being rendered", () => {
  it("bar: an off-palette baseColor is caught", () => {
    const bad = { ...barsSample, baseColor: "#1f77b4" };
    const r = runProduceConformance("bar", bad);
    expect(r.checked).toBe(true);
    expect(r.violations.some((v) => v.includes("not in the Okabe-Ito"))).toBe(
      true,
    );
  });

  it("bar: a truncated (non-zero) value axis is NOT directly settable via config, but a year-range title is caught", () => {
    const bad = { ...barsSample, title: "2019-2024" };
    const r = runProduceConformance("bar", bad);
    expect(r.violations.some((v) => v.includes("year range"))).toBe(true);
  });

  it("line: a name-only source (no url) is conformant — prose provenance never deadlocks (E2)", () => {
    const prose = {
      ...seriesSample,
      source: { name: "Chiffres tels que rapportés dans cet article" },
    };
    const r = runProduceConformance("line", prose);
    // url absence is no longer a violation; a NAMED source still is required.
    expect(r.violations.some((v) => v.includes("source url"))).toBe(false);
    expect(r.violations.some((v) => v.includes("source name"))).toBe(false);
  });

  it("line: a source with no NAME is still caught (anti-fabrication)", () => {
    const bad = { ...seriesSample, source: { name: "" } };
    const r = runProduceConformance("line", bad);
    expect(r.violations.some((v) => v.includes("missing source name"))).toBe(
      true,
    );
  });

  it("line: an ALL CAPS title is caught", () => {
    const bad = { ...seriesSample, title: seriesSample.title.toUpperCase() };
    const r = runProduceConformance("line", bad);
    expect(r.violations.some((v) => v.includes("ALL CAPS"))).toBe(true);
  });

  it("scatter: a missing y-axis label is caught", () => {
    const bad = { ...scatterSample, yLabel: "" };
    const r = runProduceConformance("scatter", bad);
    expect(r.violations.some((v) => v.includes("y-axis label"))).toBe(true);
  });

  it("histogram: too few bins (a too-wide binWidth) is caught", () => {
    const bad = { ...histogramSample, binWidth: 1000 };
    const r = runProduceConformance("histogram", bad);
    expect(r.violations.some((v) => v.includes("< 3"))).toBe(true);
  });

  it("beeswarm: a missing value-axis label is caught", () => {
    const bad = { ...beeswarmSample, valueLabel: "" };
    const r = runProduceConformance("beeswarm", bad);
    expect(r.violations.some((v) => v.includes("value-axis label"))).toBe(true);
  });

  it("connected-scatter: a missing x-axis label is caught", () => {
    const bad = { ...connectedScatterSample, xLabel: "" };
    const r = runProduceConformance("connected-scatter", bad);
    expect(r.violations.some((v) => v.includes("x-axis label"))).toBe(true);
  });

  it("lollipop: a truncated value domain is never possible via config, but a short title is caught", () => {
    const bad = { ...lollipopSample, title: "short" };
    const r = runProduceConformance("lollipop", bad);
    expect(r.violations.some((v) => v.includes("too short"))).toBe(true);
  });
});

// WCAG 1.1.1 parity with dw-chart/map-dw (whose spec validation hard-requires
// altInsight): the produce gate must REQUIRE a non-empty altInsight on EVERY
// produced chart. checkGlobalConformance's check is opt-in ("altInsight" in input)
// and the produce-time callers never passed the key — so a chart-native deliverable
// could ship with no enforced insight-alt at all. The requirement is pinned at the
// produce boundary, where a deliverable is actually built.
describe("runProduceConformance — altInsight is REQUIRED at produce (WCAG 1.1.1)", () => {
  const without = (obj: object, key: string): Record<string, unknown> => {
    const copy: Record<string, unknown> = { ...obj };
    delete copy[key];
    return copy;
  };

  it("flags a config with NO altInsight key (the silent-skip gap)", () => {
    const r = runProduceConformance("bar", without(barsSample, "altInsight"));
    expect(r.checked).toBe(true);
    expect(r.violations.some((v) => v.includes("altInsight"))).toBe(true);
  });

  it("flags an empty-string altInsight", () => {
    const r = runProduceConformance("line", {
      ...seriesSample,
      altInsight: "   ",
    });
    expect(r.violations.some((v) => v.includes("altInsight"))).toBe(true);
  });

  it("passes with a non-empty altInsight", () => {
    const r = runProduceConformance("bar", {
      ...barsSample,
      altInsight:
        "The Central branch draws more visitors than the next three combined.",
    });
    expect(r.violations.some((v) => v.includes("altInsight"))).toBe(false);
  });

  it("stays a HARD violation on a brand-explicit config (never downgraded to a concern)", () => {
    const r = runProduceConformance("bar", {
      ...without(barsSample, "altInsight"),
      baseColor: "#0072B2",
      brandExplicit: true,
    });
    expect(r.violations.some((v) => v.includes("altInsight"))).toBe(true);
    expect(r.concerns.some((c) => c.includes("altInsight"))).toBe(false);
  });
});

// scripts/backfill-proofs.mjs shells produce.mjs for each committed sample, and
// produce.mjs runs this exact gate on the raw sample JSON — so every sample of a
// produce-guarded type must pass with 0 violations (altInsight included), or the
// backfill fails. This pins that invariant without running the (heavy) backfill.
describe("runProduceConformance — guarded backfill samples pass the produce gate", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["waffle", waffleSample],
    ["treemap", treemapSample],
    ["boxplot", boxplotSample],
    ["diverging-stacked", divergingStackedSample],
    ["bump", bumpSample],
    ["heatmap", heatmapSample],
  ];
  for (const [type, sample] of cases) {
    it(`${type}: the shipped sample config is conformant (altInsight included)`, () => {
      const r = runProduceConformance(type, sample);
      expect(r.checked).toBe(true);
      expect(r.violations).toEqual([]);
    });
  }
});

describe("runProduceConformance — an unwired type is reported, not silently skipped", () => {
  it("returns checked:false for a type without a produce-time guard yet", () => {
    // "marimekko" (not "heatmap" — now wired, see heatmap-conformance.test.ts and
    // the "heatmap" case in produce-conformance.ts) is Family B, deferred by design
    // (a 2D width×height encoding an article rarely yields), so it is the unwired-type
    // witness here. When it too is wired, swap in another still-deferred type.
    const r = runProduceConformance("marimekko", { title: "irrelevant" });
    expect(r.checked).toBe(false);
    expect(r.violations).toEqual([]);
  });
});
