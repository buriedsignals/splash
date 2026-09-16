/**
 * The timing contract for « En 2016, le solaire est devenu la troisième source d'électricité suisse » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 30 frames. The year ticks.
 * - `reveal`: 165 frames. The stream flows 25 years in five seconds.
 * - `subject`: 246 frames. The giants set aside, the small sources magnified and turned to lines; the race to 2024.
 * - `conclusion`: 69 frames. The whole stream back, 2016 marked; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 627 frames, 20.9 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const STREAM_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 627,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 30 },
  reveal: { start: 81, duration: 165 },
  subject: { start: 252, duration: 246 },
  conclusion: { start: 498, duration: 69 },
  hold: { start: 567, duration: 60 },
};
