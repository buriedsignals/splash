/**
 * The timing contract for `video-cold2-coal-share-europe` (BRIEF.md, « The choreography »).
 *
 * - `establish` 45: the title card, alone on the ground from frame 0.
 * - `reference` 75: the twelve arrive in their 2010 class, lowest first, with the key.
 * - `reveal` 150: the years run 2010 → 2024, ten frames a year, the count stepping 3 → 1.
 * - `subject` 210: the camera closes on Poland as the map rewinds to 2010; the three named; the years replay,
 *   eight frames a year, each gauge counting down past the notched half.
 * - `conclusion` 60: pull back to the whole map, Poland outlined and named, the credit.
 * - `hold` 60.
 *
 * Total: 600 frames, 20 s at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 600,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 75 },
  reveal: { start: 120, duration: 150 },
  subject: { start: 270, duration: 210 },
  conclusion: { start: 480, duration: 60 },
  hold: { start: 540, duration: 60 },
};
