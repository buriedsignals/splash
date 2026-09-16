/**
 * The timing contract for « L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000 » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 66 frames. The twelve 2000 levels grow from zero, France first.
 * - `reveal`: 105 frames. Row after row the part added by 2024 stacks on its level, the gain counting.
 * - `subject`: 180 frames. Five copies of Spain's level lay along France's; the added parts slide off to zero; the rows
 *   re-sort by gain.
 * - `conclusion`: 96 frames. The added parts slide back onto their levels; Spain and France ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 558 frames, 18.6 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const STACKED_BAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 558,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 66 },
  reveal: { start: 117, duration: 105 },
  subject: { start: 222, duration: 180 },
  conclusion: { start: 402, duration: 96 },
  hold: { start: 498, duration: 60 },
};
