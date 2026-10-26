/**
 * The timing contract for « Un centième des sites porte plus d'un tiers de la puissance » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. Europe; the key's named circles.
 * - `reveal`: 210 frames. The hundred circles, largest first, about six seconds; the counts climb.
 * - `subject`: 105 frames. The other 8 800 as faint points; their share.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 588 frames, 19.6 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SYMBOL_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 588,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 117, duration: 210 },
  subject: { start: 333, duration: 105 },
  conclusion: { start: 438, duration: 60 },
  hold: { start: 498, duration: 90 },
};
