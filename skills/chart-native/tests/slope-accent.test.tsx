import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SlopeChart, type SlopeConfig } from "../src/SlopeChart";
import sample from "../assets/sample-data/slope.json";

// config.accent lets a newsroom's story-wide editorial hue drive the ONE
// highlighted line, instead of the hard-coded OKABE_ITO.vermillion default.
const config: SlopeConfig = {
  title: sample.title,
  unit: sample.unit,
  labelField: sample.labelField,
  leftField: sample.leftField,
  rightField: sample.rightField,
  leftPeriod: sample.leftPeriod,
  rightPeriod: sample.rightPeriod,
  highlightLabel: sample.highlightLabel,
  source: sample.source,
  rows: sample.rows,
};

describe("SlopeChart — highlighted line reads config.accent", () => {
  it("uses config.accent for the highlighted line when set", () => {
    const markup = renderToStaticMarkup(
      <SlopeChart config={{ ...config, accent: "#7A1FA2" }} />,
    );
    expect(markup.toLowerCase()).toContain("#7a1fa2");
  });

  it("falls back to the vermillion default when accent is absent", () => {
    const markup = renderToStaticMarkup(<SlopeChart config={config} />);
    expect(markup.toLowerCase()).toContain("#d55e00");
  });
});
