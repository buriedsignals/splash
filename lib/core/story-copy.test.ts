import { describe, expect, it } from "bun:test";
import { STORY_COPY, storyCopy } from "./story-copy";

describe("the auto-generated story copy is quaternary, not binary", () => {
  it("has every language the locale tables cover", () => {
    expect(Object.keys(STORY_COPY).sort()).toEqual(["de", "en", "fr", "it"]);
  });

  it("never leaks English into a German or an Italian walk", () => {
    // The measured leak: `const fr = isFrench(meta.lang)` sent "the highest of the N shown"
    // into an Italian scrolly and "a 4-fold gap" into a German map story.
    for (const lang of ["de", "it", "fr"] as const) {
      const c = storyCopy(lang);
      expect(c.lowest).not.toBe(STORY_COPY.en.lowest);
      expect(c.highestOf(12)).not.toBe(STORY_COPY.en.highestOf(12));
      expect(c.foldGap(4)).not.toBe(STORY_COPY.en.foldGap(4));
      expect(c.yearSpan(9)).not.toBe(STORY_COPY.en.yearSpan(9));
    }
  });

  it("ordinals follow the language, including the two that had no branch at all", () => {
    expect(storyCopy("en").nth(3)).toBe("the 3rd");
    expect(storyCopy("fr").nth(1)).toBe("le 1er");
    expect(storyCopy("de").nth(3)).toBe("der 3.");
    expect(storyCopy("it").nth(3)).toBe("il 3º");
  });

  it("falls back to English for a tag no table covers, without throwing", () => {
    expect(storyCopy("es")).toEqual(STORY_COPY.en);
    expect(storyCopy(undefined)).toEqual(STORY_COPY.en);
    expect(storyCopy("fr-CH")).toEqual(STORY_COPY.fr);
  });
});
