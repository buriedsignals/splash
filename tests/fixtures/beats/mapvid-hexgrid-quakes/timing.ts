import type { BeatTiming } from "./timing-contract";

export { checkTiming, endOf, progressOf } from "./timing-contract";
export type { BeatTiming, TimingEvent } from "./timing-contract";

/**
 * The edit, in words: the frame comes up — title, source, the caveat (0.8s) — the empty basemap and
 * the class scale are laid down, so a reader knows what a shade will mean before any shade exists
 * (0.6s), then **2024 plays**, one year in seven seconds, each hexagon appearing on the day its
 * first magnitude-4 event was catalogued and darkening as it crosses each class (7.0s). The densest
 * cell is outlined and named once the year has finished (0.67s), the conclusion states what the
 * year showed (1.0s), and the finished map is held for 2.0s.
 *
 * The reveal is the beat. Everything else exists so that the seven seconds in the middle can be
 * read: the argument is that the rim redraws itself continuously, and only a clock can say that.
 */
export const HEXGRID_TIMING: BeatTiming = {
  fps: 30,
  total: 380,
  establish: { start: 0, duration: 24 },
  reference: { start: 30, duration: 18 },
  reveal: { start: 60, duration: 210 },
  subject: { start: 270, duration: 20 },
  conclusion: { start: 290, duration: 30 },
  hold: { start: 320, duration: 60 },
};
