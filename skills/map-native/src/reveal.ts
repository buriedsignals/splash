// reveal.ts — shared pure helpers for the simple-reveal video format.
// A simple reveal is a FIXED-camera, data-animates-in clip: one eased progress
// 0→1 with short blank holds at both ends. Both SymbolReveal and ChoroplethReveal
// drive their reveal from these helpers so the math is unified and unit-tested.
import { interpolate, Easing } from "remotion";

export const REVEAL_FRAMES = 240; // 8s @ 30fps
export const REVEAL_HOLD = 0.05; // ~5% blank-in / full-out
export const MAX_FILL_OPACITY = 0.85;

export function easedRevealProgress(
  frame: number,
  durationInFrames: number,
  opts: { holdIn?: number; holdOut?: number } = {},
): number {
  const holdIn = opts.holdIn ?? REVEAL_HOLD;
  const holdOut = opts.holdOut ?? REVEAL_HOLD;
  const t = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);
  return interpolate(t, [holdIn, 1 - holdOut], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function revealFillOpacity(
  progress: number,
  max: number = MAX_FILL_OPACITY,
): number {
  return progress * max;
}

// Latitude clamp to ±85° (Mercator-safe) — every bounds passed to MapTiler must be clamped.
function clampLat(lat: number): number {
  return Math.max(-85, Math.min(85, lat));
}

export function revealCameraPlan(bounds: [number, number, number, number]): {
  kind: "fixed";
  bounds: [number, number, number, number];
} {
  return {
    kind: "fixed",
    bounds: [bounds[0], clampLat(bounds[1]), bounds[2], clampLat(bounds[3])],
  };
}
