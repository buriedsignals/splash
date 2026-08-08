import { describe, it, expect } from "bun:test";
import { computeChordLayout, type ChordData } from "../src/chord-geometry";

const dims = {
  width: 400,
  height: 400,
  padding: { top: 20, right: 20, bottom: 20, left: 20 },
};

const data: ChordData = {
  labels: ["A", "B", "C"],
  matrix: [
    [0, 10, 5],
    [8, 0, 3],
    [4, 2, 0],
  ],
};

describe("computeChordLayout", () => {
  it("produces one arc per entity", () => {
    const l = computeChordLayout(data, dims);
    expect(l.groups).toHaveLength(3);
  });

  it("sizes each arc by the entity's total outgoing flow (row sum)", () => {
    const l = computeChordLayout(data, dims);
    // A's row sum = 0+10+5 = 15 (d3.chord group value = row sum)
    expect(l.groups.find((g) => g.label === "A")!.value).toBe(15);
    expect(l.groups.find((g) => g.label === "C")!.value).toBe(6);
  });

  it("emits a ribbon per non-zero directed flow", () => {
    const l = computeChordLayout(data, dims);
    // 6 off-diagonal non-zero flows → d3.chord groups them into chord pairs
    expect(l.ribbons.length).toBeGreaterThan(0);
    for (const r of l.ribbons) expect(r.path).toContain("M");
  });

  it("centres the figure in the plot", () => {
    const l = computeChordLayout(data, dims);
    expect(l.cx).toBeCloseTo(dims.width / 2, 5);
    expect(l.cy).toBeCloseTo(dims.height / 2, 5);
  });

  it("throws on a non-square matrix", () => {
    expect(() =>
      computeChordLayout(
        {
          labels: ["A", "B"],
          matrix: [
            [0, 1, 2],
            [1, 0, 3],
          ],
        },
        dims,
      ),
    ).toThrow(/square/);
  });

  it("throws on a negative flow", () => {
    expect(() =>
      computeChordLayout(
        {
          labels: ["A", "B"],
          matrix: [
            [0, -1],
            [1, 0],
          ],
        },
        dims,
      ),
    ).toThrow(/≥ 0/);
  });
});

// ---------------------------------------------------------------------------
// THE RING MUST FILL ITS BAND. The first real render of a chord through the flow chain showed
// the circle floating in about a third of its own plot band, at the 1200×676 article frame:
// the radius was `min(innerWidth, innerHeight) / 2 - 64`, one fixed gutter applied to BOTH
// axes. An arc label sits BESIDE the ring, so horizontally it needs its whole width and
// vertically only a line — taking the larger of the two spends the label's WIDTH out of the
// frame's HEIGHT, and a landscape frame is short.
//
// MUTATION-VERIFIED: restoring the single `labelGutter = 64` on both axes reddened both cases,
// and so did swapping gutterX and gutterY — the two failure modes this rule exists for.
// ---------------------------------------------------------------------------
describe("chord radius — measured per axis, so a landscape frame is not wasted", () => {
  const dims = {
    width: 1200,
    height: 676,
    padding: { top: 250, right: 20, bottom: 60, left: 20 },
  };
  const data = {
    labels: ["A", "B", "C"],
    matrix: [
      [0, 3, 1],
      [2, 0, 1],
      [1, 1, 0],
    ],
  };

  it("lets the HEIGHT bound the ring when the labels are short", () => {
    // inner: 1160 × 366. Vertical budget 12+8+13 = 33 ⇒ 183 - 33 = 150.
    // Horizontal budget 12+8+~10 = 30 ⇒ 580 - 30 = 550, far larger — so height wins.
    const { radius } = computeChordLayout(data, dims, {
      arcWidth: 12,
      labelGutterX: 30,
      labelGutterY: 33,
    });
    expect(radius).toBe(150);
    // …and that is far more than the one-gutter answer the fixed 64 gave (183 - 64 = 119).
    expect(radius).toBeGreaterThan(119);
  });

  it("lets the WIDTH bound it when the labels are long enough to leave the frame", () => {
    const narrow = { ...dims, width: 320 };
    const { radius } = computeChordLayout(data, narrow, {
      arcWidth: 12,
      labelGutterX: 120,
      labelGutterY: 33,
    });
    expect(radius).toBe(160 - 20 - 120); // inner 280 / 2 − 120
  });
});
