import { describe, expect, it } from "bun:test";
import {
  COVERED_LANGS,
  isCoveredLang,
  uncoveredLanguageRefusal,
} from "./language-coverage";
import { STORY_COPY } from "./story-copy";
import { SYMBOL_UNIT_WORDS } from "./locale";
import { DATE_COPY } from "./date-locale";

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

  // The second reachable furniture table, held to the same rule as STORY_COPY. It reads the
  // journalist's own sentence rather than writing one, but the failure mode is the same
  // shape: a row that exists only in English makes the check answer "the unit is already
  // stated" for an English subtitle and "no" for the identical French one, so a French chart
  // ships "…54 pour cent recyclés (%)" while its English twin reads clean. That is not
  // hypothetical — it is the pair of live charts (saWby / fi1UI) this table was written from.
  it("names no language the symbol-unit word table has no row for", () => {
    expect(Object.keys(SYMBOL_UNIT_WORDS).length).toBeGreaterThan(0);
    for (const [symbol, rows] of Object.entries(SYMBOL_UNIT_WORDS)) {
      expect([symbol, Object.keys(rows).sort()]).toEqual([
        symbol,
        [...COVERED_LANGS].sort(),
      ]);
      // A row that merely REPEATS the English forms is the leak wearing the table's clothes.
      for (const lang of COVERED_LANGS.filter((l) => l !== "en"))
        expect([symbol, lang, rows[lang]]).not.toEqual([symbol, lang, rows.en]);
    }
  });

  // The third reachable furniture table, held to the same rule. A date is furniture the same
  // way "Source:" is: the TIME family (gantt, calendar, candlestick) puts month and weekday
  // NAMES on every axis, and a row that exists only in English ships an Italian calendar
  // whose weekdays read "Mon Wed Fri Sun" — the leak this rule exists to make impossible.
  it("names no language the date table has no row for", () => {
    expect(Object.keys(DATE_COPY).sort()).toEqual([...COVERED_LANGS].sort());
    for (const lang of COVERED_LANGS.filter((l) => l !== "en")) {
      expect([lang, DATE_COPY[lang].monthsShort]).not.toEqual([
        lang,
        DATE_COPY.en.monthsShort,
      ]);
      expect([lang, DATE_COPY[lang].weekdaysShortMonday]).not.toEqual([
        lang,
        DATE_COPY.en.weekdaysShortMonday,
      ]);
    }
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
