import type { BeatTiming } from "./timing-contract";

export { checkTiming, endOf, progressOf } from "./timing-contract";
export type { BeatTiming, TimingEvent } from "./timing-contract";

/**
 * The edit: the frame comes up — title, source, basemap (0.87s) — the size legend fades in (0.67s)
 * and is left for 0.6s so it can be read, the 16 secondary events fill in from smallest to largest
 * (2.87s), Tohoku crossfades to the accent and is labelled on its own (0.67s), the energy-ratio
 * conclusion states the number (0.73s), and the finished map is held for 1.27s.
 */
export const QUAKE_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 20 },
  reveal: { start: 70, duration: 86 },
  subject: { start: 158, duration: 20 },
  conclusion: { start: 180, duration: 22 },
  hold: { start: 202, duration: 38 },
};
