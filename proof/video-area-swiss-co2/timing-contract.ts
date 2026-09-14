/**
 * The timing contract for « La moitié du CO₂ suisse depuis 1858 a été émise après 1986 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The ticks and the years.
 * - `reveal`: 240 frames. The surface fills 167 years in about seven seconds; the stock counts up.
 * - `subject`: 105 frames. The 1986 rule, the two surfaces tinted apart and named.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 606 frames, 20.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const AREA_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 606,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 117, duration: 240 },
  subject: { start: 363, duration: 105 },
  conclusion: { start: 474, duration: 42 },
  hold: { start: 516, duration: 90 },
};
