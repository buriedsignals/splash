/**
 * The timing contract for `video-cold2-world-population` (BRIEF.md, « The choreography »).
 *
 * - `establish` 45: the title card, alone on the ground from frame 0.
 * - `reference` 45: the ticks from zero to 8 billion, the years.
 * - `reveal` 195: the surface fills 1800 → 2023, linear in years, the population counting up.
 * - `subject` 210: the surface tints, the 1800 slice lifts, eight copies fly and stack beside 2023, « ×8 ».
 * - `conclusion` 60: the surface back to the accent, the 2022 crossing named, the credit.
 * - `hold` 60.
 *
 * Total: 615 frames, 20.5 s at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const WORLD_POPULATION_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 615,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 45 },
  reveal: { start: 90, duration: 195 },
  subject: { start: 285, duration: 210 },
  conclusion: { start: 495, duration: 60 },
  hold: { start: 555, duration: 60 },
};
