/**
 * "TROP CONDENSÉ, PAS EXPLIQUÉ, SANS PRÉCISION" — the owner's three words for a plate that every
 * guard in this tree reported as fine.
 *
 * A still has no clock and no reader to ask, so everything it owes is on it at once — and the thing
 * that makes it the hardest of the four exports is that it must choose ONE scale. On a concentrated
 * ranking that choice turns most of the data into a hairline: the beat this was written from drew
 * twenty-seven bars of which seventeen were under four pixels, printed two country names, and left
 * the rest to a phrase.
 *
 * WHAT IS REFUSED IS NOT THE CONDENSATION. A concentration IS the claim on a beat like that one, and
 * flattening the tail is the honest way to draw it — a log scale would make the tail readable and
 * lie about the shape. What is refused is drawing marks a reader cannot see and saying nothing about
 * them. A plate that brackets them and prints their COUNT has told the reader what it could not
 * draw.
 *
 * TWO THRESHOLDS, BOTH MEASURED, because a share alone cannot tell a tail from a small chart. Over
 * the 68 delivered plates that draw four or more rect marks, the most any hides is 50 % — and that
 * is `static-carbon-footprint-spread` hiding four of eight, which is not a tail anyone expects to
 * read. Nothing else exceeds 37 %. So: more than half the marks, AND at least eight of them.
 * Swept after both: 66 measured, 52 skipped, 0 refused.
 */
import { describe, expect, it } from "bun:test";
import { assertPlateSaysWhatItCannotDraw } from "../scripts/render-still.mjs";

/** The first cut of a real beat, in miniature: a concentrated ranking on one shared scale. */
const CASES = [25505, 1045, 645, 542, 526, 483, 272, 227, 207, 202, 38, 38, 35, 35, 33, 30, 28, 27, 25, 18, 17, 10, 4, 4, 3, 2, 0];
const plate = (words: string) =>
  `<svg width="1080" height="1920"><rect width="1080" height="1920" fill="#16191B"/>` +
  CASES.map((c, i) => `<rect x="80" y="${300 + i * 30}" width="${Math.max(3, Math.round((c / 25505) * 900))}" height="18"/>`).join("") +
  words +
  `</svg>`;

const twoNames = `<text x="80" y="1200" font-size="36">Romania 25,505</text>`;

describe("a plate says what it cannot draw", () => {
  it("refuses a ranking that hides most of its data and never says how much", () => {
    expect(() => assertPlateSaysWhatItCannotDraw(plate(twoNames), { what: "the first cut" })).toThrow(
      /says nowhere how many that is/,
    );
  });

  it("names the count and the share, so an author knows what is missing", () => {
    expect(() => assertPlateSaysWhatItCannotDraw(plate(twoNames), { what: "the first cut" })).toThrow(
      /17 of its 27 marks/,
    );
  });

  it("says the condensation itself is not what is being refused", () => {
    expect(() => assertPlateSaysWhatItCannotDraw(plate(twoNames))).toThrow(/may well BE the claim/);
  });

  it("accepts the same plate once it brackets them and prints the count", () => {
    const accounted = plate(`${twoNames}<text x="80" y="1260" font-size="36">and 17 more, 271 between them</text>`);
    expect(() => assertPlateSaysWhatItCannotDraw(accounted)).not.toThrow();
  });

  it("reads a grouped numeral, because a plate writes counts the way a reader does", () => {
    const grouped = `<svg width="1080" height="1920"><rect width="1080" height="1920"/>` +
      Array.from({ length: 2400 }, (_, i) => `<rect x="80" y="${i}" width="${i < 2000 ? 2 : 400}" height="1"/>`).join("") +
      `<text x="80" y="1800" font-size="36">and 2,000 more</text></svg>`;
    expect(() => assertPlateSaysWhatItCannotDraw(grouped)).not.toThrow();
  });

  it("skips a plate with too few marks to read a shape from, rather than passing it", () => {
    const small = `<svg width="1080" height="1920"><rect width="1080" height="1920"/><rect x="0" y="0" width="3" height="10"/></svg>`;
    expect(assertPlateSaysWhatItCannotDraw(small).measured).toBe(false);
  });

  it("skips a plate whose marks are all one size — it has no varying dimension", () => {
    const even = `<svg width="1080" height="1920"><rect width="1080" height="1920"/>` +
      Array.from({ length: 10 }, (_, i) => `<rect x="0" y="${i * 20}" width="3" height="10"/>`).join("") +
      `</svg>`;
    expect(assertPlateSaysWhatItCannotDraw(even).measured).toBe(false);
  });

  it("accepts half the marks hidden when there are only a few — a small chart is not a tail", () => {
    const eight = `<svg width="1080" height="1920"><rect width="1080" height="1920"/>` +
      [900, 800, 700, 600, 3, 3, 3, 3].map((w, i) => `<rect x="0" y="${i * 40}" width="${w}" height="20"/>`).join("") +
      `</svg>`;
    expect(() => assertPlateSaysWhatItCannotDraw(eight)).not.toThrow();
  });
});
