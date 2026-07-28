// The engine side of the Verify layer's capture ladder (lib/verify/capture.ts).
//
// `capture()` resolves the element it screenshots down a list of candidates —
// `[data-splash-root]`, then `#root > div`, then `#root`, then `body` — and reads the
// rendered title down a second one — `[data-splash-title]`, then `svg[role=img][aria-label]`,
// then `h1`, then `h2`. The first rung of each was posed by no engine, so every capture fell
// through to a degradation: a structural guess for the root, and the SVG accessible name for
// the title. Both happened to be right for chart-native, which is exactly the problem — the
// contract was being honoured by coincidence, and the first component to render a title that
// is not an SVG aria-label would have had no rung left.
//
// WHY THE MARKER IS SUPPRESSED WHEN EMBEDDED. The root selector decides the SCREENSHOT CROP
// and feeds the `capture:fits-viewport` check. In a scrolly deliverable the page root is the
// scrolly scaffold and each chart is one step inside it, rendered with `embedded`. Marking
// every ChartFrame would make `document.querySelector("[data-splash-root]")` return the
// first inner chart, cropping the evidence to a fragment of the page under review. So the
// marker means "I am the deliverable's own root", which is precisely what `!embedded`
// already says. A scrolly page stays unmarked and keeps falling through to `#root > div`,
// byte-for-byte the behaviour it has today.
import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { InteractiveBarChart } from "../src/InteractiveBarChart";
import { LineChart, type ChartConfig } from "../src/LineChart";
import { PieChart, type PieConfig } from "../src/PieChart";
import { HeatmapChart, type HeatmapConfig } from "../src/HeatmapChart";
import barSample from "../assets/sample-data/bars.json";
import lineSample from "../assets/sample-data/series.json";
import pieSample from "../assets/sample-data/pie.json";
import heatmapSample from "../assets/sample-data/heatmap.json";

// The two ladder rungs this file exists to make live. Kept as literals rather than imported
// from lib/verify: an engine must not depend on the verifier, and a rename over there should
// break this test loudly rather than follow it silently.
const ROOT_MARKER = "data-splash-root";
const TITLE_MARKER = "data-splash-title";

const countOf = (html: string, attr: string) =>
  html.split(`${attr}=""`).length - 1;

describe("chart-native poses the capture ladder's markers", () => {
  const cases = [
    [
      "bar",
      <BarChart
        config={barSample as unknown as BarConfig}
        progress={1}
        width={840}
        height={460}
      />,
    ],
    [
      "line",
      <LineChart
        config={lineSample as unknown as ChartConfig}
        progress={1}
        width={840}
        height={480}
      />,
    ],
    [
      "pie",
      <PieChart
        config={pieSample as unknown as PieConfig}
        progress={1}
        width={840}
        height={480}
      />,
    ],
    [
      "heatmap",
      <HeatmapChart
        config={heatmapSample as unknown as HeatmapConfig}
        progress={1}
        width={840}
        height={480}
      />,
    ],
  ] as const;

  for (const [name, element] of cases) {
    it(`${name}: marks exactly one root and one title`, () => {
      const html = renderToStaticMarkup(element);
      expect(countOf(html, ROOT_MARKER)).toBe(1);
      expect(countOf(html, TITLE_MARKER)).toBe(1);
    });
  }

  it("the marked title carries the SAME text the ladder used to reach via the SVG name", () => {
    // The rung being replaced read `svg[role='img'][aria-label]`. The marker must not change
    // WHAT the verifier records as the rendered title, only how surely it finds it.
    const config = barSample as unknown as BarConfig;
    const html = renderToStaticMarkup(
      <BarChart config={config} progress={1} width={840} height={460} />,
    );
    expect(html).toContain(`aria-label="${config.title}"`);
    const marked = html.match(new RegExp(`${TITLE_MARKER}=""[^>]*>([^<]*)<`));
    expect(marked?.[1]).toBe(config.title);
  });

  it("the root marker sits on the OUTERMOST element, where `#root > div` used to land", () => {
    // The degradation it replaces resolved to the frame div, so the crop must not move.
    const html = renderToStaticMarkup(
      <BarChart
        config={barSample as unknown as BarConfig}
        progress={1}
        width={840}
        height={460}
      />,
    );
    expect(html.indexOf(ROOT_MARKER)).toBeLessThan(60);
    expect(html.startsWith("<div")).toBe(true);
  });

  it("marks the responsive layout too — that is the one an interactive deliverable ships", () => {
    const html = renderToStaticMarkup(
      <BarChart
        config={barSample as unknown as BarConfig}
        progress={1}
        width={840}
        height={460}
        responsive
      />,
    );
    expect(countOf(html, ROOT_MARKER)).toBe(1);
    expect(countOf(html, TITLE_MARKER)).toBe(1);
  });

  it("an INTERACTIVE chart marks the measured wrapper, not the frame inside it", () => {
    // In an interactive build `#root > div` is InteractiveChart's wrapper, with ChartFrame
    // nested inside at the same box. Both would happily claim to be the root; only the
    // outer one may, or the marker names a different element than the guess it replaces.
    // Measured on a produced interactive.html: wrapper and frame share the box exactly, so
    // the distinction is invisible in pixels and very visible in a `querySelector`.
    const html = renderToStaticMarkup(
      <InteractiveBarChart
        config={barSample as unknown as BarConfig}
        animateOn="none"
      />,
    );
    expect(countOf(html, ROOT_MARKER)).toBe(1);
    // ...and it is the OUTERMOST element, the one carrying the responsive wrapper's style.
    const marked = html.slice(html.indexOf(ROOT_MARKER));
    expect(marked).toContain("min-width:280px");
    expect(html.indexOf(ROOT_MARKER)).toBeLessThan(40);
  });

  it("an EMBEDDED chart marks neither — the host scaffold owns the page root and its title", () => {
    for (const responsive of [true, false]) {
      const html = renderToStaticMarkup(
        <BarChart
          config={barSample as unknown as BarConfig}
          progress={1}
          width={840}
          height={460}
          responsive={responsive}
          embedded
        />,
      );
      expect(countOf(html, ROOT_MARKER)).toBe(0);
      expect(countOf(html, TITLE_MARKER)).toBe(0);
    }
  });
});
