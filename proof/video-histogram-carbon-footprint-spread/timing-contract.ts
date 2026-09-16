/**
 * The timing contract for « 6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The zero line and the bin names; a tick per country swept along the axis.
 * - `reveal`: 150 frames. Every tick falls into its bin as one cell, the bins rising at one pace; the count ticks.
 * - `subject`: 180 frames. The 4-tonne cut and « 127 »; the tail's bins stack onto the 4–8 bin; tenths of the 213.
 * - `conclusion`: 90 frames. The tenths close; the tail's bins back in their slots; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 585 frames, 19.5 seconds at 30 fps — a brisk rhythm.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const HISTOGRAM_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 585,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 60 },
  reveal: { start: 105, duration: 150 },
  subject: { start: 255, duration: 180 },
  conclusion: { start: 435, duration: 90 },
  hold: { start: 525, duration: 60 },
};
