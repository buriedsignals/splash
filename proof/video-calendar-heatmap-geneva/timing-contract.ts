/**
 * The timing contract for « 31 jours d'affilée au-dessus de 20 °C à Genève » (BRIEF.md). A brisk rhythm.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 180 frames. The year drawn as its daily temperature over the 20 °C line, the warm days counted.
 * - `reveal`: 120 frames. Every day falls from the curve into its calendar cell and takes its colour.
 * - `subject`: 150 frames. The days under 20 °C step back; the run is outlined day by day, counted to 31.
 * - `conclusion`: 60 frames. The colours back — the whole calendar; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 621 frames, 20.7 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CALENDAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 621,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 180 },
  reveal: { start: 231, duration: 120 },
  subject: { start: 351, duration: 150 },
  conclusion: { start: 501, duration: 60 },
  hold: { start: 561, duration: 60 },
};
