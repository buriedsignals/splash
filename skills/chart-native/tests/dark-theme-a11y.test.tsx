import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AUDIT_REGISTRY } from "../src/component-registry";
import {
  COLORS,
  COLORS_DARK,
  DARK_TOOLTIP_BORDER,
  tooltipBorder,
} from "../src/core/tokens";
import { contrastRatio } from "../src/core/conformance";

import barSample from "../assets/sample-data/bars.json";
import beeswarmSample from "../assets/sample-data/beeswarm.json";
import boxplotSample from "../assets/sample-data/boxplot.json";
import bulletSample from "../assets/sample-data/bullet.json";
import bumpSample from "../assets/sample-data/bump.json";
import connectedScatterSample from "../assets/sample-data/connected-scatter.json";
import divergingSample from "../assets/sample-data/diverging-bar.json";
import divergingStackedSample from "../assets/sample-data/diverging-stacked.json";
import dotStripSample from "../assets/sample-data/dot-strip.json";
import dumbbellSample from "../assets/sample-data/dumbbell.json";
import fanSample from "../assets/sample-data/fan.json";
import groupedSample from "../assets/sample-data/grouped.json";
import heatmapSample from "../assets/sample-data/heatmap.json";
import histogramSample from "../assets/sample-data/histogram.json";
import lineSample from "../assets/sample-data/series.json";
import lollipopSample from "../assets/sample-data/lollipop.json";
import pieSample from "../assets/sample-data/pie.json";
import pyramidSample from "../assets/sample-data/population-pyramid.json";
import radialBarSample from "../assets/sample-data/radial-bar.json";
import scatterSample from "../assets/sample-data/scatter.json";
import slopeSample from "../assets/sample-data/slope.json";
import stackedAreaSample from "../assets/sample-data/stacked-area.json";
import stackedSample from "../assets/sample-data/stacked.json";
import treemapSample from "../assets/sample-data/treemap.json";
import violinSample from "../assets/sample-data/violin.json";
import waffleSample from "../assets/sample-data/waffle.json";
import waterfallSample from "../assets/sample-data/waterfall.json";

// The newsroom house `theme: dark` (F2) flips the chart CHROME onto the dark furniture
// set (COLORS_DARK): the frame bg becomes #18181B and every FURNITURE text/line (title,
// axis, source, legend, gridlines) flips to the dark tokens (ink #F4F4F5, muted #A1A1AA,
// axis #52525B, grid #3F3F46). The danger: a component that forgot to thread `dark` keeps
// painting furniture in a LIGHT-theme literal — ink #1A1A1A (a ~1.15:1 black-on-black
// fail), or muted #6B6B6B / axis #CFCFCF / grid #E6E6E6 — an invisible straggler.
//
// This suite renders EVERY dark-supporting native type (the 27 components that thread
// `dark` — the family-B specialists that don't support dark are out of scope) on the dark
// theme and asserts NO light-furniture literal survives. A test that only checks #1A1A1A
// (and only 6 types) would PASS a muted/axis/grid straggler in the other 21 — this closes
// that gap: all four literals, all 27 types.
//
// The #1A1A1A carve-out: three of the 27 print an IN-MARK label directly on a coloured
// mark (heatmap cells, treemap cells, diverging-stacked segments) via labelInkOnFill —
// the shared WCAG max-contrast picker returns white OR the dark ink #1A1A1A depending on
// the fill, THEME-INDEPENDENTLY (the mark colour is the same in both themes). That #1A1A1A
// is legitimate (it sits on a light-enough fill, not on the dark ground) — the SAME
// allowance the finding grants the tooltip's #1A1A1A panel background. For those three
// types #1A1A1A is not treated as a furniture straggler; the three unambiguous furniture
// greys (never used as an in-mark colour) are still enforced, plus the dark ink must be
// present (proving the furniture text flipped). The static, non-interactive render
// (interactive=false, hover=null) carries NO tooltip, so it never exercises the tooltip's
// legitimate #1A1A1A.

const source = { name: "Riverton open data", url: "https://example.org/x" };

// (render-type id, shipped sample) for the 27 dark-supporting components. The sample
// files are complete configs (title + source + data); we spread `dark:true` + a stable
// source over each and render the SAME static branch a static.png produce would.
const CASES: [string, Record<string, unknown>][] = [
  ["bar", barSample],
  ["beeswarm", beeswarmSample],
  ["boxplot", boxplotSample],
  ["bullet", bulletSample],
  ["bump", bumpSample],
  ["connected-scatter", connectedScatterSample],
  ["diverging", divergingSample],
  ["diverging-stacked", divergingStackedSample],
  ["dot-strip", dotStripSample],
  ["dumbbell", dumbbellSample],
  ["fan", fanSample],
  ["grouped", groupedSample],
  ["heatmap", heatmapSample],
  ["histogram", histogramSample],
  ["line", lineSample],
  ["lollipop", lollipopSample],
  ["pie", pieSample],
  ["pyramid", pyramidSample],
  ["radial-bar", radialBarSample],
  ["scatter", scatterSample],
  ["slope", slopeSample],
  ["stacked-area", stackedAreaSample],
  ["stacked", stackedSample],
  ["treemap", treemapSample],
  ["violin", violinSample],
  ["waffle", waffleSample],
  ["waterfall", waterfallSample],
];

// The four LIGHT-theme furniture literals that must NEVER survive a dark render.
const INK = "#1A1A1A"; // COLORS.ink
const PURE_FURNITURE_GREYS = ["#6B6B6B", "#CFCFCF", "#E6E6E6"]; // muted / axis / grid

// The three dark-supporting types that legitimately print #1A1A1A as an IN-MARK label
// (labelInkOnFill on a light-enough mark fill) — theme-independent WCAG max-contrast text,
// not furniture. Their FURNITURE still uses the dark ink (#F4F4F5); the greys are still
// enforced. This set is the labelInkOnFill importers among the 27; if it ever must grow,
// that is a real review question (a new in-mark-label type), not a silent widen.
const IN_MARK_INK_TYPES = new Set(["heatmap", "treemap", "diverging-stacked"]);

/** the light-furniture literals that leaked as CHROME in a dark render (empty = clean). */
function furnitureStragglers(type: string, markup: string): string[] {
  const up = markup.toUpperCase();
  const found = PURE_FURNITURE_GREYS.filter((g) =>
    up.includes(g.toUpperCase()),
  );
  // #1A1A1A is a straggler UNLESS this type legitimately prints it as an in-mark label.
  if (!IN_MARK_INK_TYPES.has(type) && up.includes(INK.toUpperCase()))
    found.push(INK);
  return found;
}

function darkMarkup(type: string, sample: Record<string, unknown>): string {
  const Comp = AUDIT_REGISTRY[type];
  if (!Comp) throw new Error(`no component registered for dark type "${type}"`);
  return renderToStaticMarkup(
    createElement(Comp, {
      config: { ...sample, source, dark: true },
      progress: 1,
      width: 840,
      height: 480,
    }),
  );
}

describe("dark theme a11y — chrome flips to the dark furniture set", () => {
  it("proves the black-on-black hazard the suite guards against is real", () => {
    // the light-theme dark ink on the dark bg is an unreadable ~1.15:1 — exactly why
    // furniture MUST flip; the dark ink on the dark bg clears WCAG body text.
    expect(contrastRatio(COLORS.ink, COLORS_DARK.bg)).toBeLessThan(3);
    expect(
      contrastRatio(COLORS_DARK.ink, COLORS_DARK.bg),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("covers every dark-supporting native type (all 27)", () => {
    expect(CASES).toHaveLength(27);
    for (const [type] of CASES) expect(AUDIT_REGISTRY[type]).toBeDefined();
  });

  for (const [type, sample] of CASES) {
    it(`${type}: dark bg #18181B present + furniture ink flipped to #F4F4F5`, () => {
      const up = darkMarkup(type, sample).toUpperCase();
      expect(up).toContain(COLORS_DARK.bg.toUpperCase()); // "#18181B"
      expect(up).toContain(COLORS_DARK.ink.toUpperCase()); // "#F4F4F5"
    });

    it(`${type}: no light-furniture literal survives the dark render`, () => {
      expect(furnitureStragglers(type, darkMarkup(type, sample))).toEqual([]);
    });
  }
});

// The detector must actually FIRE — otherwise the suite is a no-op guard. These prove it
// catches a furniture straggler (and that the in-mark carve-out is #1A1A1A-only, narrow).
describe("dark theme a11y — the straggler detector fails on a straggler", () => {
  it("flags a leaked muted/axis/grid literal on ANY type", () => {
    expect(
      furnitureStragglers("bar", '<text fill="#6B6B6B">x</text>'),
    ).toContain("#6B6B6B");
    expect(furnitureStragglers("line", '<line stroke="#E6E6E6"/>')).toContain(
      "#E6E6E6",
    );
  });

  it("flags a leaked light INK literal on a non-in-mark type", () => {
    expect(
      furnitureStragglers("bar", '<text fill="#1A1A1A">x</text>'),
    ).toContain("#1A1A1A");
  });

  it("the in-mark carve-out excuses ONLY #1A1A1A, never the furniture greys", () => {
    // an in-mark type may carry #1A1A1A (an on-fill label) but a grey is still a leak.
    expect(furnitureStragglers("heatmap", '<text fill="#1A1A1A"/>')).toEqual(
      [],
    );
    expect(
      furnitureStragglers("heatmap", '<line stroke="#CFCFCF"/>'),
    ).toContain("#CFCFCF");
  });

  it("a LIGHT render of the same type DOES carry the furniture literals it flips", () => {
    // sanity: the flip is what removes them — a light render is full of #1A1A1A furniture.
    const lightBar = renderToStaticMarkup(
      createElement(AUDIT_REGISTRY.bar, {
        config: { ...(barSample as Record<string, unknown>), source },
        progress: 1,
        width: 840,
        height: 460,
      }),
    );
    expect(lightBar.toUpperCase()).toContain(COLORS.ink.toUpperCase());
  });
});

// F3-follow-up — the interactive tooltip's dark affordance. Every *Chart.tsx tooltip
// keys its border on the shared tooltipBorder(config.dark): on the dark frame the near-
// black panel gets a 1px hairline (the dark axis token) so its edge + vanished shadow
// read; light gets `undefined`, which React OMITS from the inline style → byte-identical.
describe("dark theme — tooltip panel boundary affordance", () => {
  it("light theme emits NO border (React drops undefined → byte-identical)", () => {
    expect(tooltipBorder(false)).toBeUndefined();
    expect(tooltipBorder(undefined)).toBeUndefined();
    // proof React serializes an undefined style value to nothing (the whole basis of
    // the light byte-identity claim across all 27 swept tooltips).
    const withUndef = renderToStaticMarkup(
      createElement("div", {
        style: { background: COLORS.ink, border: tooltipBorder(false) },
      }),
    );
    const without = renderToStaticMarkup(
      createElement("div", { style: { background: COLORS.ink } }),
    );
    expect(withUndef).toBe(without);
  });

  it("dark theme emits a visible hairline (the dark axis token) with real contrast", () => {
    expect(tooltipBorder(true)).toBe(DARK_TOOLTIP_BORDER);
    expect(DARK_TOOLTIP_BORDER).toBe(`1px solid ${COLORS_DARK.axis}`);
    // the border must read against BOTH the panel (#1A1A1A) and the ground (#18181B) —
    // the panel edge is ~1.03:1 without it; the hairline lifts it clear of that floor.
    expect(contrastRatio(COLORS_DARK.axis, COLORS.ink)).toBeGreaterThan(1.5);
    expect(contrastRatio(COLORS_DARK.axis, COLORS_DARK.bg)).toBeGreaterThan(
      1.5,
    );
    const dark = renderToStaticMarkup(
      createElement("div", {
        style: { background: COLORS.ink, border: tooltipBorder(true) },
      }),
    );
    expect(dark).toContain(`border:1px solid ${COLORS_DARK.axis}`);
  });
});
