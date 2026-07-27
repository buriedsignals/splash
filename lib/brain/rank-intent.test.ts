import { describe, test, expect } from "bun:test";
import { suggestIntents } from "./rank-intent";

test("a French takeaway about an evolution suggests change-over-time", () => {
  expect(suggestIntents("Les prix ont évolué depuis 2019")).toContain(
    "change-over-time",
  );
});

test("a takeaway with no cue suggests nothing, never a guess", () => {
  expect(suggestIntents("Les chats aiment le fromage")).toEqual([]);
});

test("a takeaway naming a canton suggests spatial", () => {
  expect(suggestIntents("Un canton se démarque des autres")).toContain(
    "spatial",
  );
});

// WHAT THIS PASS IS WORTH, WRITTEN DOWN. These are measurements taken on real editorial
// phrasings (spec 2026-07-27-intent-declared-design.md §1), and they are recorded as this
// function's known WEAKNESS rather than as its contract: none of them is a behaviour to preserve,
// and a future reader improving the regexes should expect to change these lines.
//
// They are here because they are the whole reason the intent is now DECLARED. While `propose`
// read the ranking's semantic input out of this function alone, an ordinary French claim ordered
// the offer by nothing at all, and a claim about spread ordered it around geography — with the
// run saying neither. That is not a bug to patch in the regexes; the mechanism was wrong.
describe("the measured limits that made the intent a declared part of the angle", () => {
  test("misses ordinary phrasings — in both languages, on different claims", () => {
    // The same claim, one language apart: English hits, French says nothing.
    expect(
      suggestIntents("Geneva pays the highest premium of the Romandy cantons"),
    ).toContain("ranking");
    expect(
      suggestIntents("Genève paie la prime la plus lourde des cantons romands"),
    ).toEqual([]);
    // And the mirror image, so this is not a story about one language being better served.
    expect(suggestIntents("Les primes ont augmenté en dix ans")).toContain(
      "change-over-time",
    );
    expect(suggestIntents("Premiums rose 30% over ten years")).toEqual([]);
    // A correlation — the textbook case — is missed in both.
    expect(suggestIntents("Income and life expectancy move together")).toEqual(
      [],
    );
    expect(
      suggestIntents("Le revenu et l'espérance de vie évoluent ensemble"),
    ).toEqual([]);
  });

  test("mis-fires: a claim about spread reads as geography, because one noun won", () => {
    // The subject is the SPREAD between two values. `canton` decides otherwise, and the offer
    // came back as three maps.
    expect(
      suggestIntents(
        "La prime varie de 115 francs entre le canton le plus cher et le moins cher",
      ),
    ).toEqual(["spatial"]);
  });
});
