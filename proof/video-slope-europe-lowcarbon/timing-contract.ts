/**
 * The timing contract for « Les seize pays ont tous gagné du bas-carbone depuis 2000 ; un seul a doublé la France ».
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 75 frames. The rails; the sixteen 2000 values.
 * - `reveal`: 120 frames. The sixteen lines travel to 2024 over about three seconds; the 2024 values land.
 * - `subject`: 105 frames. The others step back; France and Finland picked out; their crossing ringed.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 507 frames, 16.9 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SLOPE_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 507,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 75 },
  reveal: { start: 132, duration: 120 },
  subject: { start: 252, duration: 105 },
  conclusion: { start: 357, duration: 60 },
  hold: { start: 417, duration: 90 },
};
