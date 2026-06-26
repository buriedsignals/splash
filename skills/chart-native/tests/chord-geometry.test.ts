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
