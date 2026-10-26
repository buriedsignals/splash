/**
 * The timing contract for « La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés »
 * (BRIEF.md). A brisk rhythm: moves overlap, no dead time between gestures.
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The two bars grow on one TWh scale; their names and totals.
 * - `reveal`: 90 frames. Germany's bar stretches to France's length, « 100 % »; gaps cut both into nine sources.
 * - `subject`: 225 frames. The wheel fades in; source after source, both parts swing onto their spoke, the tips joined.
 * - `conclusion`: 75 frames. Both outlines close and fill; nuclear's shares ringed; the credit.
 * - `hold`: 60 frames.
 *
 * Total: 555 frames, 18,5 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const RADAR_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 555,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 60 },
  reveal: { start: 105, duration: 90 },
  subject: { start: 195, duration: 225 },
  conclusion: { start: 420, duration: 75 },
  hold: { start: 495, duration: 60 },
};
