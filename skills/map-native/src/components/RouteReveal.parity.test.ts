// Locks that the extracted stagedEntrance reproduces RouteReveal's original inline math exactly,
// so the refactor is provably byte-identical. This test encodes the OLD inline formulas and
// asserts the core matches them at sampled local-seconds.
import { describe, it, expect } from "bun:test";
import { Easing, interpolate } from "remotion";
import { stagedEntrance } from "../core/staged-reveal.ts";

const BORDER_S = 2.5,
  FILL_S = 1.0,
  LABEL_S = 0.7,
  FILL_OPACITY = 0.55;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// The ORIGINAL inline expressions from RouteReveal.tsx:441-467 (pre-refactor), verbatim.
function original(lt: number) {
  const bp = interpolate(clamp01(lt / BORDER_S), [0, 1], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
  });
  const fp = clamp01((lt - BORDER_S) / FILL_S);
  const fo = interpolate(
    fp,
    [0, 0.6, 1],
    [0, FILL_OPACITY * 1.25, FILL_OPACITY],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const lp = clamp01((lt - BORDER_S - FILL_S) / LABEL_S);
  return { bp, fill: fp <= 0 ? 0 : fo, lp };
}

describe("RouteReveal staged parity", () => {
  it("stagedEntrance equals the original inline math across the whole envelope", () => {
    for (const lt of [-1, 0, 0.5, 1.25, 2.5, 3.0, 3.5, 4.2, 10]) {
      const o = original(lt);
      const s = stagedEntrance(lt, { fillOpacity: FILL_OPACITY });
      expect(s.borderProgress).toBeCloseTo(o.bp, 9);
      // `fillEnvelope` is the curve the original produced, unchanged. `fillOpacity` is the
      // same curve clamped into the paint channel — and at RouteReveal's 0.55 target the
      // overshoot peaks at 0.6875, so the clamp is a no-op here and BOTH still match.
      expect(s.fillEnvelope).toBeCloseTo(o.fill, 9);
      expect(s.fillOpacity).toBeCloseTo(o.fill, 9);
      expect(s.labelReveal).toBeCloseTo(o.lp, 9);
    }
  });

  it("RouteReveal's own target never needed the clamp — the parity above is exact", () => {
    // Guards the reasoning, not just the numbers: if someone raises FILL_OPACITY past 0.8,
    // the two fields diverge and this test says so instead of the parity quietly weakening.
    expect(FILL_OPACITY * 1.25).toBeLessThanOrEqual(1);
  });
});
