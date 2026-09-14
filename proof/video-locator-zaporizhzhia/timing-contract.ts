/**
 * The timing contract for « La plus grosse centrale bas-carbone d'Europe est en Ukraine » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 75 frames. Europe; Ukraine tinted and named; the station's ring.
 * - `reveal`: 135 frames. The camera closes in over about two and a half seconds; the names land once it has settled.
 * - `subject`: 105 frames. The ring closes on the station; its name; the capacity counts up to 6 000 MW.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames: the located station.
 *
 * Total: 528 frames, 17.6 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const LOCATOR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 528,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 75 },
  reveal: { start: 132, duration: 135 },
  subject: { start: 273, duration: 105 },
  conclusion: { start: 378, duration: 60 },
  hold: { start: 438, duration: 90 },
};
