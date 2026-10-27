/**
 * The timing contract of a keyed-family GESTURE video (craft/gestures/GRAMMAR.md §5): six events, the first two the
 * scheduler's, the next three one composed gesture each, the last a hold of the conclusion.
 *
 * - `establish`: 75 frames. THE TITLE CARD from frame 0 — the takeaway, word for word.
 * - `reference`: 45 frames. The chart arrives: names, axis, marks.
 * - `reveal`: 90 frames. The first gesture.
 * - `subject`: 90 frames. The second gesture.
 * - `conclusion`: 105 frames. What was filtered returns, the whole chart; the third gesture; the credit.
 * - `hold`: 60 frames. The conclusion, still.
 *
 * Total: 471 frames, 15.7 seconds at 30 fps.
 */
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const KEYED_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 471,
  establish: { start: 0, duration: 75 },
  reference: { start: 81, duration: 45 },
  reveal: { start: 126, duration: 90 },
  subject: { start: 216, duration: 90 },
  conclusion: { start: 306, duration: 105 },
  hold: { start: 411, duration: 60 },
};
