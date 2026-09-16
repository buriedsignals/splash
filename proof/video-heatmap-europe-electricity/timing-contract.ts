/**
 * The timing contract for « Sept pays européens dépassent 94 % d’électricité bas-carbone, par trois chemins » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 135 frames. Row after row a bar of 100 % grows over the 94 % line; « 7 pays » counts.
 * - `reveal`: 135 frames. Every bar splits into its nine sources, each segment folding into its cell's colour.
 * - `subject`: 150 frames. The others step back; two rows swap; the seven part into three routes, the nuclear column ringed.
 * - `conclusion`: 90 frames. Everything returns — the whole matrix in rank order, the seven bracketed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 621 frames, 20.7 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const HEATMAP_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 621,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 135 },
  reveal: { start: 186, duration: 135 },
  subject: { start: 321, duration: 150 },
  conclusion: { start: 471, duration: 90 },
  hold: { start: 561, duration: 60 },
};
