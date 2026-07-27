import { describe, expect, it } from "bun:test";
import { INTENTS } from "../brain/intents";
import { intentCopy } from "./intent-copy";
import { suggestIntentFor } from "./suggest-intent";

// The keyword pass, kept and RETROGRADED. It no longer decides the ranking; it offers a reading
// of the draft takeaway that the journalist confirms or overrules. This is where it stays alive
// and called — the alternative was letting it rot into code reachable only by a legacy manifest.
describe("the intent question a host puts to the journalist", () => {
  it("serves the whole vocabulary, phrased editorially, in the asked language", () => {
    const asked = suggestIntentFor("Genève paie la prime la plus lourde", "fr");
    expect(asked.language).toBe("fr");
    expect(asked.question).toBe(intentCopy("fr").question);
    expect(asked.choices.map((c) => c.id)).toEqual([...INTENTS]);
    expect(asked.choices.every((c) => c.label.trim() !== "")).toBe(true);
  });

  it("says which language it answered in, when the asked one is not shipped", () => {
    const asked = suggestIntentFor("Anything at all", "de");
    expect(asked.language).toBe("en");
    expect(asked.question).toBe(intentCopy("en").question);
  });

  // THE MEASURED CASE. The French claim the keyword pass reads as nothing at all: the host is
  // told plainly that there is no suggestion, and the journalist picks — instead of the loop
  // ordering the offer by fit and readiness with nobody told.
  it("says out loud when the wording suggests nothing, and never fills the blank", () => {
    const asked = suggestIntentFor(
      "Genève paie la prime la plus lourde des cantons romands",
      "fr",
    );
    expect(asked.suggested).toEqual([]);
    expect(asked.note).toBe(intentCopy("fr").noSuggestion);
  });

  it("offers what the wording reads like, as a suggestion to confirm or overrule", () => {
    const asked = suggestIntentFor("Les primes ont augmenté en dix ans", "fr");
    expect(asked.suggested).toContain("change-over-time");
    // Phrased with the LABEL, never the machine id — the socle's rule, at the one place the
    // suggestion is put to a human.
    const label = intentCopy("fr").choices.find(
      (c) => c.id === "change-over-time",
    )!.label;
    expect(asked.note).toBe(intentCopy("fr").suggestionNote(label));
    expect(asked.note).not.toContain("change-over-time");
  });

  // A mis-fire is still a mis-fire — it is just visible and overrulable now. Recorded so the
  // demotion is proven rather than asserted: the pass reads geography, and it OFFERS it.
  it("offers a mis-reading rather than acting on it", () => {
    const asked = suggestIntentFor(
      "La prime varie de 115 francs entre le canton le plus cher et le moins cher",
      "fr",
    );
    expect(asked.suggested).toEqual(["spatial"]);
    expect(asked.choices.map((c) => c.id)).toContain("distribution");
  });
});
