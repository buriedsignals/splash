/**
 * The timing contract for « Au-delà de 30 000 $ par personne, l’espérance de vie tient dans une bande 3 fois plus étroite »
 * (BRIEF.md). A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 54 frames. The gridlines, the ticks, one column of 165 dots at their ages.
 * - `reveal`: 150 frames. Poorest first, each dot flies to its income; « {n} pays » climbs to 165.
 * - `subject`: 210 frames. The break drawn; the cloud folds into two columns; the two bars; three copies of the short bar
 *   stacked on the long one; « 3 fois ».
 * - `conclusion`: 75 frames. The dots unfold back; the copies go; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 600 frames, 20 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SCATTER_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 600,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 54 },
  reveal: { start: 105, duration: 150 },
  subject: { start: 255, duration: 210 },
  conclusion: { start: 465, duration: 75 },
  hold: { start: 540, duration: 60 },
};
