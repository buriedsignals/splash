/**
 * The timing contract for « 72 réacteurs sur 8 900 centrales bas-carbone » (BRIEF.md, « The choreography »).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 150 frames. The land, then the seven fuels arriving one after another, the count climbing to 8 900.
 * - `reveal`: 100 frames. The others step back, the 72 ringed, their count.
 * - `subject`: 170 frames. The others return and every dot grows to its capacity over about three seconds; the power
 *   count climbs to 34,4 %.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames: the weighted map the video ends on.
 *
 * Total: 639 frames, 21.3 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DOT_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 639,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 150 },
  reveal: { start: 207, duration: 100 },
  subject: { start: 313, duration: 170 },
  conclusion: { start: 489, duration: 60 },
  hold: { start: 549, duration: 90 },
};
