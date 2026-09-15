/**
 * The timing contract for « L’eau et l’atome portent encore 77 % du bas-carbone européen, mais 10 pays ont basculé »
 * (BRIEF.md). A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. One block fills the frame from the left, « 469 GW » counting.
 * - `reveal`: 84 frames. Seams cut the block into its cells, largest first.
 * - `subject`: 216 frames. Wind and solar rise in every cell; ten flood; the ten slide onto France's cell.
 * - `conclusion`: 90 frames. The ten slide home; France ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 561 frames, 18.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const TREEMAP_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 561,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 84 },
  subject: { start: 195, duration: 216 },
  conclusion: { start: 411, duration: 90 },
  hold: { start: 501, duration: 60 },
};
