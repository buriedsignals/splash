/**
 * The timing contract for « La population mondiale a dépassé 8 milliards en 2022 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 30 frames. The ticks and the years.
 * - `reveal`: 190 frames. The surface fills 224 years in about six seconds; the population counts up.
 * - `subject`: 270 frames. The 1800 slice becomes a unit; copies stack on it to the 2023 level; the level runs to 2023;
 *   the camera closes in on the last years, where 8 billion is crossed in 2022 — a year the overview draws 7 px wide.
 * - `conclusion`: 45 frames. The camera pulls back; the surface returns to full strength; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 658 frames, 21.9 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const POPULATION_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 658,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 30 },
  reveal: { start: 81, duration: 190 },
  subject: { start: 277, duration: 270 },
  conclusion: { start: 553, duration: 45 },
  hold: { start: 598, duration: 60 },
};
