/**
 * The timing contract for « Pologne : +17,3 points de bas-carbone depuis 2015, toujours la seule sous la moitié » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. Six empty tracks to 100 %, the names in their 2015 order, the key.
 * - `reveal`: 210 frames. The 2015 bars, then the 2024 bars extending on from them, each gain counting.
 * - `subject`: 180 frames. The rows re-sort by gain, one row climbing at a time; Poland to the top.
 * - `conclusion`: 90 frames. The 50 % line; every row but Poland steps back; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 666 frames, 22.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BULLET_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 666,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 96, duration: 210 },
  subject: { start: 306, duration: 180 },
  conclusion: { start: 486, duration: 90 },
  hold: { start: 576, duration: 90 },
};
