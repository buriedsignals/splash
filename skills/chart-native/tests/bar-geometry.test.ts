import { describe, it, expect } from "bun:test";
import {
  computeBarLayout,
  growBar,
  type BarData,
  type BarDims,
} from "../src/bar-geometry";
import sample from "../assets/sample-data/bars.json";

const data: BarData = {
  catField: sample.catField,
  valField: sample.valField,
  rows: sample.rows,
};
const dims: BarDims = {
  width: 840,
  height: 480,
  padding: { top: 64, right: 24, bottom: 52, left: 120 },
};

describe("computeBarLayout — baseline & projection", () => {
  it("the value domain always includes 0 (bars encode length)", () => {
    const layout = computeBarLayout(data, dims, { orientation: "horizontal" });
    expect(layout.valueDomain[0]).toBeLessThanOrEqual(0);
    expect(layout.valueDomain[1]).toBeGreaterThan(0);
  });

  it("emits one bar and one category tick per row", () => {
    const layout = computeBarLayout(data, dims, { orientation: "horizontal" });
    expect(layout.bars).toHaveLength(sample.rows.length);
    expect(layout.catTicks).toHaveLength(sample.rows.length);
  });

  it("sort:desc orders bars by value descending", () => {
    const layout = computeBarLayout(data, dims, {
      orientation: "horizontal",
      sort: "desc",
    });
    const vals = layout.bars.map((b) => b.rawVal);
    expect(vals).toEqual([...vals].sort((a, b) => b - a));
  });

  it("a bigger value gives a longer bar (horizontal width)", () => {
    const layout = computeBarLayout(data, dims, {
      orientation: "horizontal",
      sort: "desc",
    });
    expect(layout.bars[0].w).toBeGreaterThan(layout.bars[1].w);
  });

  it("every bar's baseline edge sits on value 0 (horizontal: x === base)", () => {
    const layout = computeBarLayout(data, dims, { orientation: "horizontal" });
    for (const b of layout.bars) expect(b.x).toBeCloseTo(b.base, 5);
  });

  it("vertical bars sit on the baseline (y + h === base)", () => {
    const layout = computeBarLayout(data, dims, { orientation: "vertical" });
    for (const b of layout.bars) expect(b.y + b.h).toBeCloseTo(b.base, 5);
  });

  it("throws on empty rows", () => {
    expect(() =>
      computeBarLayout({ ...data, rows: [] }, dims, {
        orientation: "vertical",
      }),
    ).toThrow();
  });
});

describe("growBar — growth from the baseline (pure)", () => {
  const layout = computeBarLayout(data, dims, { orientation: "horizontal" });
  const bar = layout.bars[0];

  it("progress 0 = zero length, progress 1 = full bar", () => {
    expect(growBar(bar, 0, "horizontal").w).toBeCloseTo(0, 5);
    expect(growBar(bar, 1, "horizontal").w).toBeCloseTo(bar.w, 5);
  });

  it("grows from the baseline edge (x stays anchored at base for horizontal)", () => {
    const half = growBar(bar, 0.5, "horizontal");
    expect(half.w).toBeCloseTo(bar.w / 2, 5);
    expect(half.x).toBeCloseTo(bar.base, 5); // baseline edge fixed
  });

  it("vertical growth keeps the baseline edge fixed (y+h === base)", () => {
    const v = computeBarLayout(data, dims, { orientation: "vertical" });
    const vb = v.bars[0];
    const half = growBar(vb, 0.5, "vertical");
    expect(half.h).toBeCloseTo(vb.h / 2, 5);
    expect(half.y + half.h).toBeCloseTo(vb.base, 5);
  });

  it("clamps out-of-range progress", () => {
    expect(growBar(bar, -1, "horizontal").w).toBeCloseTo(0, 5);
    expect(growBar(bar, 2, "horizontal").w).toBeCloseTo(bar.w, 5);
  });
});
