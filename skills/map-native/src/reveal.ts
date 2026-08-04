// reveal.ts — shared pure helpers for the simple-reveal video format.
// A simple reveal is a FIXED-camera, data-animates-in clip: one eased progress
// 0→1 with short blank holds at both ends. Both SymbolReveal and ChoroplethReveal
// drive their reveal from these helpers so the math is unified and unit-tested.
import { interpolate, Easing } from "remotion";

export const REVEAL_FRAMES = 240; // 8s @ 30fps
export const REVEAL_HOLD = 0.1; // ~10% blank-in / full-out (≥24 frames @ 240f — video.md floor)
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

// ---------------------------------------------------------------------------
// THE WALK, INSIDE A REVEAL — sub-project ④(b).
//
// A reveal is the narrative kind where the DATA carries the story and the camera holds the
// frame (the umbrella spec's own table: "ce qui apparaît, dans quel ordre"). Until now it had
// no notion of a story at all: one master progress drove every subject's opacity at once, so a
// journalist's confirmed walk — its order, its beats — changed nothing on screen.
// (ChoroplethReveal's header claimed regions revealed "by bin index"; `__binIdx` was computed
// and never read, measured by the 2026-08-03 gesture inventory.)
//
// These two helpers are the whole mechanism, and they are PURE so the seven components share
// one behaviour rather than seven near-copies — the same discipline easedRevealProgress
// already imposes on the uniform ramp.
//
// NO WALK ⇒ NOTHING CHANGES. A component with no arcBeats keeps calling easedRevealProgress
// directly and renders byte-identically to before. That is the constraint the whole sub-project
// is bounded by: a walk that nobody wrote must not alter a single frame.

/** How much OVERLAP two consecutive entrances share, as a fraction of one subject's window.
 *  0 would make the map tick like a slideshow; 1 would put everything back on one ramp. A
 *  third keeps each entrance legible while the clip still reads as one continuous move. */
export const WALK_ENTRANCE_OVERLAP = 1 / 3;

/**
 * ONE SUBJECT'S OWN 0→1, from the master progress — the primitive that turns "everything at
 * once" into "each in its turn".
 *
 * `index` is the subject's position in the JOURNALIST'S walk, never its rank in the data: the
 * order is an editorial decision the beats already carry, and re-sorting here would silently
 * overrule it (the defect the bar-scrolly beat order had to be fixed for on 2026-07-14).
 */
export function walkSubjectProgress(
  overall: number,
  index: number,
  count: number,
): number {
  if (count <= 1) return clamp01(overall);
  // Windows overlap, so the last one must still finish exactly at 1: solve for a stride that
  // fits `count` windows of `span` into [0, 1] with the given overlap.
  const span = 1 / (count - (count - 1) * WALK_ENTRANCE_OVERLAP);
  const stride = span * (1 - WALK_ENTRANCE_OVERLAP);
  const start = index * stride;
  if (overall <= start) return 0;
  if (overall >= start + span) return 1;
  return (overall - start) / span;
}

/**
 * WHICH beat is on screen at this progress — what a caption reads, and what a label names.
 *
 * Answers the beat whose entrance has STARTED most recently, not the one nearest to finishing:
 * a caption must name what the reader's eye has just been drawn to. Clamped, so a progress of 0
 * reads beat 0 and a progress of 1 reads the last — never -1, never `count`.
 */
export function activeWalkIndex(overall: number, count: number): number {
  if (count <= 0) return -1;
  let active = 0;
  for (let i = 1; i < count; i++)
    if (walkSubjectProgress(overall, i, count) > 0) active = i;
  return active;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE FILL-OPACITY EXPRESSION a walk paints — pure, so the seven reveal components share one
 * behaviour instead of seven hand-written `case` chains that drift.
 *
 * With NO walk it returns the plain scalar these components have always painted, so a run that
 * nobody wrote a storyboard for renders byte-identically. With a walk it returns a MapLibre
 * `case` expression keyed on `__walkIdx` — the region's position in the journalist's own order.
 *
 * The FALLBACK arm (regions the walk does not name) completes with the LAST beat, deliberately:
 * the walk leads and the rest of the map lands as the closing picture. Letting them ramp
 * continuously instead would drown the order the journalist chose, and an order nobody can see
 * is not an order.
 */
export function walkFillOpacity(
  progress: number,
  walkCount: number,
  max: number = MAX_FILL_OPACITY,
): unknown {
  if (walkCount <= 0) return revealFillOpacity(progress, max);
  return [
    "case",
    ...Array.from({ length: walkCount }, (_, i) => [
      ["==", ["get", "__walkIdx"], i],
      revealFillOpacity(walkSubjectProgress(progress, i, walkCount), max),
    ]).flat(),
    revealFillOpacity(
      walkSubjectProgress(progress, walkCount - 1, walkCount),
      max,
    ),
  ];
}
