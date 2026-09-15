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
  seedFilterDeclaration,
  segments,
  chartGeometry,
} from "../assets/ChartWebSeed.tsx";
import {
  buildFilterIndex,
  filterNotes,
  filterOptionsForMarkup,
} from "../assets/filter.ts";
import {
  assertNoEmptySurplus,
  assertPlotCellIsItsViewBox,
  buildCss,
  plotViewBoxOf,
} from "../scripts/render-web.mjs";
import { controlChromeCss } from "../assets/control-chrome.ts";

const HERE = import.meta.dirname;

const DATA = JSON.parse(
  await readFile(
    join(HERE, "..", "assets", "sample-data", "rainfall.json"),
    "utf8",
  ),
);

/** The seed's own filter declaration and the keys it draws — built exactly as the runner builds
 *  them (`render-web.mjs`'s `render`), because a test that hand-rolled the index would stop
 *  proving that the DECLARED path works. */
const SEED_YEARS = DATA.map((d: { year: number }) => d.year);
const SEED_FILTER = seedFilterDeclaration(SEED_YEARS);
const SEED_FILTER_KEYS = SEED_YEARS.map(String);
const SEED_INDEX = buildFilterIndex(SEED_FILTER, SEED_FILTER_KEYS);

function renderSeed() {
  const ground = "#FFFFFF";
  const furniture = deriveFurniture(ground);
  return renderToStaticMarkup(
    createElement(ChartWebSeed, {
      data: DATA,
      filterIndex: SEED_INDEX,
      filterOptions: filterOptionsForMarkup(SEED_FILTER, "chart-filter"),
      filterNotes: filterNotes(SEED_FILTER, SEED_FILTER_KEYS),
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
  const css = () =>
    buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });

  it("should never set max-width on .chart-figure or .chart-plot in the shared stylesheet", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
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
    // The plot fills its OWN column, and that column is computed to be exactly the drawing plus
    // this beat's declared gutters — so `width: 100%` here is the drawing's width, not the frame's,
    // and there is no empty gutter inside it. The frame still takes the whole container: that is
    // the assertion above, and it is the one the owner's screenshot was about.
    expect(plotRule).toContain("width: 100%");
  });

  // REVERSED 2026-08-10. This test used to assert the opposite — that the header block and the
  // source line WERE capped to 640px. See references/web-discipline.md, "The words take the same
  // width as the graphic": the title and the source are furniture over a graphic, not a paragraph
  // beside it, and a title stopping at 640px above a chart running to 1600 reads as a broken box.
  // The assertion is kept rather than deleted, pointed the other way, so nobody can reinstate the
  // cap without this file going red and telling them where the argument is written down.
  it("should cap neither the header block nor the source line — the words take the graphic's width", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
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
    expect(css).toContain(".chart-header, .chart-source { flex: 0 0 auto; }");
  });

  // NARROWED 2026-08-10, W4 Task 5. This assertion used to read `expect(css).not.toContain("@media")`
  // and it was RIGHT about the defect and WRONG about the mechanism. What the fluid redesign
  // overturned was a two-RUNG layout: a second pre-rendered arrangement that a width query swapped
  // in, so the beat had two shapes and a reader saw whichever the query picked. `@media` is not
  // that. It is the only way CSS can say "this container is narrower than the content needs", and
  // ruling R2 requires exactly that sentence for the web format — web is not a fourth export size,
  // it fills whatever container the CMS gives it, and filling a 375px-wide phone is a different
  // instruction from filling a 1600px article well.
  //
  // Left as written, whoever implements that DELETES this test, and a guard deleted is the failure
  // mode `HANDOVER.md:725-729` documents. So it is narrowed to the PATTERN, with its reason, rather
  // than removed: at most one query, and nothing inside it may take content away or cap the frame.
  //
  // NOT touched here, deliberately: the header/source width cap. That is B3.3's, already reversed
  // by its own owner in the test above (`should cap neither the header block nor the source line`),
  // whose scan runs over the WHOLE stylesheet and therefore already covers anything nested in a
  // query. Re-pinning it from this direction would undo work that has just landed.
  //
  // THE MUTATIONS THAT REDDEN THE THREE ASSERTIONS BELOW. Run by injecting each rule into
  // `buildCss`'s stylesheet in a copy of the tree under /tmp, 2026-08-10:
  //
  //   a second @media (max-width) block                       RED  — "at most ONE width query"
  //   @media { .chart-figure { max-width: 560px } }           RED  — the cap defect, by pattern
  //   @media { .chart-plot { display: none } }                RED  — ×2
  //   @media { .end-label { display: none } }                 RED  — ×2, it carries a value
  //   @media { .chart-source { display: none } }              RED  — provenance is not optional
  //   @media (orientation: portrait) { … }                    RED  — a rung under another name
  //   @media { .x-axis .tick:nth-child(2n) { display:none } } GREEN — the one legitimate removal
  //
  // The last row is the point of the allowlist: a redundant second reading of a scale that is still
  // fully drawn may go on a phone. Nothing that carries a value may.
  const mediaBlocks = (css: string) => {
    // Top-level at-rule blocks, matched by brace-depth rather than by regex, so a nested rule
    // inside the query does not terminate the block early.
    const found: string[] = [];
    for (const m of css.matchAll(/@media\b([^{]*)\{/g)) {
      let depth = 1;
      let i = m.index! + m[0].length;
      for (; i < css.length && depth > 0; i++) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
      }
      found.push(css.slice(m.index!, i));
    }
    return found;
  };

  it("should carry at most ONE width query — a second rung is a rung", () => {
    const blocks = mediaBlocks(css());
    expect(blocks.length).toBeLessThanOrEqual(1);
    // And if there is one, it is a max-width query about the container's narrowness — not a
    // print/orientation/resolution rule sneaking a different layout in under another name.
    for (const block of blocks) {
      expect(block.slice(0, block.indexOf("{"))).toMatch(/max-width:\s*\d+px/);
    }
  });

  it("should never, inside a width query, cap the frame or hide a mark layer", () => {
    // The two-rung defect and the cap defect, named as patterns instead of as a mechanism. A query
    // may re-proportion the plot; it may not take the graphic away or put the cap back.
    const STRUCTURE =
      /\.(chart-figure|chart-plot|chart|seg|pt|overlay|hit-area|end-label|note)\b/;
    for (const block of mediaBlocks(css())) {
      for (const [, selector, body] of block.matchAll(
        /([^{}]+)\{([^{}]*)\}/g,
      )) {
        if (!STRUCTURE.test(selector)) continue;
        expect([selector.trim(), /\bmax-width\b/.test(body)]).toEqual([
          selector.trim(),
          false,
        ]);
        expect([selector.trim(), /\bdisplay:\s*none\b/.test(body)]).toEqual([
          selector.trim(),
          false,
        ]);
        expect([
          selector.trim(),
          /\bvisibility:\s*hidden\b/.test(body),
        ]).toEqual([selector.trim(), false]);
      }
    }
  });

  it("should hide, inside a width query, only tick labels — never anything carrying a value", () => {
    // Dropping alternate x-tick labels on a phone removes a redundant reading of a scale that is
    // still fully drawn. That is the ONLY thing a query may remove. A data point, a series, an end
    // label, an annotation, the source line — each of those IS the argument or its provenance, and
    // a narrow window is not a reason to stop making it. The allowlist is written as classes,
    // deliberately narrow, so widening it is a visible edit with a reason attached.
    const ALLOWED_TO_HIDE =
      /^\s*\.(x-axis|y-axis)\s+\.tick(-label)?(:nth-child\([^)]*\))?\s*$/;
    for (const block of mediaBlocks(css())) {
      for (const [, selector, body] of block.matchAll(
        /([^{}]+)\{([^{}]*)\}/g,
      )) {
        if (!/\b(display:\s*none|visibility:\s*hidden)\b/.test(body)) continue;
        for (const one of selector.split(",")) {
          expect([one.trim(), ALLOWED_TO_HIDE.test(one)]).toEqual([
            one.trim(),
            true,
          ]);
        }
      }
    }
  });

  // Regression: filling the container is a claim about the FRAME's own edges, not about the
  // content inside it. The owner's own 1600px screenshot showed the title, the axis labels, the
  // source line and the end-point mark all touching the frame's edge with zero inner margin — a
  // real defect a "no max-width" assertion alone cannot catch, since the frame filling its
  // container and its content having room to breathe are two different claims.
  it("should give .chart-figure a fixed, non-zero inner padding on every side", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
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
    // Fixed CSS pixels, never a fraction of the container — this format's own "type/spacing is a
    // fixed value, only geometry stretches" rule, extended to the frame's inner margin. A `%`- or
    // `vw`-based inset would either shrink toward nothing on a narrow frame or balloon on a wide
    // one; a modest fixed value reads as deliberate at every width instead (see this file's own
    // 1600/1024/768/375px screenshots).
    expect(figureRule).not.toMatch(/padding:[^;]*%/);
    expect(figureRule).not.toMatch(/padding:[^;]*vw/);
    // Small enough that it cannot "eat" the narrowest width this format verifies at (375px) — an
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
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
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

// Everything in this block is the STRUCTURE of the two-column rule, and none of it is the proof.
// `scripts/verify-web.mjs` is the proof: it drives Chrome and measures the drawing, the column and
// the window against each other.
//
// TWO RULES THIS REPLACED, AND WHY BOTH WENT. It first asserted `max-height: 100dvh` on the figure
// with the plot as the only shrinkable item — that clamp made the cell HEIGHT-driven and left two
// empty side gutters: "la carte ne prend pas toute la largeur tout comme les charts". It then
// asserted the clamp's absence and a width-driven cell — and every page grew past the window: "ça
// prend la largeur mais ne respecte pas la hauteur qu'on avait avant". Both hold at once only if
// the surplus width goes somewhere real, so it goes to the words.
// Measured on the seed at 1512x860 after this change: drawing 1086.1x503.3 at its own viewBox
// ratio, a 1141px plot box, a 323px column, 0px of width unused, and the document exactly 860px in
// an 860px window.
describe("the drawing is sized by the height it has, and the surplus width becomes a column", () => {
  const css = () =>
    buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
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

  it("should lay the figure out as the drawing plus a column that takes everything left", () => {
    // THE MUTATION: a fixed second track, or `auto`. Either gives the leftover width a third place
    // to go, and where it goes is nowhere — the empty gutter this arrangement exists to end.
    const figure = rule(".chart-figure {");
    expect(figure).toContain("minmax(var(--aside-min), 1fr);");
    expect(figure).not.toContain("max-width");
    expect(figure).toContain("width: 100%");
  });

  it("should state the drawing's own column as arithmetic, never as an intrinsic guess", () => {
    // A grid sizes COLUMNS before ROWS, so an `auto` track asks a height-derived box how wide it
    // wants to be while the row's height is still unknown. Measured on the cartogram at 1512x860:
    // the track resolved to 1014.3px for a plot that then laid out at 1158px and ran 120px over the
    // column beside it — and `max-content`, `min-content` and `fit-content(100%)` all gave the
    // identical 1014.3px, so it is not a choice of keyword.
    const figure = rule(".chart-figure {");
    expect(figure).toMatch(/grid-template-columns:\s*\n?\s*min\(/);
    // The window's height, with the frame's own inset taken out of it — and NO container query
    // unit, because an element is not its own query container: `100cqw` written in a rule on
    // `.chart-figure` resolves against the viewport while the same token one level down resolves
    // against the figure's content box. Measured, exactly 48px of drawing lost to that difference.
    expect(figure).toContain("100dvh - var(--frame-pad) * 2");
    expect(figure.slice(figure.lastIndexOf("*/"))).not.toContain("cqw");
  });

  it("should give the figure a DEFINITE height, not a clamp, with a vh fallback under the dvh", () => {
    const figure = rule(".chart-figure {");
    expect(figure).toContain("height: 100dvh");
    expect(figure).not.toContain("max-height");
    expect(figure.indexOf("height: 100vh")).toBeLessThan(figure.indexOf("height: 100dvh"));
  });

  it("should put the drawing in column one and EVERY other block in the column beside it", () => {
    // The rule is "everything that is not the drawing", never a list: sixteen control vocabularies
    // ship in this tree and each names its fieldset after itself, so a list would be stale the week
    // a seventeenth arrives. The header is in the column too, and that is not a preference — a
    // full-width header of unknown height cannot be subtracted from the window in CSS, and the
    // drawing's width is the window's height minus that header.
    const stylesheet = css();
    expect(stylesheet).toContain(".chart-figure > .chart-plot { grid-column: 1; grid-row: 1 / span 60; }");
    expect(stylesheet).toContain(".chart-figure > :not(.chart-plot) { grid-column: 2; min-width: 0; }");
  });

  it("should size every row by the words in it, with the drawing spanning all of them", () => {
    // THE MUTATION, and it shipped once: make row 1 `minmax(0, 1fr)`. The first block of the column
    // then shares that row with the drawing, the row is sized as the LEFTOVER rather than as the
    // block, and the title, the control, the key and the reading all print on top of one another.
    const figure = rule(".chart-figure {");
    expect(figure).toContain("grid-auto-rows: min-content");
    expect(figure).toContain("align-content: start");
    expect(figure).not.toContain("grid-template-rows: minmax(0, 1fr)");
  });

  it("should let NOTHING squeeze the plot — no clamp above it, no floor under it", () => {
    const plot = rule(".chart-plot {");
    expect(plot).toContain("width: 100%");
    expect(plot).toContain("height: auto");
    expect(plot).not.toMatch(/min-height:\s*\d+px/);
    expect(css()).not.toContain("PLOT_FLOOR");
  });

  it("should derive the stacking threshold from the drawing's aspect and the column's measure", () => {
    // Not a typed width. The floor under the drawing is the column's own measure carried through
    // the drawing's aspect, so a wide beat stacks later than a square one at the same measure.
    const at = (sheet: string) => Number(/@media \(max-width: ([\d.]+)px\)/.exec(sheet)![1]);
    const square = buildCss({ plot: { width: 400, height: 400 }, aside: { minWidth: 300 },
      ground: "#FFFFFF", accent: "#0B7A75", ...deriveFurniture("#FFFFFF") });
    const wide = buildCss({ plot: { width: 800, height: 400 }, aside: { minWidth: 300 },
      ground: "#FFFFFF", accent: "#0B7A75", ...deriveFurniture("#FFFFFF") });
    const roomier = buildCss({ plot: { width: 400, height: 400 }, aside: { minWidth: 360 },
      ground: "#FFFFFF", accent: "#0B7A75", ...deriveFurniture("#FFFFFF") });
    expect(at(square)).toBe(671);   // 48 + 300 + 24 + 300 - 1
    expect(at(wide)).toBe(971);     // 48 + 600 + 24 + 300 - 1
    expect(at(roomier)).toBe(791);  // 48 + 360 + 24 + 360 - 1
  });

  it("should refuse to build a stylesheet with no measure for the column", () => {
    expect(() =>
      buildCss({ plot: FRAME, ground: "#FFFFFF", accent: "#0B7A75", ...deriveFurniture("#FFFFFF") } as never),
    ).toThrow(/reading column's own measure/);
  });
});

describe("the filter — declared by the beat, default view complete, native controls", () => {
  it("should default to the 'All years' radio checked, with the other two present but unchecked", () => {
    const markup = renderSeed();
    expect(markup).toContain('id="chart-filter-all"');
    expect(markup).toContain('id="chart-filter-2015-2019"');
    expect(markup).toContain('id="chart-filter-2020-2025"');
    const allInput = markup.slice(
      markup.indexOf('id="chart-filter-all"') - 40,
      markup.indexOf('id="chart-filter-all"') + 120,
    );
    expect(allInput).toContain("checked");
  });

  it("should tag every point and segment with its own period, classified from the real split year", () => {
    expect(periodOf(2019, 2020)).toBe("early");
    expect(periodOf(2020, 2020)).toBe("late");
    const markup = renderSeed();
    expect(markup).toContain('data-filter="2015-2019"');
    expect(markup).toContain('data-filter="2020-2025"');
    // And the key beside it, because the two travel together or the build refuses them.
    expect(markup).toContain('data-key="2019" data-filter="2015-2019"');
    expect(markup).toContain('data-key="2020" data-filter="2020-2025"');
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
    // The class, not the whole opening tag: the fieldset is also an `establish` layer of the
    // entrance (`assets/entrance.ts`) and carries its `data-entrance*` attributes now, which a
    // string equality on the tag would report as the control having disappeared.
    expect(markup).toMatch(/<fieldset class="chart-filter"[ >]/);
    expect(markup).toContain("<legend>Show</legend>");
    expect(markup).toContain('<div class="options">');
    // Three native radios in one named group — the thing that makes this a radio group to a
    // keyboard and to a screen reader, before any styling is applied to it.
    expect((markup.match(/type="radio"/g) ?? []).length).toBe(3);
    expect((markup.match(/name="chart-filter"/g) ?? []).length).toBe(3);
  });

  it("should put the segmented treatment behind a :has() support guard, leaving native radios as the base", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
      filter: SEED_FILTER,
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
    // NARROWED 2026-08-10, W4 Task 5, keeping this clause's REAL meaning. It used to read
    // `expect(css).not.toContain("@media")` — a statement about the whole stylesheet, made from
    // inside a test about the filter's capability query, and therefore load-bearing by accident.
    // What it means is what it says in the sentence above it: a capability query is not a rung, so
    // the `@supports` block must not have a width query nested inside it, dressing a second layout
    // up as a feature test. The stylesheet-wide rule is now three assertions of its own, above.
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).not.toContain("@media");
  });

  it("should never take a radio out of the focus order to make the pills look tidy", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
      filter: SEED_FILTER,
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

  /**
   * REWRITTEN, AND THE CLAUSE IT REPLACES IS QUOTED SO THE REVERSAL IS MET RATHER THAN LOST. This
   * test used to require `background: var(--ink); color: var(--ground)` and to FORBID the accent,
   * on the reasoning that "the accent stays reserved for the subject — a control that borrowed it
   * would make the one colour that means something in this frame also mean 'you clicked here'".
   * That reasoning is sound about a MARK and it is overruled about FURNITURE by the owner's own
   * arbitration, which he made on three different beats in three different words: « le fait
   * d'utiliser du noir au filtre et vu qu'il y a plein de traits c'est peu lisible », « l'encadré
   * gris au filtre c'est moche », « la colorisation des filtres n'est pas lisible avec le texte ».
   * The contrast was never the defect — white on black measures 21,0:1 — the WEIGHT was.
   */
  it("should paint the chosen pill as a wash, a ring and darker words, never a slab of ink", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
      filter: SEED_FILTER,
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const at = css.indexOf(".chart-filter label:has(input:checked)");
    const checkedRule = css.slice(at, css.indexOf("}", at));
    expect(checkedRule).toContain(
      "background: color-mix(in srgb, var(--accent) 22%, var(--ground))",
    );
    expect(checkedRule).toContain("border-color: var(--accent)");
    expect(checkedRule).toContain("color: var(--ink)");
    // The slab is gone, and the test says so in the terms the defect was reported in.
    expect(checkedRule).not.toContain("background: var(--ink)");
    // Still no literal colour anywhere: every value is a custom property the direction filed.
    expect(checkedRule).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  /**
   * THE TWENTY-FIRST COPY CANNOT COME BACK.
   *
   * `filter.ts` and `hold.ts` have no chrome of their own: they borrow this one, and for as long as
   * it was written out here it was the twenty-first byte-for-byte copy of a drawing that now has
   * one home. Equality against the module's own output — not a list of properties — is what makes a
   * local edit here impossible to make quietly, which is the whole failure mode: twenty copies held
   * together by the eye, and the eye had already let two of them drift to a flex value the owner
   * had arbitrated against.
   */
  it("should be the shared control chrome itself, not a copy of it", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
      filter: SEED_FILTER,
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    expect(css).toContain(
      controlChromeCss({
        scope: ".chart-figure",
        name: "filter",
        // The same two arguments the renderer passes, restated rather than imported: the equality
        // then fails if EITHER the module's drawing or this format's use of it drifts. `reserve:
        // null` because this one chrome serves every filter beat and their sentences run from 38
        // characters to 215 — see `FILTER_NOTE_RESERVE` for why no single number is defensible.
        notes: { margin: "4px 0 8px", reserve: null },
      }),
    );
  });

  /**
   * BOTH OF LOT 2's MEASURED FINDINGS, CHECKED ON THIS COPY TOO. One of twenty carried
   * `min-inline-size: 0`, and this copy was not it: a `<fieldset>` defaults to
   * `min-inline-size: min-content` and a flex item to `min-width: auto`, so a rail that cannot wrap
   * takes the DOCUMENT with it (1351px in a 375px window, measured on
   * proof/web-slope-europe-lowcarbon). Latent rather than live on the three beats that declare a
   * filter — the seed and the heatmap both measured 375/375 at 375px before this change, because
   * their rails happen to fit — and closed by construction now.
   *
   * The other finding, `flex: 0 0 auto` on the options row, this copy did NOT carry: it declared no
   * flex at all, which computes to the `0 1 auto` the owner arbitrated for. Asserted anyway, since
   * "correct by default" is exactly how fourteen of the twenty were correct.
   */
  it("should let the options row shrink, and never push the document wider than the window", () => {
    const css = buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
      filter: SEED_FILTER,
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });
    const fieldset = css.slice(
      css.indexOf(".chart-filter {"),
      css.indexOf("\n}", css.indexOf(".chart-filter {")),
    );
    expect(fieldset).toContain("min-inline-size: 0");
    expect(fieldset).toContain("min-width: 0");
    const options = css.slice(
      css.indexOf(".chart-filter .options {"),
      css.indexOf("}", css.indexOf(".chart-filter .options {")),
    );
    expect(options).toContain("flex: 0 1 auto");
    expect(options).not.toContain("flex: 0 0 auto");
    expect(options).toContain("min-width: 0");
  });

  /** The sentence is announced, not merely drawn — and it is announced from ONE container, because
   *  the notes come and go by `display` and a live region that itself comes and goes announces
   *  nothing. This is the shape every other control in `assets/` already had. */
  it("should put the narrowing sentences in one live region", () => {
    const markup = renderSeed();
    expect(markup).toContain('<div class="filter-notes" role="status">');
    expect(markup).toContain('<p data-filter-note=');
    expect(markup).not.toContain('class="filter-note"');
  });

  it("should never gate the reference rule — a level, not a reading — behind the filter", () => {
    // The reference rule is a horizontal line at 912 mm — it annotates a LEVEL, not a reading, so
    // it is transversal furniture and stays drawn in every filter state.
    const markup = renderSeed();
    const overlay = markup.slice(
      markup.indexOf('class="overlay"'),
      markup.indexOf('<div class="x-axis"'),
    );
    const referenceLabel = overlay.slice(
      overlay.indexOf('class="note reference-label"') - 200,
      overlay.indexOf("2015 level"),
    );
    expect(referenceLabel).not.toContain("data-filter");

    // The other two DO carry it, and that is the correction a look at the render earned: the
    // notable-year marker belongs to 2020 and the end label prints 2025's own value, so under
    // "2015–2019" they used to hang over an empty plot beside a line that stopped six years
    // earlier — the end label printing a number the narrowed view does not contain.
    expect(overlay).toContain('data-key="2020" data-filter="2020-2025"');
    expect(overlay).toContain('data-key="2025" data-filter="2020-2025"');
  });
});

/**
 * THE MARK ANSWERS, NOT A DOT ON TOP OF IT — the format's own contract with a beat whose readings
 * are rectangles rather than points.
 *
 * What a string assertion here can hold is that the two rules exist and that a beat which names no
 * shape is untouched. What it CANNOT hold is that the picture changes: that is `verify-web.mjs`
 * driving a real pointer, and the beat's own capture. The defect this replaced was found by
 * looking, not by reading CSS.
 */
describe("a point may delegate its answer to the mark it names", () => {
  const css = () =>
    buildCss({ plot: FRAME,
      aside: { minWidth: 300 },
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ink: "#000000",
      muted: "#616161",
      grid: "#D1D1D1",
    });

  it("should keep a delegating point invisible in every state hover/focus/tap put it in", () => {
    // THE MUTATION: delete the `.pt[data-mark-ref]` rule. The column then lights AND a grey dot
    // prints at its top — both answers at once, which is worse than either.
    for (const state of [":hover", ":focus", ".pt-active"])
      expect([state, css().includes(`.pt[data-mark-ref]${state}`)]).toEqual([state, true]);
    const at = css().indexOf(".pt[data-mark-ref]:hover");
    expect(css().slice(at, css().indexOf("}", at))).toContain("fill: transparent");
  });

  it("should paint the named mark in a colour the BEAT declared, never one this file names", () => {
    // THE MUTATION: replace `var(--mark-active, var(--muted))` with a literal, or with a
    // `filter: brightness(1.2)`. The first puts a colour decision in the format; the second
    // lightens on a light ground and on a dark one alike, which is the thing this beat's own
    // measurement refused.
    const at = css().indexOf(".mark-active {");
    const rule = css().slice(at, css().indexOf("}", at));
    expect(rule).toContain("fill: var(--mark-active, var(--muted))");
    expect(css()).not.toContain("filter: brightness");
  });

  it("should leave a point that names no mark exactly as it was — a line beat keeps its dot", () => {
    const at = css().indexOf(".pt:hover");
    expect(css().slice(at, css().indexOf("}", at))).toContain("fill: var(--muted)");
    // And the seed, which is a line beat, names no mark at all.
    expect(renderSeed()).not.toContain("data-mark-ref");
  });
});

/**
 * THE CELL CARRIES THE RATIO OF ITS OWN viewBox — the guard, and the three things it has to refuse.
 *
 * The owner read the defect off a render: "les cercles ne sont pas parfaits tout comme les flèches,
 * on dirait que c'est étiré." Measured on `proof/web-connected-scatter-lowcarbon` at 1512x860, a
 * 1420x535 cell for an 820x460 viewBox — scaleX 1.732 against scaleY 1.163, 1.49x. On
 * `proof/web-proportional-symbol-europe-capacity`, 2.11x. And the WORST case was not the height
 * clamp at all but the `min-height` floor: the pictogram at 375x812, 2.15x the other way.
 *
 * `preserveAspectRatio="none"` is kept. What is guarded is that the box it fills always has the
 * viewBox's own proportions, which is what makes that stretch uniform — a scale rather than a
 * distortion. See `references/web-discipline.md`, "A LENGTH follows the stretch; a SHAPE never
 * does", for the numbers after: 1.0000 on all 120 measurements of the committed corpus.
 */
describe("the plot cell carries the ratio of its own viewBox", () => {
  const cssFor = (plot: { width: number; height: number }) =>
    buildCss({
      plot,
      aside: { minWidth: 300 },
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ...deriveFurniture("#FFFFFF"),
    });

  it("should shape the cell from the beat's own two numbers, not from a ratio typed here", () => {
    const css = cssFor(FRAME);
    // SHAPED BY ITS viewBox, SIZED BY ITS COLUMN. The column was computed to be exactly the drawing
    // plus this beat's gutters, so `width: 100%` here is the drawing's own width and the ratio then
    // gives its height. Nothing is capped on the inline axis: capping the width of a box carrying
    // an aspect-ratio keeps the height it had and breaks the ratio.
    expect(css).toContain(`aspect-ratio: ${FRAME.width} / ${FRAME.height}`);
    expect(css).toMatch(/width: 100%;\n  height: auto;\n  aspect-ratio/);
    // The beat's three fixed bands are BAKED as numbers rather than reached for with var(): they
    // live on `.chart-plot`, and a nested var() inside a custom property is substituted against the
    // element that DECLARES it — written into a rule on `.chart-figure` they take their 0px
    // fallback and the drawing comes out one gutter too wide. Measured on the cartogram at 1512: a
    // 1282px plot across a 282px column.
    expect(css).not.toContain("var(--y-gutter, 0px))");
    // And a DIFFERENT beat gets its own two numbers, not the seed's: the pair is read per render,
    // off the markup, and a constant compiled in here would satisfy the seed and nothing else.
    expect(cssFor({ width: 901, height: 337 })).toContain("aspect-ratio: 901 / 337");
  });

  it("should give both gutters the cell's own height, with no slack left to cross", () => {
    const css = cssFor(FRAME);
    for (const gutter of [".chart-plot .y-axis", ".chart-plot .end-axis"]) {
      const rule = css.slice(css.indexOf(gutter), css.indexOf("}", css.indexOf(gutter)));
      // Row 1 of the plot's grid is `auto`, sized by the drawing itself, so a gutter at
      // `height: 100%` is exactly the drawing's height and a label at `top: 62%` lands on the same
      // 62 % of the geometry it names.
      expect(rule).toContain("height: 100%");
      expect(rule).not.toContain("transform");
    }
    // THE MUTATION THIS ONE EXISTS FOR, and it was a real defect: `margin-inline: auto` on the
    // x-axis band. An auto inline margin makes a grid item shrink to fit, its labels are absolutely
    // positioned and contribute nothing to fit, and the band measured 0.0px wide with every tick
    // piled on one point.
    const x = css.slice(css.indexOf(".chart-plot .x-axis"), css.indexOf("}", css.indexOf(".chart-plot .x-axis")));
    expect(x).toContain("width: 100%");
    expect(x).not.toContain("margin-inline: auto");
    expect(x).not.toContain("transform");
  });

  it("should refuse to build a stylesheet with no geometry to size the cell from", () => {
    expect(() => buildCss({ ground: "#FFFFFF", accent: "#0B7A75", ...deriveFurniture("#FFFFFF") } as never)).toThrow(
      /viewBox/,
    );
  });

  it("should read the beat's viewBox off the markup it drew, and refuse markup that draws two", () => {
    expect(plotViewBoxOf(renderSeed())).toEqual({ width: FRAME.width, height: FRAME.height });
    expect(() => plotViewBoxOf('<p>no chart here</p>', "a beat")).toThrow(/no <svg class="chart">/);
    expect(() =>
      plotViewBoxOf(
        '<svg class="chart" viewBox="0 0 820 380"></svg><svg class="chart" viewBox="0 0 900 380"></svg>',
        "a beat",
      ),
    ).toThrow(/2 different viewBoxes/);
  });

  it("should refuse a page whose cell shape and whose <svg> disagree", () => {
    const honest = `<style>${cssFor(FRAME)}</style>` +
      `<svg class="chart" viewBox="0 0 ${FRAME.width} ${FRAME.height}"></svg>`;
    expect(() => assertPlotCellIsItsViewBox(honest, "the seed")).not.toThrow();

    // THE MUTATION THE GUARD EXISTS FOR: the same page, drawn at a different box from the one its
    // stylesheet was built for — which is what a beat that swapped its geometry without rebuilding
    // its CSS, or that redefined --cell-w in a rule of its own, ships.
    const stretched = `<style>${cssFor({ width: 820, height: 380 })}</style>` +
      `<svg class="chart" viewBox="0 0 820 460"></svg>`;
    expect(() => assertPlotCellIsItsViewBox(stretched, "a beat")).toThrow(/carry its own viewBox/);

    const none = `<style>.chart-plot { display: grid; }</style><svg class="chart" viewBox="0 0 820 380"></svg>`;
    expect(() => assertPlotCellIsItsViewBox(none, "a beat")).toThrow(/no aspect-ratio/);
  });
});

/**
 * NO WIDTH IS LEFT EMPTY — the second guard, and the two refusals that produced it.
 *
 * The first guard above says the drawing has the right SHAPE. It says nothing about where the width
 * goes, and that is the hole the owner fell into twice. A cell built as `min(track, track x W/H)` is
 * the right shape at every width and leaves two empty gutters under a height budget: 954px of
 * drawing inside a 1420px track on the connected scatter at 1512x860, 695px inside 1464px on the
 * symbol map. Removing the budget instead made every page taller than the window. What this refuses
 * is EMPTY SURPLUS, in either arrangement.
 */
describe("no width is left empty", () => {
  const cssFor = (plot: { width: number; height: number }) =>
    buildCss({
      plot,
      aside: { minWidth: 300 },
      ground: "#FFFFFF",
      accent: "#0B7A75",
      ...deriveFurniture("#FFFFFF"),
    });
  const pageWith = (css: string) =>
    `<style>${css}</style><svg class="chart" viewBox="0 0 ${FRAME.width} ${FRAME.height}"></svg>`;

  it("should pass the stylesheet this format actually emits", () => {
    expect(() => assertNoEmptySurplus(pageWith(cssFor(FRAME)), "the seed")).not.toThrow();
  });

  it("should refuse a figure whose second track is not the one that takes what is left", () => {
    for (const value of ["300px;", "auto;", "1fr;"]) {
      const broken = cssFor(FRAME).replace("minmax(var(--aside-min), 1fr);", value);
      expect([value, (() => {
        try { assertNoEmptySurplus(pageWith(broken), "a beat"); return "shipped"; }
        catch { return "refused"; }
      })()]).toEqual([value, "refused"]);
    }
  });

  it("should refuse a drawing column left to the grid's own intrinsic pass", () => {
    // THE MUTATION a maintainer reaches for first, because it reads as simpler: let `auto` size the
    // column. It cannot — the row's height does not exist yet when that pass runs.
    const guessed = cssFor(FRAME)
      .replace(/grid-template-columns:\s*\n\s*min\([\s\S]*?\n    \)\n/m, "grid-template-columns: auto\n");
    expect(() => assertNoEmptySurplus(pageWith(guessed), "a beat")).toThrow(/cannot know the row's height/);
  });

  it("should refuse a cell shaped by anything but its own viewBox", () => {
    const wrong = cssFor(FRAME).replace(
      `aspect-ratio: ${FRAME.width} / ${FRAME.height}`,
      "aspect-ratio: 16 / 9",
    );
    expect(() => assertNoEmptySurplus(pageWith(wrong), "a beat")).toThrow(/aspect-ratio/);
  });

  it("should refuse a column that keeps the frame's own inset inside the window's height", () => {
    // THE MUTATION both earlier builds shipped: measure the drawing's height against the whole
    // window rather than against the room inside the frame. The drawing is then sized for a window
    // it does not have and overruns the column beside it — 48px, measured.
    const unpadded = cssFor(FRAME).replace("100dvh - var(--frame-pad) * 2", "100dvh");
    expect(() => assertNoEmptySurplus(pageWith(unpadded), "a beat")).toThrow(/frame's own inset/);
  });

  it("should refuse a plot that lets its component's inline aspect-ratio decide its size", () => {
    // Forty shipped components still set one. Left in force it fights the column arithmetic:
    // measured on the diverging stacked bar at 1512, the plot came out 1176px wider than the
    // drawing in it and ran 852px off the side of the document.
    const unguarded = cssFor(FRAME).replace("aspect-ratio: auto !important;", "");
    expect(() => assertNoEmptySurplus(pageWith(unguarded), "a beat")).toThrow(/inline "aspect-ratio"/);
  });
});
