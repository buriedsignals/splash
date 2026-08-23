/**
 * DEFECT 11 — THE COMPARISON THAT IS A SILENCE, AND THE RULING ABOUT WHERE IT BELONGS.
 *
 * Found on a real story: WHO's rabies register, where 3 021 deaths were written down against an
 * estimated 59 000 and the comparison — India — filed nothing at all. The worked choropleth refused
 * it outright ("the subject and the comparison must both have a joined value"), which leaves a
 * producer two moves and both are worse than the refusal: drop the half of the argument the takeaway
 * is about, or paint a silence as a number.
 *
 * The ruling is in `assets/geo-choropleth.ts`'s own header for `claimEndsThatMisreport`, and it is
 * asymmetric: the comparison may be an absence, the subject may not, and an absent end never takes a
 * position on the value scale. This file drives it, including the case that made it necessary and
 * the case it rules OUT of this format and names a home for.
 *
 * WHAT IT DOES NOT DO: decide whether a sentence "means" absence. A phrase list answering that is
 * the shape that already produced a false confirmation in this tree — the intake lexicon that says
 * "the frozen prose states no incompleteness" about a file whose publisher states one in the
 * plainest English there is. What is decidable is whether a beat wrote two sentences at all, and
 * whether they differ.
 */
import { describe, expect, it } from "bun:test";
import {
  assertClaimReads,
  claimEndsThatMisreport,
  silencesThatReadAlike,
  type ClaimEnd,
} from "../assets/geo-choropleth.ts";

const subject = (over: Partial<ClaimEnd> = {}): ClaimEnd => ({
  role: "subject",
  key: "AFG",
  value: 641,
  says: "Afghanistan — 641 reported, the highest of any country",
  markedOnTheValueScale: true,
  ...over,
});

const comparison = (over: Partial<ClaimEnd> = {}): ClaimEnd => ({
  role: "comparison",
  key: "IND",
  value: null,
  says: "India — filed nothing for this year. Not zero: no return.",
  markedOnTheValueScale: false,
  ...over,
});

describe("a claim whose second end is an absence", () => {
  it("lets the beat that could not be made be made — a value against a silence", () => {
    // The exact pair the real story needed and the format refused.
    expect(claimEndsThatMisreport([subject(), comparison()])).toEqual([]);
  });

  it("still lets an ordinary two-value claim through untouched", () => {
    expect(
      claimEndsThatMisreport([
        subject(),
        comparison({
          key: "ALB",
          value: 0,
          says: "Albania — 0 reported",
          markedOnTheValueScale: true,
        }),
      ]),
    ).toEqual([]);
  });

  it("refuses an absent end marked on the value scale, because a mark there is a reading", () => {
    // A triangle at 0 for a country that filed nothing says it reported zero — the one reading this
    // class of beat exists to refuse, on a story where 94 filed nothing and 44 filed a real zero.
    const issues = claimEndsThatMisreport([
      subject(),
      comparison({ markedOnTheValueScale: true }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("takes no position on the scale");
    expect(issues[0]).toContain("IND");
  });

  it("refuses an absent end that says nothing, because then half the claim is a fill colour", () => {
    const issues = claimEndsThatMisreport([
      subject(),
      comparison({ says: "   " }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("carries the absence in words");
  });

  it("rules a claim whose SUBJECT is a silence out of this format, and names the beat it belongs to", () => {
    // The asymmetry, and it is the ruling rather than a convenience: a claim with neither end on the
    // value scale leaves the scale marking nothing. That beat is a COVERAGE map and it is a
    // different beat, so the refusal names it instead of leaving a producer to invent one.
    const issues = claimEndsThatMisreport([
      subject({ value: null, markedOnTheValueScale: false }),
      comparison(),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("COVERAGE map");
    expect(issues[0]).toContain("did not return");
  });
});

describe("the two silences, and whether the beat tells them apart", () => {
  it("passes a beat that gave each of them its own words", () => {
    // What the real story shipped: the first tick says the zero is a reading, the swatch says the
    // blank is not one and how many regions it covers.
    expect(
      silencesThatReadAlike({
        noReturn: "No return filed — 94 countries. Not a zero.",
        reportedZero: "0 — filed, reported none",
      }),
    ).toEqual([]);
  });

  it("refuses one word for two opposite facts", () => {
    const issues = silencesThatReadAlike({
      noReturn: "No data",
      reportedZero: "no data",
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("one word for two opposite facts");
    // And it says WHY the words have to carry it — colour measurably cannot.
    expect(issues[0]).toContain("1.27:1 to 1.32:1");
  });

  it("refuses a surface with no words at all, on either side", () => {
    expect(
      silencesThatReadAlike({ noReturn: "", reportedZero: "0" })[0],
    ).toContain("no-data surface carries no words");
    expect(
      silencesThatReadAlike({
        noReturn: "No return filed",
        reportedZero: "",
      })[0],
    ).toContain("class holding a real zero carries no words");
  });
});

describe("the refusal a render throws", () => {
  it("says nothing when the claim reads as drawn", () => {
    expect(() =>
      assertClaimReads([subject(), comparison()], {
        noReturn: "No return filed — 94 countries. Not a zero.",
        reportedZero: "0 — filed, reported none",
      }),
    ).not.toThrow();
  });

  it("carries every issue in one message, not the first one it found", () => {
    // A refusal that names one defect at a time turns one render into four.
    expect(() =>
      assertClaimReads(
        [subject({ value: null }), comparison({ markedOnTheValueScale: true })],
        {
          noReturn: "No data",
          reportedZero: "No data",
        },
      ),
    ).toThrow(/COVERAGE map[\s\S]*takes no position[\s\S]*two opposite facts/);
  });
});
