/**
 * The timing contract for « Sept pays européens dépassent 94 % d'électricité bas-carbone — six au
 * nord-ouest, et l'Albanie », version 2: the scrolly's six cards told in time (BRIEF.md, « The
 * choreography »). Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`).
 *
 * - `establish`: 120 frames. THE TITLE CARD, alone on the ground from frame 0 — four seconds to read a title
 *   of up to four lines and the standfirst under it before the story starts.
 * - `reference` (card 2): 100 frames — the title card gives way to the map, the panel arrives, then fifteen per class — six classes, each with time for its fill and
 *   its swatch to visibly land before the next begins; the three lowest shares are named once their class has
 *   landed. It starts after a 6-frame breath.
 * - `reveal` (cards 3 + 4): 160 frames. THE FLOOR RISES: a cursor travels the key borne by borne,
 *   40, 55, 70, 85, 94 %, and each class it passes steps back to bare land while the counter steps down
 *   40 → 32 → 26 → 20 → 12 → 7. Five steps in 70 % of the event, about 22 frames each — long enough to
 *   read a count before the next one replaces it. The six names land in the last part, once the floor
 *   stands at 94 %.
 * - `subject` (card 5): 240 frames. The camera's travel is 48 frames of it (1.6 s) — a zoom that resolves
 *   faster reads as a cut — the close-up's five names land only after it has settled and count their
 *   shares, then the callout is set over the sea and left four seconds to be read.
 * - `conclusion` (card 6): 120 frames. The close-up names leave, the camera pulls back, the eight names of the
 *   whole map land and are left a second, then the END CARD states the claim over the map.
 * - `hold`: 100 frames (3.3 s): the end card's claim, four lines, and its source, to read.
 *
 * Total: 870 frames, 29 seconds at 30 fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CHOROPLETH_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 870,
  establish: { start: 0, duration: 120 },
  reference: { start: 120, duration: 100 },
  reveal: { start: 226, duration: 160 },
  subject: { start: 398, duration: 240 },
  conclusion: { start: 650, duration: 120 },
  hold: { start: 770, duration: 100 },
};
