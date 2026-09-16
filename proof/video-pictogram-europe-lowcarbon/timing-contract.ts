/**
 * The timing contract for « L'Europe électrique est aux deux bouts : 6 pays seulement au milieu » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 105 frames. The axis; a square drops onto its column as the front sweeps from 0 to 100 %.
 * - `reveal`: 75 frames. The two cuts rise; the axis parts at them.
 * - `subject`: 195 frames. Each part settles into its block, the j-th square of every block at the same moment; the counts.
 * - `conclusion`: 90 frames. The parts close into the pictogram, magnified; the ring round « 6 pays »; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 570 frames, 19 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const PICTOGRAM_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 570,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 105 },
  reveal: { start: 150, duration: 75 },
  subject: { start: 225, duration: 195 },
  conclusion: { start: 420, duration: 90 },
  hold: { start: 510, duration: 60 },
};
