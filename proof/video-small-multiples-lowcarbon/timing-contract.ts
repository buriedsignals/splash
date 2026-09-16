/**
 * The timing contract for « Les seize ont tous progressé, et ceux qui partaient de plus bas le plus » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 84 frames. Sixteen 2000 bars grow in one row; the row is cut into sixteen panels.
 * - `reveal`: 120 frames. Panel after panel a copy of the 2000 bar slides out and rises to 2024, the gain counting.
 * - `subject`: 147 frames. Every added part drops to the baseline; the panels re-sort by their 2000 start.
 * - `conclusion`: 90 frames. The added parts climb back onto their levels; Denmark and Sweden ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 552 frames, 18.4 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SMALL_MULTIPLES_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 552,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 84 },
  reveal: { start: 135, duration: 120 },
  subject: { start: 255, duration: 147 },
  conclusion: { start: 402, duration: 90 },
  hold: { start: 492, duration: 60 },
};
