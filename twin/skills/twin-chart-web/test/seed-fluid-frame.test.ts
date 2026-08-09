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

  // REVERSED 2026-08-10. This test used to assert the opposite — that the header block and the
  // source line WERE capped to 640px. See references/web-discipline.md, "The words take the same
  // width as the graphic": the title and the source are furniture over a graphic, not a paragraph
  // beside it, and a title stopping at 640px above a chart running to 1600 reads as a broken box.
  // The assertion is kept rather than deleted, pointed the other way, so nobody can reinstate the
  // cap without this file going red and telling them where the argument is written down.
  it("should cap neither the header block nor the source line — the words take the graphic's width", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    // Every rule in the stylesheet whose selector list names the header or the source: none of
    // them may declare a width cap. Written as a scan rather than a string match so that moving
    // the declaration into another rule (`.chart-header { … }`, `.chart-title { … }` inside a
    // grouped selector) does not slip past it.
    const capped = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selector]) =>
        /\.chart-(header|source|title|caveat)\b/.test(selector),
      )
      .filter(([, , body]) => /\bmax-width\b/.test(body))
      .map(([, selector]) => selector.trim().split("\n").pop());
    expect(capped).toEqual([]);
    // What did NOT change: words are still never squeezed to make the chart fit.
    expect(css).toContain(
      ".chart-header, .chart-filter, .chart-source { flex: 0 0 auto; }",
    );
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

// Everything in this block is the STRUCTURE of the window-fit rule, and none of it is the proof.
// `scripts/verify-web.mjs` is the proof: it drives Chrome at seven viewport sizes and measures
// `document.scrollHeight` against `window.innerHeight`, which is the only number a reader ever
// experiences. What a string assertion here CAN do is stop the mechanism being deleted or quietly
// rewritten into something that no longer clamps — measured before the fix, the seed came to 902px
// tall in an 800px window at 1600px wide, 1051px in a 950px window at 1920px, and 1762px at
// 3440x900; after it, 0px of overflow at every one of them, with the plot's height UNCHANGED
// wherever the window already had room.
describe("the beat fits the visible window", () => {
  const css = () =>
    buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
  const rule = (selector: string) => {
    const at = css().indexOf(selector);
    return css().slice(at, css().indexOf("}", at));
  };

  it("should clamp the figure to the viewport height, with a vh fallback under the dvh", () => {
    const figure = rule(".chart-figure {");
    expect(figure).toContain("max-height: 100dvh");
    // The fallback must come FIRST: both declarations are valid syntax to a parser that knows
    // dvh, and the last one wins there; an engine that does not know dvh drops that line and
    // keeps the vh above it. Reversed, the fallback would win everywhere.
    expect(figure.indexOf("max-height: 100vh")).toBeLessThan(
      figure.indexOf("max-height: 100dvh"),
    );
  });

  it("should make the figure a flex column so the clamp has something to distribute", () => {
    const figure = rule(".chart-figure {");
    expect(figure).toContain("display: flex");
    expect(figure).toContain("flex-direction: column");
    // Still no cap on the width — the fit rule must not have reintroduced the defect the fluid
    // redesign removed.
    expect(figure).not.toContain("max-width");
    expect(figure).toContain("width: 100%");
  });

  it("should let ONLY the plot absorb the shortfall — words are never squeezed", () => {
    const stylesheet = css();
    expect(stylesheet).toContain(
      ".chart-header, .chart-filter, .chart-source { flex: 0 0 auto; }",
    );
    const plot = rule(".chart-plot {");
    expect(plot).toContain("flex: 0 1 auto");
  });

  it("should give the plot an explicit pixel floor rather than letting it shrink to a strip", () => {
    const plot = rule(".chart-plot {");
    const floor = plot.match(/min-height:\s*(\d+)px/);
    expect(floor).not.toBeNull();
    const px = Number(floor![1]);
    // Above zero, because `min-height: 0` would also satisfy flexbox's own min-height:auto
    // override while allowing a 3px "chart"; and below the 153px the seed measures at the
    // narrowest width this genre verifies (375px), so the floor can never fire on a window this
    // genre actually ships to and change a rendering that was already correct.
    expect(px).toBeGreaterThan(0);
    expect(px).toBeLessThan(153);
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

  // The considered treatment the owner asked for — plain radios read as a placeholder. What a
  // string assertion can prove is that the treatment did not achieve its look by breaking the
  // control: `scripts/verify-web.mjs` is what proves a real click selects, Tab reaches, and the
  // focus ring changes actual pixels (that last check was itself first written wrong — it accepted
  // the user agent's outline on an `opacity: 0` input, which paints nothing, and passed against a
  // copy with the ring deleted).
  it("should wrap the three options in one .options track without leaving the fieldset", () => {
    const markup = renderSeed();
    expect(markup).toContain('<fieldset class="chart-filter">');
    expect(markup).toContain("<legend>Show</legend>");
    expect(markup).toContain('<div class="options">');
    // Three native radios in one named group — the thing that makes this a radio group to a
    // keyboard and to a screen reader, before any styling is applied to it.
    expect((markup.match(/type="radio"/g) ?? []).length).toBe(3);
    expect((markup.match(/name="period"/g) ?? []).length).toBe(3);
  });

  it("should put the segmented treatment behind a :has() support guard, leaving native radios as the base", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const at = css.indexOf("@supports selector(:has(*))");
    expect(at).toBeGreaterThan(-1);
    // The checked state is expressed through :has(); an engine without it must fall back to the
    // radios rather than to three identical unlit pills over a hidden input.
    expect(css).toContain(".chart-filter label:has(input:checked)");
    // Still no width/height breakpoint anywhere — @supports is a capability query, not a rung.
    expect(css).not.toContain("@media");
  });

  it("should never take a radio out of the focus order to make the pills look tidy", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const at = css.indexOf(".chart-filter label input {");
    const inputRule = css.slice(at, css.indexOf("}", at));
    expect(inputRule).toContain("opacity: 0");
    expect(inputRule).not.toContain("display: none");
    expect(inputRule).not.toContain("visibility: hidden");
    // A keyboard user must still see where they are: the ring goes on the pill, since the input
    // it would otherwise land on is transparent.
    expect(css).toContain(".chart-filter label:has(input:focus-visible)");
    expect(css).toMatch(
      /\.chart-filter label:has\(input:focus-visible\) \{ outline: \d+px solid/,
    );
  });

  it("should paint the checked pill from the derived furniture, never a literal colour", () => {
    const css = buildCss({
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const at = css.indexOf(".chart-filter label:has(input:checked)");
    const checkedRule = css.slice(at, css.indexOf("}", at));
    expect(checkedRule).toContain("background: var(--ink)");
    expect(checkedRule).toContain("color: var(--ground)");
    // The accent stays reserved for the subject — a control that borrowed it would make the one
    // colour that means something in this frame also mean "you clicked here".
    expect(checkedRule).not.toContain("var(--accent)");
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
