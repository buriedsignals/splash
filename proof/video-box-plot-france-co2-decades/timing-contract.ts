/**
 * The timing contract for « Les émissions de CO2 par personne en France ont culminé dans les années 1970 » (BRIEF.md).
 * A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 75 frames. The ticks and decade names; the 75 annual readings in chronological order.
 * - `reveal`: 165 frames. Decade after decade the readings gather into a column, the box is drawn out of them and lifts out.
 * - `subject`: 165 frames. One median walks the decades: up to the 1970s, down at every step after.
 * - `conclusion`: 60 frames. The walking median dissolves; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 576 frames, 19.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BOXPLOT_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 576,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 75 },
  reveal: { start: 126, duration: 165 },
  subject: { start: 291, duration: 165 },
  conclusion: { start: 456, duration: 60 },
  hold: { start: 516, duration: 60 },
};
