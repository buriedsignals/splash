/**
 * The timing contract for « En France, le nucléaire pèse plus que le fossile et le renouvelable réunis » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 90 frames. The six names; the whole 100 % bars grow from one left edge, row after row.
 * - `reveal`: 120 frames. Each bar slides until its nuclear sits astride the anchor; the totals land at the ends.
 * - `subject`: 180 frames. The five others step back; France's bar parts, its two sides laid end to end under its nuclear.
 * - `conclusion`: 90 frames. France's bar closes, the five return, France's nuclear ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 585 frames, 19.5 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DIVERGING_STACKED_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 585,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 90 },
  reveal: { start: 135, duration: 120 },
  subject: { start: 255, duration: 180 },
  conclusion: { start: 435, duration: 90 },
  hold: { start: 525, duration: 60 },
};
