/**
 * The timing contract for « Sept pays européens dépassent 94 % d'électricité bas-carbone — six au
 * nord-ouest, et l'Albanie », version 2: the scrolly's six cards told in time (BRIEF.md, « The
 * choreography »). Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`).
 *
 * - `establish` (card 1): 30 frames. The map is up at frame 0; only the furniture comes up here.
 * - `reference` (card 2): 90 frames, fifteen per class — six classes, each with time for its fill and
 *   its swatch to visibly land before the next begins. It starts after a 6-frame breath.
 * - `reveal` (cards 3 + 4): 90 frames. The filter and the count take the first 45 %, the six names the
 *   last part, once the 33 have stepped back — two readings in sequence, so each gets about a second
 *   and a half of its own.
 * - `subject` (card 5): 96 frames. The camera's travel is half of it (48 frames, 1.6 s) — a zoom that
 *   resolves faster reads as a cut — and the close-up's five names land only after it has settled.
 * - `conclusion` (card 6): 84 frames. The close-up names leave, the camera pulls back over 42 frames,
 *   then the eight names of the whole map land.
 * - `hold`: 78 frames (2.6 s), over the 60-frame floor: eight names, a counter and a key to read.
 *
 * Total: 510 frames, 17 seconds at 30 fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CHOROPLETH_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 510,
  establish: { start: 0, duration: 30 },
  reference: { start: 36, duration: 90 },
  reveal: { start: 132, duration: 90 },
  subject: { start: 234, duration: 96 },
  conclusion: { start: 342, duration: 84 },
  hold: { start: 432, duration: 78 },
};
