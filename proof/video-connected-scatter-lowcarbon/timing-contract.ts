/**
 * The timing contract for « Tous plus propres chez eux, 5 plus légers en Europe » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The axes, the key, the sixteen 2000 rings.
 * - `reveal`: 210 frames. Sixteen countries travel to 2024 one after another, the count climbing as each lands.
 * - `subject`: 120 frames. The close-up onto 0–12 %: the crowd opens and is named.
 * - `conclusion`: 240 frames. The pull back; the five that weigh less, one after another; France's two moves; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 771 frames, 25.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CONNECTED_SCATTER_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 771,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 210 },
  subject: { start: 321, duration: 120 },
  conclusion: { start: 441, duration: 240 },
  hold: { start: 681, duration: 90 },
};
