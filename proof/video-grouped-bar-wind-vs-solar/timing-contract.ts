/**
 * The timing contract for « Dans 5 de ces 6 pays l'éolien devance le solaire — la Suisse est l'exception » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. The six names, the baseline, the two series named.
 * - `reveal`: 270 frames. Wind rises across the six; then solar, group by group, the lead counted.
 * - `subject`: 90 frames. The five where wind leads step back; Switzerland kept.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 606 frames, 20.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const GROUPED_BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 606,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 96, duration: 270 },
  subject: { start: 366, duration: 90 },
  conclusion: { start: 456, duration: 60 },
  hold: { start: 516, duration: 90 },
};
