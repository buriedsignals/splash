/**
 * The timing contract for « Le plancher européen est monté de 30 points, le plafond de 2 » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 54 frames. Both rails on one scale, the two years, the sixteen chips on 2000.
 * - `reveal`: 120 frames. Floor first, each chip's copy travels to its 2024 seat, its leader drawn behind it.
 * - `subject`: 210 frames. The fourteen step back; « +29,5 » and « +2,1 »; the 2000 span traced, slid onto 2024 pinned to
 *   Sweden; the overhang past Poland turns, « −27,4 ».
 * - `conclusion`: 75 frames. The overhang folds away; the whole chart; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 570 frames, 19 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DOT_STRIP_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 570,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 54 },
  reveal: { start: 105, duration: 120 },
  subject: { start: 225, duration: 210 },
  conclusion: { start: 435, duration: 75 },
  hold: { start: 510, duration: 60 },
};
