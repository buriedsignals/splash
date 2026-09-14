/**
 * The timing contract for « En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967 » (BRIEF.md). Brisk.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. The ticks and the decades.
 * - `reveal`: 240 frames. The line traces 75 years — three frames a year — the 1973 peak marked once passed.
 * - `subject`: 150 frames. 2024 ringed; a level line shoots back from it, the year counting down at its head, and lands
 *   where the rising line first reached that level: 1967, ringed.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 60 frames.
 *
 * Total: 606 frames, 20.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const LINE_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 606,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 96, duration: 240 },
  subject: { start: 336, duration: 150 },
  conclusion: { start: 486, duration: 60 },
  hold: { start: 546, duration: 60 },
};
