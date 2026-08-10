/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The arithmetic behind "an annotation is coloured against what it is drawn over". Every number in
 * here is a real pair out of this corpus, not a made-up one, so a reader can check the guard against
 * the artifact: `#0B7A75` on `#616161` is the carbon histogram's median rule against the bar it
 * spends 97 % of its length inside; `#000000` on `#0072B2` is the Swiss pyramid's peak callout
 * against the band it names.
 *
 * WHAT IT PROVABLY DOES NOT CATCH. Whether a beat CALLS any of this. A component that computes an
 * ink and then draws the accent anyway passes every assertion on this page —
 * `annotation-reads-over-what-it-crosses.test.ts` walks the delivered SVGs for that, and it is the
 * one that reads the artifact rather than the arithmetic.
 *
 * THE MUTATIONS THAT REDDEN IT, both run 2026-08-10 in a copy of the tree under
 * `/tmp/annotation-ink-mutation/`, never here.
 *
 * M1 — `inkThatReadsOver` returns the better pole instead of throwing when neither clears the floor
 * (the whole `if (best.ratio < floor) { … }` block deleted):
 *
 *   error: expect(received).toThrow(expected)
 *   Expected substring: "no ink reads at 4.5:1"
 *   Received function did not throw
 *   Received value: "#000000"
 *   (fail) inkThatReadsOver — the deriving half > should refuse to pick an ink for a label lying
 *          half on the page and half on a mid-blue bar
 *   14 pass · 1 fail
 *
 * M2 — the floor in `assertAnnotationReadsOverMarks` slackened by a whole ratio point,
 * `if (worst.ratio < floor - 1)`. Worth reading closely: it does NOT redden the histogram's median
 * rule, because 1.20 is under 3 − 1 as well. It reddens the pyramid's callout, the case that sits
 * just under its floor — which is the case a slackened floor is for:
 *
 *   error: expect(received).toThrow(expected)
 *   Expected substring: "4.05:1 against #0072B2"
 *   Received function did not throw
 *   Received value: { ratio: 4.0497960251947696, fill: "#0072B2" }
 *   (fail) assertAnnotationReadsOverMarks — the loud half > should throw on the pyramid's own peak
 *          callout at the text floor and pass it at the non-text one
 *   14 pass · 1 fail
 */
import { describe, it, expect } from "bun:test";
import {
  NON_TEXT_CONTRAST_FLOOR,
  TEXT_CONTRAST_FLOOR,
  LARGE_TEXT_CONTRAST_FLOOR,
  textContrastFloor,
  inkBox,
  overlaps,
  marksUnder,
  worstContrast,
  assertAnnotationReadsOverMarks,
  inkThatReadsOver,
} from "../scripts/annotation-ink.mjs";

describe("the two floors are the two the spec names, not one applied twice", () => {
  it("should hold a non-text mark to 3:1 and body text to 4.5:1", () => {
    expect([NON_TEXT_CONTRAST_FLOOR, TEXT_CONTRAST_FLOOR]).toEqual([3, 4.5]);
  });

  it("should relax a 25px bold title to the large-text floor and hold a 13px bold note to the text floor", () => {
    expect(textContrastFloor({ fontSize: 25, fontWeight: 700 })).toBe(
      LARGE_TEXT_CONTRAST_FLOOR,
    );
    expect(textContrastFloor({ fontSize: 19, fontWeight: 700 })).toBe(
      LARGE_TEXT_CONTRAST_FLOOR,
    );
    // 19px at book weight does NOT earn the exemption — the spec's relaxation is 18.66px BOLD.
    expect(textContrastFloor({ fontSize: 19, fontWeight: 400 })).toBe(
      TEXT_CONTRAST_FLOOR,
    );
    expect(textContrastFloor({ fontSize: 13, fontWeight: 700 })).toBe(
      TEXT_CONTRAST_FLOOR,
    );
  });
});

describe("what an annotation is drawn over", () => {
  it("should read the ink box off the anchor, because that is what decides where x sits", () => {
    const measured = { width: 100, ascent: 9, descent: 3 };
    expect(inkBox({ x: 200, y: 50, anchor: "start", ...measured })).toEqual({
      x: 200,
      y: 41,
      width: 100,
      height: 12,
    });
    expect(inkBox({ x: 200, y: 50, anchor: "middle", ...measured }).x).toBe(
      150,
    );
    expect(inkBox({ x: 200, y: 50, anchor: "end", ...measured }).x).toBe(100);
  });

  it("should refuse a box built from an unmeasured width", () => {
    expect(() =>
      inkBox({
        x: 0,
        y: 0,
        width: undefined as unknown as number,
        ascent: 9,
        descent: 3,
      }),
    ).toThrow("measure the string");
  });

  it("should not count two rectangles that only touch at an edge", () => {
    // The waterfall's connector, exactly: it runs from one bar's right edge to the next bar's left
    // edge. Counting a zero-width meeting as a crossing is four false failures in one beat.
    const bar = { x: 100, y: 0, width: 40, height: 100 };
    const connector = { x: 140, y: 50, width: 26, height: 1 };
    expect(overlaps(bar, connector)).toBe(false);
    expect(overlaps(bar, { ...connector, x: 139 })).toBe(true);
  });

  it("should return only the marks a rule really passes through", () => {
    const bars = [
      { x: 127, y: 150, width: 71, height: 305, fill: "#616161" },
      { x: 200, y: 330, width: 71, height: 125, fill: "#616161" },
    ];
    const medianRule = { x: 183, y: 147, width: 2, height: 308 };
    expect(marksUnder(medianRule, bars)).toEqual([bars[0]]);
  });

  it("should report the least forgiving background, not the first one", () => {
    expect(worstContrast("#0B7A75", ["#FFFFFF", "#616161"])).toEqual({
      ratio: expect.closeTo(1.2, 2),
      fill: "#616161",
    });
  });
});

describe("assertAnnotationReadsOverMarks — the loud half", () => {
  it("should throw on the histogram's own median rule, naming the bar and the measured ratio", () => {
    expect(() =>
      assertAnnotationReadsOverMarks(
        { what: "the median rule", colour: "#0B7A75" },
        ["#FFFFFF", "#616161"],
        NON_TEXT_CONTRAST_FLOOR,
      ),
    ).toThrow("1.20:1 against #616161");
  });

  it("should throw on the pyramid's own peak callout at the text floor and pass it at the non-text one", () => {
    // 4.05:1 — under SC 1.4.3 for a 12px note, over SC 1.4.11 for a mark. The same pair, two
    // verdicts: this is why the floors may not be collapsed into one.
    expect(() =>
      assertAnnotationReadsOverMarks(
        { what: "the peak callout", colour: "#000000" },
        ["#0072B2"],
        TEXT_CONTRAST_FLOOR,
      ),
    ).toThrow("4.05:1 against #0072B2");
    expect(
      assertAnnotationReadsOverMarks(
        { what: "the peak callout", colour: "#000000" },
        ["#0072B2"],
        NON_TEXT_CONTRAST_FLOOR,
      ).ratio,
    ).toBeCloseTo(4.05, 2);
  });

  it("should refuse to pass vacuously when nobody said what it is drawn over", () => {
    expect(() =>
      assertAnnotationReadsOverMarks(
        { what: "a rule", colour: "#000000" },
        [],
        NON_TEXT_CONTRAST_FLOOR,
      ),
    ).toThrow("no backgrounds");
  });

  it("should refuse a floor nobody chose", () => {
    expect(() =>
      assertAnnotationReadsOverMarks(
        { what: "a rule", colour: "#000000" },
        ["#FFFFFF"],
        undefined as unknown as number,
      ),
    ).toThrow("needs an explicit floor");
  });
});

describe("inkThatReadsOver — the deriving half", () => {
  it("should pick black for a rule that crosses a white page and a mid-grey bar", () => {
    // White reaches 1.00:1 on the page it is drawn on; black reaches 3.39:1 on the bar. The
    // honest outcome is a near-black rule, not the teal one the histogram used to draw.
    expect(
      inkThatReadsOver(["#FFFFFF", "#616161"], NON_TEXT_CONTRAST_FLOOR),
    ).toBe("#000000");
  });

  it("should pick white for a label that sits entirely on the pyramid's blue band", () => {
    expect(inkThatReadsOver(["#0072B2"], TEXT_CONTRAST_FLOOR)).toBe("#FFFFFF");
  });

  it("should refuse to pick an ink for a label lying half on the page and half on a mid-blue bar", () => {
    // Black is 4.05:1 on the bar, white is 1.00:1 on the page. Neither reads. The message has to
    // say so rather than return the better failure, because the fix is positional.
    expect(() =>
      inkThatReadsOver(["#FFFFFF", "#0072B2"], TEXT_CONTRAST_FLOOR),
    ).toThrow("no ink reads at 4.5:1");
  });

  it("should refuse to pass vacuously on an empty background set", () => {
    expect(() => inkThatReadsOver([], NON_TEXT_CONTRAST_FLOOR)).toThrow(
      "no backgrounds",
    );
  });
});
