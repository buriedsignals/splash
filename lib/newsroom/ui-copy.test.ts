import { describe, expect, it } from "bun:test";
import { exportProposalCopy } from "./ui-copy";

describe("the interface-copy locale layer", () => {
  it("answers in English for an unknown language", () => {
    expect(exportProposalCopy("rm-CH").intro).toBe(
      exportProposalCopy("en").intro,
    );
  });

  it("keeps the shipped French wording for a French newsroom", () => {
    expect(exportProposalCopy("fr").intro).toBe(
      "Le visuel est produit. Choisissez la forme de livraison (rien n'est encore construit — la forme choisie est générée à la demande) :",
    );
  });

  it("resolves a regional tag to its base language", () => {
    expect(exportProposalCopy("fr-CH").intro).toBe(
      exportProposalCopy("fr").intro,
    );
  });

  it("offers the same set of lines in every language it declares", () => {
    const en = Object.keys(exportProposalCopy("en")).sort();
    expect(Object.keys(exportProposalCopy("fr")).sort()).toEqual(en);
  });
});
