import { describe, expect, it } from "bun:test";
import { deaccent, nameAppearsIn, normalizeName } from "./name-match";

describe("recognising the same source under a different form", () => {
  it("folds diacritics, the way the chart engine already does", () => {
    expect(deaccent("intermédiaires")).toBe("intermediaires");
    expect(normalizeName("  Office  Fédéral  ")).toBe("office federal");
  });

  it("matches a German declension of the same name", () => {
    // Measured: `energie-region-allemand` — the ledger refused because the article wrote the
    // genitive. Same source, different ending.
    expect(
      nameAppearsIn(
        "Bundesamt für Statistik",
        "Laut Angaben des Bundesamtes für Statistik stieg der Wert.",
      ),
    ).toBe(true);
  });

  it("matches a name whose accents the CLI mangled", () => {
    // Measured: `co2-secteurs-grouped` — the source was verbatim, the encoding was not.
    expect(
      nameAppearsIn(
        "Office fédéral de l'énergie",
        "publié par l'Office federal de l energie",
      ),
    ).toBe(true);
  });

  it("does NOT match a name that merely shares a common word", () => {
    // The accepted risk (spec §7): normalizing widens the halo. It must not widen it to this.
    expect(
      nameAppearsIn(
        "Institut Pasteur",
        "Le rapport de l'institut national de la santé",
      ),
    ).toBe(false);
  });

  it("does not let a two-letter token carry a match on its own", () => {
    expect(nameAppearsIn("de", "un texte de test")).toBe(false);
    expect(nameAppearsIn("il", "il fait beau")).toBe(false);
    expect(nameAppearsIn("la", "la maison est grande")).toBe(false);
  });

  it("matches a three-letter statistical-office acronym that IS the whole name", () => {
    // The common case in this domain: OFS/BFS are this repo's own canonical fixture source
    // names. Dropping every token shorter than MIN_STEM left NOTHING to match on, so a
    // citation whose acronym is literally in the article was refused — and the refusal is
    // run-blocking (flow-decisions -> save-decision exits non-zero).
    expect(nameAppearsIn("OFS", "Selon l'OFS, les primes montent.")).toBe(true);
    expect(nameAppearsIn("ONS", "Figures from the ONS show a rise.")).toBe(
      true,
    );
    expect(nameAppearsIn("IEA", "IEA data confirms the trend.")).toBe(true);
    expect(nameAppearsIn("BFS", "Laut BFS stieg der Wert.")).toBe(true);
    expect(nameAppearsIn("WHO", "The WHO reported new cases.")).toBe(true);
  });

  it("requires the acronym to be a WHOLE token, not embedded in a longer word", () => {
    // Whole-token equality, not substring: the fallback must not readmit the halo that
    // dropping the substring comparison closed.
    expect(nameAppearsIn("ONS", "the responsible authority said so")).toBe(
      false,
    );
    expect(nameAppearsIn("who", "the whole village agreed")).toBe(false);
  });
});
