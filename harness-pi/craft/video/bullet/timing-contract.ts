/**
 * The timing contract for « Pologne : +17,3 points de bas-carbone depuis 2015, toujours la seule sous la moitié » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 75 frames. Each country's whole electricity to 100 %: the 2015 low-carbon part, the fossil rest.
 * - `reveal`: 120 frames. The frontier moves to 2024 row after row: the part gained fills in, each gain counted.
 * - `subject`: 150 frames. The rows re-sort by gain, one row climbing at a time; Poland to the top.
 * - `conclusion`: 90 frames. The 50 % line; Poland alone short of it, ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 546 frames, 18.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BULLET_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 546,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 75 },
  reveal: { start: 126, duration: 120 },
  subject: { start: 246, duration: 150 },
  conclusion: { start: 396, duration: 90 },
  hold: { start: 486, duration: 60 },
};
