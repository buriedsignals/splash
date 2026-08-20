/**
 * This beat's timing contract. `BeatTiming`, `progressOf`, `checkTiming` are imported from the
 * shared copy (`#shared/chart-video/timing.ts`) rather than re-implemented — a story beat may
 * reach that shared alias (unlike a skill, which never imports out of itself).
 *
 * The edit, in words: furniture comes up — title, subtitle, the empty plate, the ranked list's
 * zero baseline (0.8s) — held for 0.67s so the reader can see the frame is empty, then the seven
 * countries fill in and their bars grow TOGETHER, in the data's own order (lowest to highest —
 * `revealOrder`), the article's own "country by country" (3s), Brazil's own outline lands as its
 * own event (0.67s), the "more than the other six combined" line appears (0.67s), and the finished
 * map is held for exactly one second.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export { checkTiming, endOf, progressOf } from "#shared/chart-video/timing.ts";
export type { BeatTiming, TimingEvent } from "#shared/chart-video/timing.ts";

export const FOREST_TIMING: BeatTiming = {
  fps: 30,
  total: 210,
  establish: { start: 0, duration: 24 },
  reference: { start: 24, duration: 20 },
  reveal: { start: 50, duration: 90 },
  subject: { start: 140, duration: 20 },
  conclusion: { start: 160, duration: 20 },
  hold: { start: 180, duration: 30 },
};
