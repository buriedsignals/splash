// Proves the A29 clamp changed NOTHING a viewer can see.
//
// The argument, and why this is a stronger proof than a rendered still: MapLibre paint
// opacities are [0,1] channels — a value handed in above 1 is saturated before it reaches
// the framebuffer. So the alpha a frame actually paints is `clamp01(value)`, and two
// formulas that agree after clamp01 produce a pixel-identical render at every frame. This
// file replays the OLD arithmetic (the pre-A29 expression, verbatim) beside the new one for
// every comp that consumes the envelope, at every frame of the entrance, and asserts they
// agree post-saturation.
//
// Same discipline as RouteReveal.parity.test.ts: the old formulas are duplicated here on
// purpose. They are a frozen record of what shipped, not a second implementation.
import { describe, it, expect } from "bun:test";
import { Easing, interpolate } from "remotion";
import {
  stagedEntrance,
  clampOpacity,
  STAGED_FILL_OVERSHOOT,
  STAGED_BORDER_S,
  STAGED_FILL_S,
} from "./staged-reveal.ts";
import {
  AREAL_BORDER_S,
  AREAL_FILL_S,
  AREAL_FILL_START_S,
  AREAL_LABEL_S,
  AREAL_LABEL_START_S,
} from "../story-choreography.ts";

const AREAL = {
  borderS: AREAL_BORDER_S,
  fillS: AREAL_FILL_S,
  labelS: AREAL_LABEL_S,
  fillStart: AREAL_FILL_START_S,
  labelStart: AREAL_LABEL_START_S,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// The PRE-A29 `fillOpacity` — the raw envelope, returned unclamped under that name.
// `win` is the fill window: the areal comps retune it, RouteReveal keeps the defaults.
function oldFillOpacity(
  localSeconds: number,
  target: number,
  win: { fillStart: number; fillS: number } = AREAL,
): number {
  const fp = clamp01((localSeconds - win.fillStart) / win.fillS);
  if (fp <= 0) return 0;
  return interpolate(fp, [0, 0.6, 1], [0, target * 1.25, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

// Every local-second the entrance spans, at 30fps, plus a margin either side.
const FRAMES: number[] = [];
for (let f = -30; f <= 30 * 8; f++) FRAMES.push(f / 30);

describe("A29 clamp — post-saturation render parity, comp by comp", () => {
  it("ChoroplethStory context: the bloom layer's delta is unchanged", () => {
    const BLOOM_BASE = 0.9; // ChoroplethStory.tsx
    for (const ls of FRAMES) {
      const old = Math.max(0, oldFillOpacity(ls, BLOOM_BASE) - BLOOM_BASE);
      const now = stagedEntrance(ls, {
        fillOpacity: BLOOM_BASE,
        ...AREAL,
      }).fillBloom;
      expect(clamp01(now)).toBeCloseTo(clamp01(old), 12);
    }
  });

  it("CartogramStory / HexGridStory context: same, at their own targets", () => {
    for (const FULL_OPACITY of [0.85, 0.8]) {
      for (const ls of FRAMES) {
        const old = Math.max(
          0,
          oldFillOpacity(ls, FULL_OPACITY) - FULL_OPACITY,
        );
        const now = stagedEntrance(ls, {
          fillOpacity: FULL_OPACITY,
          ...AREAL,
        }).fillBloom;
        expect(clamp01(now)).toBeCloseTo(clamp01(old), 12);
      }
    }
  });

  it("sequential areal comps: the bloom layer's own fill-opacity is unchanged once saturated", () => {
    // These paint `staged.fillOpacity` DIRECTLY. Pre-A29 that could be 1.125 (choropleth,
    // target 0.9) or 1.0625 (cartogram, 0.85) — out of the channel, saturated to 1 by the
    // GPU. The clamped value reaches 1 too, so the painted alpha is identical.
    for (const target of [0.9, 0.85, 0.8]) {
      for (const ls of FRAMES) {
        const old = oldFillOpacity(ls, target);
        const now = stagedEntrance(ls, {
          fillOpacity: target,
          ...AREAL,
        }).fillOpacity;
        expect(now).toBeCloseTo(clamp01(old), 12);
      }
    }
  });

  it("SymbolStory: the mark's opacity is unchanged (and was never out of range)", () => {
    const SYMBOL_BASE_OPACITY = 0.75; // SymbolStory.tsx
    for (const ls of FRAMES) {
      const old = SYMBOL_BASE_OPACITY * oldFillOpacity(ls, 1);
      const now = clampOpacity(
        SYMBOL_BASE_OPACITY *
          stagedEntrance(ls, { fillOpacity: 1, ...AREAL }).fillEnvelope,
      );
      expect(now).toBeCloseTo(clamp01(old), 12);
      // Worth stating: 0.75 * 1.25 = 0.9375, so this comp's bloom always fitted. Reading
      // the CLAMPED field here instead of the envelope would have flattened it to 0.75.
      expect(now).toBeLessThanOrEqual(1);
    }
  });

  it("LocatorStory: both channels unchanged once saturated", () => {
    const DIM_OPACITY = 0.25; // LocatorStory.tsx
    for (const highlight of [true, false]) {
      const fillCeiling = highlight ? 0.95 : DIM_OPACITY;
      const strokeCeiling = highlight ? 1 : DIM_OPACITY;
      for (const ls of FRAMES) {
        const env = stagedEntrance(ls, {
          fillOpacity: 1,
          ...AREAL,
        }).fillEnvelope;
        expect(clampOpacity(fillCeiling * env)).toBeCloseTo(
          clamp01(fillCeiling * oldFillOpacity(ls, 1)),
          12,
        );
        expect(clampOpacity(strokeCeiling * env)).toBeCloseTo(
          clamp01(strokeCeiling * oldFillOpacity(ls, 1)),
          12,
        );
      }
    }
  });

  it("DotDensityStory: every dot's staggered opacity unchanged once saturated", () => {
    const STAGGER_SPAN = 0.25; // dot-density-story.ts
    for (const ls of FRAMES) {
      const env = stagedEntrance(ls, { fillOpacity: 1, ...AREAL }).fillEnvelope;
      const old = oldFillOpacity(ls, 1);
      for (const order of [0, 0.25, 0.5, 0.75, 0.99]) {
        const delay = order * STAGGER_SPAN;
        const remap = (p: number) => Math.max(0, (p - delay) / (1 - delay));
        expect(Math.min(1, remap(env))).toBeCloseTo(clamp01(remap(old)), 12);
      }
    }
  });

  it("RouteReveal: its target is low enough that nothing was ever clipped", () => {
    const FILL_OPACITY = 0.55; // RouteReveal.tsx
    // RouteReveal passes no window override: fill starts when the border finishes.
    const win = { fillStart: STAGED_BORDER_S, fillS: STAGED_FILL_S };
    for (const ls of FRAMES) {
      const old = oldFillOpacity(ls, FILL_OPACITY, win);
      expect(old).toBeLessThanOrEqual(1);
      expect(
        stagedEntrance(ls, { fillOpacity: FILL_OPACITY }).fillOpacity,
      ).toBeCloseTo(old, 12);
    }
  });

  it("and the values that used to leave the channel really did leave it", () => {
    // Without this the suite above could pass vacuously — it would prove the clamp is a
    // no-op because there was never anything to clamp.
    const peak = AREAL.fillStart + AREAL.fillS * 0.6;
    expect(oldFillOpacity(peak, 0.9)).toBeGreaterThan(1); // choropleth sequential
    expect(oldFillOpacity(peak, 0.85)).toBeGreaterThan(1); // cartogram sequential
    expect(oldFillOpacity(peak, 1)).toBeCloseTo(STAGED_FILL_OVERSHOOT, 6);
    expect(0.95 * oldFillOpacity(peak, 1)).toBeGreaterThan(1); // locator fill
    expect(1 * oldFillOpacity(peak, 1)).toBeGreaterThan(1); // locator stroke
  });
});
