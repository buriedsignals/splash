import { describe, expect, it } from "bun:test";
import { exportProposalCopy, signoffCopy, sourceQuestionCopy } from "./ui-copy";
import { EN_SOURCE_QUESTIONS, sourceQuestion } from "../source/policy";

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

// The sign-off state a journalist is handed at EXPORT. The scripts keep printing the machine
// token (`EDITORIAL: unsigned — LLM render-approval only`); this is the sentence printed beside
// it, so relaying the machine line verbatim is no longer the only thing the code makes possible.
describe("the sign-off state, said to a person", () => {
  const LANGS = ["en", "fr", "de", "it"] as const;

  it("answers in English for an unknown language", () => {
    expect(signoffCopy("rm-CH").unsigned).toBe(signoffCopy("en").unsigned);
  });

  it("resolves a regional tag to its base language", () => {
    expect(signoffCopy("fr-CH").unsigned).toBe(signoffCopy("fr").unsigned);
  });

  // Two DIFFERENT reasons a sign-off could not be bound, and they must not share a sentence:
  // a folder delivery has no single file, a hosted embed has no file the newsroom OWNS. Since
  // SKILL.md relays the SIGNOFF line and never the machine one, reusing `skipped` on the hosted
  // path told the journalist « cette livraison est un dossier » about something that has no
  // folder — a false explanation, on the routine hosted-DW interactive path.
  it("keeps the hosted reason distinct from the folder reason, in every language", () => {
    for (const lang of LANGS) {
      const copy = signoffCopy(lang);
      expect(copy.skippedHosted).not.toBe(copy.skipped);
      expect(copy.skippedHosted.startsWith("SIGNOFF:")).toBe(true);
    }
    expect(signoffCopy("en").skipped).toContain("folder");
    expect(signoffCopy("en").skippedHosted).not.toContain("folder");
    expect(signoffCopy("fr").skippedHosted).not.toContain("dossier");
  });

  it("offers the same lines, translated, in every declared language", () => {
    for (const lang of LANGS) {
      const copy = signoffCopy(lang);
      expect(Object.keys(copy).sort()).toEqual(
        Object.keys(signoffCopy("en")).sort(),
      );
      expect(copy.signed("yvan")).toContain("yvan");
    }
    for (const lang of ["fr", "de", "it"] as const)
      expect(signoffCopy(lang).unsigned).not.toBe(signoffCopy("en").unsigned);
  });

  it("states the FACT, never the mechanism the machine line names", () => {
    for (const lang of LANGS) {
      const line = signoffCopy(lang).unsigned;
      expect(line.startsWith("SIGNOFF:")).toBe(true);
      expect(line).not.toContain("LLM");
      expect(line).not.toContain("EDITORIAL");
      expect(line).not.toContain("render-approval");
    }
  });
});

// The source question is the one question a run cannot BEGIN without an answer to, so it is put
// to the journalist by the façade — and a question a journalist is asked is interface copy.
describe("the source question, in the newsroom's language", () => {
  const LANGS = ["en", "fr", "de", "it"] as const;

  it("answers in English for an unknown language", () => {
    expect(sourceQuestionCopy("rm-CH")).toBe(EN_SOURCE_QUESTIONS);
  });

  it("resolves a regional tag to its base language", () => {
    expect(sourceQuestionCopy("de-CH").kind).toBe(
      sourceQuestionCopy("de").kind,
    );
  });

  it("asks each of the four questions in its own words in every language", () => {
    for (const lang of LANGS) {
      const copy = sourceQuestionCopy(lang);
      expect(Object.keys(copy).sort()).toEqual(
        Object.keys(EN_SOURCE_QUESTIONS).sort(),
      );
      expect(copy.kind.length).toBeGreaterThan(0);
      expect(copy.label("public").length).toBeGreaterThan(0);
      expect(copy.url.length).toBeGreaterThan(0);
      expect(copy.urlNotSpecific("https://x.ch").length).toBeGreaterThan(0);
    }
    // Translated, not copied: three languages that returned English would be a silent gap.
    for (const lang of ["fr", "de", "it"] as const)
      expect(sourceQuestionCopy(lang).kind).not.toBe(EN_SOURCE_QUESTIONS.kind);
  });

  it("names the kinds by their declared ids, which are the vocabulary a host writes", () => {
    // The five answerable kinds stay machine ids in every language: they are what goes into the
    // declaration, and translating them would produce an answer the schema refuses.
    for (const lang of LANGS)
      for (const kind of ["public", "local", "private", "prose", "synthetic"])
        expect(sourceQuestionCopy(lang).kind).toContain(kind);
  });

  it("lets the policy decide WHICH question is owed, and only the words change", () => {
    // One branch table, four vocabularies: the copy never re-decides what is missing.
    const fr = sourceQuestionCopy("fr");
    expect(sourceQuestion(undefined, fr)).toBe(fr.kind);
    expect(sourceQuestion({ kind: "public" }, fr)).toBe(fr.label("public"));
    expect(sourceQuestion({ kind: "public", label: "OFS" }, fr)).toBe(fr.url);
    expect(sourceQuestion({ kind: "local", label: "Relevés" }, fr)).toBeNull();
  });
});
