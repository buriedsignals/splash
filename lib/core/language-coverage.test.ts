import { describe, expect, it } from "bun:test";
import {
  COVERED_LANGS,
  isCoveredLang,
  uncoveredLanguageRefusal,
} from "./language-coverage";
import { STORY_COPY } from "./story-copy";

describe("the languages splash can actually finish a deliverable in", () => {
  it("covers exactly the four the furniture tables are written for", () => {
    expect([...COVERED_LANGS].sort()).toEqual(["de", "en", "fr", "it"]);
  });

  it("names no language the story-copy table has no row for", () => {
    // docs/splash/language-debt.md lists COVERED_LANGS as "the last line to change, once the
    // four above have a row" — but nothing enforced the ordering. Adding "es" to the list (and
    // to the literal assertion above, which a developer doing that would naturally update)
    // would go green with no STORY_COPY row, and storyCopy() falls back to English silently
    // while dwLocale DOES localize — the exact mixed deliverable this module exists to refuse.
    // STORY_COPY is the only one of the four furniture tables that is exported; LOCALES
    // (locale.ts) and SOURCE_QUESTION_TABLE (newsroom/ui-copy.ts) are module-private, so this
    // guard pins the reachable one rather than none.
    expect([...COVERED_LANGS].sort()).toEqual(Object.keys(STORY_COPY).sort());
  });

  it("accepts a regional tag of a covered language", () => {
    expect(isCoveredLang("fr-CH")).toBe(true);
    expect(isCoveredLang("de_AT")).toBe(true);
  });

  it("refuses a fifth language rather than shipping a mixed deliverable", () => {
    // The measured mixed shape: Datawrapper renders Spanish numbers (dwLocale maps es-ES)
    // under a literal English "Source:", because the furniture tables have no `es` row.
    expect(isCoveredLang("es")).toBe(false);
    const r = uncoveredLanguageRefusal("es");
    expect(r).toContain("es");
    expect(r).toContain("fr, de, it");
  });

  it("treats an absent language as covered — the run simply has none yet", () => {
    expect(isCoveredLang(undefined)).toBe(true);
    expect(isCoveredLang("")).toBe(true);
  });
});
