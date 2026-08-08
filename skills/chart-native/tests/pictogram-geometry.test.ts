import { describe, it, expect } from "bun:test";
import {
  computePictogramLayout,
  iconFill,
  chooseUnitPerIcon,
  MAX_ICONS_PER_ROW,
  TARGET_MAX_ICONS,
  MIN_VISIBLE_ICON_FRACTION,
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

// ── chooseUnitPerIcon ────────────────────────────────────────────────────────
// The countability half of the type. A pictogram's whole claim is that the reader
// VERIFIES by counting; that claim dies twice over if nobody picks the unit:
//   · too small a unit → the longest row is a hedge of 380 tiny figures nobody counts
//     (the state docs/splash/defect-2026-08-07-…md named as the reason not to ship it);
//   · too large a unit → every row is one icon and the chart says less than a sentence.
// So the unit is DERIVED, on a 1-2-5 ladder, and the two ceilings are named constants
// rather than magic numbers buried in the mapper.
describe("chooseUnitPerIcon — the unit that keeps the count countable", () => {
  it("keeps the longest row inside the target band", () => {
    for (const max of [3, 9, 42, 84_000, 380_000, 7.5, 0.42]) {
      const u = chooseUnitPerIcon([max, max / 3]);
      expect(Math.ceil(max / u - 1e-9)).toBeLessThanOrEqual(TARGET_MAX_ICONS);
    }
  });

  it("never hands back a unit so coarse the longest row is a single icon", () => {
    for (const max of [3, 9, 42, 84_000, 380_000, 7.5, 0.42]) {
      const u = chooseUnitPerIcon([max, max / 3]);
      expect(max / u).toBeGreaterThan(1);
    }
  });

  it("picks a 1-2-5 ladder value, so the key reads as a round number", () => {
    for (const max of [3, 9, 42, 84_000, 380_000, 7.5, 0.42]) {
      const u = chooseUnitPerIcon([max]);
      // normalise to [1,10): the mantissa must be 1, 2 or 5
      const norm = u / Math.pow(10, Math.floor(Math.log10(u)));
      expect([1, 2, 5].some((m) => Math.abs(norm - m) < 1e-9)).toBe(true);
    }
  });

  it("the shipped sample's own values yield the unit the sample states (10 000)", () => {
    expect(chooseUnitPerIcon([84_000, 56_000, 38_000, 22_000, 9_000])).toBe(
      10_000,
    );
  });

  it("380 units of a 1-unit-per-icon reading collapses to a countable row", () => {
    // the defect's number, exactly: 380 icons on one row rendered ~2 px each.
    const u = chooseUnitPerIcon([380]);
    expect(380 / u).toBeLessThanOrEqual(MAX_ICONS_PER_ROW);
  });

  it("throws when nothing positive is there to count", () => {
    expect(() => chooseUnitPerIcon([0, 0])).toThrow(/positive/);
    expect(() => chooseUnitPerIcon([])).toThrow(/positive/);
  });

  it("the guard ceiling is looser than the chooser's target (an explicit unit has room)", () => {
    // a journalist who states their own unit ("one figure = 1,000 households") is not
    // forced onto the ladder — the produce-time guard only refuses the UNCOUNTABLE.
    expect(MAX_ICONS_PER_ROW).toBeGreaterThan(TARGET_MAX_ICONS);
  });
});

describe("the sliver threshold is the geometry's, not a literal", () => {
  it("a remainder under MIN_VISIBLE_ICON_FRACTION is dropped rather than drawn as a hairline", () => {
    const l = computePictogramLayout(
      {
        ...data,
        unitPerIcon: 10000,
        rows: [{ district: "Sliver", residents: 30_100 }], // 3.01 icons
      },
      dims,
    );
    expect(0.01).toBeLessThan(MIN_VISIBLE_ICON_FRACTION);
    expect(l.rows[0].frac).toBe(0);
    expect(l.rows[0].fullIcons).toBe(3);
  });
});
