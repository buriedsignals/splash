/**
 * The timing contract for « Le charbon, 12 % de l’électricité de six pays, tient dans deux colonnes » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 105 frames. The whole block, « 1 638 TWh »; it parts into six columns, names and totals arriving.
 * - `reveal`: 120 frames. Column after column the nine bands grow up from the foot; the source names in the gutter.
 * - `subject`: 180 frames. Every band but coal steps back; the coal cells pour, area kept, into one strip.
 * - `conclusion`: 90 frames. The coal flies back into its holes, everything returns, Germany's and Poland's coal ringed.
 * - `hold`: 60 frames.
 *
 * Total: 600 frames, 20 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const MARIMEKKO_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 600,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 105 },
  reveal: { start: 150, duration: 120 },
  subject: { start: 270, duration: 180 },
  conclusion: { start: 450, duration: 90 },
  hold: { start: 540, duration: 60 },
};
