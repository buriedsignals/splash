import { describe, expect, it } from "bun:test";
import {
  placementBlock,
  placementLines,
  resolvePlacement,
} from "../src/placement";
import { placementCopy } from "../../../lib/newsroom/ui-copy";

const en = placementCopy("en");

describe("resolvePlacement", () => {
  it("reads both grains off an anchor", () => {
    expect(
      resolvePlacement({
        anchor: { paragraphIndex: 5, quote: "the shutters closed" },
      }),
    ).toEqual({
      kind: "anchored",
      paragraphIndex: 5,
      quote: "the shutters closed",
    });
  });

  it("keeps a quote-only anchor (the grain that survives an edit)", () => {
    expect(
      resolvePlacement({ anchor: { quote: "the shutters closed" } }),
    ).toEqual({
      kind: "anchored",
      quote: "the shutters closed",
    });
  });

  it("keeps an index-only anchor", () => {
    expect(resolvePlacement({ anchor: { paragraphIndex: 3 } })).toEqual({
      kind: "anchored",
      paragraphIndex: 3,
    });
  });

  it("treats an empty or whitespace quote as no quote", () => {
    expect(
      resolvePlacement({ anchor: { paragraphIndex: 3, quote: "   " } }),
    ).toEqual({
      kind: "anchored",
      paragraphIndex: 3,
    });
  });

  it("refuses a non-positive or non-integer paragraph index rather than printing it", () => {
    expect(
      resolvePlacement({ anchor: { paragraphIndex: 0, quote: "q" } }),
    ).toEqual({
      kind: "anchored",
      quote: "q",
    });
    expect(
      resolvePlacement({ anchor: { paragraphIndex: 2.5, quote: "q" } }),
    ).toEqual({
      kind: "anchored",
      quote: "q",
    });
  });

  it("reads an explicit free-standing declaration", () => {
    expect(resolvePlacement({ freeStanding: true })).toEqual({
      kind: "free-standing",
    });
  });

  it("an anchor with nothing usable in it is NOT a placement", () => {
    expect(resolvePlacement({ anchor: {} })).toEqual({ kind: "undeclared" });
    expect(resolvePlacement({ anchor: { quote: "" } })).toEqual({
      kind: "undeclared",
    });
  });

  it("declaring both an anchor and free-standing keeps the anchor (the more specific claim)", () => {
    expect(
      resolvePlacement({
        freeStanding: true,
        anchor: { quote: "the shutters closed" },
      }),
    ).toEqual({ kind: "anchored", quote: "the shutters closed" });
  });

  it("silence is undeclared — never guessed into free-standing", () => {
    expect(resolvePlacement({})).toEqual({ kind: "undeclared" });
    expect(resolvePlacement(null)).toEqual({ kind: "undeclared" });
    expect(resolvePlacement(undefined)).toEqual({ kind: "undeclared" });
    expect(resolvePlacement("not an object")).toEqual({ kind: "undeclared" });
  });
});

describe("placementLines", () => {
  it("prints both grains with the quote marked authoritative", () => {
    const lines = placementLines(
      { kind: "anchored", paragraphIndex: 5, quote: "the shutters closed" },
      en,
    );
    expect(lines[0]).toBe(en.intro);
    expect(lines[1]).toContain("the shutters closed");
    expect(lines[1]).toContain("5");
    expect(lines[lines.length - 1]).toBe(en.advisory);
  });

  it("prints the quote-only line when there is no paragraph number", () => {
    const lines = placementLines(
      { kind: "anchored", quote: "the shutters closed" },
      en,
    );
    expect(lines[1]).toBe(en.anchoredQuoteOnly("the shutters closed"));
  });

  it("prints the index-only line when there is no quote", () => {
    const lines = placementLines({ kind: "anchored", paragraphIndex: 3 }, en);
    expect(lines[1]).toBe(en.anchoredIndexOnly(3));
  });

  it("says free-standing, and never invents a paragraph", () => {
    const lines = placementLines({ kind: "free-standing" }, en);
    expect(lines[1]).toBe(en.freeStanding);
    expect(lines.join(" ")).not.toContain("§");
  });

  it("says nothing at all when nothing was declared", () => {
    expect(placementLines({ kind: "undeclared" }, en)).toEqual([]);
  });
});

describe("placementBlock", () => {
  it("wraps the lines in relay markers so the orchestrator prints them verbatim", () => {
    const block = placementBlock(
      "e1",
      { kind: "anchored", paragraphIndex: 5, quote: "the shutters closed" },
      en,
    );
    expect(block.startsWith("SPLASH_PLACEMENT")).toBe(true);
    expect(block.endsWith("END_SPLASH_PLACEMENT")).toBe(true);
    expect(block).toContain("e1");
    expect(block).toContain("the shutters closed");
  });

  it("is the empty string when there is nothing to say", () => {
    expect(placementBlock("e1", { kind: "undeclared" }, en)).toBe("");
  });
});
