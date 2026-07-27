import { describe, expect, it } from "bun:test";
import { INTENTS } from "../brain/intents";
import { INTENT_COPY_LANGUAGES, intentCopy } from "./intent-copy";

describe("the intent question, phrased for a journalist", () => {
  it("covers the whole closed vocabulary in every language it ships", () => {
    for (const lang of INTENT_COPY_LANGUAGES) {
      const copy = intentCopy(lang);
      expect(copy.choices.map((c) => c.id)).toEqual([...INTENTS]);
      expect(copy.question.trim()).not.toBe("");
      for (const choice of copy.choices) {
        expect(choice.label.trim()).not.toBe("");
        expect(choice.example.trim()).not.toBe("");
      }
    }
  });

  it("falls back to English for a language it does not ship, rather than half-translating", () => {
    expect(intentCopy("de")).toEqual(intentCopy("en"));
    expect(intentCopy("")).toEqual(intentCopy("en"));
    // A region tag resolves to its base language, like every other copy table here.
    expect(intentCopy("fr-CH")).toEqual(intentCopy("fr"));
  });

  // THE RULE OF THE SOCLE, MADE MECHANICAL. "A journalist must never be asked 'is your intent
  // part-to-whole?'" is a discipline until something enforces it. Every label and example is
  // checked against the vocabulary of the drawing — the words that name a FORM instead of a
  // POINT — and against the raw machine id, which is the failure this guard was written for.
  const CHART_WORDS = [
    "chart",
    "graph",
    "graphique",
    "plot",
    "diagram",
    "diagramme",
    "bar chart",
    "barres",
    "histogram",
    "histogramme",
    "camembert",
    "pie",
    "scatter",
    "nuage de points",
    "courbe",
    "axe",
    "axis",
    "légende",
    "legend",
    "carte",
    "map",
    "visualisation",
    "visualization",
    "dataviz",
  ];

  it("never asks the question in the vocabulary of the drawing", () => {
    for (const lang of INTENT_COPY_LANGUAGES) {
      const copy = intentCopy(lang);
      const said = [
        copy.question,
        copy.suggestionNote("X"),
        copy.noSuggestion,
        ...copy.choices.flatMap((c) => [c.label, c.example]),
      ];
      for (const sentence of said) {
        const lower = sentence.toLowerCase();
        for (const word of CHART_WORDS)
          expect({ lang, sentence, word, hit: lower.includes(word) }).toEqual({
            lang,
            sentence,
            word,
            hit: false,
          });
      }
    }
  });

  it("never shows a journalist the machine id", () => {
    for (const lang of INTENT_COPY_LANGUAGES) {
      for (const choice of intentCopy(lang).choices) {
        const shown = `${choice.label} ${choice.example}`.toLowerCase();
        for (const id of INTENTS) expect(shown.includes(id)).toBe(false);
      }
    }
  });

  // The two pairs the keyword pass measurably confused (spec §1): ranking/magnitude and
  // distribution/spatial. If two choices read the same, declaring is no better than guessing.
  it("gives every choice a distinct label and a distinct example", () => {
    for (const lang of INTENT_COPY_LANGUAGES) {
      const copy = intentCopy(lang);
      expect(new Set(copy.choices.map((c) => c.label)).size).toBe(
        copy.choices.length,
      );
      expect(new Set(copy.choices.map((c) => c.example)).size).toBe(
        copy.choices.length,
      );
    }
  });
});
