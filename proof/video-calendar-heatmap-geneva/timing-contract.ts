/**
 * The timing contract for « 31 jours d'affilée au-dessus de 20 °C à Genève » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 45 frames. The empty calendar and the key.
 * - `reveal`: 300 frames. The year fills day by day — 366 days in about nine seconds — the warm days counted.
 * - `subject`: 180 frames. The days under 20 °C step back; the run is outlined day by day, counted to 31.
 * - `conclusion`: 60 frames. The colours back; the credit.
 * - `hold`: 90 frames.
 *
 * Total: 726 frames, 24.2 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CALENDAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 726,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 45 },
  reveal: { start: 96, duration: 300 },
  subject: { start: 396, duration: 180 },
  conclusion: { start: 576, duration: 60 },
  hold: { start: 636, duration: 90 },
};
