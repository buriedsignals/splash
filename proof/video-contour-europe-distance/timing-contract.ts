/**
 * The timing contract for « La moitié de l'Europe est à moins de 132 km de la mer » (BRIEF.md, « The choreography »).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0 — a second and a half.
 * - `reference`: 60 frames. The title gives way to the land; the key comes up.
 * - `reveal`: 150 frames. The sweep from every coast to 132 km over about four seconds, linear in kilometres, the
 *   100 km line left behind; the median line lands.
 * - `subject`: 210 frames. The sweep on to 682 km over about six seconds; the farthest point marked.
 * - `conclusion`: 120 frames. The fill withdraws, the lines stay; the credit.
 * - `hold`: 90 frames: the contour map the video ends on.
 *
 * Total: 699 frames, 23.3 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CONTOUR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 699,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 117, duration: 150 },
  subject: { start: 273, duration: 210 },
  conclusion: { start: 489, duration: 120 },
  hold: { start: 609, duration: 90 },
};
