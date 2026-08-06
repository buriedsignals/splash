// twin/skills/twin-chart-beat/test/inspect-render.test.ts
import { describe, it, expect } from "bun:test";
import { inspectSvg } from "../scripts/inspect-render.mjs";

const svg = (body: string) =>
  `<svg role="img" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

describe("inspectSvg", () => {
  it("should measure contrast against the real ground, not against assumed white", () => {
    const dark = inspectSvg(svg('<text fill="#767676">x</text>'), {
      ground: "#101820",
    });
    const light = inspectSvg(svg('<text fill="#767676">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(dark.contrast[0].ratio).not.toBeCloseTo(light.contrast[0].ratio, 1);
  });

  it("should fail a fill below 4.5:1 on the given ground", () => {
    const result = inspectSvg(svg('<text fill="#AAAAAA">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should pass black on white", () => {
    const result = inspectSvg(svg('<text fill="#000000">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].ratio).toBeCloseTo(21, 0);
    expect(result.contrast[0].pass).toBe(true);
  });

  it("should report alt text missing when there is no desc", () => {
    expect(
      inspectSvg(svg("<text>x</text>"), { ground: "#FFFFFF" }).altText.present,
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

  // --- Beyond the six above: the plan's own regexes miss real SVG shapes. These pin the fixes. ---

  it("should see a fill inherited from an ancestor <g>, not just a fill attribute on <text> itself", () => {
    const result = inspectSvg(svg('<g fill="#AAAAAA"><text>x</text></g>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast.length).toBe(1);
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should read a fill declared in a style attribute, not only a fill attribute", () => {
    const result = inspectSvg(svg('<text style="fill:#AAAAAA">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast.length).toBe(1);
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should expand a three-digit hex fill", () => {
    // Not #000: black would also be the default-black fallback for an undeclared fill, so
    // #000 would pass even if 3-digit expansion were silently broken. #abc has no such
    // collision — a correct expansion to "#AABBCC" is the only way to pass.
    const result = inspectSvg(svg('<text fill="#abc">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#AABBCC");
  });

  it("should not mistake an attribute whose name merely ends in 'fill' for the fill attribute", () => {
    // No real fill declared anywhere: the effective fill is the SVG initial value (black), which
    // reads fine on white. A regex that matches `fill="..."` as a substring instead of an
    // attribute name would grab "#AAAAAA" here and silently under-report an unreadable label.
    const result = inspectSvg(svg('<text data-nofill="#AAAAAA">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#000000");
    expect(result.contrast[0].pass).toBe(true);
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
    // A <title> on a sub-group is a legitimate accessible name for that group, not a redundant
    // cursor tooltip on the whole chart.
    const result = inspectSvg(svg("<g><title>Nested label</title></g>"), {
      ground: "#FFFFFF",
    });
    expect(result.rootTitle).toBe(false);
  });

  it("should judge a big bold title against the 3:1 large-text floor, not 4.5:1", () => {
    // #949494 on white is 3.03:1: below the normal-text floor, above the large-text one.
    const result = inspectSvg(
      svg('<text fill="#949494" font-size="26" font-weight="700">Title</text>'),
      {
        ground: "#FFFFFF",
      },
    );
    expect(result.contrast[0].ratio).toBeCloseTo(3.03, 1);
    expect(result.contrast[0].pass).toBe(true);
  });

  it("should still hold small text at that same ratio to 4.5:1", () => {
    const result = inspectSvg(svg('<text fill="#949494">small</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].pass).toBe(false);
  });

  // --- Round 2, review-driven: the walker still had five silent-pass holes. Never default an
  // unresolvable colour to black — silence and a pass must not look alike. ---

  it("should prefer a style fill over a presentation fill attribute (CSS cascade order)", () => {
    const result = inspectSvg(
      svg('<text fill="#000000" style="fill:#AAAAAA">x</text>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should resolve an rgb() fill instead of silently dropping it", () => {
    const result = inspectSvg(svg('<text fill="rgb(170,170,170)">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
    expect(result.contrast[0].unresolved).toBe(false);
  });

  it("should mark an unparseable fill as unresolved rather than defaulting it to black", () => {
    const result = inspectSvg(svg('<text fill="url(#grad)">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0]).toEqual({
      fill: "url(#grad)",
      ratio: null,
      pass: false,
      unresolved: true,
    });
  });

  it("should resolve a named colour the table actually carries, e.g. rebeccapurple", () => {
    const result = inspectSvg(svg('<text fill="rebeccapurple">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].fill).toBe("#663399");
    expect(result.contrast[0].unresolved).toBe(false);
  });

  it("should mark a named colour outside the table as unresolved, not guess a hex for it", () => {
    const result = inspectSvg(svg('<text fill="mediumspringgreen">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].unresolved).toBe(true);
    expect(result.contrast[0].fill).toBe("mediumspringgreen");
  });

  it("should resolve currentColor via the nearest ancestor's color attribute", () => {
    const result = inspectSvg(
      svg('<g color="#AAAAAA"><text fill="currentColor">x</text></g>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
    expect(result.contrast[0].unresolved).toBe(false);
  });

  it("should mark currentColor unresolved when no ancestor declares a color", () => {
    const result = inspectSvg(svg('<text fill="currentColor">x</text>'), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].unresolved).toBe(true);
  });

  it("should see a fill override on a nested tspan, not just on the parent text", () => {
    const result = inspectSvg(
      svg('<text fill="#000000">ok<tspan fill="#AAAAAA">bad</tspan></text>'),
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

  it("should not truncate tag parsing on a stray > inside a quoted attribute value", () => {
    const result = inspectSvg(
      svg('<text data-note="a > b" fill="#AAAAAA">x</text>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should refuse a non-px font-size unit rather than granting it the large-text floor", () => {
    // 50% is really ~8px; parseFloat("50%") reads 50 and would wrongly clear the >=24 bar.
    const result = inspectSvg(
      svg('<text fill="#949494" font-size="50%" font-weight="700">x</text>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].pass).toBe(false); // held to 4.5:1, not granted 3:1
  });

  it("should grant the large-text floor to a bold keyword, not only a numeric weight", () => {
    const result = inspectSvg(
      svg('<text fill="#949494" font-size="20" font-weight="bold">x</text>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].pass).toBe(true); // 20px + bold clears the 18.66px/bold large floor
  });

  it("should exclude text inside <defs> from the contrast report — it never renders", () => {
    const result = inspectSvg(
      svg('<defs><text fill="#AAAAAA">hidden</text></defs>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast.length).toBe(0);
  });

  // --- Round 3, review-driven: the tool must be conservative BY CONSTRUCTION. Enumerate the
  // small set of forms it fully understands; everything else — including anything it merely
  // suspects it cannot see — is unresolved, never a confident wrong answer. ---

  it("should mark every contrast entry unresolved when a <style> block is present anywhere", () => {
    // The text has its OWN explicit fill, but a <style> block could still repaint it — its mere
    // presence in the document is enough, this file does not parse stylesheets.
    const result = inspectSvg(
      svg(
        "<style>text { fill: #AAAAAA }</style>" +
          '<text fill="#000000">x</text>',
      ),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast.length).toBe(1);
    expect(result.contrast[0].unresolved).toBe(true);
    expect(result.contrast[0].pass).toBe(false);
    expect(result.contrast[0].ratio).toBeNull();
  });

  it("should still report text under a <style> block even when its local fill is none", () => {
    // A stylesheet rule could un-hide it; skipping it would be exactly the silent miss this
    // tool exists to prevent.
    const result = inspectSvg(
      svg("<style>text{fill:red}</style>" + '<text fill="none">x</text>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast.length).toBe(1);
    expect(result.contrast[0].unresolved).toBe(true);
  });

  it("should take the LAST of a fill declared twice in one style attribute", () => {
    const result = inspectSvg(
      svg('<text style="fill:#000000; fill:#AAAAAA">x</text>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].fill).toBe("#AAAAAA");
    expect(result.contrast[0].pass).toBe(false);
    expect(result.contrast[0].unresolved).toBe(false);
  });

  it("should read a font-size declared only in style, overriding a larger attribute value", () => {
    const result = inspectSvg(
      svg('<text font-size="30" style="font-size:8px" fill="#949494">x</text>'),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].pass).toBe(false); // held to 4.5:1: the real size is 8px, not 30
  });

  it("should not inherit a large ancestor size when a child declares an unparseable style size", () => {
    const result = inspectSvg(
      svg(
        '<g font-size="30"><text style="font-size:2vw" fill="#949494">x</text></g>',
      ),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].pass).toBe(false); // uncertain size must not buy the easier floor
  });

  it("should read a font-weight declared only in style as a keyword", () => {
    const result = inspectSvg(
      svg(
        '<text font-size="20" style="font-weight:bold" fill="#949494">x</text>',
      ),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].pass).toBe(true); // 20px + bold clears the large-text floor
  });

  it("should not inherit a bold ancestor weight when a child declares an unparseable style weight", () => {
    const result = inspectSvg(
      svg(
        '<g font-weight="bold"><text font-size="20" style="font-weight:garbage" fill="#949494">x</text></g>',
      ),
      { ground: "#FFFFFF" },
    );
    expect(result.contrast[0].pass).toBe(false); // uncertain weight must not buy the easier floor
  });

  // These forms were already unresolved (never a false pass) before this round; explicitly
  // pinned now because a reviewer twice found the report silent about exactly this.
  it.each([
    ["rgb() with percentages", "rgb(60%,60%,60%)"],
    ["rgb() space syntax", "rgb(170 170 170)"],
    ["rgb() with slash-alpha", "rgb(170 170 170 / 50%)"],
    ["rgba()", "rgba(170,170,170,0.5)"],
    ["hsl()", "hsl(0, 0%, 67%)"],
  ])("should mark %s as unresolved, never a false pass", (_label, value) => {
    const result = inspectSvg(svg(`<text fill="${value}">x</text>`), {
      ground: "#FFFFFF",
    });
    expect(result.contrast[0].unresolved).toBe(true);
    expect(result.contrast[0].pass).toBe(false);
  });
});
