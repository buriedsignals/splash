/**
 * The timing contract for « La Chine a émis plus de CO₂ que les cinq pays suivants réunis » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 90 frames. The world's emissions as one bar; the ten largest marked inside it.
 * - `reveal`: 240 frames. The ten fall out of the world into their rows, largest first; the scale closes onto them.
 * - `subject`: 180 frames. The next five line up end to end under China, their sum counting, short of China's end.
 * - `conclusion`: 150 frames. Germany — the tenth — slides into the gap and fits; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 801 frames, 26.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 801,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 90 },
  reveal: { start: 141, duration: 240 },
  subject: { start: 381, duration: 180 },
  conclusion: { start: 561, duration: 150 },
  hold: { start: 711, duration: 90 },
};
