/**
 * This map beat's timing contract — the one object a journalist edits to retime it.
 *
 * The vocabulary is not redefined here either: `BeatTiming`, `progressOf` and `checkTiming` are
 * `./timing-contract.ts`, a physical copy of the motion grammar's vocabulary from
 * `twin-chart-video/assets/timing.ts`. A copy, not an import, because a skill never reaches across
 * another skill's boundary at runtime — the copy is guarded byte-identical to its source by
 * `splash-twin/test/root-template-shared.test.ts`, so it cannot drift silently. The six editorial
 * events and the structural rules are the motion grammar's, not the chart genre's, and a second
 * copy of `checkTiming` would be two engines quietly disagreeing about what "the conclusion cannot
 * precede its evidence" means — which is exactly what the guard test prevents.
 * What is local to a beat is its EDIT, which is the object below.
 */

import type { BeatTiming } from "./timing-contract";

export { checkTiming, endOf, progressOf } from "./timing-contract";
export type { BeatTiming, TimingEvent } from "./timing-contract";

/**
 * The edit, in words: the frame comes up — title, source, basemap, the empty scale (0.87s) — the
 * European average is marked on that scale (0.67s) and then left alone for 0.6s so it can be read,
 * the countries fill in from the lowest emitter to the highest (2.87s), Switzerland is outlined and
 * named on its own (0.67s), its value takes its place on the scale beside the average (0.73s), and
 * the finished map is held for 1.27s.
 *
 * The two things the reader must compare are therefore the FIRST and the LAST marks to arrive, on
 * one scale, with the whole distribution built between them.
 */
export const MAP_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 20 },
  reveal: { start: 70, duration: 86 },
  subject: { start: 158, duration: 20 },
  conclusion: { start: 180, duration: 22 },
  hold: { start: 202, duration: 38 },
};
