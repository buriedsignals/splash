import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SlopeChart, type SlopeConfig } from "../src/SlopeChart";
import { LollipopChart, type LollipopConfig } from "../src/LollipopChart";
import { HistogramChart, type HistogramConfig } from "../src/HistogramChart";
import { RadialBarChart, type RadialBarConfig } from "../src/RadialBarChart";
import slopeSample from "../assets/sample-data/slope.json";
import lollipopSample from "../assets/sample-data/lollipop.json";
import histogramSample from "../assets/sample-data/histogram.json";
import radialBarSample from "../assets/sample-data/radial-bar.json";

// Restores the render-level coverage lost when the four *-accent.test.tsx files were
// deleted alongside the dead config.accent reads. Those files each held TWO tests: one
// on the removed accent branch (correctly gone) and one on the LIVE default-colour
// branch that survives removal — and for HistogramChart/RadialBarChart they were the
// ONLY files in the suite that ever rendered those components at all. One `it` per
// component here: no `accent` key, asserting the hard-coded default hex actually
// reaches the markup (SlopeChart/LollipopChart/HistogramChart → OKABE_ITO.vermillion
// #D55E00, RadialBarChart → OKABE_ITO.orange #E69F00).
describe("chart-native components paint their live default highlight colour", () => {
  it("SlopeChart highlights the trend-buck line in the vermillion default", () => {
    const config: SlopeConfig = {
      title: slopeSample.title,
      unit: slopeSample.unit,
      labelField: slopeSample.labelField,
      leftField: slopeSample.leftField,
      rightField: slopeSample.rightField,
      leftPeriod: slopeSample.leftPeriod,
      rightPeriod: slopeSample.rightPeriod,
      highlightLabel: slopeSample.highlightLabel,
      source: slopeSample.source,
      rows: slopeSample.rows,
    };
    const markup = renderToStaticMarkup(<SlopeChart config={config} />);
    expect(markup.toLowerCase()).toContain("#d55e00");
  });

  it("LollipopChart highlights the headline row in the vermillion default", () => {
    const config: LollipopConfig = {
      title: lollipopSample.title,
      unit: lollipopSample.unit,
      catField: lollipopSample.catField,
      valField: lollipopSample.valField,
      highlightLabel: lollipopSample.highlightLabel,
      source: lollipopSample.source,
      rows: lollipopSample.rows,
    };
    const markup = renderToStaticMarkup(<LollipopChart config={config} />);
    expect(markup.toLowerCase()).toContain("#d55e00");
  });

  it("HistogramChart draws its median line in the vermillion default", () => {
    const config: HistogramConfig = {
      title: histogramSample.title,
      unit: histogramSample.unit,
      valueField: histogramSample.valueField,
      binWidth: histogramSample.binWidth,
      source: histogramSample.source,
      rows: histogramSample.rows,
    };
    const markup = renderToStaticMarkup(<HistogramChart config={config} />);
    expect(markup.toLowerCase()).toContain("#d55e00");
  });

  it("RadialBarChart fills its peak ring bars in the orange default", () => {
    const config: RadialBarConfig = {
      title: radialBarSample.title,
      unit: radialBarSample.unit,
      categoryField: radialBarSample.categoryField,
      valueField: radialBarSample.valueField,
      source: radialBarSample.source,
      rows: radialBarSample.rows,
    };
    const markup = renderToStaticMarkup(<RadialBarChart config={config} />);
    expect(markup.toLowerCase()).toContain("#e69f00");
  });
});
