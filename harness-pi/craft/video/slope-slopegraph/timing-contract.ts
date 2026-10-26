/**
 * The timing contract for « Les seize pays ont tous gagné du bas-carbone depuis 2000 — un seul a doublé la France »
 * (BRIEF.md). A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The rails and the sixteen 2000 values.
 * - `reveal`: 150 frames. The lines drawn to 2024 one after another; « {n} en hausse » climbs to 16.
 * - `subject`: 180 frames. France's line in the accent; every line that started under it tested in turn; only Finland ends
 *   above it, its crossing ringed; « {n} dépasse la France » stops at 1.
 * - `conclusion`: 75 frames. The whole chart back; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 576 frames, 19.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SLOPE_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 576,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 150 },
  subject: { start: 261, duration: 180 },
  conclusion: { start: 441, duration: 75 },
  hold: { start: 516, duration: 60 },
};
