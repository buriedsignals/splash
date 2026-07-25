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
});
