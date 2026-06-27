import { describe, it, expect } from "bun:test";
import {
  computePictogramLayout,
  iconFill,
  type PictogramData,
} from "../src/pictogram-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 30, right: 30, bottom: 40, left: 140 },
};

const data: PictogramData = {
  categoryField: "district",
  valueField: "residents",
  unitPerIcon: 10000,
  rows: [
    { district: "Downtown", residents: 84000 }, // 8.4 icons
    { district: "Riverside", residents: 56000 }, // 5.6
    { district: "Suburbs", residents: 22000 }, // 2.2
  ],
};

describe("computePictogramLayout", () => {
  it("produces one row per category", () => {
    const l = computePictogramLayout(data, dims);
    expect(l.rows).toHaveLength(3);
  });

  it("count = value / unitPerIcon, split into full icons + remainder", () => {
    const l = computePictogramLayout(data, dims);
    const dt = l.rows.find((r) => r.category === "Downtown")!;
    expect(dt.count).toBeCloseTo(8.4, 6);
    expect(dt.fullIcons).toBe(8);
    expect(dt.frac).toBeCloseTo(0.4, 6);
  });

  it("columns = the longest row's icon count, rounded up", () => {
    const l = computePictogramLayout(data, dims);
    expect(l.maxCols).toBe(9); // ceil(8.4)
  });

  it("every icon is the same size (count, not size, encodes value)", () => {
    const l = computePictogramLayout(data, dims);
    expect(l.iconSize).toBeGreaterThan(0);
    // iconSize is a single shared scalar — there is no per-row size
    expect(typeof l.iconSize).toBe("number");
  });

  it("the longest row fits within the plot width", () => {
    const l = computePictogramLayout(data, dims);
    expect(l.maxCols * l.cellW).toBeLessThanOrEqual(l.innerWidth + 1e-6);
  });

  it("a whole-number value has no partial icon", () => {
    const l = computePictogramLayout(
      { ...data, rows: [{ district: "Exact", residents: 30000 }] },
      dims,
    );
    expect(l.rows[0].fullIcons).toBe(3);
    expect(l.rows[0].frac).toBe(0);
  });

  it("throws on a negative value", () => {
    expect(() =>
      computePictogramLayout(
        { ...data, rows: [{ district: "X", residents: -1 }] },
        dims,
      ),
    ).toThrow(/negative/);
  });

  it("throws on a non-positive unitPerIcon", () => {
    expect(() =>
      computePictogramLayout({ ...data, unitPerIcon: 0 }, dims),
    ).toThrow(/unitPerIcon/);
  });
});

describe("iconFill — fills columns left→right, partial last icon", () => {
  it("is 0 everywhere at reveal 0 (blank start)", () => {
    expect(iconFill(0, 8.4, 0, 9)).toBe(0);
    expect(iconFill(5, 8.4, 0, 9)).toBe(0);
  });

  it("a full icon within the count fills to 1 at reveal 1", () => {
    expect(iconFill(0, 8.4, 1, 9)).toBe(1);
    expect(iconFill(7, 8.4, 1, 9)).toBe(1);
  });

  it("the last icon fills only to the remainder at reveal 1", () => {
    expect(iconFill(8, 8.4, 1, 9)).toBeCloseTo(0.4, 6);
  });

  it("a column beyond the row's count stays empty", () => {
    expect(iconFill(8, 5.6, 1, 9)).toBe(0); // row has only 5.6 icons
  });
});
