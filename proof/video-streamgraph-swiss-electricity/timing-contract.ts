/**
 * The timing contract for « En 2016, le solaire est devenu la troisième source d'électricité suisse » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. The year ticks.
 * - `reveal`: 240 frames. The stream flows 25 years in about seven seconds; solar's rank rides its band.
 * - `subject`: 105 frames. The other bands step back; the 2016 rule.
 * - `conclusion`: 60 frames. The others return; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 597 frames, 19.9 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const STREAM_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 597,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 102, duration: 240 },
  subject: { start: 342, duration: 105 },
  conclusion: { start: 447, duration: 60 },
  hold: { start: 507, duration: 90 },
};
