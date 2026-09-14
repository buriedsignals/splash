/**
 * The timing contract for « Par pays 65,1 % ; au km² 44,9 % » (BRIEF.md, « The choreography »). Its own instance of
 * `BeatTiming` (`#shared/chart-video/timing.ts`).
 *
 * - `establish`: 45 frames. THE TITLE CARD, alone on the ground from frame 0 — a second and a half.
 * - `reference`: 84 frames, after a 6-frame breath. The map, the key and the balance come up; the five classes
 *   arrive lowest first — about thirteen frames each — each country's column rising on the balance with it.
 * - `reveal`: 84 frames. Every country but Russia steps back, RUSSIE is named, and the pivot drops under the
 *   area-weighted mean, « au km² 44,9 % ».
 * - `subject`: 180 frames. THE MORPH: every country travels into its equal tile over nearly four seconds while its
 *   column takes the same one-in-forty weight, and a live pivot slides from 44,9 to 65,1 %; the codes land.
 * - `conclusion`: 66 frames. The credit is set.
 * - `hold`: 60 frames: the cartogram the video ends on.
 *
 * The owner (2026-09-15): « ajuste mieux ton rythme pour rendre ça plus dynamique ».
 *
 * Total: 549 frames, 18.3 seconds at 30 fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CARTOGRAM_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 549,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 84 },
  reveal: { start: 141, duration: 84 },
  subject: { start: 231, duration: 180 },
  conclusion: { start: 417, duration: 72 },
  hold: { start: 489, duration: 60 },
};
