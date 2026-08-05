// The tokenizer's own tests, at the tokenizer (registry A18).
//
// Why here and not only at a caller: extracting the three copies into one definition was the
// fix, and a mutation then showed what the copies had hidden — narrowing the separator class
// reddened `lib/source/prose.test.ts` alone. `verify-offer` and `verify-beats` both read grouped
// figures in production and neither had a test that exercised one. Repeating the same assertion
// in all three callers would rebuild, one level up, exactly the duplication that was just
// removed; the definition owning its own contract is the version that does not drift.
import { describe, it, expect } from "bun:test";
import { figuresIn } from "./figures";

describe("figuresIn — the numeric tokens of a text", () => {
  // THE THREE SEPARATORS ARE THE POINT. A French or Swiss article writes 17 600 with a plain
  // space, a non-breaking space, or a narrow non-breaking space, depending on which CMS produced
  // it. A tokenizer that collapses only some of them INVENTS figures — it reads "17" and "600",
  // neither of which is in the article, and a grounding guard then refuses prose that is
  // perfectly grounded, or admits prose that is not.
  it("should collapse a plain space between digit groups", () => {
    expect(figuresIn("17 600 euros")).toEqual(["17600"]);
  });

  it("should collapse a non-breaking space between digit groups", () => {
    expect(figuresIn("17 600 euros")).toEqual(["17600"]);
  });

  it("should collapse a narrow non-breaking space between digit groups", () => {
    expect(figuresIn("17 600 euros")).toEqual(["17600"]);
  });

  it("should read a comma as a decimal separator, not as grouping", () => {
    expect(figuresIn("3,5 %")).toEqual(["3.5"]);
  });

  it("should read a period decimal unchanged", () => {
    expect(figuresIn("3.5 %")).toEqual(["3.5"]);
  });

  // The collapse is guarded on a following group of exactly three digits, so a space that is
  // just a space stays a boundary: "3 chats" is one figure, not a fragment of a larger one.
  it("should not join two numbers that are not a grouped figure", () => {
    expect(figuresIn("3 chats et 12 chiens")).toEqual(["3", "12"]);
  });

  it("should return every token, in order of appearance", () => {
    expect(figuresIn("de 12 à 17 600, soit 3,5 fois")).toEqual([
      "12",
      "17600",
      "3.5",
    ]);
  });

  it("should answer empty for a text with no figure", () => {
    expect(figuresIn("aucun chiffre ici")).toEqual([]);
  });
});
