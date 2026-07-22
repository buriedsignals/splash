import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HistogramChart, type HistogramConfig } from "../src/HistogramChart";
import sample from "../assets/sample-data/histogram.json";

// config.accent lets a newsroom's story-wide editorial hue drive the median
// line, instead of the hard-coded OKABE_ITO.vermillion default.
const config: HistogramConfig = {
  title: sample.title,
  unit: sample.unit,
  valueField: sample.valueField,
  binWidth: sample.binWidth,
  source: sample.source,
  rows: sample.rows,
};

describe("HistogramChart — median line reads config.accent", () => {
  it("uses config.accent for the median line when set", () => {
    const markup = renderToStaticMarkup(
      <HistogramChart config={{ ...config, accent: "#7A1FA2" }} />,
    );
    expect(markup.toLowerCase()).toContain("#7a1fa2");
  });

  it("falls back to the vermillion default when accent is absent", () => {
    const markup = renderToStaticMarkup(<HistogramChart config={config} />);
    expect(markup.toLowerCase()).toContain("#d55e00");
  });
});
