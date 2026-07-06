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

  it("line: a missing source url is caught", () => {
    const bad = { ...seriesSample, source: { name: "X", url: "" } };
    const r = runProduceConformance("line", bad);
    expect(r.violations.some((v) => v.includes("missing source url"))).toBe(
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

describe("runProduceConformance — an unwired type is reported, not silently skipped", () => {
  it("returns checked:false for a type without a produce-time guard yet", () => {
    const r = runProduceConformance("pie", { title: "irrelevant" });
    expect(r.checked).toBe(false);
    expect(r.violations).toEqual([]);
  });
});
