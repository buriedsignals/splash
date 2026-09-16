/**
 * The timing contract for « L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂ » (BRIEF.md). A brisk rhythm.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The rows; the 1990 names.
 * - `reveal`: 270 frames. The camera closes in on India's tip and tracks it while the lines advance 35 years — about seven
 *   frames a year — every line named at its tip, each pass ringed as it happens.
 * - `subject`: 90 frames. The camera pulls back to the whole chart; every line but India and the three it passed steps back.
 * - `conclusion`: 60 frames. The whole chart back; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 591 frames, 19.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const BUMP_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 591,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 111, duration: 270 },
  subject: { start: 381, duration: 90 },
  conclusion: { start: 471, duration: 60 },
  hold: { start: 531, duration: 60 },
};
