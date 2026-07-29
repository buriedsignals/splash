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
  });
});
