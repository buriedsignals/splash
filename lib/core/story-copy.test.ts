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

  it("word-form ordinals follow the language for small ranks (scrolly's walk/sequence wording)", () => {
    expect(storyCopy("en").ordinalWord(2)).toBe("the second");
    expect(storyCopy("fr").ordinalWord(2)).toBe("le deuxième");
    expect(storyCopy("de").ordinalWord(2)).toBe("der zweite");
    expect(storyCopy("it").ordinalWord(2)).toBe("il secondo");
    // Italian elides "il" to "l'" before the vowel-initial "ottavo".
    expect(storyCopy("it").ordinalWord(8)).toBe("l'ottavo");
  });

  it("word-form ordinals fall back to the numeral-suffix form beyond the word table", () => {
    for (const lang of ["en", "fr", "de", "it"] as const) {
      const c = storyCopy(lang);
      expect(c.ordinalWord(11)).toBe(c.nth(11));
    }
  });

  it("`first` always equals the word-form ordinal of 1", () => {
    for (const lang of ["en", "fr", "de", "it"] as const) {
      const c = storyCopy(lang);
      expect(c.first).toBe(c.ordinalWord(1));
    }
  });

  it("never leaks English into a German or Italian temporal sequence", () => {
    for (const lang of ["de", "it", "fr"] as const) {
      const c = storyCopy(lang);
      expect(c.first).not.toBe(STORY_COPY.en.first);
      expect(c.mostRecent).not.toBe(STORY_COPY.en.mostRecent);
      expect(c.years(9)).not.toBe(STORY_COPY.en.years(9));
      expect(c.mostRecentSince(c.years(9))).not.toBe(
        STORY_COPY.en.mostRecentSince(STORY_COPY.en.years(9)),
      );
      expect(c.laterBy(c.ordinalWord(2), c.years(9))).not.toBe(
        STORY_COPY.en.laterBy(
          STORY_COPY.en.ordinalWord(2),
          STORY_COPY.en.years(9),
        ),
      );
    }
  });

  it("never leaks English into a German or Italian magnitude reveal's tail wording", () => {
    // map-native's own `magnitudeCaption` — English-only for every language before this fix,
    // French included: `ordinal()` had no lang parameter at all.
    for (const lang of ["fr", "de", "it"] as const) {
      const c = storyCopy(lang);
      expect(c.longTail("X", "1")).not.toBe(STORY_COPY.en.longTail("X", "1"));
    }
  });

  it("never leaks English 'avg'/'points' into a German or Italian hex-grid callout", () => {
    // hex-grid-story.ts's aggregate wording ("12 avg", "1,200 points") was English-only for
    // every language — no lang parameter reached it at all.
    for (const lang of ["fr", "de", "it"] as const) {
      const c = storyCopy(lang);
      expect(c.meanOf("12")).not.toBe(STORY_COPY.en.meanOf("12"));
    }
    // "points" is the correct FRENCH word too (not a false-cognate leak) — only German/Italian
    // diverge from the English wording.
    for (const lang of ["de", "it"] as const) {
      const c = storyCopy(lang);
      expect(c.pointCount("1200")).not.toBe(STORY_COPY.en.pointCount("1200"));
    }
    expect(storyCopy("fr").pointCount("1200")).toBe("1200 points");
  });

  it("meanOf/pointCount wrap the already-localized value string unchanged", () => {
    expect(STORY_COPY.en.meanOf("12,4")).toBe("12,4 avg");
    expect(STORY_COPY.fr.meanOf("12,4")).toBe("12,4 en moyenne");
    expect(STORY_COPY.de.meanOf("12,4")).toBe("12,4 im Mittel");
    expect(STORY_COPY.it.meanOf("12,4")).toBe("12,4 in media");
    expect(STORY_COPY.en.pointCount("1 200")).toBe("1 200 points");
    expect(STORY_COPY.fr.pointCount("1 200")).toBe("1 200 points");
    expect(STORY_COPY.de.pointCount("1 200")).toBe("1 200 Punkte");
    expect(STORY_COPY.it.pointCount("1 200")).toBe("1 200 punti");
  });

  // ---------------------------------------------------------------------------
  // The rows the map derivers used to hard-code. Every one of these was an English
  // literal INSIDE a deriver ("the highest", "the densest hexagon", "mostly X",
  // "3 sites", "3 territories") and shipped verbatim into fr/de/it deliverables —
  // the same class as the locator caption that read "the highest of the 5 shown"
  // on a French page.
  // ---------------------------------------------------------------------------
  it("siteCount pluralizes per language (locator's categorized regime)", () => {
    expect(STORY_COPY.en.siteCount(1)).toBe("1 site");
    expect(STORY_COPY.en.siteCount(3)).toBe("3 sites");
    expect(STORY_COPY.fr.siteCount(1)).toBe("1 site");
    expect(STORY_COPY.fr.siteCount(3)).toBe("3 sites");
    expect(STORY_COPY.de.siteCount(1)).toBe("1 Standort");
    expect(STORY_COPY.de.siteCount(3)).toBe("3 Standorte");
    expect(STORY_COPY.it.siteCount(1)).toBe("1 sito");
    expect(STORY_COPY.it.siteCount(3)).toBe("3 siti");
  });

  it("routeSpan wraps the already-localized distance (route's derived takeaway)", () => {
    expect(STORY_COPY.en.routeSpan(3, "3,909")).toBe("3 territories, 3,909 km");
    expect(STORY_COPY.en.routeSpan(1, "12")).toBe("1 territory, 12 km");
    expect(STORY_COPY.fr.routeSpan(3, "3 909")).toBe("3 territoires, 3 909 km");
    expect(STORY_COPY.de.routeSpan(3, "3.909")).toBe("3 Gebiete, 3.909 km");
    expect(STORY_COPY.it.routeSpan(3, "3.909")).toBe("3 territori, 3.909 km");
  });

  it("rankOfHighest reads as prose in each language (cartogram's ranked walk)", () => {
    expect(STORY_COPY.en.rankOfHighest(1)).toBe("the highest");
    expect(STORY_COPY.en.rankOfHighest(2)).toBe("the 2nd highest");
    expect(STORY_COPY.en.rankOfHighest(3)).toBe("#3");
    for (const lang of ["fr", "de", "it"] as const)
      for (const rank of [1, 2, 3])
        expect(storyCopy(lang).rankOfHighest(rank)).not.toBe(
          STORY_COPY.en.rankOfHighest(rank),
        );
  });

  it("densestBin names the bin shape in each language (hex-grid's ranked walk)", () => {
    expect(STORY_COPY.en.densestBin(1, "hex")).toBe("the densest hexagon");
    expect(STORY_COPY.en.densestBin(2, "square")).toBe("the 2nd densest cell");
    expect(STORY_COPY.en.densestBin(3, "hex")).toBe("#3 hexagon");
    for (const lang of ["fr", "de", "it"] as const)
      for (const rank of [1, 2, 3])
        expect(storyCopy(lang).densestBin(rank, "hex")).not.toBe(
          STORY_COPY.en.densestBin(rank, "hex"),
        );
  });

  it("mostly carries the dominant category (dot-density's categorized reveal)", () => {
    expect(STORY_COPY.en.mostly("solar")).toBe("mostly solar");
    for (const lang of ["fr", "de", "it"] as const)
      expect(storyCopy(lang).mostly("solar")).not.toBe(
        STORY_COPY.en.mostly("solar"),
      );
  });
});
