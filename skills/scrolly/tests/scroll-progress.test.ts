import { describe, it, expect } from "bun:test";
import { scrollToLineProgress } from "../src/ScrollyChart";

// The chart-scrolly scrub: continuous scroll (0→1) → line reveal, hitting each reveal's
// path-length fraction exactly when its card centres. Checkpoints = [0, ...reveals, 1].
describe("scrollToLineProgress (continuous line scrub)", () => {
  const reveals = [0, 0.35, 0.72, 1]; // 4 reveal points (first=0, last=1)
  it("is 0 at scroll 0 (empty) and 1 at scroll 1 (full line)", () => {
    expect(scrollToLineProgress(0, reveals)).toBe(0);
    expect(scrollToLineProgress(1, reveals)).toBe(1);
  });
  it("clamps out-of-range scroll", () => {
    expect(scrollToLineProgress(-0.5, reveals)).toBe(0);
    expect(scrollToLineProgress(2, reveals)).toBe(1);
  });
  it("is monotonically non-decreasing across the scroll", () => {
    let prev = -1;
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const v = scrollToLineProgress(s, reveals);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
  it("lands ON a reveal's fraction when its card centres", () => {
    // checkpoints = [0, 0, 0.35, 0.72, 1, 1] (len 6). card J centres at scroll J/(len-1).
    // The 0.72 reveal is checkpoint index 3 → scroll 3/5 = 0.6.
    expect(scrollToLineProgress(0.6, reveals)).toBeCloseTo(0.72, 6);
  });
  it("interpolates linearly between two checkpoints", () => {
    // halfway between checkpoint 3 (0.72) and 4 (1.0) → scroll (3.5)/5 = 0.7 → 0.86
    expect(scrollToLineProgress(0.7, reveals)).toBeCloseTo(0.86, 6);
  });
});
