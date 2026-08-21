/**
 * The timing contract for "two readings of one railway, twelve years, opposite directions".
 *
 * Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`), because this beat's argument
 * is a different shape from the seed's: there are two series, and its subject — 2020 — sits inside
 * both of them, five years before either ends. A reveal that stopped at the subject would hide the
 * recovery that follows it, and the recovery is half of what makes 2020 a break rather than a new
 * level. So `reveal` always draws BOTH series whole, 2014 to 2025, before `subject` starts;
 * `subject` draws no new data at all, it is a distinct emphasis event landing on marks already on
 * screen, in both panels at once.
 *
 * It runs 300 frames where the seed runs 240, and every extra frame is spent on the two things
 * this beat has that the seed does not. `establish` is 30 rather than 26 because the furniture it
 * raises is two panels, two y scales and two named series rather than one of each. `subject` is 24
 * rather than 18 because it lands in two places and ties them together. `conclusion` is 30 rather
 * than 24 because it states two values, one per panel, not one.
 *
 * The 24-frame gap between `reference` ending at 60 and `reveal` starting at 84 is the pause the
 * motion grammar asks for, and it is 0.8s rather than the seed's 0.6s for the same reason: there
 * are two labelled reference rules to read here, not one.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into a skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const RAIL_TIMING: BeatTiming = {
  fps: 30,
  total: 300,
  establish: { start: 0, duration: 30 },
  reference: { start: 36, duration: 24 },
  reveal: { start: 84, duration: 96 },
  subject: { start: 186, duration: 24 },
  conclusion: { start: 216, duration: 30 },
  hold: { start: 252, duration: 48 },
};
