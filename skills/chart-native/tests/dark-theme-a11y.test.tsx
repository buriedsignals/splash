import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { LineChart, type ChartConfig } from "../src/LineChart";
import { ScatterChart, type ScatterConfig } from "../src/ScatterChart";
import { StackedBarChart, type StackedConfig } from "../src/StackedBarChart";
import { PieChart, type PieConfig } from "../src/PieChart";
import { WaterfallChart, type WaterfallConfig } from "../src/WaterfallChart";
import { COLORS, COLORS_DARK } from "../src/core/tokens";
import { contrastRatio } from "../src/core/conformance";

// The newsroom house `theme: dark` (F2) flips the chart CHROME onto the dark
// furniture set (COLORS_DARK): the frame background becomes #18181B and every
// furniture text (title, axis, source, legend) flips to the LIGHT ink C.ink
// (#F4F4F5). The danger the batch had to avoid: a component that forgot to thread
// `dark` keeps painting furniture in the light-theme dark ink COLORS.ink (#1A1A1A),
// which on the dark bg is a ~1.15:1 black-on-black fail — invisible text. This
// suite renders a representative slice of the type grid on the dark theme and
// asserts (a) the dark bg is present, (b) the light furniture ink is present, and
// (c) the light-theme dark ink NEVER appears (no black-on-black furniture text).
//
// The static, non-interactive render (progress=1) has no hover tooltip — the one
// place COLORS.ink legitimately stays a dark PANEL background regardless of theme —
// so #1A1A1A must be entirely absent from these markups.

const source = { name: "Riverton open data", url: "https://example.org/x" };

const barConfig: BarConfig = {
  title: "The Central branch draws more visitors than the next three combined",
  source,
  unit: "monthly visits",
  catField: "branch",
  valField: "visits",
  orientation: "horizontal",
  sort: "desc",
  rows: [
    { branch: "Central", visits: 10400 },
    { branch: "Riverside", visits: 4200 },
    { branch: "Hilltop", visits: 2600 },
  ],
  dark: true,
};

const lineConfig: ChartConfig = {
  title: "Ridership climbed steadily across the decade",
  source,
  unit: "annual riders (000s)",
  directLabel: "Riders",
  xField: "year",
  yField: "riders",
  xType: "linear",
  points: [
    { year: 2018, riders: 120 },
    { year: 2019, riders: 148 },
    { year: 2020, riders: 96 },
    { year: 2021, riders: 172 },
    { year: 2022, riders: 210 },
  ],
  dark: true,
};

const scatterConfig: ScatterConfig = {
  title: "Branches open longer draw far more visitors",
  source,
  xField: "hours",
  yField: "visits",
  xLabel: "weekly opening hours",
  yLabel: "monthly visits",
  rows: [
    { branch: "Central", hours: 62, visits: 10400 },
    { branch: "Riverside", hours: 40, visits: 4200 },
    { branch: "Hilltop", hours: 28, visits: 2600 },
  ],
  dark: true,
};

const stackedConfig: StackedConfig = {
  title: "Renewables overtook coal in the town's power mix by 2024",
  source,
  unit: "% of electricity generated",
  catField: "year",
  seriesFields: ["Coal", "Gas", "Hydro", "Renewables"],
  rows: [
    { year: 2010, Coal: 52, Gas: 20, Hydro: 18, Renewables: 10 },
    { year: 2015, Coal: 41, Gas: 24, Hydro: 18, Renewables: 17 },
    { year: 2020, Coal: 30, Gas: 26, Hydro: 19, Renewables: 25 },
    { year: 2024, Coal: 18, Gas: 22, Hydro: 20, Renewables: 40 },
  ],
  dark: true,
};

const pieConfig: PieConfig = {
  title: "The city covers nearly three-fifths of the library's funding",
  source,
  unit: "annual funding",
  labelField: "source",
  valueField: "amount",
  rows: [
    { source: "City grant", amount: 1160000 },
    { source: "State grant", amount: 360000 },
    { source: "Donations", amount: 280000 },
    { source: "Fees", amount: 200000 },
  ],
  dark: true,
};

const waterfallConfig: WaterfallConfig = {
  title: "Salaries and upkeep swallowed the council's new income",
  source,
  unit: "running balance (£000s)",
  rows: [
    { label: "Opening", value: 1200, total: true },
    { label: "Grants", value: 600 },
    { label: "Fees", value: 200 },
    { label: "Salaries", value: -900 },
    { label: "Upkeep", value: -350 },
    { label: "Closing", value: 750, total: true },
  ],
  dark: true,
};

// (type, rendered dark-theme markup) — every branch is a fixed, non-interactive
// static render (responsive defaults false), so we exercise the SAME frame branch a
// static.png produce would.
const RENDERS: [string, string][] = [
  [
    "bar",
    renderToStaticMarkup(
      <BarChart config={barConfig} progress={1} width={840} height={460} />,
    ),
  ],
  [
    "line",
    renderToStaticMarkup(
      <LineChart config={lineConfig} progress={1} width={840} height={480} />,
    ),
  ],
  [
    "scatter",
    renderToStaticMarkup(
      <ScatterChart
        config={scatterConfig}
        progress={1}
        width={840}
        height={480}
      />,
    ),
  ],
  [
    "stacked",
    renderToStaticMarkup(
      <StackedBarChart
        config={stackedConfig}
        progress={1}
        width={840}
        height={460}
      />,
    ),
  ],
  [
    "pie",
    renderToStaticMarkup(
      <PieChart config={pieConfig} progress={1} width={840} height={480} />,
    ),
  ],
  [
    "waterfall",
    renderToStaticMarkup(
      <WaterfallChart
        config={waterfallConfig}
        progress={1}
        width={840}
        height={480}
      />,
    ),
  ],
];

describe("dark theme a11y — chrome flips to the dark furniture set", () => {
  it("proves the black-on-black hazard the suite guards against is real", () => {
    // the light-theme dark ink on the dark bg is an unreadable ~1.15:1 — exactly why
    // furniture MUST flip; the light ink on the dark bg clears WCAG body text.
    expect(contrastRatio(COLORS.ink, COLORS_DARK.bg)).toBeLessThan(3);
    expect(
      contrastRatio(COLORS_DARK.ink, COLORS_DARK.bg),
    ).toBeGreaterThanOrEqual(4.5);
  });

  for (const [type, markup] of RENDERS) {
    it(`${type}: frame background is the dark bg #18181B`, () => {
      expect(markup).toContain(COLORS_DARK.bg); // "#18181B"
    });

    it(`${type}: title/axis ink is the light furniture ink #F4F4F5`, () => {
      expect(markup.toUpperCase()).toContain(COLORS_DARK.ink.toUpperCase());
    });

    it(`${type}: no furniture text renders in the light-theme dark ink (black-on-black)`, () => {
      // COLORS.ink (#1A1A1A) on the dark bg would be an invisible fail; the static,
      // non-interactive render has no dark-panel tooltip, so it must be wholly absent.
      expect(markup.toUpperCase()).not.toContain(COLORS.ink.toUpperCase());
    });
  }
});
