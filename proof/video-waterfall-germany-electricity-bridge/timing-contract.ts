/**
 * The timing contract for « L'Allemagne a produit 143 TWh d'électricité de moins en 2024 qu'en 2015 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 90 frames. The ticks; the 2015 total grows from zero; a copy slides to the 2024 slot.
 * - `reveal`: 120 frames. Seams cut both totals into their members; the 2024 copy's members go to 2024, its total counting.
 * - `subject`: 180 frames. The names ride to their slots; the gained and lost parts slide onto the running total.
 * - `conclusion`: 60 frames. The seams close; the net change bracketed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 555 frames, 18.5 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const WATERFALL_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 555,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 90 },
  reveal: { start: 135, duration: 120 },
  subject: { start: 255, duration: 180 },
  conclusion: { start: 435, duration: 60 },
  hold: { start: 495, duration: 60 },
};
