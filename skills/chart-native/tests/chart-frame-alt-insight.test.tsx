// WCAG 1.1.1 — every chart's <svg role="img" aria-label={title}> already carries a
// meaningful accessible NAME (the title IS the insight by design). The fuller
// altInsight is the accessible DESCRIPTION, emitted ONCE by the shared ChartFrame as
// a visually-hidden element (CSS clip pattern — NOT display:none, which would remove
// the node from the accessibility tree). It reaches ChartFrame via AltInsightContext,
// provided at the shared mount level from config.altInsight — no per-component wiring.
import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { AltInsightContext } from "../src/core/ChartFrame";

const config: BarConfig = {
  title: "The Central branch draws more visitors than the next three combined",
  source: {
    name: "Riverton city open data",
    url: "https://data.riverton.gov/x",
  },
  unit: "monthly visits",
  catField: "branch",
  valField: "visits",
  orientation: "horizontal",
  sort: "desc",
  rows: [
    { branch: "Central", visits: 10400 },
    { branch: "Riverside", visits: 4200 },
    { branch: "Hilltop", visits: 3100 },
  ],
};

const ALT =
  "Central logs 10,400 monthly visits — more than Riverside, Hilltop and Eastgate combined.";

const count = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

describe("ChartFrame — visually-hidden altInsight description", () => {
  it("renders the provided altInsight exactly once (fixed/static layout)", () => {
    const html = renderToStaticMarkup(
      <AltInsightContext.Provider value={ALT}>
        <BarChart config={config} responsive={false} width={840} height={460} />
      </AltInsightContext.Provider>,
    );
    expect(count(html, ALT)).toBe(1);
    // screen-reader-reachable: CSS clip pattern, never display:none
    expect(html).toContain("clip:rect(0 0 0 0)");
    expect(html).not.toContain("display:none");
  });

  it("renders the provided altInsight exactly once (responsive/interactive layout)", () => {
    const html = renderToStaticMarkup(
      <AltInsightContext.Provider value={ALT}>
        <BarChart config={config} responsive={true} width={840} height={460} />
      </AltInsightContext.Provider>,
    );
    expect(count(html, ALT)).toBe(1);
  });

  it("emits nothing without a provider (samples/legacy renders unchanged)", () => {
    const html = renderToStaticMarkup(
      <BarChart config={config} responsive={false} width={840} height={460} />,
    );
    expect(count(html, ALT)).toBe(0);
    expect(html).not.toContain("clip:rect(0 0 0 0)");
  });

  it("emits nothing for a blank-string altInsight", () => {
    const html = renderToStaticMarkup(
      <AltInsightContext.Provider value="   ">
        <BarChart config={config} responsive={false} width={840} height={460} />
      </AltInsightContext.Provider>,
    );
    expect(html).not.toContain("clip:rect(0 0 0 0)");
  });
});
