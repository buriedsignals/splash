import { describe, it, expect } from "bun:test";
import {
  computePieLayout,
  sweepArc,
  sliceProgress,
  type PieData,
  type PieDims,
} from "../src/pie-geometry";
import sample from "../assets/sample-data/pie.json";

const data: PieData = {
  labelField: sample.labelField,
  valueField: sample.valueField,
  rows: sample.rows,
};
const dims: PieDims = {
  width: 840,
  height: 480,
  padding: { top: 64, right: 40, bottom: 40, left: 40 },
};

describe("computePieLayout — angles & shares", () => {
  const layout = computePieLayout(data, dims, { donut: true });

  it("one slice per row, shares sum to 1", () => {
    expect(layout.slices).toHaveLength(sample.rows.length);
    const sum = layout.slices.reduce((s, x) => s + x.share, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("sorted descending — the largest slice is first", () => {
    expect(layout.slices[0].rawLabel).toBe("City grant");
    const vals = layout.slices.map((s) => s.value);
    expect(vals).toEqual([...vals].sort((a, b) => b - a));
  });

  it("angles are contiguous from 0 to 2π", () => {
    expect(layout.slices[0].startAngle).toBeCloseTo(0, 6);
    for (let i = 1; i < layout.slices.length; i++)
      expect(layout.slices[i].startAngle).toBeCloseTo(
        layout.slices[i - 1].endAngle,
        6,
      );
    expect(layout.slices.at(-1)!.endAngle).toBeCloseTo(Math.PI * 2, 6);
  });

  it("donut has a hole; plain pie does not", () => {
    expect(layout.innerRadius).toBeGreaterThan(0);
    const flat = computePieLayout(data, dims, { donut: false });
    expect(flat.innerRadius).toBe(0);
  });

  it("throws on empty rows and on a zero total", () => {
    expect(() => computePieLayout({ ...data, rows: [] }, dims)).toThrow();
    expect(() =>
      computePieLayout({ ...data, rows: [{ source: "X", amount: 0 }] }, dims),
    ).toThrow();
  });
});

describe("sweepArc / sliceProgress — the angle reveal (pure)", () => {
  const layout = computePieLayout(data, dims, { donut: true });
  const first = layout.slices[0];
  const last = layout.slices.at(-1)!;

  it("progress 0 reveals nothing, progress 1 reveals every wedge", () => {
    for (const s of layout.slices)
      expect(sweepArc(s, 0, layout.radius, layout.innerRadius)).toBe("");
    for (const s of layout.slices)
      expect(
        sweepArc(s, 1, layout.radius, layout.innerRadius).length,
      ).toBeGreaterThan(0);
  });

  it("the sweep reaches the first slice before the last", () => {
    // by 60% the master angle has passed the first slice (58%) but not the last
    expect(sliceProgress(first, 0.6)).toBe(1);
    expect(sliceProgress(last, 0.6)).toBe(0);
  });

  it("sliceProgress is 0 at the slice start and 1 at its end", () => {
    expect(sliceProgress(first, first.startAngle / (Math.PI * 2))).toBeCloseTo(
      0,
      6,
    );
    expect(sliceProgress(first, first.endAngle / (Math.PI * 2))).toBeCloseTo(
      1,
      6,
    );
  });
});
