import { describe, expect, it } from "bun:test";
import { CONTENT_LANGUAGES, UI_LANGUAGES, pageCopy } from "./copy.ts";

describe("the languages the setup page offers", () => {
  // A2: the selector used to list Deutsch and Italiano while the copy table knew en/fr only,
  // so choosing German re-rendered the page in English. Offering a choice that is not honoured
  // is worse than not offering it — and the list is now DERIVED from the table, so the two
  // cannot drift apart again the next time a translation lands (or is reverted).
  it("offers an interface language only when the page speaks it", () => {
    const fallback = pageCopy("zz");
    expect(UI_LANGUAGES.map((l) => l.id)).toContain("en");
    for (const option of UI_LANGUAGES) {
      // Identity, not text: `pageCopy` falls back to the English object, so an entry of its
      // own is exactly what "this page can be read in that language" means — and English,
      // which IS the fallback, is the one language that cannot be checked that way.
      if (option.id !== "en") expect(pageCopy(option.id)).not.toBe(fallback);
      expect(option.label.trim()).not.toBe("");
    }
  });

  it("keeps the publication language independent of what the page speaks", () => {
    // A newsroom publishing in German is a supported delivery — `metadata.lang` is a BCP-47
    // string all the way down. What it cannot have (yet) is a German setup page, and those are
    // two different facts: the content selector is a superset, never a mirror.
    const content = CONTENT_LANGUAGES.map((l) => l.id);
    for (const option of UI_LANGUAGES) expect(content).toContain(option.id);
    expect(content).toContain("de");
    expect(UI_LANGUAGES.map((l) => l.id)).not.toContain("de");
  });
});
