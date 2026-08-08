import { describe, it, expect } from "bun:test";
import * as core from "./locale";

// GOLDEN regression tests (not parity tests). Earlier versions of this file imported
// chart-native's and map-native's own `src/core/locale.ts` as a second implementation
// to compare against — but both of those files are now pure `export * from
// "../../../../lib/core/locale"` re-exports (see skills/chart-native/src/core/locale.ts
// and skills/map-native/src/core/locale.ts). Comparing `core.X(...)` to
// `cnLocale.X(...)`/`mnLocale.X(...)` was therefore comparing this module to itself at
// runtime — a tautology that cannot fail no matter how badly `lib/core/locale.ts`
// regresses. Every value below is a literal captured from a real run of `core`
// (see git history / Task 3 report for the capture method) and is mutation-proven: a
// one-character change to the source (a separator or a furniture label byte) flips one
// of these goldens to FAIL.
//
// French/German narrow-no-break-space grouping: ` `, the same glyph
// Intl.NumberFormat('fr-FR') and Datawrapper's fr-FR locale emit (see lib/core/locale.ts
// header). Written as an escape (not the literal invisible glyph) so it stays visible
// and diffable in this file.
const NBSP = "\u202f";

const LANGS = [undefined, "fr", "de", "it", "en", "fr-CH", "de-CH", "pt"];
const NUMS = [0, 42, 1900, -1900, 19.3, 12345.6, 890.2, 1_800_000, -0.5];

describe("core/locale — golden number + furniture output", () => {
  it("isFrench matches for every lang", () => {
    const golden = [false, true, false, false, false, true, false, false];
    LANGS.forEach((l, i) => expect(core.isFrench(l)).toBe(golden[i]));
  });

  it("decimalSep / groupSep / sourceLabel match for every lang", () => {
    const LOCALE_FR = {
      decimal: ",",
      group: NBSP,
      source: "Source :",
      flow: { to: "vers", outgoing: "sortants", mostWith: "surtout avec" },
    };
    const LOCALE_DE = {
      decimal: ",",
      group: ".",
      source: "Quelle:",
      flow: { to: "nach", outgoing: "abgehend", mostWith: "vor allem mit" },
    };
    const LOCALE_IT = {
      decimal: ",",
      group: ".",
      source: "Fonte:",
      flow: { to: "verso", outgoing: "in uscita", mostWith: "soprattutto con" },
    };
    const LOCALE_EN = {
      decimal: ".",
      group: ",",
      source: "Source:",
      flow: { to: "to", outgoing: "out", mostWith: "most with" },
    };
    // undefined/en/pt fall back to English; fr-CH/de-CH resolve to the fr/de base row.
    const golden = [
      LOCALE_EN,
      LOCALE_FR,
      LOCALE_DE,
      LOCALE_IT,
      LOCALE_EN,
      LOCALE_FR,
      LOCALE_DE,
      LOCALE_EN,
    ];
    LANGS.forEach((l, i) => {
      expect(core.decimalSep(l)).toBe(golden[i].decimal);
      expect(core.groupSep(l)).toBe(golden[i].group);
      expect(core.sourceLabel(l)).toBe(golden[i].source);
    });
  });

  it("formatLocaleNumber matches for every lang x number", () => {
    const EN_ROW = [
      "0",
      "42",
      "1,900",
      "-1,900",
      "19.3",
      "12,345.6",
      "890.2",
      "1,800,000",
      "-0.5",
    ];
    const FR_ROW = [
      "0",
      "42",
      `1${NBSP}900`,
      `-1${NBSP}900`,
      "19,3",
      `12${NBSP}345,6`,
      "890,2",
      `1${NBSP}800${NBSP}000`,
      "-0,5",
    ];
    const DE_IT_ROW = [
      "0",
      "42",
      "1.900",
      "-1.900",
      "19,3",
      "12.345,6",
      "890,2",
      "1.800.000",
      "-0,5",
    ];
    const golden: Record<string, string[]> = {
      und: EN_ROW,
      fr: FR_ROW,
      de: DE_IT_ROW,
      it: DE_IT_ROW,
      en: EN_ROW,
      "fr-CH": FR_ROW,
      "de-CH": DE_IT_ROW,
      pt: EN_ROW,
    };
    for (const l of LANGS) {
      const row = golden[l ?? "und"];
      NUMS.forEach((n, i) => {
        expect(core.formatLocaleNumber(n, l)).toBe(row[i]);
      });
    }
  });

  it("localizeDecimal matches", () => {
    const EN_ROW = ["1.9k", "19.3", "1.8M", "0.02"];
    const COMMA_ROW = ["1,9k", "19,3", "1,8M", "0,02"];
    const golden: Record<string, string[]> = {
      und: EN_ROW,
      fr: COMMA_ROW,
      de: COMMA_ROW,
      it: COMMA_ROW,
      en: EN_ROW,
      "fr-CH": COMMA_ROW,
      "de-CH": COMMA_ROW,
      pt: EN_ROW,
    };
    for (const l of LANGS) {
      const row = golden[l ?? "und"];
      ["1.9k", "19.3", "1.8M", "0.02"].forEach((s, i) => {
        expect(core.localizeDecimal(s, l)).toBe(row[i]);
      });
    }
  });

  it("localeFor + LocaleSpec match", () => {
    // The `flow` row (the flow family's connective words) is part of the spec, so it is
    // pinned here too — an unlocalized word reaching a reader is the defect this table was
    // extended to close (a French sankey whose links read "Solaire to Réseau").
    const LOCALE_FR = {
      decimal: ",",
      group: NBSP,
      source: "Source :",
      flow: { to: "vers", outgoing: "sortants", mostWith: "surtout avec" },
    };
    const LOCALE_DE = {
      decimal: ",",
      group: ".",
      source: "Quelle:",
      flow: { to: "nach", outgoing: "abgehend", mostWith: "vor allem mit" },
    };
    const LOCALE_IT = {
      decimal: ",",
      group: ".",
      source: "Fonte:",
      flow: { to: "verso", outgoing: "in uscita", mostWith: "soprattutto con" },
    };
    const LOCALE_EN = {
      decimal: ".",
      group: ",",
      source: "Source:",
      flow: { to: "to", outgoing: "out", mostWith: "most with" },
    };
    const golden = [
      LOCALE_EN,
      LOCALE_FR,
      LOCALE_DE,
      LOCALE_IT,
      LOCALE_EN,
      LOCALE_FR,
      LOCALE_DE,
      LOCALE_EN,
    ];
    LANGS.forEach((l, i) => expect(core.localeFor(l)).toEqual(golden[i]));
    // …and the accessor the components call answers the same row.
    LANGS.forEach((l, i) => expect(core.flowWords(l)).toEqual(golden[i].flow));
  });

  it("unitSuffix matches", () => {
    // fr/de prefix every short unit with a narrow no-break space, "%"/"‰" included;
    // en/it/undefined/pt attach symbol units directly and space word units.
    const SYMBOL_ROW = ["", "", "%", "‰", " km", " kg", ""];
    const NBSP_ROW = [
      "",
      "",
      `${NBSP}%`,
      `${NBSP}‰`,
      `${NBSP}km`,
      `${NBSP}kg`,
      "",
    ];
    const golden: Record<string, string[]> = {
      und: SYMBOL_ROW,
      fr: NBSP_ROW,
      de: NBSP_ROW,
      it: SYMBOL_ROW,
      en: SYMBOL_ROW,
      "fr-CH": NBSP_ROW,
      "de-CH": NBSP_ROW,
      pt: SYMBOL_ROW,
    };
    const UNITS = [undefined, "", "%", "‰", "km", "kg", "magnitude"];
    for (const l of LANGS) {
      const row = golden[l ?? "und"];
      UNITS.forEach((u, i) => {
        expect(core.unitSuffix(u, l)).toBe(row[i]);
      });
    }
  });

  it("SHORT_UNIT_MAX_CHARS matches", () => {
    expect(core.SHORT_UNIT_MAX_CHARS).toBe(3);
  });
});

describe("core/locale — golden output on map-native's historically-tested range (fr/en)", () => {
  // map-native's own locale.ts historically supported only fr/en (isFrench-binary);
  // de/it silently fell back to English-style separators + "Source:" — a real, TRACKED
  // divergence (CLAUDE.md backlog: "sourceLabel map-native FR-seul (gap de/it)").
  // Unifying onto chart-native's fuller 4-locale table (this module) FIXES de/it for
  // map-native as an intentional, documented side effect of the extraction. This block
  // pins the fr/en range map-native's own test suite
  // (skills/map-native/tests/locale.test.ts) ever asserted, to golden values.
  //
  // A SECOND divergence closed by the extraction: map-native's own `FR_GROUP` was a
  // plain ASCII space (U+0020), not the narrow no-break space (U+202F) chart-native
  // uses — and map-native's own test file's "NBSP" constant encoded the SAME wrong
  // character, so the two were self-consistent and the bug was invisible (a French
  // number's thousands gap could break across a line-wrap). core adopts chart-native's
  // U+202F (the grounded, documented convention — matches Intl.NumberFormat('fr-FR') and
  // DW's fr-FR locale) — every French golden below uses `NBSP` (` `), not a plain
  // space.
  const FR_EN = [undefined, "fr", "en"];

  it("localizeNumberString matches golden output for en strictly, fr with the U+202F group fix", () => {
    const EN_ROW = ["0.00", "12,000", "0.02", "-12,345.6", "1,900"];
    const FR_ROW = [
      "0,00",
      `12${NBSP}000`,
      "0,02",
      `-12${NBSP}345,6`,
      `1${NBSP}900`,
    ];
    const golden: Record<string, string[]> = {
      und: EN_ROW,
      fr: FR_ROW,
      en: EN_ROW,
    };
    for (const l of FR_EN) {
      const row = golden[l ?? "und"];
      ["0.00", "12000", "0.02", "-12345.6", "1900"].forEach((s, i) => {
        expect(core.localizeNumberString(s, l)).toBe(row[i]);
      });
    }
  });

  it("labelWithUnit matches golden output for en strictly, fr with the U+202F group fix", () => {
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
    const EN_ROW = [
      "7,4 magnitude",
      "70%",
      "296$bn",
      "4M€",
      "34 km",
      "181",
      "181",
      "34 000 voyageurs/j",
    ];
    const FR_ROW = [
      "7,4 magnitude",
      `70${NBSP}%`,
      `296${NBSP}$bn`,
      `4M${NBSP}€`,
      `34${NBSP}km`,
      "181",
      "181",
      "34 000 voyageurs/j",
    ];
    const golden: Record<string, string[]> = {
      und: EN_ROW,
      fr: FR_ROW,
      en: EN_ROW,
    };
    for (const l of FR_EN) {
      const row = golden[l ?? "und"];
      CASES.forEach(([v, u], i) => {
        expect(core.labelWithUnit(v, u, l)).toBe(row[i]);
      });
    }
  });

  it("spaces a short unit the German way, like unitSuffix already does", () => {
    // labelWithUnit was `isFrench`-binary while its twin unitSuffix (locale.ts:167-174)
    // already handled `de` — two helpers of the same file disagreeing about German.
    expect(core.labelWithUnit("70", "%", "de")).toBe(
      core.labelWithUnit("70", "%", "fr"),
    );
    expect(core.labelWithUnit("70", "%", "de")).not.toBe("70%");
  });

  it("decimalSep/sourceLabel/formatLocaleNumber match golden fr/en output (no regression on the tested range)", () => {
    const golden: Record<
      string,
      { decimal: string; source: string; n1900: string }
    > = {
      und: { decimal: ".", source: "Source:", n1900: "1,900" },
      fr: { decimal: ",", source: "Source :", n1900: `1${NBSP}900` },
      en: { decimal: ".", source: "Source:", n1900: "1,900" },
    };
    for (const l of FR_EN) {
      const g = golden[l ?? "und"];
      expect(core.decimalSep(l)).toBe(g.decimal);
      expect(core.sourceLabel(l)).toBe(g.source);
      expect(core.formatLocaleNumber(1900, l)).toBe(g.n1900);
    }
  });

  // These two were already golden/analytic (not tautological parity) before this
  // hardening pass — kept as-is.
  it("de/it resolve correctly post-extraction (was map-native's English-fallback gap)", () => {
    expect(core.decimalSep("de")).toBe(",");
    expect(core.sourceLabel("de")).toBe("Quelle:");
    expect(core.sourceLabel("it")).toBe("Fonte:");
  });

  it("the French group separator is the narrow no-break space, U+202F (was map-native's plain ASCII space)", () => {
    expect([...core.groupSep("fr")][0]?.codePointAt(0)).toBe(0x202f);
  });
});

// ── "does this sentence already state the unit?" ─────────────────────────────────────────
//
// The MEASURED defect (live Datawrapper chart saWby, 2026-08-08): a subtitle reading
// "…Basel highest at 54 percent recycled" was published as "…54 percent recycled (%)",
// because the only test for "already stated" was for the SYMBOL as its own token, and
// "percent" is not the token "%". The French run reproduced it byte for byte on chart
// fi1UI ("…54 pour cent recyclés (%)"), which is why the word forms are a TABLE and not
// an English list.
describe("unitStatedIn — the one reader-facing test of whether a unit is already said", () => {
  it("finds the unit as its own token, and answers with the bytes on the page", () => {
    expect(core.unitStatedIn("Recycling reaches 54%", "%")).toBe("%");
    expect(core.unitStatedIn("Le recyclage atteint 54 %", "%")).toBe("%");
    expect(core.unitStatedIn("Surface exprimée en m", "m")).toBe("m");
  });

  it("does not mistake a letter buried in an ordinary word for the unit", () => {
    expect(core.unitStatedIn("Loyer moyen des logements", "m")).toBeUndefined();
    expect(core.unitStatedIn("Tonnage des déchets", "t")).toBeUndefined();
  });

  it("reads the SPELLED-OUT percent in each of the four covered languages", () => {
    expect(
      core.unitStatedIn(
        "A ranking of four Swiss cities, Basel highest at 54 percent recycled",
        "%",
      ),
    ).toBe("percent");
    expect(core.unitStatedIn("Recycling reaches 54 per cent", "%")).toBe(
      "per cent",
    );
    expect(
      core.unitStatedIn("Bâle en tête à 54 pour cent recyclés", "%"),
    ).toBe("pour cent");
    expect(core.unitStatedIn("Basel recycelt 54 Prozent", "%")).toBe("Prozent");
    expect(core.unitStatedIn("Basilea ricicla il 54 per cento", "%")).toBe(
      "per cento",
    );
  });

  it("reads the spelled-out per-mille the same way, in all four", () => {
    for (const [text, want] of [
      ["A rate of 4 per mille", "per mille"],
      ["Un taux de 4 pour mille", "pour mille"],
      ["Eine Rate von 4 Promille", "Promille"],
      ["Un tasso del 4 per mille", "per mille"],
    ] as const)
      expect(core.unitStatedIn(text, "‰")).toBe(want);
  });

  // The boundary is what keeps the word forms from over-reaching. "percentage points" is a
  // DIFFERENT unit from "%", and a subtitle that says it has not stated "%".
  it("stops at a word boundary — 'percentage' is not 'percent', 'per cento' is not 'per cent'", () => {
    expect(
      core.unitStatedIn("Recycling rose by 4 percentage points", "%"),
    ).toBeUndefined();
    expect(
      core.unitStatedIn("Le pourcentage de tri a progressé", "%"),
    ).toBeUndefined();
  });

  // The word forms belong to the SYMBOL units and to nothing else. "CHF" is not "francs":
  // the ISO code says WHICH franc, which the word does not, so a subtitle saying "583
  // francs" has not stated "CHF". Measured on the repo's own corpus: four French angles
  // write "francs" against unit "CHF" (lib/loop/angle.test.ts:231, :270, lib/host/
  // state.test.ts:311, lib/loop/angle.test.ts:15).
  it("says nothing about a currency code a word form would only half-state", () => {
    expect(
      core.unitStatedIn("Genève affiche 583 francs, Fribourg 468.", "CHF"),
    ).toBeUndefined();
  });

  it("answers undefined for a blank or absent unit rather than matching everything", () => {
    expect(core.unitStatedIn("anything at all", "")).toBeUndefined();
    expect(core.unitStatedIn("anything at all", "   ")).toBeUndefined();
    expect(core.unitStatedIn("anything at all", undefined)).toBeUndefined();
  });

  // The unit comes from a brief — untrusted — and can carry regex metacharacters.
  it("escapes a unit carrying regex metacharacters instead of compiling it", () => {
    expect(core.unitStatedIn("Vitesse en m/s^2", "m/s^2")).toBe("m/s^2");
    expect(core.unitStatedIn("Vitesse en metres", "m/s^2")).toBeUndefined();
  });

  it("has a spelled-out row for every language splash can finish a deliverable in", () => {
    for (const [symbol, rows] of Object.entries(core.SYMBOL_UNIT_WORDS)) {
      expect([symbol, Object.keys(rows).sort()]).toEqual([
        symbol,
        ["de", "en", "fr", "it"],
      ]);
      for (const forms of Object.values(rows))
        expect(forms.length).toBeGreaterThan(0);
    }
  });
});
