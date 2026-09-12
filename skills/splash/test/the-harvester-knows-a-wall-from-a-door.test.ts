/**
 * THE TWO VOCABULARIES THE HARVESTER CLICKS ON, AND WHY THEY ARE NOT THE SAME SHAPE.
 *
 * A consent dialog is a standardised wall in front of every page, so its vocabulary is broad and
 * matched at the START of a label: measured across two map waves, nine of twelve references were
 * lost to walls, and most consent buttons outside the English-speaking web say what they do —
 * "Zustimmen und weiter", "Accept all cookies". A whole-label match reached none of them.
 *
 * An entry screen is one piece's own invitation, so its vocabulary is narrow and matched WHOLE. The
 * asymmetry is the design, and a test that treated the two alike would license the harvester to
 * click a "Start over" control in the middle of an article.
 */
import { describe, it, expect } from "bun:test";
import {
  CONSENT_WORDS,
  ENTRY_WORDS,
} from "../../../scripts/design-base/harvest.mjs";

describe("the consent vocabulary", () => {
  it("should reach a button that says what it does, not only one that says a single word", () => {
    // Each of these was met on a real page and refused by the anchored-at-both-ends version.
    for (const label of [
      "Zustimmen und weiter",
      "Accept all cookies",
      "Accepter et fermer",
      "Tillad alle",
      "I agree to the terms",
    ])
      expect(CONSENT_WORDS.test(label), label).toBe(true);
  });

  it("should still refuse a label that only contains the word somewhere", () => {
    // The opening has to be the button's subject. A sentence that happens to carry "accept" is a
    // paragraph, and clicking it is how a harvester leaves the piece it came to measure.
    for (const label of [
      "We will accept your submission once it has been reviewed by an editor",
      "Do not accept",
      "Read our cookie policy",
      "Manage preferences",
      "Reject all",
    ])
      expect(CONSENT_WORDS.test(label), label).toBe(false);
  });
});

describe("the entry vocabulary", () => {
  it("should open a piece's own door", () => {
    for (const label of [
      "Explore the map",
      "Start watching",
      "Play",
      "Enter",
      "Launch",
    ])
      expect(ENTRY_WORDS.test(label), label).toBe(true);
  });

  it("should be matched whole, so it never clicks a control inside a piece", () => {
    // Narrow on purpose: unlike consent, this vocabulary is not standardised, and a prefix match
    // would turn every "Start over" and "Play again" into an entry screen.
    for (const label of [
      "Start over",
      "Play again",
      "Explore more stories",
      "Enter your email",
    ])
      expect(ENTRY_WORDS.test(label), label).toBe(false);
  });
});
