/**
 * The timing contract of a Cell-grid GESTURE video (craft/gestures/GRAMMAR.md §5): six events, the first two the
 * scheduler's, the next three one composed gesture each, the last a hold of the conclusion.
 *
 * - `establish`: 75 frames. THE TITLE CARD from frame 0 — the takeaway, word for word, long enough to read.
 * - `reference`: 54 frames. The grid arrives with its key and its names; the cells come in (unless a reveal is staged).
 * - `reveal`: 96 frames. The first gesture.
 * - `subject`: 96 frames. The second gesture.
 * - `conclusion`: 108 frames. A filter returns; the third gesture; the credit.
 * - `hold`: 60 frames. The conclusion, still.
 *
 * Total: 501 frames, 16.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CELL_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 501,
  establish: { start: 0, duration: 75 },
  reference: { start: 81, duration: 54 },
  reveal: { start: 135, duration: 96 },
  subject: { start: 231, duration: 96 },
  conclusion: { start: 327, duration: 108 },
  hold: { start: 441, duration: 60 },
};
