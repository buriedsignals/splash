/**
 * The timing contract for « La moitié du CO₂ suisse depuis 1858 a été émise après 1986 » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 36 frames. The ticks and the years.
 * - `reveal`: 195 frames. The surface fills 167 years in six seconds; the stock counts up.
 * - `subject`: 186 frames. The rule sweeps back from 2024 to 1986 as the gauge fills to half; both halves flatten.
 * - `conclusion`: 60 frames. The curve comes back whole; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 612 frames, 20.4 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const AREA_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 612,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 36 },
  reveal: { start: 87, duration: 195 },
  subject: { start: 288, duration: 186 },
  conclusion: { start: 480, duration: 60 },
  hold: { start: 552, duration: 60 },
};
