import { describe, it, expect } from "bun:test";
import {
  stagedEntrance,
  STAGED_BORDER_S,
  STAGED_FILL_S,
  STAGED_LABEL_S,
} from "./staged-reveal.ts";

describe("stagedEntrance", () => {
  const T = STAGED_BORDER_S + STAGED_FILL_S + STAGED_LABEL_S;

  it("is fully empty before the trigger", () => {
    const r = stagedEntrance(-0.5, { fillOpacity: 0.9 });
    expect(r.borderProgress).toBe(0);
    expect(r.fillOpacity).toBe(0);
    expect(r.labelReveal).toBe(0);
  });

  it("draws the border first, before any fill", () => {
    const mid = stagedEntrance(STAGED_BORDER_S / 2, { fillOpacity: 0.9 });
    expect(mid.borderProgress).toBeGreaterThan(0);
    expect(mid.borderProgress).toBeLessThan(1);
    expect(mid.fillOpacity).toBe(0); // fill has not started
    expect(mid.labelReveal).toBe(0);
  });

  it("completes the border by BORDER_S, then blooms fill with an overshoot above target", () => {
    const atBorderDone = stagedEntrance(STAGED_BORDER_S, { fillOpacity: 0.9 });
    expect(atBorderDone.borderProgress).toBeCloseTo(1, 5);
    // 60% through the fill window = the overshoot peak (target*1.25)
    const peak = stagedEntrance(STAGED_BORDER_S + STAGED_FILL_S * 0.6, {
      fillOpacity: 0.9,
    });
    expect(peak.fillOpacity).toBeCloseTo(0.9 * 1.25, 5);
  });

  it("settles fill to the target and finishes the label by the end", () => {
    const end = stagedEntrance(T, { fillOpacity: 0.9 });
    expect(end.fillOpacity).toBeCloseTo(0.9, 5);
    expect(end.labelReveal).toBeCloseTo(1, 5);
  });

  it("clamps everything to its final state well past the end", () => {
    const late = stagedEntrance(T + 10, { fillOpacity: 0.9 });
    expect(late.borderProgress).toBeCloseTo(1, 5);
    expect(late.fillOpacity).toBeCloseTo(0.9, 5);
    expect(late.labelReveal).toBeCloseTo(1, 5);
  });
});
