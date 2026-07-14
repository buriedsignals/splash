import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ScatterChart, type ScatterConfig } from "../src/ScatterChart";

// scatter.md rule 4: label the few that matter. When the journalist/② names story
// points via `annotate`, EVERY named point must carry a permanent point label — not
// just the headline (max-y) outlier. Regression guard for the 3-highlight bug where a
// scatter of GDP × life-expectancy requested Japan/Qatar/Nigeria but shipped one label.
const base: ScatterConfig = {
  title: "Richer countries tend to live longer, but wealth is not destiny",
  source: { name: "World Bank", url: "https://data.worldbank.org" },
  xField: "gdp",
  yField: "life",
  labelField: "country",
  xLabel: "GDP per capita",
  yLabel: "life expectancy",
  rows: [
    { country: "Japan", gdp: 40000, life: 84 },
    { country: "Qatar", gdp: 62000, life: 80 },
    { country: "Nigeria", gdp: 2000, life: 55 },
    { country: "Brazil", gdp: 8000, life: 76 },
    { country: "India", gdp: 2000, life: 70 },
  ],
};

// point labels render as <text ...>{name}</text> — match the text content, not the
// (attribute-only) aria-labels.
function labelled(markup: string, names: string[]): string[] {
  return names.filter((n) => new RegExp(`>${n}<`).test(markup));
}

describe("ScatterChart — every requested highlight is labelled", () => {
  it("labels ALL points named in `annotate`, not just the max-y outlier", () => {
    const markup = renderToStaticMarkup(
      <ScatterChart
        config={{ ...base, annotate: ["Japan", "Qatar", "Nigeria"] }}
        progress={1}
        width={840}
        height={480}
      />,
    );
    expect(labelled(markup, ["Japan", "Qatar", "Nigeria"]).sort()).toEqual([
      "Japan",
      "Nigeria",
      "Qatar",
    ]);
  });

  it("does not permanently label points outside the annotate set", () => {
    const markup = renderToStaticMarkup(
      <ScatterChart
        config={{ ...base, annotate: ["Japan"] }}
        progress={1}
        width={840}
        height={480}
      />,
    );
    expect(labelled(markup, ["Japan"])).toEqual(["Japan"]);
    expect(labelled(markup, ["Brazil"])).toEqual([]);
  });
});
