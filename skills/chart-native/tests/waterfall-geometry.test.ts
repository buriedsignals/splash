import { describe, it, expect } from "bun:test";
import {
  computeWaterfallLayout,
  growWaterfallBar,
  type WaterfallData,
} from "../src/waterfall-geometry";

const dims = {
  width: 700,
  height: 400,
  padding: { top: 20, right: 20, bottom: 40, left: 50 },
};

const data: WaterfallData = {
  rows: [
    { label: "Open", value: 1200, total: true },
    { label: "Grants", value: 600 },
    { label: "Salaries", value: -900 },
    { label: "Close", value: 900, total: true },
  ],
};

describe("computeWaterfallLayout", () => {
  it("produces one bar per step", () => {
    const l = computeWaterfallLayout(data, dims);
    expect(l.bars).toHaveLength(4);
  });

  it("floats deltas on the running total (start = previous end)", () => {
    const l = computeWaterfallLayout(data, dims);
    const grants = l.bars[1];
    const salaries = l.bars[2];
    expect(grants.startVal).toBe(1200); // after the opening total
    expect(grants.endVal).toBe(1800);
    expect(salaries.startVal).toBe(1800);
    expect(salaries.endVal).toBe(900);
  });

  it("draws totals from zero", () => {
    const l = computeWaterfallLayout(data, dims);
    expect(l.bars[0].startVal).toBe(0);
    expect(l.bars[0].endVal).toBe(1200);
    expect(l.bars[3].startVal).toBe(0);
    expect(l.bars[3].endVal).toBe(900);
  });

  it("the closing total equals start + every step (exact bridge)", () => {
    const l = computeWaterfallLayout(data, dims);
    const bridged = 1200 + 600 - 900;
    expect(l.bars[3].endVal).toBe(bridged);
  });

  it("tags sign per step", () => {
    const l = computeWaterfallLayout(data, dims);
    expect(l.bars[1].sign).toBe(1);
    expect(l.bars[2].sign).toBe(-1);
  });

  it("count axis includes 0 (baseline rule)", () => {
    const l = computeWaterfallLayout(data, dims);
    expect(l.countDomain[0]).toBe(0);
  });

  it("throws on a non-numeric value", () => {
    const bad = { rows: [{ label: "X", value: "n/a" as unknown as number }] };
    expect(() => computeWaterfallLayout(bad, dims)).toThrow(
      /invalid waterfall/,
    );
  });
});

describe("growWaterfallBar — grows from the start level", () => {
  it("an increase grows up from its start; full height at progress 1", () => {
    const l = computeWaterfallLayout(data, dims);
    const grants = l.bars[1];
    const g0 = growWaterfallBar(grants, 0);
    const g1 = growWaterfallBar(grants, 1);
    expect(g0.h).toBeCloseTo(0, 5);
    expect(g1.h).toBeCloseTo(Math.abs(grants.startY - grants.endY), 5);
  });

  it("enforces a minimum drawn height for a TINY non-zero step", () => {
    // a +1 step on a ~2000-tall domain is < 1px; minBarPx must floor it.
    const tiny: WaterfallData = {
      rows: [
        { label: "Open", value: 2000, total: true },
        { label: "Tiny", value: 1 },
        { label: "Close", value: 2001, total: true },
      ],
    };
    const l = computeWaterfallLayout(tiny, dims);
    const step = l.bars[1];
    expect(Math.abs(step.endY - step.startY)).toBeLessThan(3); // truly sub-pixel-ish
    expect(growWaterfallBar(step, 1, 3).h).toBeCloseTo(3, 5); // floored to 3px
  });

  it("a TRUE zero step stays zero (no phantom bar)", () => {
    const z: WaterfallData = {
      rows: [
        { label: "Open", value: 1000, total: true },
        { label: "Zero", value: 0 },
      ],
    };
    const l = computeWaterfallLayout(z, dims);
    expect(growWaterfallBar(l.bars[1], 1, 3).h).toBeCloseTo(0, 5);
  });
});
