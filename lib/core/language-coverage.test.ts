import { describe, expect, it } from "bun:test";
import {
  COVERED_LANGS,
  isCoveredLang,
  uncoveredLanguageRefusal,
} from "./language-coverage";

describe("the languages splash can actually finish a deliverable in", () => {
  it("covers exactly the four the furniture tables are written for", () => {
    expect([...COVERED_LANGS].sort()).toEqual(["de", "en", "fr", "it"]);
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
