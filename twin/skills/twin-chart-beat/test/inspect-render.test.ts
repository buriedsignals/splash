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
});
