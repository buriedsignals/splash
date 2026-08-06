import type { Beat } from "./map-story.ts";
import type { Phase } from "./story-timeline.ts";

/**
 * Map each reveal beat's subject region (beat.highlight[0]) to the frame its entrance starts.
 *
 * ★ WHICH FRAME THAT IS, is the difference between two readings of the same tuned pacing, and
 * `story-choreography.ts` states BOTH:
 *
 *   "The border draws during the camera glide-in (trigger = beat start = when the move begins),
 *    so motion is continuous."
 *   "AREAL_REVEAL_HOLD_S = 3.0; // per-region hold → gentle entrance ~2.1s + ~0.9s readable
 *    stillness"
 *
 * Only one can be true, and the arithmetic in the second is the one that does not work from the
 * beat's start: the entrance ends 2.1s after its trigger, so from a move-start trigger it lands
 * 0.8s INTO a 3.0s hold and leaves 2.2s of stillness, not 0.9s. The 0.9s the knob claims is what
 * you get when the entrance starts where the camera stops.
 *
 * Both are defensible and one of them is shipped, so this does not pick a winner globally:
 * `atHoldStart` is opt-in, and the default is the frame every existing caller already got. An
 * EXPLAINER story (a declared sweepCarrier) opts in, because its whole claim is that the camera
 * arrives somewhere and THEN that place animates in — measured on the first explainer render,
 * 2026-08-06: at frame 358, 25 frames into a 39-frame glide, Germany's border had already drawn
 * most of the way round and its fill had bloomed, all of it under a moving camera.
 */
export function triggerFrameByRegion(
  beats: Beat[],
  phases: Phase[],
  opts: { atHoldStart?: boolean } = {},
): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].kind !== "reveal") continue;
    const key = beats[i].highlight[0];
    if (!key) continue;
    if (!m.has(key))
      m.set(
        key,
        opts.atHoldStart
          ? phases[i].startFrame + phases[i].moveFrames
          : phases[i].startFrame,
      );
  }
  return m;
}
