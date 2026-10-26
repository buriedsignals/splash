/**
 * The timing contract for « Le nucléaire de ces six pays est français à 84 % » (BRIEF.md). A brisk rhythm: moves
 * overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. One bar grows down the left rail, « 1 638 TWh » counting.
 * - `reveal`: 150 frames. The bar splits into the nine sources; the ribbons pour into the six countries.
 * - `subject`: 210 frames. Every ribbon but nuclear's steps back; nuclear → France fills with the accent; the nuclear
 *   bar slides onto France's node, « 84 % ».
 * - `conclusion`: 84 frames. The copy slides home, every ribbon returns, « 84 % » on the ribbon; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 615 frames, 20.5 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SANKEY_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 615,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 150 },
  subject: { start: 261, duration: 210 },
  conclusion: { start: 471, duration: 84 },
  hold: { start: 555, duration: 60 },
};
