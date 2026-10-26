/**
 * The timing contract for « La Croatie est le seul pays de l'UE à émettre plus de CO₂ par personne qu'en 1990 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 90 frames. The 27 names; the 1990 levels grow row after row.
 * - `reveal`: 150 frames. Every level goes to 2024, the largest fall first, the part lost left pale; the falls counted.
 * - `subject`: 180 frames. The parts lost slide across the zero line and become the changes; the camera closes ×250 onto
 *   the zero line, where Croatia's rise becomes a length.
 * - `conclusion`: 75 frames. The camera pulls back to the whole chart, Croatia ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 606 frames, 20.2 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DIVERGING_BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 606,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 90 },
  reveal: { start: 141, duration: 150 },
  subject: { start: 291, duration: 180 },
  conclusion: { start: 471, duration: 75 },
  hold: { start: 546, duration: 60 },
};
