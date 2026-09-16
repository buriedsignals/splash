/**
 * The timing contract for "solar and wind went from almost nothing to 7% of Switzerland's
 * electricity."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem (`BRIEF.md`'s "The motion
 * problem") is FOUR columns arriving in chronological order, each a THREE-segment stack that must
 * rise together as one event:
 *
 * - `establish` — title, source, legend (which hue is which segment) — same rhythm as every prior
 *   beat (0/26).
 * - `reference` draws 2000's own total (66.1 TWh) as a dashed rule, left to right, before any
 *   column grows — the same 18-frame pause floor every prior beat established (`reference` ends
 *   at 54, `reveal` starts at 72).
 * - `reveal` cascades the four columns in their CHRONOLOGICAL order (2000, 2010, 2020, 2024) — not
 *   sorted by magnitude, unlike the grouped-bar beat's cross-country ranking, because these four
 *   points are one entity's own history, and `motion-grammar.md`'s "the order is chronological, or
 *   it is argumentative" makes chronological the only honest choice here. 80 frames: close to the
 *   single-line beat's continuous draw (78), because four discrete year-columns is a shorter
 *   cascade than the grouped-bar beat's five cross-country categories.
 * - `subject` cannot start before every column has finished stacking (`checkTiming`'s ordering
 *   rule) — solar & wind's ring and highlight land on the 2024 column's baseline segment only once
 *   all four columns, including 2024's own nuclear & other segment above it, are already visible.
 *   22 frames.
 * - `conclusion` states the one new fact — solar & wind's 2024 share against its 2000 share
 *   ("7.5% of the mix in 2024 — near zero in 2000") — once the subject has landed. 28 frames.
 * - `hold` — 46 frames, comfortably over the half-second floor.
 *
 * Total: 248 frames, 8.3 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const STACKED_BAR_TIMING: BeatTiming = {
  fps: 30,
  total: 248,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 80 },
  subject: { start: 152, duration: 22 },
  conclusion: { start: 174, duration: 28 },
  hold: { start: 202, duration: 46 },
};
