import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LineChart, type ChartConfig } from "../src/LineChart";
import { BarChart, type BarConfig } from "../src/BarChart";
import { ScatterChart, type ScatterConfig } from "../src/ScatterChart";
import { PieChart, type PieConfig } from "../src/PieChart";
import { StackedBarChart, type StackedConfig } from "../src/StackedBarChart";
import { DumbbellChart, type DumbbellConfig } from "../src/DumbbellChart";
import lineSample from "../assets/sample-data/series.json";
import barSample from "../assets/sample-data/bars.json";
import scatterSample from "../assets/sample-data/scatter.json";
import pieSample from "../assets/sample-data/pie.json";
import stackedSample from "../assets/sample-data/stacked.json";
import dumbbellSample from "../assets/sample-data/dumbbell.json";

// Regression guard for the redundant-title-tooltip bug.
//
// Every chart <svg> used to carry BOTH:
//   - aria-label={config.title}      → the accessible NAME (correct, kept)
//   - <title>{config.title}</title>  → an SVG <title> FIRST CHILD (the bug)
// An SVG <title> element makes the browser render a native, cursor-following
// tooltip repeating the chart title — which is already shown in the header, so
// it is pure noise. It was also redundant for assistive tech: aria-label wins
// over <title> in the accessible-name computation, so removing <title> loses
// nothing for screen readers.
//
// Three distinct uses must be kept straight:
//   (a) aria-label on <svg role="img">  → KEEP (accessible name).
//   (b) per-data-mark tooltips           → in chart-native these are HTML
//       `.tooltip` divs (ChartFrame), NOT SVG <title>, so unaffected here.
//   (c) <title>/title= at the svg root   → the bug, removed everywhere.
//
// `/<title[\s>]/` matches an OPENING <title> tag only (`</title>` starts with
// `</`, so it never matches) — i.e. it fires iff an SVG <title> element exists.

const UNIQUE = "ZZ_UNIQUE_ARIA_NAME_ZZ";

const cases: { name: string; markup: () => string }[] = [
  {
    name: "line",
    markup: () =>
      renderToStaticMarkup(
        <LineChart
          config={{ ...(lineSample as unknown as ChartConfig), title: UNIQUE }}
          progress={1}
          width={840}
          height={480}
        />,
      ),
  },
  {
    name: "bar",
    markup: () =>
      renderToStaticMarkup(
        <BarChart
          config={{ ...(barSample as unknown as BarConfig), title: UNIQUE }}
          progress={1}
          width={840}
          height={460}
        />,
      ),
  },
  {
    name: "scatter",
    markup: () =>
      renderToStaticMarkup(
        <ScatterChart
          config={{
            ...(scatterSample as unknown as ScatterConfig),
            title: UNIQUE,
          }}
          progress={1}
          width={840}
          height={480}
        />,
      ),
  },
  {
    name: "pie",
    markup: () =>
      renderToStaticMarkup(
        <PieChart
          config={{ ...(pieSample as unknown as PieConfig), title: UNIQUE }}
          progress={1}
          width={840}
          height={480}
        />,
      ),
  },
  {
    name: "stacked",
    markup: () =>
      renderToStaticMarkup(
        <StackedBarChart
          config={{
            ...(stackedSample as unknown as StackedConfig),
            title: UNIQUE,
          }}
          progress={1}
          width={840}
          height={460}
        />,
      ),
  },
  {
    name: "dumbbell",
    markup: () =>
      renderToStaticMarkup(
        <DumbbellChart
          config={{
            ...(dumbbellSample as unknown as DumbbellConfig),
            title: UNIQUE,
          }}
          progress={1}
          width={840}
          height={480}
        />,
      ),
  },
];

describe("chart-native svg root — no redundant chart-title tooltip", () => {
  for (const c of cases) {
    it(`${c.name}: <svg> has aria-label name but NO <title> element`, () => {
      const m = c.markup();
      // (c) no SVG <title> anywhere → no cursor-following native tooltip
      expect(m).not.toMatch(/<title[\s>]/);
      // (a) the accessible name survives on the role="img" svg
      expect(m).toContain('role="img"');
      expect(m).toContain(`aria-label="${UNIQUE}"`);
    });
  }
});
