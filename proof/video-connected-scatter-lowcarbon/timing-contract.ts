/**
 * The timing contract for « Tous plus propres chez eux, 5 plus légers en Europe » (BRIEF.md). A brisk rhythm.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 105 frames. The axes, the key; each country's 2000 weight as a bar from zero at its own mix, collapsing to
 *   its ring.
 * - `reveal`: 180 frames. Sixteen countries travel to 2024 one after another, the count climbing as each lands.
 * - `subject`: 105 frames. The close-up onto 0–12 %: the crowd opens and is named.
 * - `conclusion`: 210 frames. The pull back; the five that weigh less, one after another; France's two moves; every country
 *   back — the whole chart; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 711 frames, 23.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CONNECTED_SCATTER_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 711,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 105 },
  reveal: { start: 156, duration: 180 },
  subject: { start: 336, duration: 105 },
  conclusion: { start: 441, duration: 210 },
  hold: { start: 651, duration: 60 },
};
