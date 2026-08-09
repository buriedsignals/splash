import type { BeatTiming } from "./timing-contract";

export { checkTiming, endOf, progressOf } from "./timing-contract";
export type { BeatTiming, TimingEvent } from "./timing-contract";

/**
 * The edit, in words: the frame comes up — title, source, caveat (0.8s) — then the SEARCH'S OWN
 * LIMIT is laid down before any result exists: the city-centre point the query was run from, the
 * 6 km ring the source stopped at, and the empty distance axis under the map (0.6s). Then the
 * radius **grows from 0 to 6 km at a constant rate** (7.0s), and each organisation lands on the
 * frame the moment the ring reaches it. The farthest is named once the sweep has finished (0.67s),
 * the conclusion states the shape of the distribution (1.0s), and the finished map is held for 2.0s.
 *
 * The reference event is doing the real work in this beat. Drawing the 6 km limit BEFORE the sweep
 * starts is what makes the last second and a half — a growing ring finding nothing at all — read as
 * a result rather than as the video running out of data.
 */
export const LOCATOR_TIMING: BeatTiming = {
  fps: 30,
  total: 380,
  establish: { start: 0, duration: 24 },
  reference: { start: 30, duration: 18 },
  reveal: { start: 60, duration: 210 },
  subject: { start: 270, duration: 20 },
  conclusion: { start: 290, duration: 30 },
  hold: { start: 320, duration: 60 },
};
