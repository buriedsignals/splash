/**
 * The timing contract for « Les femmes passent devant les hommes à partir de 60-64 ans » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. Band after band from the foot, the pyramid grows out of the spine.
 * - `reveal`: 150 frames. The men's half folds onto the women's; the shared part leaves; the difference slides to the spine.
 * - `subject`: 120 frames. The scale ×10 around the spine; the rule at the crossing, its two values.
 * - `conclusion`: 90 frames. The camera back; the shared part grows back, the whole pyramid; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 531 frames, 17.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const PYRAMID_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 531,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 150 },
  subject: { start: 261, duration: 120 },
  conclusion: { start: 381, duration: 90 },
  hold: { start: 471, duration: 60 },
};
