import { describe, it, expect } from "bun:test";
import {
  stagedEntrance,
  STAGED_BORDER_S,
  STAGED_FILL_S,
  STAGED_LABEL_S,
  STAGED_FILL_OVERSHOOT,
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
    // 60% through the fill window = the overshoot peak (target*OVERSHOOT). The RAW curve
    // carries it; `fillOpacity` is that curve made safe for a paint property (below).
    const peak = stagedEntrance(STAGED_BORDER_S + STAGED_FILL_S * 0.6, {
      fillOpacity: 0.9,
    });
    expect(peak.fillEnvelope).toBeCloseTo(0.9 * STAGED_FILL_OVERSHOOT, 5);
    expect(peak.fillEnvelope).toBeGreaterThan(0.9);
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

  // The residual this suite grew for: `fillOpacity` is handed straight to a MapLibre paint
  // property by the sequential-mode areal comps and by RouteReveal. An opacity above 1 is
  // out of the channel's domain — the GPU silently saturates it, so the bug is invisible
  // in a render and only shows up as "the bloom did nothing".
  describe("the opacity channel stays inside [0,1]", () => {
    // Every target the engine actually passes today, plus the boundary and past it.
    const TARGETS = [0, 0.25, 0.55, 0.75, 0.8, 0.85, 0.9, 1];

    it("fillOpacity never leaves [0,1], for any target, anywhere in the envelope", () => {
      for (const target of TARGETS) {
        for (let ls = -1; ls <= T + 2; ls += 0.02) {
          const r = stagedEntrance(ls, { fillOpacity: target });
          expect(r.fillOpacity).toBeGreaterThanOrEqual(0);
          expect(r.fillOpacity).toBeLessThanOrEqual(1);
        }
      }
    });

    it("a target above 0.8 is exactly where the unclamped curve broke the channel", () => {
      const at = (target: number) =>
        stagedEntrance(STAGED_BORDER_S + STAGED_FILL_S * 0.6, {
          fillOpacity: target,
        });
      // 0.8 is the last target whose overshoot still fits: 0.8 * 1.25 === 1.
      expect(at(0.8).fillEnvelope).toBeCloseTo(1, 5);
      expect(at(0.8).fillOpacity).toBeCloseTo(1, 5);
      // Above it the raw curve leaves the channel and the safe one does not.
      expect(at(0.9).fillEnvelope).toBeGreaterThan(1);
      expect(at(0.9).fillOpacity).toBe(1);
      expect(at(1).fillEnvelope).toBeCloseTo(STAGED_FILL_OVERSHOOT, 5);
      expect(at(1).fillOpacity).toBe(1);
    });

    it("keeps the RAW envelope available, because three comps read the overshoot as headroom", () => {
      // ChoroplethStory/CartogramStory/HexGridStory paint `fillBloom` on a layer ABOVE the
      // base fill: the amount over the target IS the bloom. Clamping the curve itself would
      // have cut that gesture (0.9 → bloom 0.225 becomes 0.1) without anyone noticing.
      const peak = stagedEntrance(STAGED_BORDER_S + STAGED_FILL_S * 0.6, {
        fillOpacity: 0.9,
      });
      expect(peak.fillBloom).toBeCloseTo(0.9 * (STAGED_FILL_OVERSHOOT - 1), 5);
      expect(peak.fillBloom).toBeGreaterThan(0);
    });

    it("fillBloom is a valid opacity too, and is zero outside the overshoot", () => {
      for (const target of TARGETS) {
        for (let ls = -1; ls <= T + 2; ls += 0.02) {
          const r = stagedEntrance(ls, { fillOpacity: target });
          expect(r.fillBloom).toBeGreaterThanOrEqual(0);
          expect(r.fillBloom).toBeLessThanOrEqual(1);
        }
        // Settled: the curve is back ON the target, so there is no headroom left.
        expect(stagedEntrance(T + 5, { fillOpacity: target }).fillBloom).toBe(
          0,
        );
        // Before the trigger: nothing at all.
        expect(stagedEntrance(-1, { fillOpacity: target }).fillBloom).toBe(0);
      }
    });

    it("a caller that passes an out-of-range target still gets a valid opacity", () => {
      // Defensive: no caller does this today, but the helper is the shared boundary.
      const r = stagedEntrance(T, { fillOpacity: 1.4 });
      expect(r.fillOpacity).toBeLessThanOrEqual(1);
      expect(r.fillOpacity).toBeGreaterThanOrEqual(0);
      const neg = stagedEntrance(T, { fillOpacity: -0.2 });
      expect(neg.fillOpacity).toBeGreaterThanOrEqual(0);
    });
  });
});
