import { describe, it, expect } from "bun:test";
import * as core from "./locale";
// Canonical (richer, validated 4-locale) implementation this module is extracted from —
// chart-native's own locale.test.ts already pins fr/de/it/en/unknown behaviour in detail.
import * as cnLocale from "../../skills/chart-native/src/core/locale";
// map-native's mirror — historically fr/en-only (isFrench-binary). Kept for its two
// unique helpers (localizeNumberString, labelWithUnit) and for a documented-divergence
// check below; see the "map-native-only helpers" block for why parity there is scoped.
import * as mnLocale from "../../skills/map-native/src/core/locale";

const LANGS = [undefined, "fr", "de", "it", "en", "fr-CH", "de-CH", "pt"];
const NUMS = [0, 42, 1900, -1900, 19.3, 12345.6, 890.2, 1_800_000, -0.5];

describe("core/locale parity with chart-native (canonical, 4-locale)", () => {
  it("isFrench matches for every lang", () => {
    for (const l of LANGS) expect(core.isFrench(l)).toBe(cnLocale.isFrench(l));
  });

  it("decimalSep / groupSep / sourceLabel match for every lang", () => {
    for (const l of LANGS) {
      expect(core.decimalSep(l)).toBe(cnLocale.decimalSep(l));
      expect(core.groupSep(l)).toBe(cnLocale.groupSep(l));
      expect(core.sourceLabel(l)).toBe(cnLocale.sourceLabel(l));
    }
  });

  it("formatLocaleNumber matches for every lang x number", () => {
    for (const l of LANGS) {
      for (const n of NUMS) {
        expect(core.formatLocaleNumber(n, l)).toBe(
          cnLocale.formatLocaleNumber(n, l),
        );
      }
    }
  });

  it("localizeDecimal matches", () => {
    for (const l of LANGS) {
      for (const s of ["1.9k", "19.3", "1.8M", "0.02"]) {
        expect(core.localizeDecimal(s, l)).toBe(cnLocale.localizeDecimal(s, l));
      }
    }
  });

  it("localeFor + LocaleSpec match", () => {
    for (const l of LANGS)
      expect(core.localeFor(l)).toEqual(cnLocale.localeFor(l));
  });

  it("unitSuffix matches", () => {
    for (const l of LANGS) {
      for (const u of [undefined, "", "%", "‰", "km", "kg", "magnitude"]) {
        expect(core.unitSuffix(u, l)).toBe(cnLocale.unitSuffix(u, l));
      }
    }
  });

  it("SHORT_UNIT_MAX_CHARS matches", () => {
    expect(core.SHORT_UNIT_MAX_CHARS).toBe(cnLocale.SHORT_UNIT_MAX_CHARS);
  });
});

describe("core/locale — map-native-only helpers, parity on map-native's tested range (fr/en)", () => {
  // map-native's locale.ts historically supported only fr/en (isFrench-binary); de/it
  // silently fell back to English-style separators + "Source:" — a real, TRACKED
  // divergence (CLAUDE.md backlog: "sourceLabel map-native FR-seul (gap de/it)").
  // Unifying onto chart-native's fuller 4-locale table (this module) FIXES de/it for
  // map-native as an intentional, documented side effect of the extraction — not a
  // silent behaviour change. Parity here is therefore scoped to fr/en, the only range
  // map-native's own test suite (skills/map-native/tests/locale.test.ts) ever asserted.
  //
  // A SECOND divergence surfaced while writing this test: map-native's own `FR_GROUP`
  // is a plain ASCII space (U+0020), not the narrow no-break space (U+202F) chart-native
  // uses — and map-native's own test file's "NBSP" constant encodes the SAME wrong
  // character, so the two were self-consistent and the bug was invisible (a French
  // number's thousands gap could break across a line-wrap). core adopts chart-native's
  // U+202F (the grounded, documented convention — matches Intl.NumberFormat('fr-FR') and
  // DW's fr-FR locale). French-locale comparisons below therefore normalize the group
  // character before comparing byte-for-byte; English is unaffected (comma group sep,
  // untouched) and compared strictly.
  const FR_EN = [undefined, "fr", "en"];
  const normSpace = (s: string) => s.replace(/ /g, " ");

  it("localizeNumberString matches map-native for en strictly, fr modulo the group-char fix", () => {
    for (const l of FR_EN) {
      for (const s of ["0.00", "12000", "0.02", "-12345.6", "1900"]) {
        expect(normSpace(core.localizeNumberString(s, l))).toBe(
          normSpace(mnLocale.localizeNumberString(s, l)),
        );
      }
    }
  });

  it("labelWithUnit matches map-native for en strictly, fr modulo the group-char fix", () => {
    const CASES: Array<[string, string | undefined]> = [
      ["7,4", "magnitude"],
      ["70", "%"],
      ["296", "$bn"],
      ["4M", "€"],
      ["34", "km"],
      ["181", undefined],
      ["181", ""],
      ["34 000", " voyageurs/j"],
    ];
    for (const l of FR_EN) {
      for (const [v, u] of CASES) {
        expect(normSpace(core.labelWithUnit(v, u, l))).toBe(
          normSpace(mnLocale.labelWithUnit(v, u, l)),
        );
      }
    }
  });

  it("decimalSep/sourceLabel/formatLocaleNumber match map-native's fr/en output (no regression on the tested range)", () => {
    for (const l of FR_EN) {
      expect(core.decimalSep(l)).toBe(mnLocale.decimalSep(l));
      expect(core.sourceLabel(l)).toBe(mnLocale.sourceLabel(l));
      expect(normSpace(core.formatLocaleNumber(1900, l))).toBe(
        normSpace(mnLocale.formatLocaleNumber(1900, l)),
      );
    }
  });

  // NOTE: skills/map-native/src/core/locale.ts is now itself a thin `export * from
  // lib/core/locale` re-export (see Step 4), so `mnLocale` above IS `core` at runtime —
  // the two gaps this extraction closed can no longer be demonstrated by a live A/B
  // comparison in this file. Pinned here as a plain regression guard on the resolved
  // (fixed) values instead; the "before" evidence is recorded in the Task 3 report.
  it("de/it resolve correctly post-extraction (was map-native's English-fallback gap)", () => {
    expect(core.decimalSep("de")).toBe(",");
    expect(core.sourceLabel("de")).toBe("Quelle:");
    expect(core.sourceLabel("it")).toBe("Fonte:");
  });

  it("the French group separator is the narrow no-break space, U+202F (was map-native's plain ASCII space)", () => {
    expect([...core.groupSep("fr")][0]?.codePointAt(0)).toBe(0x202f);
  });
});
