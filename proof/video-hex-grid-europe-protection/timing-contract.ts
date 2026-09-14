/**
 * The timing contract for « Par habitant, la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The cells land with their codes; the key column comes up.
 * - `reveal`: 120 frames. The cells take their count class, lowest first; Germany ringed and its line.
 * - `subject`: 180 frames. Every cell changes to its rate class over about three seconds; Czechia ringed; the lines.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames: the grid per inhabitant.
 *
 * Total: 573 frames, 19.1 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const HEX_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 573,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 117, duration: 120 },
  subject: { start: 243, duration: 180 },
  conclusion: { start: 423, duration: 60 },
  hold: { start: 483, duration: 90 },
};
