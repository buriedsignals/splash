/**
 * The timing contract for « Dans 5 de ces 6 pays l'éolien devance le solaire, la Suisse est l'exception » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 90 frames. Each country's whole electricity rises as one column, source on source, to 100 %.
 * - `reveal`: 240 frames. Every other source fades; wind and solar slide down side by side; the scale closes onto them.
 * - `subject`: 180 frames. Wind's level carried across to solar, group after group; the lead counted, five of six.
 * - `conclusion`: 90 frames. Every group but Switzerland steps back; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 741 frames, 24.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const GROUPED_BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 741,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 90 },
  reveal: { start: 141, duration: 240 },
  subject: { start: 381, duration: 180 },
  conclusion: { start: 561, duration: 90 },
  hold: { start: 651, duration: 90 },
};
