import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LollipopChart, type LollipopConfig } from "../src/LollipopChart";
import sample from "../assets/sample-data/lollipop.json";

// config.accent lets a newsroom's story-wide editorial hue drive the ONE
// highlighted row, instead of the hard-coded OKABE_ITO.vermillion default.
const config: LollipopConfig = {
  title: sample.title,
  unit: sample.unit,
  catField: sample.catField,
  valField: sample.valField,
  highlightLabel: sample.highlightLabel,
  source: sample.source,
  rows: sample.rows,
};

describe("LollipopChart — highlighted dot reads config.accent", () => {
  it("uses config.accent for the highlighted dot when set", () => {
    const markup = renderToStaticMarkup(
      <LollipopChart config={{ ...config, accent: "#7A1FA2" }} />,
    );
    expect(markup.toLowerCase()).toContain("#7a1fa2");
  });

  it("falls back to the vermillion default when accent is absent", () => {
    const markup = renderToStaticMarkup(<LollipopChart config={config} />);
    expect(markup.toLowerCase()).toContain("#d55e00");
  });
});
