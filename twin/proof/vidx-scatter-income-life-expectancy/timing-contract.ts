/**
 * The timing contract for "among twenty wealthy countries, the United States has the lowest life
 * expectancy."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem (`BRIEF.md`'s "The motion
 * problem") is TWENTY independent points, not a continuous trend — closer to the dumbbell's ten
 * rows than to a single traced line, but twice the count and each arrival is a single dot rather
 * than a paired arrival:
 *
 * - `establish` — title, source, both axis labels — same rhythm as every prior beat (0/26).
 * - `reference` draws the peer median (82 years) as a dashed rule, left to right, before any point
 *   appears — the same 18-frame pause floor every prior beat established (`reference` ends at 54,
 *   `reveal` starts at 72).
 * - `reveal` cascades the twenty points in GDP-ascending order (the x-axis's own order — see
 *   `BRIEF.md`). 100 frames: more than the dumbbell's ten-row cascade (96), because twice the
 *   points need slightly more room even with tighter per-point overlap, but not dramatically more,
 *   because a single dot's arrival is a smaller event than a dumbbell row's dot-plus-connector.
 * - `subject` cannot start before every point has landed (`checkTiming`'s ordering rule) — the
 *   United States' ring and bold label land only once the whole cloud, including its own
 *   already-landed dot (16th of 20 in the GDP-ascending cascade, not artificially last), is
 *   visible. 24 frames.
 * - `conclusion` states the one new fact — the US figure against the peer median and its own
 *   income rank — once the subject has landed. 30 frames: the longest conclusion of any beat in
 *   this batch, because the sentence carries two facts (the value AND the income-rank contrast)
 *   rather than one.
 * - `hold` — 46 frames, comfortably over the half-second floor.
 *
 * Total: 272 frames, 9.1 seconds at 30fps — the longest of this batch, matching the largest point
 * count.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SCATTER_TIMING: BeatTiming = {
  fps: 30,
  total: 272,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 100 },
  subject: { start: 172, duration: 24 },
  conclusion: { start: 196, duration: 30 },
  hold: { start: 226, duration: 46 },
};
