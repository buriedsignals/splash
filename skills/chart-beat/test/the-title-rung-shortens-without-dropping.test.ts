/**
 * R6 — THE RUNG THAT SHORTENS A TITLE, AND THE THING THAT STOPS IT SHORTENING THE CLAIM.
 *
 * WHY THE RUNG EXISTS. Four beats refused every row of the export table with one binding
 * constraint, and the resume ledger names it in a line: "the ladder has no rung for a TITLE, and on
 * these beats the title is the claim." At a video legibility floor a claim-length headline takes two
 * to six lines of the largest type on the frame, and the ladder ran R5 (a documented no-op) → R7
 * (remove the standfirst) → R9 (refuse), with nothing in between that could touch the biggest block
 * on the page.
 *
 * WHY IT IS THE ONLY RUNG THAT DOES NOT REMOVE. Every other rung takes something away, because
 * "make it smaller" is the instruction that fails at the moment it is needed. A title is the one
 * piece of furniture that rule cannot be applied to: remove a beat's claim and there is no beat. So
 * R6 removes WORDS and is guarded against removing MEANING — and that guard is what this file is
 * about, because a rung that quietly dropped half a claim would look, on the frame, exactly like a
 * rung that shortened it well.
 *
 * ── WHAT IS ASSERTED ──────────────────────────────────────────────────────────────────────────
 *
 *   1. The four rules each REFUSE on their own, on real sentences from this corpus's own beats:
 *      a quantity dropped, what a quantity counts dropped, a named subject dropped, a qualifier
 *      class dropped or reversed.
 *   2. A good shortening — one a person wrote and read — passes all four.
 *   3. The rung DECLINES rather than fires when it would recover nothing, which is the ladder's own
 *      R5 lesson made mechanical.
 *   4. `linesOf` is required, not defaulted. The rung's whole justification is the line it saves.
 *   5. Its stated limits are stated: the header names them, and one of them (no comparison-word
 *      list) is asserted here as a KNOWN PASS, so nobody later reads the gap as an oversight.
 *
 * ── THE MUTATIONS ─────────────────────────────────────────────────────────────────────────────
 * Run in an rsync of the tree under `/tmp/r6mut/`, never in this working tree. Baseline 17 pass /
 * 0 fail.
 *
 *   `claimSurvives` returns `{ ok: true, lost: [] }` always      RED 11/6 — every refusal at once
 *   the "what a quantity counts" rule deleted                    RED 16/1 — and this is the one
 *        that matters most: "All 11 of these international organisations sit inside 4.4 km of
 *        central Geneva" cut to "All 11 sit inside 4.4 km of central Geneva" keeps every numeral,
 *        every proper noun and every qualifier, and states nothing. No other rule sees it.
 *   the reversal check deleted                                   RED 16/1 — `more` → `less` passes
 *        the class check by carrying a qualifier of its own, so the opposition has to be named
 *   the `after < before` line check removed (always fires)       RED 16/1
 *   `linesOf` defaulted to `text.length / 40` instead of required RED 16/1
 *   the `short.length >= long.length` check removed              RED 16/1
 */
import { describe, it, expect } from "bun:test";
import {
  REMOVAL_LADDER,
  claimSurvives,
  claimTokens,
  shortenTitle,
} from "../scripts/type-at-size.mjs";

/** The locator beat's own headline, and the shortening a person wrote for it. */
const LOCATOR =
  "All 11 of these international organisations sit inside 4.4 km of central Geneva — and a 6 km search finds no more.";
const LOCATOR_SHORT =
  "All 11 international organisations sit within 4.4 km of central Geneva; a 6 km search finds no more.";

/** The diverging bar's, where the claim is an exclusivity over a named field. */
const CROATIA =
  "Croatia is the only EU country emitting more CO₂ per person than in 1990";
const CROATIA_SHORT =
  "Croatia alone in the EU emits more CO₂ per person than in 1990";

/** A line measurer that is a real measurement of SOMETHING — here, words per line at a stated
 *  width — so the tests below never depend on the rung guessing. */
const wordsPerLine = (perLine: number) => (text: string) =>
  Math.ceil(text.split(/\s+/).length / perLine);

describe("R6 is on the ladder, between the no-op and removing the standfirst", () => {
  it("should sit after R5 and before R7, because a title is removed by neither", () => {
    const rungs = REMOVAL_LADDER.map((r) => r.rung);
    expect(rungs).toContain("R6");
    expect(rungs.indexOf("R6")).toBe(rungs.indexOf("R5") + 1);
    expect(rungs.indexOf("R6")).toBe(rungs.indexOf("R7") - 1);
  });

  it("should say it shortens and never drops, because that is the exception it claims", () => {
    const r6 = REMOVAL_LADDER.find((r) => r.rung === "R6")!;
    expect(r6.what).toMatch(/SHORTEN/);
    expect(r6.what).toMatch(/never drop/i);
    // And the ladder's own promise about itself still holds for the other rungs.
    expect(r6.loses).toMatch(/nothing the sentence asserts/i);
  });
});

describe("a shorter form that still makes the claim", () => {
  it("should survive when a person shortened it well", () => {
    expect(claimSurvives(LOCATOR, LOCATOR_SHORT)).toEqual({
      ok: true,
      lost: [],
    });
    expect(claimSurvives(CROATIA, CROATIA_SHORT)).toEqual({
      ok: true,
      lost: [],
    });
  });

  it("should read the claim's parts off the sentence rather than off a template", () => {
    const parts = claimTokens(LOCATOR);
    expect(parts.numerals).toEqual(["11", "4.4", "6"]);
    expect(parts.subjects).toEqual(["Geneva"]);
    expect(parts.qualifiers.sort()).toEqual([
      "increase",
      "negation",
      "universal",
    ]);
    // What the 11 counts — the check no proper-noun scan can make.
    expect(parts.counted.find((c) => c.numeral === "11")?.phrase).toEqual([
      "international",
      "organisations",
    ]);
  });
});

describe("a shorter form that says LESS", () => {
  it("should refuse when a quantity goes", () => {
    const lost = claimSurvives(
      LOCATOR,
      "All these international organisations sit within 4.4 km of central Geneva; a 6 km search finds no more.",
    );
    expect(lost.ok).toBe(false);
    expect(lost.lost.map((l) => [l.rule, l.token])).toContainEqual([
      "quantity",
      "11",
    ]);
  });

  it("should refuse when what a quantity COUNTS goes, which no other rule sees", () => {
    // Every numeral, every proper noun and every qualifier class survives this cut. It states
    // nothing.
    const cut =
      "All 11 sit inside 4.4 km of central Geneva; a 6 km search finds no more.";
    const before = claimTokens(LOCATOR);
    const after = claimTokens(cut);
    expect(after.numerals).toEqual(before.numerals);
    expect(after.subjects).toEqual(before.subjects);
    expect(after.qualifiers.sort()).toEqual(before.qualifiers.sort());
    const lost = claimSurvives(LOCATOR, cut);
    expect(lost.ok).toBe(false);
    expect(lost.lost.map((l) => l.rule)).toContain("what the quantity counts");
    expect(lost.lost.map((l) => l.token).sort()).toEqual([
      "international",
      "organisations",
    ]);
  });

  it("should refuse when a named subject goes", () => {
    const lost = claimSurvives(
      CROATIA,
      "Only Croatia emits more CO₂ per person than in 1990",
    );
    expect(lost.ok).toBe(false);
    expect(lost.lost.map((l) => [l.rule, l.token])).toEqual([
      ["named subject", "EU"],
    ]);
  });

  it("should refuse when a qualifier class goes", () => {
    const lost = claimSurvives(
      CROATIA,
      "Croatia in the EU emits more CO₂ per person than in 1990",
    );
    expect(lost.ok).toBe(false);
    expect(lost.lost.map((l) => [l.rule, l.token])).toEqual([
      ["qualifier", "exclusive"],
    ]);
  });

  it("should refuse a reversal, which carries a qualifier of its own and would otherwise pass", () => {
    const reversed =
      "Croatia alone in the EU emits less CO₂ per person than in 1990";
    // It is not silent about direction — it states the OPPOSITE direction, which is why the class
    // check alone is not enough.
    expect(claimTokens(reversed).qualifiers).toContain("decrease");
    const lost = claimSurvives(CROATIA, reversed);
    expect(lost.ok).toBe(false);
    expect(lost.lost.map((l) => l.rule)).toContain("reversed");
  });
});

describe("the rung fires only when it recovers a line", () => {
  it("should fire, and hand back both forms, when the shorter one wraps shorter", () => {
    const fired = shortenTitle({
      long: LOCATOR,
      short: LOCATOR_SHORT,
      linesOf: wordsPerLine(6),
    });
    expect(fired.fires).toBe(true);
    expect(fired.title).toBe(LOCATOR_SHORT);
    expect(fired.long).toBe(LOCATOR);
    expect(fired.recoveredLines).toBeGreaterThan(0);
  });

  it("should DECLINE when the shorter form wraps to the same number of lines", () => {
    // The ladder's own R5 lesson: a rung that frees no budget costs the reader for nothing.
    const declined = shortenTitle({
      long: LOCATOR,
      short: LOCATOR_SHORT,
      linesOf: () => 3,
    });
    expect(declined.fires).toBe(false);
    expect(declined.title).toBe(LOCATOR);
    expect(declined.reason).toMatch(/recovers nothing/);
  });

  it("should DECLINE, naming what would go, when the shorter form drops the claim", () => {
    const declined = shortenTitle({
      long: CROATIA,
      short: "Only Croatia emits more CO₂ per person than in 1990",
      linesOf: wordsPerLine(6),
    });
    expect(declined.fires).toBe(false);
    expect(declined.title).toBe(CROATIA);
    expect(declined.reason).toMatch(/named subject/);
    expect(declined.reason).toMatch(/EU/);
  });

  it("should refuse to run at all without the beat's own line measurer", () => {
    // Not defaulted. A title rung that guessed line counts from a character count would decide an
    // editorial question on a number it never measured.
    expect(() =>
      // @ts-expect-error — the missing argument is the point
      shortenTitle({ long: LOCATOR, short: LOCATOR_SHORT }),
    ).toThrow(/line measurer/);
  });

  it("should decline a 'shorter' form that is not shorter", () => {
    const declined = shortenTitle({
      long: "Croatia alone in the EU emits more CO₂ per person than in 1990",
      short: CROATIA,
      linesOf: wordsPerLine(6),
    });
    expect(declined.fires).toBe(false);
    expect(declined.reason).toMatch(/rewrite/);
  });
});

describe("the limits this guard states, asserted so they are not read as oversights", () => {
  it("should NOT catch a dropped comparison word, and the header says why", () => {
    // A word list wide enough to accept "360 of 366" for "360 out of 366" has to contain `of`,
    // which every sentence carries — a check that always passes is decoration. Dropping a
    // comparison in practice drops a quantity or a direction, and both of those ARE checked.
    // Recorded as a deliberate green, the same way `size-table-parity.test.ts` records its own.
    expect(
      claimSurvives(
        CROATIA,
        "Croatia alone in the EU emits more CO₂ per person, 1990",
      ).ok,
    ).toBe(true);
  });

  it("should NOT catch a common-noun head that no quantity counts", () => {
    // Rule 2 reaches the subject of "11 international organisations". It cannot reach the subject
    // of a title that counts nothing, and rule 3 only sees proper nouns — so a lowercase head noun
    // mid-sentence can go without a word from this file.
    expect(
      claimSurvives(
        "The decline is steepest among coastal towns",
        "The decline is steepest",
      ).ok,
    ).toBe(true);
  });

  it("should treat a sentence's OPENING capital as a name unless it is a function word, and err toward refusing", () => {
    // The one place the subject rule is deliberately over-strict rather than under-strict: nothing
    // can tell `Croatia is the only…` from `Emissions fell…` without a parser, so a capitalised
    // opening word that is not a published function word is read as a name. The cost is a refusal
    // a person then argues with; the alternative cost is a dropped subject nobody sees.
    expect(claimTokens("Croatia is the only EU country").subjects).toContain(
      "Croatia",
    );
    expect(claimTokens("Emissions fell in every region").subjects).toContain(
      "Emissions",
    );
    expect(claimTokens("All 11 organisations sit inside").subjects).toEqual([]);
  });
});
