/**
 * The timing contract for « La Chine a émis plus que les cinq pays suivants réunis » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. The ten names beside an empty axis.
 * - `reveal`: 240 frames. The bars grow from the tenth to the second, then the first, each counting its value.
 * - `subject`: 180 frames. The next five line up end to end along the second row, short of the first, their sum counting.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 666 frames, 22.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 666,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 96, duration: 240 },
  subject: { start: 336, duration: 180 },
  conclusion: { start: 516, duration: 60 },
  hold: { start: 576, duration: 90 },
};
