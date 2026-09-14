/**
 * The timing contract for « L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂ » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The rows; the 1990 names.
 * - `reveal`: 270 frames. The lines advance 35 years in about eight seconds — seven frames a year; the 2024 names land.
 * - `subject`: 90 frames. Every line but India and the three it passed steps back.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames.
 *
 * Total: 621 frames, 20.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BUMP_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 621,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 270 },
  subject: { start: 381, duration: 90 },
  conclusion: { start: 471, duration: 60 },
  hold: { start: 531, duration: 90 },
};
