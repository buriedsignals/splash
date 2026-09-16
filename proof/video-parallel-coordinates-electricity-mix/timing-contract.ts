/**
 * The timing contract for « 2 pays sur 16 ont plus de 25 % de nucléaire et plus de 20 % d’éolien » (BRIEF.md). A brisk
 * rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 135 frames. Finland's bar grows, splits, stands on the seven rails; its line joins the tops.
 * - `reveal`: 105 frames. The fifteen other lines drawn, each named.
 * - `subject`: 216 frames. The nuclear–wind gap opens; the floor rises on each rail, « 16 pays » → 5 → 2; the pair in the
 *   accent.
 * - `conclusion`: 78 frames. The rails close back, every line returns; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 645 frames, 21.5 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const PARALLEL_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 645,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 135 },
  reveal: { start: 186, duration: 105 },
  subject: { start: 291, duration: 216 },
  conclusion: { start: 507, duration: 78 },
  hold: { start: 585, duration: 60 },
};
