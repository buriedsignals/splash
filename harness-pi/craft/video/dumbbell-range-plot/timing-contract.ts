/**
 * The timing contract for « Tous les dix ont gagné des années de vie — la Pologne 5,0 ans, les États-Unis 2,5 » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 54 frames. The axis, the ten names ranked by their 2000 level, the 2000 dots.
 * - `reveal`: 120 frames. Row by row each dot travels to 2023; « {n} en hausse » climbs to 10.
 * - `subject`: 210 frames. The rows re-rank by gain; a copy of each gain slides onto Poland's 2000 start, one after another;
 *   the gains written as they land; Poland's row ringed.
 * - `conclusion`: 75 frames. The copies slide back onto their dumbbells; the whole chart; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 570 frames, 19 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DUMBBELL_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 570,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 54 },
  reveal: { start: 105, duration: 120 },
  subject: { start: 225, duration: 210 },
  conclusion: { start: 435, duration: 75 },
  hold: { start: 510, duration: 60 },
};
