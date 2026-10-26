/**
 * The timing contract for « La moitié de l'Europe est à moins de 132 km de la mer » (BRIEF.md, « The choreography »).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0 — a second and a half.
 * - `reference`: 45 frames. The title gives way to the land; the key and the empty chart come up.
 * - `reveal`: 135 frames. The sweep from every coast to 132 km over about three and a half seconds, linear in
 *   kilometres, the curve tracing the share of the land it has covered; the median line and its guides land.
 * - `subject`: 165 frames. The sweep on to 682 km over about four and a half seconds, the curve flattening into its
 *   tail; the farthest point marked.
 * - `conclusion`: 75 frames. The fill withdraws, the lines stay; the credit.
 * - `hold`: 60 frames: the contour map the video ends on.
 *
 * The owner (2026-09-15): « ajuste mieux ton rythme pour rendre ça plus dynamique ».
 *
 * Total: 549 frames, 18.3 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CONTOUR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 549,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 102, duration: 135 },
  subject: { start: 243, duration: 165 },
  conclusion: { start: 414, duration: 75 },
  hold: { start: 489, duration: 60 },
};
