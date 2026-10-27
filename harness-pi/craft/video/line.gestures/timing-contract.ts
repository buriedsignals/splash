/**
 * The timing contract of a Time-series GESTURE video (craft/gestures/GRAMMAR.md §5): six events, the first two the
 * scheduler's, the next three one composed gesture each, the last a hold of the conclusion.
 *
 * - `establish`: 90 frames. The title card — the takeaway, word for word.
 * - `reference`: 60 frames. The axes, then the series arriving (empty when a reveal or a trace will draw them).
 * - `reveal`, `subject`: 120 frames each. One gesture each; a trace or a reveal draws linearly in time.
 * - `conclusion`: 150 frames. What was zoomed or filtered returns, every series reaches its end; the credit.
 * - `hold`: 90 frames. The conclusion, still.
 *
 * Total: 636 frames, 21.2 seconds at 30 fps (the bar gesture kit's contract).
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
