/**
 * The timing contract for « La Chine a triplé son CO₂ par personne, l'écart avec les États-Unis est passé de 7,5 à 1,7 »
 * (BRIEF.md). A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The six 2000 stems rise.
 * - `reveal`: 150 frames. The four others step back; copies of China's stem fly over and stack beside the American stem:
 *   ×7,5.
 * - `subject`: 120 frames. Every stem travels to 2023, a tint left at 2000; the copies grow, fewer fit: ×1,7.
 * - `conclusion`: 90 frames. The copies go, the whole chart comes back, China ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 531 frames, 17.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const LOLLIPOP_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 531,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 150 },
  subject: { start: 261, duration: 120 },
  conclusion: { start: 381, duration: 90 },
  hold: { start: 471, duration: 60 },
};
