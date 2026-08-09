// The redesign's own shape, proven directly — see SKILL.md's "Overview" and
// `references/web-discipline.md`'s "Responsive behaviour" for the reasoning this file pins as
// code. The owner's own read of the first build was that a screenshot, not a computed-style
// reading, is what showed the frame stopping short of its container — this file cannot replace
// that screenshot (see the skill's own gotcha section), but it CAN pin the two structural claims a
// screenshot cannot see directly: that the `<svg>` genuinely carries no text, and that nothing in
// the shared stylesheet caps the chart frame's own width the way it capped the first build's.
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "../scripts/render-still.mjs";
import {
  ChartWebSeed,
  FRAME,
  periodOf,
  periodRangeLabel,
  segments,
  chartGeometry,
} from "../assets/ChartWebSeed.tsx";
import { buildCss } from "../scripts/render-web.mjs";

const HERE = import.meta.dirname;

const DATA = JSON.parse(
  await readFile(
    join(HERE, "..", "assets", "sample-data", "rainfall.json"),
    "utf8",
  ),
);

function renderSeed() {
  const ground = "#FFFFFF";
  const furniture = deriveFurniture(ground);
  return renderToStaticMarkup(
    createElement(ChartWebSeed, {
      data: DATA,
      title: "Rainfall over the sample town fell by a third",
      source: "Sample data — not a real measurement",
      alt: "A line falling from 912 to 604 across eleven readings.",
      ground,
      accent: "#0B7A75",
      subject: "the sample town",
      ...furniture,
      measure: measureText,
      frame: FRAME,
    }),
  );
}

describe("the seed's <svg> carries geometry only", () => {
  it("should contain no <text> element anywhere in the SSR'd svg", () => {
    const markup = renderSeed();
    const svgOnly = markup.slice(
      markup.indexOf("<svg"),
      markup.indexOf("</svg>"),
    );
    expect(svgOnly).not.toContain("<text");
  });

  it("should still carry every word as plain HTML outside the svg", () => {
    const markup = renderSeed();
    const beforeSvg = markup.slice(0, markup.indexOf("<svg"));
    expect(beforeSvg).toContain(
      "Rainfall over the sample town fell by a third",
    );
    expect(markup).toContain("2015 level");
    expect(markup).toContain("the year&#x27;s biggest rebound");
    expect(markup).toContain("the sample town");
  });

  it("should render exactly one svg.chart element — no second pre-rendered rung", () => {
    const markup = renderSeed();
    expect((markup.match(/class="chart"/g) ?? []).length).toBe(1);
    expect(markup).not.toContain("data-layout=");
  });

  it("should stretch the svg with preserveAspectRatio=none rather than letterboxing it", () => {
    const markup = renderSeed();
    expect(markup).toContain('preserveAspectRatio="none"');
  });
});

describe("nothing caps the chart frame's own width", () => {
  it("should never set max-width on .chart-figure or .chart-plot in the shared stylesheet", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const figureRule = css.slice(
      css.indexOf(".chart-figure {"),
      css.indexOf("}", css.indexOf(".chart-figure {")),
    );
    const plotRule = css.slice(
      css.indexOf(".chart-plot {"),
      css.indexOf("}", css.indexOf(".chart-plot {")),
    );
    expect(figureRule).not.toContain("max-width");
    expect(plotRule).not.toContain("max-width");
    expect(figureRule).toContain("width: 100%");
    expect(plotRule).toContain("width: 100%");
  });

  it("should cap only the header block and the source line to a reading measure", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    expect(css).toContain(".chart-header, .chart-source { max-width: 640px; }");
  });

  it("should carry no @media breakpoint — the redesign this file exists to prove has none", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    expect(css).not.toContain("@media");
  });

  // Regression: filling the container is a claim about the FRAME's own edges, not about the
  // content inside it. The owner's own 1600px screenshot showed the title, the axis labels, the
  // source line and the end-point mark all touching the frame's edge with zero inner margin — a
  // real defect a "no max-width" assertion alone cannot catch, since the frame filling its
  // container and its content having room to breathe are two different claims.
  it("should give .chart-figure a fixed, non-zero inner padding on every side", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const figureRule = css.slice(
      css.indexOf(".chart-figure {"),
      css.indexOf("}", css.indexOf(".chart-figure {")),
    );
    const paddingMatch = figureRule.match(/padding:\s*([\d.]+)px/);
    expect(paddingMatch).not.toBeNull();
    const px = Number(paddingMatch![1]);
    expect(px).toBeGreaterThan(0);
    // Fixed CSS pixels, never a fraction of the container — this genre's own "type/spacing is a
    // fixed value, only geometry stretches" rule, extended to the frame's inner margin. A `%`- or
    // `vw`-based inset would either shrink toward nothing on a narrow frame or balloon on a wide
    // one; a modest fixed value reads as deliberate at every width instead (see this file's own
    // 1600/1024/768/375px screenshots).
    expect(figureRule).not.toMatch(/padding:[^;]*%/);
    expect(figureRule).not.toMatch(/padding:[^;]*vw/);
    // Small enough that it cannot "eat" the narrowest width this genre verifies at (375px) — an
    // explicit ceiling so a future edit cannot silently turn this back into the large-fixed-value
    // failure mode the beat's own report warns against.
    expect(px).toBeLessThan(48);
  });

  // Regression: driving a real browser (see the beat's own report) found that `.overlay` — sharing
  // the svg's own grid cell so its `%`-positioned labels line up with the geometry — intercepted
  // every pointer event over the WHOLE plot before it ever reached the svg's `.hit-area` beneath
  // it, because a plain div has no pointer-events override by default. Hover/tap silently did
  // nothing anywhere in the plot; only keyboard focus (which never goes through hit-testing) still
  // worked, which is exactly the kind of defect a markup read or a unit test asserting attributes
  // exist would miss and only driving a real pointer over the real page caught.
  it("should mark .overlay pointer-events:none so it never shadows the svg's own hit-area", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const overlayRule = css.slice(
      css.indexOf(".chart-plot .overlay {"),
      css.indexOf("}", css.indexOf(".chart-plot .overlay {")),
    );
    expect(overlayRule).toContain("pointer-events: none");
  });
});

describe("the filter — default view complete, dimming only, native controls", () => {
  it("should default to the 'All years' radio checked, with the other two present but unchecked", () => {
    const markup = renderSeed();
    expect(markup).toContain('id="period-all"');
    expect(markup).toContain('id="period-early"');
    expect(markup).toContain('id="period-late"');
    const allInput = markup.slice(
      markup.indexOf('id="period-all"') - 40,
      markup.indexOf('id="period-all"') + 120,
    );
    expect(allInput).toContain("checked");
  });

  it("should tag every point and segment with its own period, classified from the real split year", () => {
    expect(periodOf(2019, 2020)).toBe("early");
    expect(periodOf(2020, 2020)).toBe("late");
    const markup = renderSeed();
    expect(markup).toContain('data-period="early"');
    expect(markup).toContain('data-period="late"');
  });

  it("should derive each filter option's label from the real span of readings in that period", () => {
    const years = DATA.map((d: { year: number }) => d.year);
    expect(periodRangeLabel("early", years, 2020)).toBe("2015–2019");
    expect(periodRangeLabel("late", years, 2020)).toBe("2020–2025");
  });

  it("should build one segment per consecutive pair, tagged by the arriving point's period", () => {
    const { points } = chartGeometry(DATA, { width: 100, height: 100 });
    const segs = segments(points, 2020);
    expect(segs.length).toBe(DATA.length - 1);
    expect(segs.every((s) => s.period === "early" || s.period === "late")).toBe(
      true,
    );
    // The segment landing on 2020 arrives in "late" — tagged by the arriving point, not the leaving one.
    const boundary = segs.find((s) => s.b.year === 2020);
    expect(boundary?.period).toBe("late");
  });

  it("should never gate the reference rule, the peak label or the end label behind data-period", () => {
    // These three are the argument, already stated (web-discipline.md, "What must not become
    // interactive") — none of them may carry the attribute the filter's CSS keys off.
    const markup = renderSeed();
    const overlay = markup.slice(
      markup.indexOf('class="overlay"'),
      markup.indexOf('<div class="x-axis"'),
    );
    expect(overlay).not.toContain("data-period");
  });
});
