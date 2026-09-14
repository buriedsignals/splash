/**
 * The timing contract for « Par pays 65,1 % ; au km² 44,9 % » — the scrolly's cards told in time (BRIEF.md,
 * « The choreography »). Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`).
 *
 * - `establish`: 45 frames. THE TITLE CARD, alone on the ground from frame 0 — a second and a half.
 * - `reference`: 120 frames, after a 6-frame breath. The title gives way to the map, the key comes up, and the
 *   five classes arrive lowest first — about nineteen frames each.
 * - `reveal`: 120 frames. Every country but Russia steps back, RUSSIE is named, and « au km² » counts up to
 *   44,9 % over a little more than a second, then is left to be read.
 * - `subject`: 150 frames. THE MORPH: the others return, then every country travels into its equal tile over
 *   about three seconds — slower than a cut, so Russia can be seen shrinking and Malta swelling — and the codes
 *   land on the tiles.
 * - `conclusion`: 120 frames. « par pays » counts up to 65,1 % under the first count; the credit is set.
 * - `hold`: 90 frames (3 s): the cartogram the video ends on.
 *
 * Total: 669 frames, 22.3 seconds at 30 fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CARTOGRAM_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 669,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 120 },
  reveal: { start: 177, duration: 120 },
  subject: { start: 303, duration: 150 },
  conclusion: { start: 459, duration: 120 },
  hold: { start: 579, duration: 90 },
};
