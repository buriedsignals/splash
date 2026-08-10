/**
 * The timing contract for "China's per-person CO2 emissions have nearly tripled since 2000,
 * overtaking the world average."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem (`BRIEF.md`'s "The motion
 * problem") is FIVE categories, each with two bars that must rise TOGETHER from a shared zero
 * baseline — closer to the dumbbell's ten independent rows than to a single traced line, but with
 * fewer categories and each one a paired arrival rather than two independent dots:
 *
 * - `establish` — title, source, legend (which hue is 2000, which is 2023) — same rhythm as every
 *   prior beat (0/26).
 * - `reference` draws the ONE thing every bar is read against: the world-average rule, left to
 *   right, before any bar grows — same 18-frame pause the line and dumbbell beats both established
 *   (`reference` ends at 54, `reveal` starts at 72).
 * - `reveal` cascades the five categories in their sorted order (by 2023 value, descending — the
 *   same order the categories sit in on the x-axis, so the ranking the reader watches assemble is
 *   the ranking the chart ends on). 90 frames: more than a single-line beat's continuous draw (78),
 *   because five paired bar-groups is five discrete arrivals, not one continuous stroke; less than
 *   the dumbbell's 96, because five groups is half the dumbbell's ten rows.
 * - `subject` cannot start before every category has finished rising (`checkTiming`'s ordering
 *   rule) — China's ring, highlight band and bold category label land only once China's own bars
 *   (which arrived second in the reveal, at their natural sorted position) are already fully grown.
 *   24 frames, matching the dumbbell's per-subject emphasis window.
 * - `conclusion` states the one new fact — China's 2023 figure against the world average
 *   ("8.56 t · 1.8× the world average") — once the subject has landed. 28 frames.
 * - `hold` — 46 frames, comfortably over the half-second floor, long enough to read the stated
 *   comparison.
 *
 * Total: 260 frames, 8.7 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const GROUPED_BAR_TIMING: BeatTiming = {
  fps: 30,
  total: 260,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 90 },
  subject: { start: 162, duration: 24 },
  conclusion: { start: 186, duration: 28 },
  hold: { start: 214, duration: 46 },
};
