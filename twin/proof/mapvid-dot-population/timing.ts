import type { BeatTiming } from "./timing-contract";

export { checkTiming, endOf, progressOf } from "./timing-contract";
export type { BeatTiming, TimingEvent } from "./timing-contract";

/**
 * The edit, in words: the frame comes up — title, source, caveat (0.8s) — then the two things the
 * argument is measured against are laid down together, the empty land of all 42 countries and the
 * empty meter with its half-way line on it (0.6s). Then the countries arrive **largest first, one
 * at a time, each given exactly the same slice of the clock** (7.0s) while the meter climbs. The
 * five the claim names are labelled once the whole map is drawn (0.67s), the conclusion states the
 * two shares (1.0s), and the finished map is held for 2.0s.
 *
 * EQUAL TIME PER COUNTRY is the whole edit, not a convenience. It is what turns an arithmetic
 * claim — five of forty-two hold more than half — into something a reader watches happen: the
 * meter is past the half-way line one eighth of the way through the reveal, and the remaining
 * seven eighths add less than the first eighth did.
 */
export const DOT_TIMING: BeatTiming = {
  fps: 30,
  total: 380,
  establish: { start: 0, duration: 24 },
  reference: { start: 30, duration: 18 },
  reveal: { start: 60, duration: 210 },
  subject: { start: 270, duration: 20 },
  conclusion: { start: 290, duration: 30 },
  hold: { start: 320, duration: 60 },
};
