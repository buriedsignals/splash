import { describe, it, expect } from "bun:test";
import { computeComboLayout, type ComboData } from "../src/combo-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 30, right: 60, bottom: 50, left: 60 },
};

const data: ComboData = {
  categoryField: "month",
  columnField: "units",
  lineField: "margin",
  rows: [
    { month: "Jan", units: 200, margin: 24 },
    { month: "Feb", units: 320, margin: 21 },
    { month: "Mar", units: 480, margin: 18 }, // units up, margin down
    { month: "Apr", units: 560, margin: 15 },
  ],
};

describe("computeComboLayout", () => {
  it("produces one column and one line point per row", () => {
    const l = computeComboLayout(data, dims);
    expect(l.columns).toHaveLength(4);
    expect(l.linePoints).toHaveLength(4);
  });

  it("the LEFT (column) axis includes 0 (length encoding)", () => {
    const l = computeComboLayout(data, dims);
    expect(l.leftDomain[0]).toBe(0);
  });

  it("the RIGHT (line) axis is NOT forced to 0 (independent rate)", () => {
    const l = computeComboLayout(data, dims);
    expect(l.rightDomain[0]).toBeGreaterThan(0); // margins 15..24, padded but > 0
  });

  it("a taller column has a smaller y (grows up from the baseline)", () => {
    const l = computeComboLayout(data, dims);
    const tall = l.columns.find((c) => c.value === 560)!;
    const short = l.columns.find((c) => c.value === 200)!;
    expect(tall.y).toBeLessThan(short.y);
    expect(tall.h).toBeGreaterThan(short.h);
  });

  it("line points sit at the band centres of their columns", () => {
    const l = computeComboLayout(data, dims);
    for (let i = 0; i < l.columns.length; i++) {
      const c = l.columns[i];
      expect(l.linePoints[i].cx).toBeCloseTo(c.x + c.w / 2, 0);
    }
  });

  it("a higher rate sits higher on the right axis (smaller y)", () => {
    const l = computeComboLayout(data, dims);
    const hi = l.linePoints.find((p) => p.value === 24)!;
    const lo = l.linePoints.find((p) => p.value === 15)!;
    expect(hi.cy).toBeLessThan(lo.cy);
  });

  it("throws on a negative column value", () => {
    const bad: ComboData = {
      categoryField: "month",
      columnField: "units",
      lineField: "margin",
      rows: [{ month: "X", units: -5, margin: 10 }],
    };
    expect(() => computeComboLayout(bad, dims)).toThrow(/negative/);
  });

  it("throws on a non-numeric line value", () => {
    const bad: ComboData = {
      categoryField: "month",
      columnField: "units",
      lineField: "margin",
      rows: [{ month: "X", units: 5, margin: "n/a" }],
    };
    expect(() => computeComboLayout(bad, dims)).toThrow(/invalid line/);
  });
});

// ---------------------------------------------------------------------------
// ★ THE BANDS — why a combo's two scales are not free to overlap.
//
// Two independent scales on one frame let the author place the line ANYWHERE relative to the
// columns. A reader who sees the orange line rise above the blue columns in July reads an
// event ("the rate overtook the volume") that exists only in the choice of right-hand domain:
// nudge that domain and the crossing moves to March, or disappears. With two DIFFERENT units
// — and a combo whose units are the same is refused outright by checkComboConformance — the
// crossing can never be a fact about the data.
//
// So the layout removes the artifact rather than annotating it: the column axis is given the
// BOTTOM band of the frame, the line axis the TOP band, with a gutter between. Co-movement
// (both rising, one rising while the other falls) reads exactly as before; the crossing cannot
// happen. checkComboConformance asserts the invariant on the layout the component renders, so
// a regression in these constants fails a produce rather than shipping a manufactured event.
// ---------------------------------------------------------------------------
describe("the two scales occupy separate bands (no manufactured crossing)", () => {
  const H = dims.height - dims.padding.top - dims.padding.bottom;

  it("no line point ever sits at or below the top of the tallest column", () => {
    const l = computeComboLayout(data, dims);
    const lowestLinePoint = Math.max(...l.linePoints.map((p) => p.cy));
    const highestColumnTop = Math.min(...l.columns.map((c) => c.y));
    expect(lowestLinePoint).toBeLessThan(highestColumnTop);
  });

  it("reports the invariant it just satisfied, for the produce-time guard to read", () => {
    expect(computeComboLayout(data, dims).lineClearsColumns).toBe(true);
  });

  // The adversarial case: a column series that MAXES OUT its own axis (so the tallest column
  // reaches the very top of the column band) and a line series at its own minimum (so the line
  // sits at the very bottom of the line band). If the bands were merely "usually" apart, this
  // is the shape that would put them in contact.
  it("holds when the columns max their axis and the line bottoms out on its own", () => {
    const extreme: ComboData = {
      categoryField: "m",
      columnField: "v",
      lineField: "r",
      rows: [
        { m: "a", v: 1000, r: 5 }, // 1000 → niceMax 1000 exactly: the column fills its band
        { m: "b", v: 10, r: 90 },
      ],
    };
    const l = computeComboLayout(extreme, dims);
    expect(l.leftDomain[1]).toBe(1000);
    expect(Math.max(...l.linePoints.map((p) => p.cy))).toBeLessThan(
      Math.min(...l.columns.map((c) => c.y)),
    );
    expect(l.lineClearsColumns).toBe(true);
  });

  it("the column axis keeps the bottom of the frame (a zero column still sits on the baseline)", () => {
    const withZero: ComboData = {
      categoryField: "m",
      columnField: "v",
      lineField: "r",
      rows: [
        { m: "a", v: 0, r: 5 },
        { m: "b", v: 100, r: 9 },
      ],
    };
    const l = computeComboLayout(withZero, dims);
    const zero = l.columns.find((c) => c.value === 0)!;
    expect(zero.y).toBeCloseTo(H, 6);
    expect(zero.h).toBeCloseTo(0, 6);
  });

  it("the column band is a real fraction of the frame, not the whole of it", () => {
    // If the column scale were still given the full inner height, the tallest column would
    // reach y≈0 and there would be no line band left — the state this whole layout replaces.
    const l = computeComboLayout(data, dims);
    const tallest = Math.min(...l.columns.map((c) => c.y));
    expect(tallest).toBeGreaterThan(H * 0.3);
  });
});

// ---------------------------------------------------------------------------
// ★ WHAT THE GUARD NEEDS FROM THE GEOMETRY — measured here, judged in conformance.
// ---------------------------------------------------------------------------
describe("the layout reports what the dual-axis guard has to judge", () => {
  it("says whether the right axis hides its own zero", () => {
    expect(computeComboLayout(data, dims).rightAxisIncludesZero).toBe(false);
    const spanningZero: ComboData = {
      categoryField: "m",
      columnField: "v",
      lineField: "r",
      rows: [
        { m: "a", v: 10, r: -2 },
        { m: "b", v: 20, r: 6 },
      ],
    };
    expect(computeComboLayout(spanningZero, dims).rightAxisIncludesZero).toBe(
      true,
    );
  });

  // MUTATION-FOUND. The first version of the test above was satisfied by `rightDomain[0] < 0`,
  // which is a different question ("does the axis reach below zero?") and answers this one
  // wrongly for a series that lives ENTIRELY below zero — a deficit, a temperature anomaly, a
  // net outflow. Such an axis does NOT show its zero, and the guard must see that.
  it("an all-negative line axis does NOT include zero (it only reaches below it)", () => {
    const allNegative: ComboData = {
      categoryField: "m",
      columnField: "v",
      lineField: "r",
      rows: [
        { m: "a", v: 10, r: -10 },
        { m: "b", v: 20, r: -2 },
      ],
    };
    const l = computeComboLayout(allNegative, dims);
    expect(l.rightDomain[1]).toBeLessThan(0);
    expect(l.rightAxisIncludesZero).toBe(false);
  });

  it("measures the line's variation RELATIVE to its own level", () => {
    // margins 15..24 → (24-15)/24 = 0.375
    expect(computeComboLayout(data, dims).lineRelativeRange).toBeCloseTo(
      0.375,
      6,
    );
  });

  it("a dead-flat line reports zero relative variation, not NaN", () => {
    const flat: ComboData = {
      categoryField: "m",
      columnField: "v",
      lineField: "r",
      rows: [
        { m: "a", v: 10, r: 100 },
        { m: "b", v: 20, r: 100 },
      ],
    };
    expect(computeComboLayout(flat, dims).lineRelativeRange).toBe(0);
  });

  it("an all-zero line series reports zero rather than dividing by zero", () => {
    const zeros: ComboData = {
      categoryField: "m",
      columnField: "v",
      lineField: "r",
      rows: [
        { m: "a", v: 10, r: 0 },
        { m: "b", v: 20, r: 0 },
      ],
    };
    expect(computeComboLayout(zeros, dims).lineRelativeRange).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ★ THE TICKS FIT THE BAND THEY WERE GIVEN — found on a real render, not in review.
//
// The bands cost each axis part of the frame, and the first produce showed what that does to a
// fixed tick count: the right axis got roughly a third of the height, kept its ~5 ticks, and
// rendered them ~6 px apart. snap-contrast failed the run with a 1:1 contrast ratio — every
// label was sampling the NEIGHBOURING label as its background, which is what overlap looks like
// to a pixel probe. So the count is derived from the height, and the floor of 2 is the one
// checkComboConformance depends on (a zero-suppressed axis showing one tick tells a reader
// nothing about where the scale starts).
// ---------------------------------------------------------------------------
import { fitTicks } from "../src/combo-geometry";

describe("tick density follows the band height", () => {
  // `yOf` maps a tick to the pixel row it will be drawn on — the ONLY thing that decides
  // whether two labels collide. Here it is `v * gap` so each fixture states its own spacing.
  const at = (gap: number) => (v: number) => v * gap;

  it("keeps every tick when they already fit", () => {
    expect(fitTicks([0, 1, 2, 3, 4], at(40))).toEqual([0, 1, 2, 3, 4]);
  });

  it("halves until they fit, so the survivors stay EVENLY spaced", () => {
    // 9 ticks 15 px apart → halve to 5 at 30 px, which clears the 28 px floor. Halving is
    // what keeps the gaps equal; picking 5 of 9 by rounded index would not.
    expect(fitTicks([0, 1, 2, 3, 4, 5, 6, 7, 8], at(15))).toEqual([
      0, 2, 4, 6, 8,
    ]);
  });

  it("halves AGAIN when one pass is not enough, down to the floor of two", () => {
    // 9 at 5 px → 5 at 10 → 3 at 20 → still under 28, so 2 at 40. The floor stops it there.
    expect(fitTicks([0, 1, 2, 3, 4, 5, 6, 7, 8], at(5))).toEqual([0, 8]);
  });

  it("never drops below two — the count the conformance rule requires", () => {
    expect(fitTicks([0, 1, 2, 3, 4], at(0.1))).toEqual([0, 4]);
    expect(fitTicks([0, 1], at(0.1))).toEqual([0, 1]);
  });

  it("no two tick labels on either axis are closer than the spacing floor", () => {
    for (const height of [320, 400, 480, 675, 900]) {
      const l = computeComboLayout(data, {
        ...dims,
        height,
      });
      for (const ticks of [l.leftTicks, l.rightTicks]) {
        // Two ticks is the floor the conformance rule needs, so it is allowed to be tight;
        // anything MORE than two has to earn its place by fitting.
        if (ticks.length <= 2) continue;
        const ys = ticks.map((t) => t.y).sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i++)
          expect({ height, gap: ys[i] - ys[i - 1] >= 27.9 }).toEqual({
            height,
            gap: true,
          });
      }
    }
  });

  it("the right axis still shows at least 2 ticks when it hides its zero", () => {
    // The rule and the layout have to meet: conformance refuses <2 labelled ticks on a
    // zero-suppressed axis, so the geometry must never produce one.
    for (const height of [300, 480, 675, 1000]) {
      const l = computeComboLayout(data, { ...dims, height });
      expect(l.rightAxisIncludesZero).toBe(false);
      expect(l.rightTicks.length).toBeGreaterThanOrEqual(2);
    }
  });
});
