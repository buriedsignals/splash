/**
 * The timing contract for « Sept pays européens dépassent 94 % d'électricité bas-carbone — six au
 * nord-ouest, et l'Albanie », version 2: the scrolly's six cards told in time (BRIEF.md, « The
 * choreography »). Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`).
 *
 * - `establish` (card 1): 30 frames. The map is up at frame 0; only the furniture comes up here.
 * - `reference` (card 2): 90 frames, fifteen per class — six classes, each with time for its fill and
 *   its swatch to visibly land before the next begins. It starts after a 6-frame breath.
 * - `reveal` (cards 3 + 4): 160 frames. THE FLOOR RISES: a cursor travels the key borne by borne,
 *   40, 55, 70, 85, 94 %, and each class it passes steps back to bare land while the counter steps down
 *   40 → 32 → 26 → 20 → 12 → 7. Five steps in 70 % of the event, about 22 frames each — long enough to
 *   read a count before the next one replaces it. The six names land in the last part, once the floor
 *   stands at 94 %.
 * - `subject` (card 5): 96 frames. The camera's travel is half of it (48 frames, 1.6 s) — a zoom that
 *   resolves faster reads as a cut — and the close-up's five names land only after it has settled.
 * - `conclusion` (card 6): 84 frames. The close-up names leave, the camera pulls back over 42 frames,
 *   then the eight names of the whole map land.
 * - `hold`: 78 frames (2.6 s), over the 60-frame floor: eight names, a counter and a key to read.
 *
 * Total: 580 frames, about 19 seconds at 30 fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CHOROPLETH_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 580,
  establish: { start: 0, duration: 30 },
  reference: { start: 36, duration: 90 },
  reveal: { start: 132, duration: 160 },
  subject: { start: 304, duration: 96 },
  conclusion: { start: 412, duration: 84 },
  hold: { start: 502, duration: 78 },
};
