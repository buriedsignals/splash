/**
 * The timing contract for « Six pays n'ont jamais quitté le top 10 des émetteurs depuis 1990 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The sixteen rows, their names, the years.
 * - `reveal`: 270 frames. The bars grow 35 years in about eight seconds; « {n} pays jamais sortis » falls from 10 to 6.
 * - `subject`: 90 frames. The six who never left picked out; the others step back.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 621 frames, 20.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const GANTT_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 621,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 270 },
  subject: { start: 381, duration: 90 },
  conclusion: { start: 471, duration: 60 },
  hold: { start: 531, duration: 90 },
};
