/**
 * The timing contract of a bar-and-column GESTURE video (craft/gestures/GRAMMAR.md §5): six events, the first two the
 * scheduler's, the next three one composed gesture each, the last a hold of the conclusion.
 *
 * - `establish`: 90 frames. THE TITLE CARD from frame 0 — the takeaway, word for word, long enough to read.
 * - `reference`: 60 frames. The chart arrives on its scale: names, the zero rule, the bars growing from zero.
 * - `reveal`: 120 frames. The first gesture.
 * - `subject`: 120 frames. The second gesture.
 * - `conclusion`: 150 frames. What was zoomed or filtered returns; the third gesture; the credit.
 * - `hold`: 90 frames. The conclusion, still.
 *
 * Total: 636 frames, 21.2 seconds at 30 fps. The pauses between events are the gaps below.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const GESTURE_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 636,
  establish: { start: 0, duration: 90 },
  reference: { start: 96, duration: 60 },
  reveal: { start: 156, duration: 120 },
  subject: { start: 276, duration: 120 },
  conclusion: { start: 396, duration: 150 },
  hold: { start: 546, duration: 90 },
};
