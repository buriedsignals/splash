/**
 * The timing contract for "Rwanda cut its child mortality rate by three-quarters since 1990."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem (`BRIEF.md`'s "The motion
 * problem") is SIX two-point lines, each its own left dot + connector + right dot arriving
 * together as one event — closer to the dumbbell's per-row cascade than to a continuous line
 * draw, but with no shared starting point the way every dumbbell row shared index 100 (each
 * country here has its OWN 1990 value):
 *
 * - `establish` — title, source, both period captions ("1990", "2023") — same rhythm as every
 *   prior beat (0/26).
 * - `reference` draws the UN SDG 3.2 target (2.5%) as a dashed rule spanning both axes, before
 *   any line appears — the same 18-frame pause floor every prior beat established (`reference`
 *   ends at 54, `reveal` starts at 72).
 * - `reveal` cascades the six lines sorted by 1990 value, descending (Niger's crisis was the
 *   worst in 1990, so it draws first — `BRIEF.md`). 85 frames: between the grouped-bar beat's
 *   five-category cascade (90) and the stacked-bar beat's four-column one (80), for six discrete
 *   line arrivals.
 * - `subject` cannot start before every line has finished drawing (`checkTiming`'s ordering rule)
 *   — Rwanda's ring on both dots, bold line and de-conflicted label crossfading to accent land
 *   only once the whole field, including Niger/Nigeria's close-landing labels, is already
 *   resolved. 24 frames.
 * - `conclusion` states the one new fact — Rwanda's two numbers and the drop between them
 *   ("15.1% → 3.9%, a three-quarters fall") — once the subject has landed. 28 frames.
 * - `hold` — 46 frames, comfortably over the half-second floor.
 *
 * Total: 259 frames, 8.6 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const SLOPE_TIMING: BeatTiming = {
  fps: 30,
  total: 259,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 85 },
  subject: { start: 157, duration: 24 },
  conclusion: { start: 181, duration: 28 },
  hold: { start: 213, duration: 46 },
};
