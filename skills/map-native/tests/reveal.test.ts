import { describe, it, expect } from "bun:test";
import {
  easedRevealProgress,
  revealFillOpacity,
  revealCameraPlan,
  MAX_FILL_OPACITY,
  REVEAL_FRAMES,
} from "../src/reveal";

describe("easedRevealProgress", () => {
  it("is 0 at frame 0 and 1 at the last frame", () => {
    expect(easedRevealProgress(0, REVEAL_FRAMES)).toBe(0);
    expect(easedRevealProgress(REVEAL_FRAMES - 1, REVEAL_FRAMES)).toBeCloseTo(
      1,
      5,
    );
  });
  it("is monotonic non-decreasing and never NaN across the clip", () => {
    let prev = -1;
    for (let f = 0; f < REVEAL_FRAMES; f++) {
      const p = easedRevealProgress(f, REVEAL_FRAMES);
      expect(Number.isNaN(p)).toBe(false);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
  it("is a pure function of frame (same frame → same value)", () => {
    expect(easedRevealProgress(120, REVEAL_FRAMES)).toBe(
      easedRevealProgress(120, REVEAL_FRAMES),
    );
  });
});

describe("revealFillOpacity", () => {
  it("ramps 0 → max monotonically", () => {
    expect(revealFillOpacity(0)).toBe(0);
    expect(revealFillOpacity(1)).toBe(MAX_FILL_OPACITY);
    expect(revealFillOpacity(0.5)).toBeCloseTo(MAX_FILL_OPACITY * 0.5, 5);
  });
});

describe("revealCameraPlan", () => {
  it("is a fixed plan with latitudes clamped to ±85", () => {
    const plan = revealCameraPlan([-10, -90, 40, 90]);
    expect(plan.kind).toBe("fixed");
    expect(plan.bounds[1]).toBeGreaterThanOrEqual(-85);
    expect(plan.bounds[3]).toBeLessThanOrEqual(85);
    expect(plan.bounds[0]).toBe(-10);
    expect(plan.bounds[2]).toBe(40);
  });
});
