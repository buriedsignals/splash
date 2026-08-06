// sweep-schedule.ts — WHERE THE SWEEP SITS IN TIME.
//
// `sweep-carrier.ts` answers WHERE each mark sits on the sweep (0 = first, 1 = last) and knows
// nothing about frames. This is the other half: the composition's own window, and the one line
// map-explainer hard-coded for its river —
//
//     trigger = RIVER_START + t.stop * (RIVER_END - RIVER_START)     (RouteReveal.tsx)
//
// — written once, for every carrier and every map type, instead of once per component.
//
// Two shapes read these numbers, and which one a component uses is decided by how it already
// paints, never by a second device:
//   • a component that ALREADY stages each mark's own entrance (SymbolStory, LocatorStory) reads
//     a TRIGGER FRAME per mark and feeds it to the same `stagedEntrance` it already ran — the
//     carrier decides WHEN, never HOW.
//   • a component that paints its marks IN BULK (choropleth, cartogram, hex grid, dot density)
//     bakes each mark's `__stop` onto the feature and compares it against `sweptFraction` inside
//     ONE data-driven expression — a per-mark `setPaintProperty` loop would issue hundreds of
//     style mutations per frame on a renderer that re-parses on each one.

import { AREAL_LABEL_START_S, AREAL_LABEL_S } from "./story-choreography";
import type { SweepStops } from "./sweep-carrier";

/** How much of the sweep a mark takes to bloom once reached. A CONSTANT, like map-explainer's
 *  BORDER_S/FILL_S: driving the bloom by a slice of the sweep makes a dense map flash by.
 *  (ChoroplethStory carries the same literal locally — the reference wiring predates this
 *  module; the two are one number and should collapse into this one.) */
export const SWEEP_BLOOM = 0.06;

/** Seconds a staged entrance needs to finish (fill bloom + label rise). The sweep's window ends
 *  this much before the last frame so the LAST mark still lands inside the video instead of
 *  being cut off mid-bloom — the mark furthest along the sweep is the one the carrier ordered
 *  last, not the one it meant to drop. */
export const SWEEP_ENTRANCE_TAIL_S = AREAL_LABEL_START_S + AREAL_LABEL_S;

export type SweepFrameWindow = { startFrame: number; endFrame: number };

/**
 * The frames the sweep runs between: it starts once the title card has cleared (there is nothing
 * to light up under a full-frame title) and ends `tailFrames` before the last frame.
 *
 * Always at least one frame wide, so a composition shorter than its own tail degrades to an
 * instant sweep rather than dividing by zero or running backwards.
 */
export function sweepFrameWindow(
  titleSceneEndFrame: number,
  durationInFrames: number,
  tailFrames = 0,
): SweepFrameWindow {
  const startFrame = Math.max(0, titleSceneEndFrame);
  const endFrame = Math.max(startFrame + 1, durationInFrames - 1 - tailFrames);
  return { startFrame, endFrame };
}

/**
 * Each mark's own entrance frame — for the components that stage marks one by one.
 *
 * This is map-explainer's river line, with the river taken out.
 */
export function sweepTriggerFrames(
  stops: SweepStops,
  window: SweepFrameWindow,
): Map<string, number> {
  const span = window.endFrame - window.startFrame;
  const out = new Map<string, number>();
  for (const [name, stop] of Object.entries(stops)) {
    const s = stop < 0 ? 0 : stop > 1 ? 1 : stop;
    out.set(name, window.startFrame + s * span);
  }
  return out;
}

/**
 * How far the sweep has advanced at this frame — for the components that paint in bulk.
 *
 * Runs to `1 + SWEEP_BLOOM`, not to 1: a mark at stop 1 needs the scalar to pass it by a full
 * bloom before it is lit, so a sweep that stopped at exactly 1 would leave the last mark — the
 * lowest value, the latest date, the far side of the territory — dark for the whole video.
 */
export function sweptFraction(frame: number, window: SweepFrameWindow): number {
  const span = window.endFrame - window.startFrame;
  const t = span <= 0 ? 1 : (frame - window.startFrame) / span;
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return clamped * (1 + SWEEP_BLOOM);
}
