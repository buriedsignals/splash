/**
 * The timing contract for « En 2000 les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023,
 * c'est l'inverse » (BRIEF.md). A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The world's 2000 ring traced from twelve o'clock; its tonnes; two names beside it.
 * - `reveal`: 135 frames. The 2023 ring grows out of it, every arc its tonnes on one scale; the names move to it.
 * - `subject`: 180 frames. The world splits into six rings, country by country, every arc keeping its angle.
 * - `conclusion`: 60 frames. China's number ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 540 frames, 18 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const DONUT_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 540,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 60 },
  reveal: { start: 105, duration: 135 },
  subject: { start: 240, duration: 180 },
  conclusion: { start: 420, duration: 60 },
  hold: { start: 480, duration: 60 },
};
