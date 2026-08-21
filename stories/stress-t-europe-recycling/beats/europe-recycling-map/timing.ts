/**
 * This beat's timing contract. `BeatTiming`, `progressOf` and `checkTiming` come from the shared
 * copy (`#shared/chart-video/timing.ts`) rather than being re-implemented — a story beat may reach
 * that shared alias, unlike a skill, which never imports out of itself.
 *
 * The edit, in words: the frame comes up — title, subtitle, the empty legend, the credit (1.33s);
 * the continent is laid down as the thing the argument is measured against, thirty-one countries
 * arriving under the no-data hatch because most of Europe did not report (1.47s); it is then left
 * alone for 0.73s so a reader can take in how much of the map has no value at all; the eleven that
 * did report fill in from the lowest rate to the highest, stopping one short (3.2s); Germany lands
 * on its own, outlined and named (1.53s); the sentence that closes the argument — the distance
 * between the two ends — appears once both ends are on screen (0.8s); and the finished map is held
 * for one second.
 *
 * The two things the reader must compare are the FIRST and the LAST marks to arrive, with the
 * whole distribution built between them.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export { checkTiming, endOf, progressOf } from "#shared/chart-video/timing.ts";
export type { BeatTiming, TimingEvent } from "#shared/chart-video/timing.ts";

export const RECYCLING_TIMING: BeatTiming = {
  fps: 30,
  total: 330,
  establish: { start: 0, duration: 40 },
  reference: { start: 46, duration: 44 },
  reveal: { start: 112, duration: 96 },
  subject: { start: 224, duration: 46 },
  conclusion: { start: 276, duration: 24 },
  hold: { start: 300, duration: 30 },
};
