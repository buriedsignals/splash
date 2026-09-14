/**
 * The timing contract for « La Chine a triplé son CO₂ par personne, l'écart avec les États-Unis est passé de 7,5 à 1,7 »
 * (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. The six names on the zero line.
 * - `reveal`: 150 frames. The 2000 levels rise pair by pair, each counting.
 * - `subject`: 150 frames. Every second stem travels to 2023; the ratio counts down.
 * - `conclusion`: 90 frames. The four others step back, China's head ringed; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 576 frames, 19.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const LOLLIPOP_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 576,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 96, duration: 150 },
  subject: { start: 246, duration: 150 },
  conclusion: { start: 396, duration: 90 },
  hold: { start: 486, duration: 90 },
};
