/**
 * The timing contract for « La Chine a émis plus de CO₂ que les cinq pays suivants réunis » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The world's emissions as one bar; the ten largest marked inside it.
 * - `reveal`: 180 frames. The ten fall out of the world into their rows, largest first; the scale closes onto them.
 * - `subject`: 135 frames. The next five line up end to end under China, their sum counting, short of China's end.
 * - `conclusion`: 180 frames. Germany — the tenth — slides into the gap and fits; then every bar returns to its row, the
 *   whole ranking, the five bracketed with their sum; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 666 frames, 22.2 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 666,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 180 },
  subject: { start: 291, duration: 135 },
  conclusion: { start: 426, duration: 180 },
  hold: { start: 606, duration: 60 },
};
