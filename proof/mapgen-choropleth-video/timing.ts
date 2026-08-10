import type { BeatTiming } from "./timing-contract";

export { checkTiming, endOf, progressOf } from "./timing-contract";
export type { BeatTiming, TimingEvent } from "./timing-contract";

/**
 * The edit, in words: the frame comes up — title, source, basemap, the empty scale (0.8s) —
 * Sweden is marked on that scale (0.6s) and then left alone for 0.6s so it can be read, the 41
 * countries fill in from the lowest emitter to the highest (3.0s), Poland is outlined and named on
 * its own (0.6s), its value lands on the scale beside Sweden's and the ratio is stated as the
 * conclusion (0.8s), and the finished map is held for 1.4s.
 *
 * The two things the reader must compare are therefore the FIRST mark to arrive (Sweden, the
 * comparison) and the LAST (Poland, the subject), on one scale, with the whole distribution of 41
 * countries built between them.
 */
export const CHOROPLETH_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 24 },
  reference: { start: 30, duration: 18 },
  reveal: { start: 66, duration: 90 },
  subject: { start: 156, duration: 18 },
  conclusion: { start: 174, duration: 24 },
  hold: { start: 198, duration: 42 },
};
