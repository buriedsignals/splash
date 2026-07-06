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

// FINDING (surfaced by this change, not fixed by it — see conformance-report.md):
// OKABE_ITO.vermillion (#D55E00) on white is 3.87:1, below the 4.5:1 WCAG minimum.
// histogram's median label and lollipop's highlighted label both render TEXT in
// this colour — a real, pre-existing gap the old test-only checks never caught
// because their fixture `text` arrays omitted the accent. produce.mjs WARNS
// (does not fail-hard) on exactly this known message, per the task's instruction
// not to break the producer over a pre-existing violation; any OTHER violation on
// these two types still fails hard (see the "catches real violations" describe
// block below, which proves that).
describe("runProduceConformance — known pre-existing sample violation (flagged, not fixed here)", () => {
  it("histogram: the median label's fixed vermillion accent fails WCAG contrast on white", () => {
    const r = runProduceConformance("histogram", histogramSample);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([
      "text colour #D55E00 contrast 3.87:1 on #FFFFFF < 4.5:1",
    ]);
  });

  it("lollipop: the highlighted row's fixed vermillion accent fails WCAG contrast on white", () => {
    const r = runProduceConformance("lollipop", lollipopSample);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([
      "text colour #D55E00 contrast 3.87:1 on #FFFFFF < 4.5:1",
    ]);
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
