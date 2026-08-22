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
  segmentsByBackground,
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

// THE CASE `inkThatReadsOver` IS RIGHT TO REFUSE, AND HAD NO ANSWER FOR.
//
// Round six, `stress-aa-salary-spread`. This newsroom's ground is dark (`#16191B`) and its accent
// is a light gold (`#D4A853`, 8.01:1 against it). Both are legitimate; a full-height rule crosses
// both, and no single ink reads over the pair:
//
//     inkThatReadsOver(["#16191B", "#D4A853"], 3)
//     -> no ink reads at 3:1 over all of #16191B, #D4A853 — #000000 reaches only 1.19:1 against
//        #16191B; #FFFFFF reaches only 2.20:1 against #D4A853. … move it onto one of them.
//
// Correct, and it is the ORDINARY case for any newsroom whose ground is dark and whose accent is
// legible on it — a median rule on a histogram, a reference line on a bar chart. That beat wrote
// the answer by hand: the rule drawn as two segments, each inked against the one background it
// actually has. The refusal's own instruction, applied twice. Nothing here offered it, so the
// carbon histogram had solved the same problem by dropping its accent entirely, which is a
// different beat rather than a reusable answer.
describe("segmentsByBackground — the answer the refusal asks for", () => {
  const GROUND = "#16191B";
  const ACCENT = "#D4A853";
  // A vertical rule falling through the plot, crossing one accent bar that starts halfway down.
  const RULE = { x: 200, y: 40, width: 2, height: 200 };
  const BAR = { x: 180, y: 140, width: 60, height: 100, fill: ACCENT };

  it("should split the rule where the background changes and ink each part against its own", () => {
    const parts = segmentsByBackground(RULE, [BAR], {
      ground: GROUND,
      floor: NON_TEXT_CONTRAST_FLOOR,
    });
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ y: 40, height: 100, fill: GROUND, ink: "#FFFFFF" });
    expect(parts[1]).toMatchObject({ y: 140, height: 100, fill: ACCENT, ink: "#000000" });
  });

  it("should cover the rule exactly — no gap, no overlap, nothing drawn twice", () => {
    const parts = segmentsByBackground(RULE, [BAR], {
      ground: GROUND,
      floor: NON_TEXT_CONTRAST_FLOOR,
    });
    expect(parts[0].y).toBe(RULE.y);
    expect(parts[parts.length - 1].y + parts[parts.length - 1].height).toBe(RULE.y + RULE.height);
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i].y).toBe(parts[i - 1].y + parts[i - 1].height);
    }
    for (const part of parts) {
      expect(part.x).toBe(RULE.x);
      expect(part.width).toBe(RULE.width);
    }
  });

  it("should give ONE segment when the rule never leaves the ground", () => {
    const parts = segmentsByBackground(RULE, [], { ground: GROUND, floor: NON_TEXT_CONTRAST_FLOOR });
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ ...RULE, fill: GROUND, ink: "#FFFFFF" });
  });

  it("should split a HORIZONTAL rule along x, because a rule's runs lie on its own long axis", () => {
    const across = { x: 100, y: 300, width: 200, height: 2 };
    const block = { x: 200, y: 280, width: 100, height: 60, fill: ACCENT };
    const parts = segmentsByBackground(across, [block], {
      ground: GROUND,
      floor: NON_TEXT_CONTRAST_FLOOR,
    });
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ x: 100, width: 100, fill: GROUND });
    expect(parts[1]).toMatchObject({ x: 200, width: 100, fill: ACCENT });
    for (const part of parts) expect(part.y).toBe(across.y);
  });

  it("should merge runs the eye would see as one, rather than emit a seam per bar", () => {
    // Two touching bars of the same fill — a histogram's bins touch by definition. One segment.
    const binA = { x: 180, y: 125, width: 30, height: 100, fill: ACCENT };
    const binB = { x: 210, y: 120, width: 30, height: 120, fill: ACCENT };
    const parts = segmentsByBackground({ x: 100, y: 130, width: 200, height: 2 }, [binA, binB], {
      ground: GROUND,
      floor: NON_TEXT_CONTRAST_FLOOR,
    });
    expect(parts.map((p) => p.fill)).toEqual([GROUND, ACCENT, GROUND]);
  });

  it("should give the TOPMOST mark to a run two marks both cover — painter's order, not array luck", () => {
    const under = { x: 180, y: 140, width: 60, height: 100, fill: ACCENT };
    const over = { x: 180, y: 140, width: 60, height: 100, fill: "#5B8A8A" };
    const parts = segmentsByBackground(RULE, [under, over], {
      ground: GROUND,
      floor: NON_TEXT_CONTRAST_FLOOR,
    });
    expect(parts[1].fill).toBe("#5B8A8A");
  });

  it("should refuse a box with no long axis, because a square is not a rule", () => {
    expect(() =>
      segmentsByBackground({ x: 0, y: 0, width: 20, height: 20 }, [], {
        ground: GROUND,
        floor: NON_TEXT_CONTRAST_FLOOR,
      }),
    ).toThrow(/long axis/);
  });

  // SPLITTING IS NOT A WAY PAST THE FLOOR, and the floor is the CALLER's. Measured across all 256
  // greys: at 4.5:1 every one of them still has a passing pole (`#757575` is the hardest, at
  // 4.61:1 to white), which is the same sweep `adjustToContrast` records — so the property is shown
  // at the first floor where a background genuinely has no ink at all, rather than at a number
  // chosen to make the test easy.
  it("should still refuse when ONE background has no ink of its own — splitting is not a way past the floor", () => {
    const midGrey = { x: 180, y: 140, width: 60, height: 100, fill: "#757575" };
    expect(() =>
      segmentsByBackground(RULE, [midGrey], { ground: GROUND, floor: 5 }),
    ).toThrow(/no ink reads at 5:1/);
  });
});
