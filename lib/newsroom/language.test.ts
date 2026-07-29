import { describe, expect, it } from "bun:test";
import { DEFAULT_UI_LANG, resolveLanguage } from "./language";

describe("resolving the newsroom's language", () => {
  it("conducts everything in English when nothing has been chosen", () => {
    expect(resolveLanguage({})).toEqual({ ui: "en", content: "en" });
    expect(DEFAULT_UI_LANG).toBe("en");
  });

  it("reuses a saved interface language without asking again", () => {
    expect(resolveLanguage({ uiLang: "de" })).toEqual({
      ui: "de",
      content: "de",
    });
  });

  it("keeps the deliverables' language separate from the interface's", () => {
    expect(resolveLanguage({ uiLang: "en", profileLang: "fr" })).toEqual({
      ui: "en",
      content: "fr",
    });
  });

  it("accepts an unknown BCP-47 value as given", () => {
    expect(resolveLanguage({ uiLang: "rm-CH" }).ui).toBe("rm-CH");
  });

  it("lets a per-run override win without changing what was saved", () => {
    const saved = { uiLang: "fr", profileLang: "fr" };
    expect(resolveLanguage({ ...saved, override: { ui: "it" } })).toEqual({
      ui: "it",
      content: "fr",
    });
    // The inputs are untouched: persisting is the caller's separate, explicit act.
    expect(saved).toEqual({ uiLang: "fr", profileLang: "fr" });
  });

  it("ignores blank values instead of resolving to an empty language", () => {
    expect(resolveLanguage({ uiLang: "   ", profileLang: "" })).toEqual({
      ui: "en",
      content: "en",
    });
  });

  it("keeps the article's own language when the house profile prefers another", () => {
    // The measured failure mode: a confirmed English article under a French house
    // profile shipped French furniture. The profile is the LAST resort, never a writer
    // over a language somebody established.
    expect(
      resolveLanguage({ uiLang: "fr", articleLang: "en", profileLang: "fr" }),
    ).toEqual({ ui: "fr", content: "en" });
  });

  it("falls back to the house profile only when no article language was declared", () => {
    expect(resolveLanguage({ uiLang: "en", profileLang: "de" }).content).toBe(
      "de",
    );
  });

  it("lets an explicit override outrank the article's own language", () => {
    expect(
      resolveLanguage({
        articleLang: "de",
        profileLang: "fr",
        override: { content: "it" },
      }).content,
    ).toBe("it");
  });

  it("ignores a blank article language instead of letting it win", () => {
    expect(
      resolveLanguage({ articleLang: "   ", profileLang: "de" }).content,
    ).toBe("de");
  });
});
