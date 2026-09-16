import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  bakeSizesFor,
  blankCards,
  cardImageName,
  CardImages,
  checkCardImages,
  evenFrom,
  noScriptCss,
  planHashOf,
  shapeSelectionCss,
  variantsOf,
} from "../scripts/live-map-cards.mjs";

// THE PURE HALF OF A LIVE MAP SCROLLY'S FROZEN CARD IMAGES: the sizes they are baked at, their names, the hash that
// says when to re-bake, the check that a page carries its own images, and the markup that chooses among them.

describe("the bake sizes", () => {
  it("should keep the stage's parity so the centred crop falls on whole pixels", () => {
    expect((evenFrom(1407.5, 1168) - 1168) % 2).toBe(0);
  });

  it("should keep the wide stage's height and bake it 2.5 times as wide", () => {
    expect(
      bakeSizesFor({
        wide: { width: 1168, height: 563 },
        tall: { width: 330, height: 703 },
      }).wide,
    ).toEqual({ width: 1408, height: 563 });
  });

  it("should keep the tall stage's width and bake it at the tall aspect", () => {
    expect(
      bakeSizesFor({
        wide: { width: 1168, height: 563 },
        tall: { width: 330, height: 703 },
      }).tall,
    ).toEqual({ width: 330, height: 703 });
  });

  it("should refuse a stage with no size", () => {
    expect(() =>
      bakeSizesFor({
        wide: { width: 0, height: 563 },
        tall: { width: 330, height: 703 },
      }),
    ).toThrow(/no size/);
  });
});

describe("the card image names", () => {
  it("should name a card image for its direction, shape, density and card", () => {
    expect(cardImageName("nocturne", 0, "tall", 2)).toBe(
      "nocturne-tall@2x-1.webp",
    );
  });

  it("should bake every card in two shapes and two densities", () => {
    expect(variantsOf()).toEqual([
      ["wide", 2],
      ["wide", 1],
      ["tall", 2],
      ["tall", 1],
    ]);
  });

  it("should give the draft page one blank image per card, carrying the fields the driver reads", () => {
    expect(
      blankCards(3, { odd: [0, 0], zoom: 0 }).shapes.wide.cards[2],
    ).toEqual({ odd: [0, 0], zoom: 0 });
  });
});

describe("the plan hash", () => {
  it("should change when the trunk digest changes", () => {
    expect(planHashOf({ plan: {}, trunk: "a" })).not.toBe(
      planHashOf({ plan: {}, trunk: "b" }),
    );
  });
});

describe("the own-bakes check", () => {
  const record = {
    images: { "creme-wide@2x-1.webp": "aa", "creme-wide@2x-2.webp": "bb" },
  };

  it("should hold when every inlined image is the bytes its direction baked", () => {
    expect(
      checkCardImages({
        id: "creme",
        inlined: [
          { name: "creme-wide@2x-1.webp", sha256: "aa" },
          { name: "creme-wide@2x-2.webp", sha256: "bb" },
        ],
        record,
      }),
    ).toEqual([]);
  });

  it("should name an image whose bytes differ from the bake record", () => {
    expect(
      checkCardImages({
        id: "creme",
        inlined: [{ name: "creme-wide@2x-1.webp", sha256: "cc" }],
        record,
      })[0],
    ).toMatch(/creme-wide@2x-1\.webp is not the bytes/);
  });

  it("should name an image that is another direction's bake", () => {
    const problems = checkCardImages({
      id: "creme",
      inlined: [{ name: "creme-wide@2x-1.webp", sha256: "aa" }],
      record,
      others: [{ images: { "nocturne-wide@2x-1.webp": "aa" } }],
    });
    expect(problems).toEqual([
      "creme-wide@2x-1.webp carries the same bytes as nocturne-wide@2x-1.webp",
    ]);
  });

  it("should name two cards carrying the same bytes", () => {
    const twice = {
      images: { "creme-wide@2x-1.webp": "aa", "creme-wide@2x-2.webp": "aa" },
    };
    expect(
      checkCardImages({
        id: "creme",
        inlined: [
          { name: "creme-wide@2x-1.webp", sha256: "aa" },
          { name: "creme-wide@2x-2.webp", sha256: "aa" },
        ],
        record: twice,
      }),
    ).toEqual([
      "creme-wide@2x-2.webp carries the same bytes as creme-wide@2x-1.webp",
    ]);
  });

  it("should name an image that is not named for its direction", () => {
    expect(
      checkCardImages({
        id: "creme",
        inlined: [{ name: "rapport-wide@2x-1.webp", sha256: "aa" }],
        record,
      })[0],
    ).toBe("rapport-wide@2x-1.webp is not named for creme");
  });
});

describe("the markup that chooses a card image", () => {
  const fallbacks = [0, 1].map((k) => ({
    wide: { x1: `w1-${k}`, x2: `w2-${k}` },
    tall: { x1: `t1-${k}`, x2: `t2-${k}` },
  }));

  it("should show only the first card's images in the markup", () => {
    const html = renderToStaticMarkup(
      createElement("div", null, CardImages({ fallbacks, first: 0 })),
    );
    expect(html.match(/opacity:1/g)?.length).toBe(2);
  });

  it("should give the 2x bake to a dense screen through a media query, not srcset's density", () => {
    const html = renderToStaticMarkup(
      createElement("div", null, CardImages({ fallbacks, first: 0 })),
    );
    expect(html).toContain(
      '<source media="(min-resolution: 1.5dppx)" srcSet="w2-0"/>',
    );
  });

  it("should hide the wide shape on a stage narrower than the reference", () => {
    expect(
      shapeSelectionCss('[data-part="x"]', { width: 1280, height: 973 }),
    ).toContain(
      '@container (aspect-ratio < 1280/973){[data-part="x"] [data-shape="wide"]{display:none}}',
    );
  });

  it("should show the last card and the named furniture without a script", () => {
    expect(noScriptCss("S", 5, ['[data-part="key"]'])).toBe(
      'S [data-fallback]{opacity:0!important}S [data-fallback="5"],S [data-part="key"]{opacity:1!important}',
    );
  });
});
