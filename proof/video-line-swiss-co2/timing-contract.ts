/**
 * The timing contract for « En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The ticks, the decades, the 1967 rule.
 * - `reveal`: 240 frames. The line traces 75 years in about seven seconds — three frames a year.
 * - `subject`: 75 frames. 2024 ringed and named.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 588 frames, 19.6 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const LINE_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 588,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 117, duration: 240 },
  subject: { start: 363, duration: 75 },
  conclusion: { start: 438, duration: 60 },
  hold: { start: 498, duration: 90 },
};
