// twin/skills/twin-chart-beat/test/inspect-render.test.ts
import { describe, it, expect } from "bun:test";
import { inspectSvg } from "../scripts/inspect-render.mjs";

// width/height/positioning matter now: this file measures rendered PIXELS, so every fragment
// below needs its text actually visible inside the canvas (an SVG text baseline at y=0 draws
// mostly off the top edge and would be clipped, measuring nothing).
const svg = (body: string) =>
  `<svg role="img" xmlns="http://www.w3.org/2000/svg" width="400" height="100">${body}</svg>`;
const text = (attrs: string, content: string) =>
  `<text x="10" y="50" ${attrs}>${content}</text>`;

describe("inspectSvg", () => {
  it("should measure contrast against the real ground, not against assumed white", () => {
    const dark = inspectSvg(svg(text('fill="#767676"', "x")), {
      ground: "#101820",
    });
    const light = inspectSvg(svg(text('fill="#767676"', "x")), {
      ground: "#FFFFFF",
    });
    expect(dark.contrast[0].ratio).not.toBeCloseTo(light.contrast[0].ratio!, 1);
  });

  it("should fail a fill below 4.5:1 on the given ground", () => {
    const result = inspectSvg(svg(text('fill="#AAAAAA"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should pass black on white", () => {
    const result = inspectSvg(svg(text('fill="#000000"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].ratio).toBeCloseTo(21, 0);
    expect(result.contrast[0].pass).toBe(true);
  });

  it("should report alt text missing when there is no desc", () => {
    expect(
      inspectSvg(svg(text("", "x")), { ground: "#FFFFFF" }).altText.present,
    ).toBe(false);
  });

  it("should read the alt text out of desc", () => {
    const result = inspectSvg(svg("<desc>A falling line.</desc>"), {
      ground: "#FFFFFF",
    });
    expect(result.altText).toEqual({ present: true, text: "A falling line." });
  });

  it("should flag a root title, which becomes a redundant cursor tooltip", () => {
    expect(
      inspectSvg(svg("<title>Chart</title>"), { ground: "#FFFFFF" }).rootTitle,
    ).toBe(true);
  });

  it("should flag a root title even when a comment or a <desc> precedes it", () => {
    const result = inspectSvg(
      svg("<!-- accessible --><desc>d</desc><title>Chart</title>"),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.rootTitle).toBe(true);
  });

  it("should not flag a <title> nested inside a child element as the root title", () => {
    const result = inspectSvg(svg("<g><title>Nested label</title></g>"), {
      ground: "#FFFFFF",
    });
    expect(result.rootTitle).toBe(false);
  });

  // --- Round 4: measure the rendered pixels instead of parsing the markup. Everything below
  // that used to need its own hand-written rule (ancestor inheritance, style precedence, 3-digit
  // hex, rgb()/currentColor/named colours, a comment inside style) is now just "what the real
  // renderer painted" — no rule to get wrong, no rule to be missing. ---

  it("should see a fill inherited from an ancestor <g>", () => {
    const result = inspectSvg(
      svg('<g fill="#AAAAAA">' + text("", "x") + "</g>"),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should read a fill declared in a style attribute", () => {
    const result = inspectSvg(svg(text('style="fill:#AAAAAA"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should take the LAST of a fill declared twice in one style attribute (later wins the cascade)", () => {
    const result = inspectSvg(
      svg(text('style="fill:#000000; fill:#AAAAAA"', "x")),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
  });

  it("should resolve a three-digit hex fill", () => {
    const result = inspectSvg(svg(text('fill="#abc"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#AABBCC");
  });

  it("should not be fooled by an attribute whose name merely ends in 'fill'", () => {
    // No real fill declared anywhere: the renderer paints SVG's own initial value, black, which
    // reads fine on white.
    const result = inspectSvg(svg(text('data-nofill="#AAAAAA"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#000000");
    expect(result.contrast[0].pass).toBe(true);
  });

  it("should not be thrown off by a stray > inside a quoted attribute value", () => {
    // A raw > in a quoted attribute value is well-formed XML (only < and & are forbidden raw); a
    // tag-boundary scan that is not quote-aware would truncate the tag right there and never see
    // the real fill= that follows it in source order.
    const result = inspectSvg(
      svg(text('data-note="a > b" fill="#AAAAAA"', "x")),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should judge a big bold title against the measured large-text floor (3:1, not 4.5:1)", () => {
    const result = inspectSvg(
      svg(text('font-size="26" font-weight="700" fill="#949494"', "Title")),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].ratio).toBeCloseTo(3.03, 1);
    expect(result.contrast[0].pass).toBe(true); // measured ink height clears the large-text floor
  });

  it("should hold ordinary small text to 4.5:1 at that same ratio", () => {
    const result = inspectSvg(svg(text('fill="#949494"', "small")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should measure opacity correctly instead of reporting the underlying fill unmodified", () => {
    // opacity="0.2" on black over white genuinely composites to a pale grey — the darkest pixel
    // that is ever actually painted is nowhere near black. A markup-reading tool that only looks
    // at `fill="#000000"` reports 21:1, pass — this is illegible.
    const result = inspectSvg(
      svg(text('font-size="20" fill="#000000" opacity="0.2"', "x")),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].fill).toBe("#CCCCCC");
    expect(result.contrast[0].ratio).toBeCloseTo(1.61, 1);
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should measure fill-opacity the same way as opacity", () => {
    const result = inspectSvg(
      svg(text('font-size="20" fill="#000000" fill-opacity="0.2"', "x")),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].fill).toBe("#CCCCCC");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should measure the real colour behind a CSS comment inside a style attribute", () => {
    // An anchored regex reading `style` never matches past a leading comment and falls through
    // to "never declared → default". The renderer parses the comment correctly; so does this.
    const result = inspectSvg(svg(text('style="/* c */fill:#AAAAAA;"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should measure a <style> block's real effect rather than refusing to judge it", () => {
    // Rounds 2-3 could not parse CSS, so a <style> block made every entry `unresolved`. The
    // renderer DOES parse it — measuring the real pixels means this is now just a correct answer,
    // not a refusal.
    const result = inspectSvg(
      svg("<style>text{fill:#AAAAAA}</style>" + text('fill="#000000"', "x")),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
    expect(result.contrast[0].unresolved).toBe(false);
  });

  it("should treat text inside an unreferenced <symbol> as not painted, the same as <defs>", () => {
    const result = inspectSvg(
      svg('<symbol id="s">' + text('fill="#AAAAAA"', "hidden") + "</symbol>"),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast.length).toBe(0);
  });

  it("should still treat text inside <defs> as not painted", () => {
    const result = inspectSvg(
      svg("<defs>" + text('fill="#AAAAAA"', "hidden") + "</defs>"),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast.length).toBe(0);
  });

  it("should still treat fill=none as not painted, not a passing entry", () => {
    const result = inspectSvg(svg(text('fill="none"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast.length).toBe(0);
  });

  it("should treat a dangling gradient reference as not painted, not a false pass", () => {
    // url(#never-defined) paints nothing; the old markup-reading version would have called this
    // "unresolved" (a fill token it could not parse) even though nothing is actually at risk —
    // there is no readability question about a glyph nobody can see.
    const result = inspectSvg(svg(text('fill="url(#never-defined)"', "x")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast.length).toBe(0);
  });

  it("should catch a <tspan> fill override as its own separately-measured entry", () => {
    const result = inspectSvg(
      svg(
        text(
          'font-size="20" fill="#000000"',
          'ok<tspan fill="#AAAAAA">bad</tspan>',
        ),
      ),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast.length).toBe(2);
    expect(
      result.contrast.some((c) => c.fill === "#000000" && c.pass === true),
    ).toBe(true);
    expect(
      result.contrast.some((c) => c.fill === "#AAAAAA" && c.pass === false),
    ).toBe(true);
  });

  it("should isolate a tiny low-contrast tspan even when a much larger sibling run dwarfs its pixel count", () => {
    // A whole-element diff that picks one representative colour for the whole <text> would let a
    // big run's own anti-aliasing noise (which scales with its length) outnumber a small run's
    // true ink pixels — measured: a 9px annotation was ~4% of a 24px sibling run's edge-pixel
    // count. Isolating each run BY STRUCTURE (its own removal, not a frequency guess) is what
    // survives that.
    const result = inspectSvg(
      svg(
        text(
          'font-size="24" fill="#000000"',
          'A big dominant run of text<tspan fill="#AAAAAA" font-size="9">tiny note</tspan>',
        ),
      ),
      { ground: "#FFFFFF" },
    );
    const tiny = result.contrast.find((c) => c.fill !== "#000000" && !c.pass);
    expect(tiny).toBeDefined();
    expect(tiny!.fill).toBe("#AAAAAA");
    expect(tiny!.ratio).toBeCloseTo(2.32, 1);
  });

  it("should isolate a tspan nested inside another tspan", () => {
    const result = inspectSvg(
      svg(
        text(
          'font-size="20" fill="#000000"',
          'a<tspan fill="#333333">b<tspan fill="#AAAAAA">c</tspan></tspan>',
        ),
      ),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast.length).toBe(3);
    expect(
      result.contrast.some((c) => c.fill === "#AAAAAA" && c.pass === false),
    ).toBe(true);
  });

  it("should report the WORST contrast across a label, not the average, when it crosses a harder background", () => {
    // Half the canvas is white, half a harder mid-grey; one label spans both. A reader has to be
    // able to read every part of the text — the easy white-side half must not average out the
    // hard grey-side half. The true worst-case answer, computed directly from the two fills, is
    // 1.5943:1 (fail); the easy white-only side alone would read 4.54:1 (pass).
    const result = inspectSvg(
      `<svg role="img" xmlns="http://www.w3.org/2000/svg" width="500" height="100">` +
        `<rect x="0" y="0" width="200" height="100" fill="#FFFFFF"/>` +
        `<rect x="200" y="0" width="300" height="100" fill="#999999"/>` +
        `<text x="20" y="55" font-size="40" fill="#767676">Wide Enough Text</text>` +
        `</svg>`,
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].fill).toBe("#767676");
    expect(result.contrast[0].ratio).toBeCloseTo(1.59, 1);
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should not let a dominant tspan's ink contaminate its parent's OWN separate measurement", () => {
    // The parent's own text is genuinely faint (true ratio 1.36:1, fails) but a tspan sibling is
    // solid black. If the parent's "own content" measurement is not isolated from its child, the
    // child's fully-opaque core pixels win the parent's own core-pixel search too, and the
    // parent's own bad contrast is silently replaced by a duplicate of the child's good one.
    const result = inspectSvg(
      svg(
        text(
          'font-size="20" fill="#DDDDDD"',
          'faint own text<tspan fill="#000000">dominant black</tspan>',
        ),
      ),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast.length).toBe(2);
    const faint = result.contrast.find((c) => c.fill !== "#000000");
    expect(faint).toBeDefined();
    expect(faint!.fill).toBe("#DDDDDD");
    expect(faint!.pass).toBe(false);
    expect(faint!.ratio).toBeCloseTo(1.36, 1);
    expect(
      result.contrast.some((c) => c.fill === "#000000" && c.pass === true),
    ).toBe(true);
  });

  it.each([
    ["rgb()", 'fill="rgb(170,170,170)"', "#AAAAAA"],
    [
      "rgba() with alpha, real composite",
      'fill="rgba(170,170,170,0.5)"',
      "#D7D7D7",
    ],
    ["hsl()", 'fill="hsl(0,0%,67%)"', "#AAAAAA"],
    [
      "a named colour outside any hand-picked table",
      'fill="mediumspringgreen"',
      "#00FA9A",
    ],
    ["currentColor via an ancestor's color", null, "#AAAAAA"], // handled separately, needs a wrapper
  ])(
    "should correctly measure %s via the real render, not refuse it",
    (label, attrs) => {
      if (label === "currentColor via an ancestor's color") {
        const result = inspectSvg(
          svg(
            '<g color="#AAAAAA">' + text('fill="currentColor"', "x") + "</g>",
          ),
          { ground: "#FFFFFF" },
        );
        expect(result.contrast[0].fill).toBe("#AAAAAA");
        expect(result.contrast[0].unresolved).toBe(false);
        return;
      }
      const result = inspectSvg(svg(text(attrs!, "x")), { ground: "#FFFFFF" });
      expect(result.contrast[0].unresolved).toBe(false);
    },
  );

  it("should reserve `unresolved` for a genuine render failure, not a fill it merely dislikes", () => {
    // A bare unescaped & is invalid XML and the rasteriser genuinely cannot parse it — this is
    // the one case `unresolved` is for now.
    const result = inspectSvg(svg(text('fill="#000000"', "Tom & Jerry")), {
      ground: "#FFFFFF",
    });
    expect(result.contrast.length).toBe(1);
    expect(result.contrast[0].unresolved).toBe(true);
    expect(result.contrast[0].ratio).toBeNull();
    expect(result.contrast[0].pass).toBe(false);
  });
});
