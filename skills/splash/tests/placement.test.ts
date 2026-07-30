import { describe, expect, it } from "bun:test";
import {
  articleEvidence,
  placementBlock,
  placementLines,
  resolvePlacement,
  undeclaredPlacementRefusal,
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

describe("articleEvidence", () => {
  it("takes the file as the hard signal and names it", () => {
    const e = articleEvidence({ opportunitiesPresent: true });
    expect(e.existed).toBe(true);
    expect(e.existed && e.why).toContain("opportunities.json");
  });

  it("takes skillsInvoked as the declared signal and names it", () => {
    const e = articleEvidence({
      opportunitiesPresent: false,
      skillsInvoked: [
        "splash:cadrage-guided",
        "suggest-article",
        "suggest-chart",
      ],
    });
    expect(e.existed).toBe(true);
    expect(e.existed && e.why).toContain("skillsInvoked");
  });

  it("prefers the file when both fire — a refusal names the evidence that cannot be argued with", () => {
    const e = articleEvidence({
      opportunitiesPresent: true,
      skillsInvoked: ["suggest-article"],
    });
    expect(e.existed && e.why).toContain("opportunities.json");
  });

  it("sees no article on a bare-topic run", () => {
    expect(articleEvidence({ opportunitiesPresent: false })).toEqual({
      existed: false,
    });
    expect(
      articleEvidence({
        opportunitiesPresent: false,
        skillsInvoked: ["splash:cadrage-direct", "suggest-chart"],
      }),
    ).toEqual({ existed: false });
  });
});

describe("undeclaredPlacementRefusal", () => {
  const evidence = articleEvidence({ opportunitiesPresent: true });

  it("refuses an undeclared placement when an article existed, naming both ways out", () => {
    const msg = undeclaredPlacementRefusal("e1", evidence, {
      kind: "undeclared",
    });
    expect(msg).toBeTruthy();
    expect(msg!).toContain("e1");
    expect(msg!).toContain("opportunities.json");
    expect(msg!).toContain("anchor");
    expect(msg!).toContain("freeStanding");
  });

  it("accepts an anchored placement", () => {
    expect(
      undeclaredPlacementRefusal("e1", evidence, {
        kind: "anchored",
        quote: "q",
      }),
    ).toBeNull();
  });

  it("accepts an explicit free-standing declaration — the article had no passage for it", () => {
    expect(
      undeclaredPlacementRefusal("e1", evidence, { kind: "free-standing" }),
    ).toBeNull();
  });

  it("never refuses when no article is evidenced", () => {
    expect(
      undeclaredPlacementRefusal(
        "e1",
        { existed: false },
        { kind: "undeclared" },
      ),
    ).toBeNull();
  });
});
