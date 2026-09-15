// THE FRAME A BEAT DECLARES — extendable or fixed, at what bound, and why.
//
// The layout holds the drawing inside the window's height and gives the cell the ratio of its own
// viewBox, so a near-square drawing on a wide, short window is HEIGHT-bound and the width it does
// not take stays margin. The owner refused both of the other two places that surplus could go —
// stretching the cell (a false geography) and a column of furniture beside the drawing ("tu as
// perdu le layout qu'on avait avant") — and named the third himself: "tout ce qui est map peut être
// étendu en largeur ou d'autres charts comme les line ou autres … juste étendre lorsque c'est
// possible."
//
// So the beat declares, and the page carries the declaration as a note the guard reads back. These
// tests pin the two halves: what `frameNoteCss` refuses about a DECLARATION, and what
// `assertFrameExtension` refuses about the WRITTEN PAGE. Every one of them was run as a mutation
// against the trunk before it was written down.
import { describe, it, expect } from "bun:test";
import {
  assertFrameExtension,
  buildCss,
  frameNoteCss,
} from "../scripts/render-web.mjs";

const PLOT = { width: 900, height: 600 };
const BASE = { width: 900, height: 684 };
const WHY =
  "A map's frame opens onto more of its own surroundings at the same scale, and the marks do not move.";

/** A page as thin as the guard needs: a note and the `<svg>` the note is a claim about. */
const pageWith = (note: string, plot = PLOT) =>
  `<style>${note}</style><svg class="chart" viewBox="0 0 ${plot.width} ${plot.height}"></svg>`;

describe("frameNoteCss — what a declaration must say before it is written down", () => {
  it("should write the base, the drawn frame and the bound into the page", () => {
    const note = frameNoteCss(
      { extends: true, base: BASE, maxRatio: 1.5, why: WHY },
      PLOT,
    );
    expect(note).toContain("THE FRAME — EXTENDS");
    expect(note).toContain("base 900/684 (1.316)");
    expect(note).toContain("drawn 900/600 (1.500)");
    expect(note).toContain("bound 1.500000");
    expect(note).toContain(WHY);
  });

  it("should write nothing at all for a beat that declares nothing", () => {
    expect(frameNoteCss(null, PLOT)).toBe("");
    // And the stylesheet is then byte-identical to the one a beat got before this mechanism
    // existed — which is what makes "nothing propagates to the catalogue" literal rather than
    // promised.
    const furniture = { ink: "#111", muted: "#666", grid: "#ddd" };
    const without = buildCss({
      ground: "#fff",
      accent: "#0B7A75",
      ...furniture,
      plot: PLOT,
    });
    expect(without).not.toContain("THE FRAME —");
  });

  it("should refuse an extendable frame that cannot say why it may extend", () => {
    expect(() =>
      frameNoteCss(
        { extends: true, base: BASE, maxRatio: 1.5, why: "it is wide" },
        PLOT,
        "beat",
      ),
    ).toThrow(/ARGUE itself in a sentence/);
  });

  it("should refuse a declaration with no base box to be a bound on", () => {
    expect(() =>
      frameNoteCss({ extends: true, maxRatio: 1.5, why: WHY }, PLOT, "beat"),
    ).toThrow(/base box/);
  });

  it("should refuse a bound below the type's own base ratio", () => {
    expect(() =>
      frameNoteCss(
        { extends: true, base: BASE, maxRatio: 1.1, why: WHY },
        PLOT,
        "beat",
      ),
    ).toThrow(/maxRatio at least its own base ratio/);
  });

  it("should give a FIXED frame its own base as its bound, with no maxRatio to declare", () => {
    const note = frameNoteCss({ extends: false, base: BASE, why: WHY }, BASE);
    expect(note).toContain("THE FRAME — FIXED");
    expect(note).toContain("bound 1.315789");
  });
});

describe("assertFrameExtension — what the WRITTEN PAGE is held to", () => {
  const declaration = { extends: true, base: BASE, maxRatio: 1.5, why: WHY };

  it("should pass a page drawn at the frame its own note claims", () => {
    const html = pageWith(frameNoteCss(declaration, PLOT));
    expect(() => assertFrameExtension(html, declaration, "beat")).not.toThrow();
  });

  it("should refuse a page whose note and whose <svg> describe different pictures", () => {
    // The note is written from one geometry and the page drawn from another — the failure mode a
    // check on the declaration alone cannot see, because the declaration is correct.
    const html = pageWith(frameNoteCss(declaration, PLOT), {
      width: 900,
      height: 684,
    });
    expect(() => assertFrameExtension(html, declaration, "beat")).toThrow(
      /different picture/,
    );
  });

  it("should refuse a page drawn past the bound the beat declared", () => {
    const wide = { width: 900, height: 400 };
    const html = pageWith(
      frameNoteCss({ ...declaration, maxRatio: 1.5 }, wide),
      wide,
    );
    expect(() => assertFrameExtension(html, declaration, "beat")).toThrow(
      /past the bound/,
    );
  });

  it("should refuse a FIXED frame drawn wider than its own base", () => {
    const fixed = { extends: false, base: BASE, why: WHY };
    // The note is written from the wider box the beat actually drew, so the two agree about the
    // picture; what is wrong is that a type whose ratio its message imposes drew a different one.
    const html = pageWith(frameNoteCss(fixed, PLOT), PLOT);
    expect(() => assertFrameExtension(html, fixed, "beat")).toThrow(
      /declared FIXED/,
    );
  });

  it("should refuse a frame drawn NARROWER than the type's own base", () => {
    const narrow = { width: 900, height: 900 };
    const html = pageWith(
      frameNoteCss({ ...declaration, maxRatio: 1.5 }, narrow),
      narrow,
    );
    expect(() => assertFrameExtension(html, declaration, "beat")).toThrow(
      /NARROWER/,
    );
  });

  it("should refuse a declared beat whose written page carries no note", () => {
    const html = pageWith("");
    expect(() => assertFrameExtension(html, declaration, "beat")).toThrow(
      /says nothing about it/,
    );
  });

  it("should refuse a note on a page nothing declared", () => {
    const html = pageWith(frameNoteCss(declaration, PLOT));
    expect(() => assertFrameExtension(html, null, "beat")).toThrow(
      /no frame declaration/,
    );
  });

  it("should leave a beat that declares nothing entirely alone", () => {
    expect(() =>
      assertFrameExtension(pageWith(""), null, "beat"),
    ).not.toThrow();
  });
});
