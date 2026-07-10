// Guardrail: the x-axis TITLE and the cited SOURCE line must never share the
// bottom band. This is the symmetric twin of tests/header-fit.test.ts (which
// guards the title band at the top).
//
// Bug M: in the static / video (non-responsive) frame, ChartFrame overlays the
// source at the very bottom (bottom:12*scale, one line of TYPE.source) while each
// cartesian chart draws its x-axis title at `innerHeight + ~44` inside the plot
// group — i.e. absolute baseline = H - pad.bottom + DY. With a bottom padding that
// only reserved the axis furniture, both landed in the same band and OVERPRINTED
// ("...articl" + "Taille des classes"). The fix reserves the source-footer band in
// the shared static resolver (resolveFrameWithHeader) so every chart's bottom
// furniture floats above it.
//
// This test asserts the INVARIANT at the pure-layout layer for EVERY chart that
// renders a centred x-axis title, so any regression that shrinks the reserve is
// caught without a browser.

import { describe, it, expect } from "bun:test";
import { resolveFrameWithHeader } from "../src/core/format";
import { TYPE } from "../src/core/tokens";

// Mirror ChartFrame.tsx static (non-responsive) source-footer geometry:
//   bottom: 12 * scale  +  one line of TYPE.source text (line-height ~1.2).
// The footer box occupies the bottom band [srcTop, H].
const SOURCE_BOTTOM_INSET = 12;
const SOURCE_LINE_HEIGHT = 1.2;
const sourceBandTop = (H: number, scale: number): number =>
  H - (SOURCE_BOTTOM_INSET + TYPE.source * SOURCE_LINE_HEIGHT) * scale;

// A cartesian chart draws its x-axis title at innerHeight + DY inside the plot
// group; text descends ~0.3em below its baseline.
const AXIS_TITLE_DESCENT = 0.3;

interface AxisTitleChart {
  name: string;
  basePad: { top: number; right: number; bottom: number; left: number };
  dy: (scale: number) => number; // x-axis-title offset below innerHeight
  plotAspect?: number;
}

// The charts that render a centred x-axis title (config.xLabel at innerWidth/2),
// each with its real static basePad (1-line title) and its axis-title offset.
const CHARTS: AxisTitleChart[] = [
  {
    name: "scatter",
    basePad: { top: 64, right: 40, bottom: 60, left: 64 },
    dy: () => 44, // ScatterChart.tsx: y={innerHeight + 44}
  },
  {
    name: "connected-scatter",
    basePad: { top: 80, right: 24, bottom: 56, left: 64 },
    dy: (s) => 42 * s, // ConnectedScatterChart.tsx: y={innerHeight + 42 * sc}
  },
  {
    name: "population-pyramid",
    basePad: { top: 80, right: 18, bottom: 54, left: 18 },
    dy: (s) => 40 * s, // PopulationPyramidChart.tsx: innerHeight + 40 * sc
  },
];

function bands(chart: AxisTitleChart, W: number, H: number, scale: number) {
  const frame = resolveFrameWithHeader(
    "Short one-line title",
    undefined,
    W,
    H,
    chart.basePad,
    scale,
    chart.plotAspect,
    false, // static / video — the band that carries the source footer
  );
  const innerHeight = H - frame.pad.top - frame.pad.bottom;
  const axisTitleBaseline = frame.pad.top + innerHeight + chart.dy(scale);
  const axisTitleBottom =
    axisTitleBaseline + TYPE.axis * scale * AXIS_TITLE_DESCENT;
  return {
    axisTitleBottom,
    srcTop: sourceBandTop(H, scale),
    padBottom: frame.pad.bottom,
  };
}

describe("bottom-band invariant — x-axis title must never overlap the source footer", () => {
  // The shipped a11y fallback the bug is about: landscape static, scale 1.
  for (const chart of CHARTS) {
    it(`${chart.name}: x-axis title clears the source band (landscape static, scale 1)`, () => {
      const { axisTitleBottom, srcTop } = bands(chart, 840, 480, 1);
      // The x-axis title's bottom edge must sit at or above the source box's top.
      expect(axisTitleBottom).toBeLessThanOrEqual(srcTop);
      // …with real clearance, not a hairline touch.
      expect(srcTop - axisTitleBottom).toBeGreaterThanOrEqual(4);
    });
  }

  // The reserve must scale with the canvas (portrait/square video, scale 1.7).
  for (const chart of CHARTS.filter((c) => c.name !== "scatter")) {
    it(`${chart.name}: reserve scales — title clears source on a portrait video canvas (scale 1.7)`, () => {
      const { axisTitleBottom, srcTop } = bands(chart, 1080, 1350, 1.7);
      expect(axisTitleBottom).toBeLessThanOrEqual(srcTop);
    });
  }

  it("responsive (interactive) mode does NOT reserve a footer band — source flows below the plot", () => {
    // In responsive mode the source is normal-flow below the SVG, so the plot's
    // bottom padding must stay exactly the chart's declared bottom (no reserve).
    const basePad = { top: 16, right: 40, bottom: 60, left: 64 };
    const frame = resolveFrameWithHeader(
      "Short one-line title",
      undefined,
      840,
      480,
      basePad,
      1,
      undefined,
      true,
    );
    expect(frame.pad.bottom).toBe(basePad.bottom);
  });
});
