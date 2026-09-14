/**
 * The timing contract for « La Croatie est le seul pays de l'UE à émettre plus de CO₂ par personne qu'en 1990 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 120 frames. The 27 names; the 1990 levels grow row after row.
 * - `reveal`: 210 frames. Every level goes to 2024, the largest fall first, the part lost left pale; the falls counted.
 * - `subject`: 240 frames. The parts lost slide across the zero line and become the changes; the camera closes ×250 onto
 *   the zero line, where Croatia's rise becomes a length.
 * - `conclusion`: 120 frames. The camera pulls back; every fall steps back, Croatia ringed; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 831 frames, 27.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DIVERGING_BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 831,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 120 },
  reveal: { start: 171, duration: 210 },
  subject: { start: 381, duration: 240 },
  conclusion: { start: 621, duration: 120 },
  hold: { start: 741, duration: 90 },
};
