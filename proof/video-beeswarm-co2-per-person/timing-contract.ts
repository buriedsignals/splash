/**
 * The timing contract for « Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l’humanité » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 54 frames. The axis, the world-average rule, one disc « Monde » at the average.
 * - `reveal`: 150 frames. The disc bursts into its 213 countries, largest first; « {n} pays » climbs to 213.
 * - `subject`: 210 frames. The six beyond 20 t ringed and bracketed; the world outline back and gliding to the top right;
 *   a copy of each of the six flying into it and merging; « 0,6 % ».
 * - `conclusion`: 75 frames. The copies fly back; the outline goes; « 0,6 % » under « 6 pays »; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 600 frames, 20 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BEESWARM_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 600,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 54 },
  reveal: { start: 105, duration: 150 },
  subject: { start: 255, duration: 210 },
  conclusion: { start: 465, duration: 75 },
  hold: { start: 540, duration: 60 },
};
