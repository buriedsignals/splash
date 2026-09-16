/**
 * The timing contract for « Sept pays européens dépassent 94 % d'électricité bas-carbone — six au
 * nord-ouest, et l'Albanie », version 2: the scrolly's six cards told in time (BRIEF.md, « The
 * choreography »). Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`).
 *
 * - `establish`: 45 frames. THE TITLE CARD, alone on the ground from frame 0 — a second and a half for a title
 *   of a dozen words (the owner, 2026-09-14: « le titre reste trop longtemps affiché »), then the story.
 * - `reference` (card 2): 72 frames — the title card gives way to the map, the panel arrives, then about ten per
 *   class; the three lowest shares are named once their class has landed.
 * - `reveal` (cards 3 + 4): 144 frames. THE FLOOR RISES: a cursor travels the key borne by borne,
 *   40, 55, 70, 85, 94 %, and each class it passes steps back to bare land while the counter steps down
 *   40 → 32 → 26 → 20 → 12 → 7. Five steps in 70 % of the event, about 20 frames each — long enough to
 *   read a count before the next one replaces it. The six names land in the last part, once the floor
 *   stands at 94 %.
 * - `subject` (card 5): 165 frames. The camera's travel is 50 frames of it; the close-up's names land only after
 *   it has settled, and each measured share counts up with its gauge — one scale, the 94 % floor notched on it.
 * - `conclusion` (card 6): 84 frames. The close-up names leave, the camera pulls back, the names of the
 *   whole map land, then the source is set on the sea. No end card: the video ends on the map.
 * - `hold`: 60 frames (2 s): the map the video ends on — the seven named, Albania ringed — and the source.
 *
 * The owner (2026-09-15): « ajuste mieux ton rythme pour rendre ça plus dynamique ».
 *
 * Total: 579 frames, 19.3 seconds at 30 fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CHOROPLETH_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 579,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 72 },
  reveal: { start: 120, duration: 144 },
  subject: { start: 267, duration: 165 },
  conclusion: { start: 435, duration: 84 },
  hold: { start: 519, duration: 60 },
};
