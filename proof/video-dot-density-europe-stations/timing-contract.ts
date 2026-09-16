/**
 * The timing contract for « 72 réacteurs sur 8 900 centrales bas-carbone » (BRIEF.md, « The choreography »).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 120 frames. The land, then the seven fuels arriving one after another, the count climbing to 8 900.
 * - `reveal`: 75 frames. The others step back, the 72 ringed, their count, and their sliver of the bar: 0,8 %.
 * - `subject`: 150 frames. The others return and every dot grows to its capacity over three seconds; the bar's
 *   nuclear segment widens with them to 34,4 %.
 * - `conclusion`: 54 frames. The credit.
 * - `hold`: 60 frames: the weighted map the video ends on.
 *
 * The owner (2026-09-15): « ajuste mieux ton rythme pour rendre ça plus dynamique ».
 *
 * Total: 522 frames, 17.4 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DOT_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 522,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 120 },
  reveal: { start: 174, duration: 75 },
  subject: { start: 252, duration: 150 },
  conclusion: { start: 408, duration: 54 },
  hold: { start: 462, duration: 60 },
};
