/**
 * The timing contract for « Dans 5 de ces 6 pays l'éolien devance le solaire, la Suisse est l'exception » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. Each country's whole electricity rises as one column, source on source, to 100 %.
 * - `reveal`: 150 frames. Every other source fades; wind and solar part and slide down; the scale closes onto them.
 * - `subject`: 150 frames. Wind's level carried over solar group after group, the lead counted; everything but
 *   Switzerland steps back.
 * - `conclusion`: 75 frames. The whole chart back, Switzerland ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 546 frames, 18.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const GROUPED_BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 546,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 150 },
  subject: { start: 261, duration: 150 },
  conclusion: { start: 411, duration: 75 },
  hold: { start: 486, duration: 60 },
};
