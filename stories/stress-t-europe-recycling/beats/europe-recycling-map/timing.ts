/**
 * This beat's timing contract. `BeatTiming`, `progressOf` and `checkTiming` come from the shared
 * copy (`#shared/chart-video/timing.ts`) rather than being re-implemented — a story beat may reach
 * that shared alias, unlike a skill, which never imports out of itself.
 *
 * The edit, in words: the frame comes up — title, the empty legend, the caveat, the credit (1.33s);
 * the continent is laid down as the thing the argument is measured against, thirty-one countries
 * arriving TOGETHER under the no-data hatch because most of Europe did not report (1.33s); it is
 * then left alone for 0.73s so a reader can take in how much of the map has no value at all; the
 * eleven that did report fill in, all at once, as one fact (1s); Germany is then outlined and named
 * on its own (1.33s); the sentence that closes the argument — the distance between the two ends —
 * appears once both ends are on screen (0.8s); and the finished map is held for 1.8s.
 *
 * WHAT CHANGED, and why the piece is nearly two seconds shorter. The reveal used to run 3.2s
 * because it was staggering the eleven countries one after another, lowest rate to highest, each
 * waiting its turn under a stipple invented to hold it there. Every one of these readings is from
 * March 2025: there is no chronology across them and no argument that ranks them, so that order was
 * invented — `motion-grammar.md`, "the order is chronological, or it is argumentative", and
 * `geo-discipline.md` rule 10. The values now arrive together; the stipple went with the stagger;
 * the frames the reveal gave back went to the hold, which is the frame a reader actually reads.
 *
 * The two things the reader must compare are the field that arrives and the subject accented after
 * it — not a first and a last mark, because there is no first and no last.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export { checkTiming, endOf, progressOf } from "#shared/chart-video/timing.ts";
export type { BeatTiming, TimingEvent } from "#shared/chart-video/timing.ts";

export const RECYCLING_TIMING: BeatTiming = {
  fps: 30,
  total: 280,
  establish: { start: 0, duration: 40 },
  reference: { start: 46, duration: 40 },
  reveal: { start: 108, duration: 30 },
  subject: { start: 156, duration: 40 },
  conclusion: { start: 202, duration: 24 },
  hold: { start: 226, duration: 54 },
};
