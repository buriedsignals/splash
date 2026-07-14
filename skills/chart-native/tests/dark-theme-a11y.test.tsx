import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AUDIT_REGISTRY } from "../src/component-registry";
import {
  COLORS,
  COLORS_DARK,
  deriveFurniture,
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

// The newsroom house `theme` (F2) is now an ARBITRARY ground hex threaded as `config.themeBg`:
// the frame bg becomes that ground and every FURNITURE text/line (title, axis, source, legend,
// gridlines) is DERIVED from it via deriveFurniture — ink = the max-contrast foreground, muted/
// axis/grid mixed toward the ground. The "dark" preset (#18181B) is just the most common non-light
// ground; a newsroom can equally pin grey, navy or pink. The danger is unchanged: a component that
// forgot to thread `themeBg` keeps painting furniture in a LIGHT-DEFAULT literal — ink #1A1A1A (a
// ~1.15:1 black-on-black fail on a dark ground), or the flat muted/axis/grid greys #6B6B6B /
// #CFCFCF / #E6E6E6 — an invisible straggler that never derived from the ground.
//
// This suite renders EVERY themeBg-supporting native type (the 27 components that thread `themeBg`
// — the family-B specialists that don't support it are out of scope) on non-light grounds and
// asserts (a) the ground bg is present, (b) the DERIVED furniture ink is present, and (c) no
// light-DEFAULT furniture literal survives. Three grounds are exercised: the dark preset (#18181B),
// an arbitrary DARK ground (dark brown), and an arbitrary LIGHT ground (pink) — proving the
// furniture derives from the ground, not from a two-value light/dark switch.

const source = { name: "Riverton open data", url: "https://example.org/x" };

// (render-type id, shipped sample) for the 27 themeBg-supporting components. The sample files are
// complete configs (title + source + data); we spread `themeBg` + a stable source over each and
// render the SAME static branch a static.png produce would.
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

// The four LIGHT-DEFAULT furniture literals that must NEVER survive a non-light render (they only
// appear if a component fell back to the flat COLORS furniture instead of deriving from the ground).
const INK = "#1A1A1A"; // COLORS.ink
const PURE_FURNITURE_GREYS = ["#6B6B6B", "#CFCFCF", "#E6E6E6"]; // muted / axis / grid

// The three types that legitimately print #1A1A1A as an IN-MARK label (labelInkOnFill on a
// light-enough mark fill) — theme-independent WCAG max-contrast text, not furniture. Their
// FURNITURE still derives from the ground; the greys are still enforced. This set is the
// labelInkOnFill importers among the 27; if it ever must grow, that is a real review question
// (a new in-mark-label type), not a silent widen.
const IN_MARK_INK_TYPES = new Set(["heatmap", "treemap", "diverging-stacked"]);

// Two arbitrary (non-preset) grounds proving derivation, not a light/dark switch:
const GROUND_DARK = "#3A2E2E"; // dark brown — a dark house ground that is NOT the #18181B preset
const GROUND_LIGHT = "#F7E8EE"; // pale pink — a light house ground that is NOT plain #FFFFFF

/** light-DEFAULT greys that leaked as CHROME because the component didn't derive furniture. The
 * flat muted/axis/grid greys are ALWAYS a leak (a derived ground tints them away). #1A1A1A is a
 * leak only when it is NOT the DERIVED ink for this ground — i.e. on a dark ground where the ink
 * flips to near-white; on a light/mid ground whose max-contrast ink IS #1A1A1A it is legitimate
 * furniture. The ground hex drives that decision (not a light/dark boolean), so a mid-luminance
 * ground that derives a near-black ink is handled correctly. The three in-mark-label types may
 * also carry #1A1A1A as an on-fill label (labelInkOnFill), theme-independently. */
function furnitureStragglers(
  type: string,
  markup: string,
  ground: string,
): string[] {
  const up = markup.toUpperCase();
  const found = PURE_FURNITURE_GREYS.filter((g) =>
    up.includes(g.toUpperCase()),
  );
  const inkIsBlack = deriveFurniture(ground).ink.toUpperCase() === INK;
  if (!inkIsBlack && !IN_MARK_INK_TYPES.has(type) && up.includes(INK))
    found.push(INK);
  return found;
}

function renderOn(
  type: string,
  sample: Record<string, unknown>,
  themeBg: string,
): string {
  const Comp = AUDIT_REGISTRY[type];
  if (!Comp) throw new Error(`no component registered for type "${type}"`);
  return renderToStaticMarkup(
    createElement(Comp, {
      config: { ...sample, source, themeBg },
      progress: 1,
      width: 840,
      height: 480,
    }),
  );
}

describe("theme a11y — chrome derives from the ground (dark preset #18181B)", () => {
  it("proves the black-on-black hazard the suite guards against is real", () => {
    // the light-default ink on the dark bg is an unreadable ~1.15:1 — exactly why furniture
    // MUST derive; the ground-derived ink on the dark bg clears WCAG body text.
    expect(contrastRatio(COLORS.ink, COLORS_DARK.bg)).toBeLessThan(3);
    expect(
      contrastRatio(COLORS_DARK.ink, COLORS_DARK.bg),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("covers every themeBg-supporting native type (all 27)", () => {
    expect(CASES).toHaveLength(27);
    for (const [type] of CASES) expect(AUDIT_REGISTRY[type]).toBeDefined();
  });

  for (const [type, sample] of CASES) {
    it(`${type}: dark preset bg #18181B present + derived ink #F4F4F5`, () => {
      const up = renderOn(type, sample, "#18181B").toUpperCase();
      expect(up).toContain(COLORS_DARK.bg.toUpperCase()); // "#18181B"
      expect(up).toContain(COLORS_DARK.ink.toUpperCase()); // "#F4F4F5"
    });

    it(`${type}: no light-default furniture literal survives the dark render`, () => {
      expect(
        furnitureStragglers(type, renderOn(type, sample, "#18181B"), "#18181B"),
      ).toEqual([]);
    });
  }
});

// The heart of the generalization: an ARBITRARY ground (not a preset) must derive its own
// furniture. Dark-brown (dark) → light derived ink; pink (light) → dark derived ink mixed toward
// pink, and the flat light-default greys must be ABSENT (their presence = a non-derived fallback).
describe("theme a11y — ARBITRARY grounds derive furniture (not a light/dark switch)", () => {
  const fDark = deriveFurniture(GROUND_DARK);
  const fLight = deriveFurniture(GROUND_LIGHT);

  it("a MID-luminance ground picks the max-contrast ink (not a fixed <0.4 flip)", () => {
    // #999999 sits just below the 0.4 luminance line: a naive <0.4 flip would pick near-WHITE ink
    // (which reads ~2.6:1 — a fail), but near-BLACK reads far better. deriveFurniture must pick the
    // ink that MAXIMISES contrast at every luminance, so the ink here is near-black.
    const MID = "#999999";
    const ink = deriveFurniture(MID).ink;
    expect(ink.toUpperCase()).toBe(INK); // near-black, the better pick on this ground
    expect(contrastRatio(ink, MID)).toBeGreaterThan(
      contrastRatio("#F4F4F5", MID),
    );
  });

  it("the HARD mid-luminance band escalates the ink to a pure pole so it clears 4.5:1", () => {
    // grounds in ≈ #717171–#818181: the better SOFTENED extreme (#1A1A1A / #F4F4F5) is only ~4.0:1
    // — below the WCAG text floor. deriveFurniture escalates to the pure pole (#000/#FFF) there, so
    // the primary ink clears 4.5:1 at EVERY ground luminance (never ships illegible on a house grey).
    for (const bg of ["#717171", "#757575", "#797979", "#818181"]) {
      const ink = deriveFurniture(bg).ink;
      expect(["#000000", "#FFFFFF"]).toContain(ink.toUpperCase()); // escalated to a pure pole
      expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5);
    }
    // clearly light/dark grounds keep the SOFTENED extremes (no needless escalation).
    expect(deriveFurniture("#18181B").ink.toUpperCase()).toBe("#F4F4F5");
    expect(deriveFurniture(GROUND_LIGHT).ink).toBe(INK);
  });

  it("the two arbitrary grounds resolve to distinct, ground-tinted furniture", () => {
    // dark ground → light ink; light ground → dark ink; neither reuses the flat default greys.
    expect(contrastRatio(fDark.ink, GROUND_DARK)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fLight.ink, GROUND_LIGHT)).toBeGreaterThanOrEqual(4.5);
    // the derived muted/axis/grid are tinted toward the ground → NOT the flat light defaults.
    for (const g of PURE_FURNITURE_GREYS) {
      expect([fDark.muted, fDark.axis, fDark.grid]).not.toContain(g);
      expect([fLight.muted, fLight.axis, fLight.grid]).not.toContain(g);
    }
  });

  for (const [type, sample] of CASES) {
    it(`${type}: arbitrary DARK ground ${GROUND_DARK} → derived ink + no straggler`, () => {
      const up = renderOn(type, sample, GROUND_DARK).toUpperCase();
      expect(up).toContain(GROUND_DARK.toUpperCase());
      expect(up).toContain(fDark.ink.toUpperCase());
      expect(
        furnitureStragglers(
          type,
          renderOn(type, sample, GROUND_DARK),
          GROUND_DARK,
        ),
      ).toEqual([]);
    });

    it(`${type}: arbitrary LIGHT ground ${GROUND_LIGHT} → derived furniture, no flat-default grey`, () => {
      const up = renderOn(type, sample, GROUND_LIGHT).toUpperCase();
      expect(up).toContain(GROUND_LIGHT.toUpperCase());
      // a light ground keeps a near-black derived ink; only the FLAT default greys are a leak.
      expect(
        furnitureStragglers(
          type,
          renderOn(type, sample, GROUND_LIGHT),
          GROUND_LIGHT,
        ),
      ).toEqual([]);
    });
  }
});

// The detector must actually FIRE — otherwise the suite is a no-op guard. These prove it catches a
// furniture straggler (and that the in-mark carve-out is #1A1A1A-only, dark-ground-only, narrow).
describe("theme a11y — the straggler detector fails on a straggler", () => {
  it("flags a leaked muted/axis/grid literal on ANY type/ground", () => {
    expect(
      furnitureStragglers("bar", '<text fill="#6B6B6B">x</text>', "#18181B"),
    ).toContain("#6B6B6B");
    expect(
      furnitureStragglers("line", '<line stroke="#E6E6E6"/>', GROUND_LIGHT),
    ).toContain("#E6E6E6");
  });

  it("flags a leaked light INK literal on a non-in-mark DARK ground", () => {
    expect(
      furnitureStragglers("bar", '<text fill="#1A1A1A">x</text>', "#18181B"),
    ).toContain("#1A1A1A");
  });

  it("the in-mark carve-out excuses ONLY #1A1A1A on a dark ground, never the greys", () => {
    // an in-mark type may carry #1A1A1A (an on-fill label) but a grey is still a leak.
    expect(
      furnitureStragglers("heatmap", '<text fill="#1A1A1A"/>', "#18181B"),
    ).toEqual([]);
    expect(
      furnitureStragglers("heatmap", '<line stroke="#CFCFCF"/>', "#18181B"),
    ).toContain("#CFCFCF");
  });

  it("on a LIGHT ground the derived #1A1A1A ink is NOT treated as a straggler", () => {
    // pink ground → derived ink is #1A1A1A; it is legitimate furniture, not a leak.
    expect(
      furnitureStragglers("bar", '<text fill="#1A1A1A">x</text>', GROUND_LIGHT),
    ).toEqual([]);
  });

  it("a LIGHT render of the same type DOES carry the flat furniture literals it derives away from", () => {
    // sanity: deriving the furniture is what removes them — a plain-light render is full of #1A1A1A.
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

// F3-follow-up — the interactive tooltip's dark affordance, now keyed on the GROUND. Every
// *Chart.tsx tooltip keys its border on the shared tooltipBorder(config.themeBg): on any dark
// ground the near-black panel gets a 1px hairline (the ground's derived axis token) so its edge +
// vanished shadow read; a light ground gets `undefined`, which React OMITS → byte-identical.
describe("theme — tooltip panel boundary affordance derives from the ground", () => {
  it("a light ground emits NO border (React drops undefined → byte-identical)", () => {
    expect(tooltipBorder(undefined)).toBeUndefined();
    expect(tooltipBorder("#FFFFFF")).toBeUndefined();
    expect(tooltipBorder(GROUND_LIGHT)).toBeUndefined();
    // proof React serializes an undefined style value to nothing (the basis of the light
    // byte-identity claim across all 27 swept tooltips).
    const withUndef = renderToStaticMarkup(
      createElement("div", {
        style: { background: COLORS.ink, border: tooltipBorder(undefined) },
      }),
    );
    const without = renderToStaticMarkup(
      createElement("div", { style: { background: COLORS.ink } }),
    );
    expect(withUndef).toBe(without);
  });

  it("a dark ground emits a visible hairline in the ground's derived axis token", () => {
    // preset dark ground.
    expect(tooltipBorder("#18181B")).toBe(`1px solid ${COLORS_DARK.axis}`);
    // arbitrary dark ground → the hairline derives from THAT ground, not a fixed token.
    const axisGreen = deriveFurniture(GROUND_DARK).axis;
    expect(tooltipBorder(GROUND_DARK)).toBe(`1px solid ${axisGreen}`);
    // the border must read against BOTH the panel (#1A1A1A) and the ground —
    // the panel edge is ~1.03:1 without it; the hairline lifts it clear of that floor.
    expect(contrastRatio(COLORS_DARK.axis, COLORS.ink)).toBeGreaterThan(1.5);
    expect(contrastRatio(COLORS_DARK.axis, COLORS_DARK.bg)).toBeGreaterThan(
      1.5,
    );
    const dark = renderToStaticMarkup(
      createElement("div", {
        style: { background: COLORS.ink, border: tooltipBorder("#18181B") },
      }),
    );
    expect(dark).toContain(`border:1px solid ${COLORS_DARK.axis}`);
  });
});
