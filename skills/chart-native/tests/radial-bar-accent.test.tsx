import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RadialBarChart, type RadialBarConfig } from "../src/RadialBarChart";
import sample from "../assets/sample-data/radial-bar.json";

// config.accent lets a newsroom's story-wide editorial hue drive the peak
// ring bars, instead of the hard-coded OKABE_ITO.orange default.
const config: RadialBarConfig = {
  title: sample.title,
  unit: sample.unit,
  categoryField: sample.categoryField,
  valueField: sample.valueField,
  source: sample.source,
  rows: sample.rows,
};

describe("RadialBarChart — peak bars read config.accent", () => {
  it("uses config.accent for the peak bars when set", () => {
    const markup = renderToStaticMarkup(
      <RadialBarChart config={{ ...config, accent: "#7A1FA2" }} />,
    );
    expect(markup.toLowerCase()).toContain("#7a1fa2");
  });

  it("falls back to the orange default when accent is absent", () => {
    const markup = renderToStaticMarkup(<RadialBarChart config={config} />);
    expect(markup.toLowerCase()).toContain("#e69f00");
  });
});
