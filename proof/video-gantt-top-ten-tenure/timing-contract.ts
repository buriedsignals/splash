/**
 * The timing contract for « Six pays n'ont jamais quitté le top 10 des émetteurs depuis 1990 » (BRIEF.md). A brisk rhythm.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. The sixteen rows, their names, the years.
 * - `reveal`: 240 frames. A year cursor sweeps 1990 → 2024, the ten seats of each year marked on it; the bars grow behind it;
 *   « {n} pays jamais sortis » falls from 10 to 6.
 * - `subject`: 75 frames. The six who never left picked out; the others step back.
 * - `conclusion`: 60 frames. The others back — the whole chart — the six kept in the accent; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 531 frames, 17.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const GANTT_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 531,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 96, duration: 240 },
  subject: { start: 336, duration: 75 },
  conclusion: { start: 411, duration: 60 },
  hold: { start: 471, duration: 60 },
};
