/**
 * The timing contract for "Switzerland has kept a longer life expectancy than France for over
 * three decades."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem is TWO series sharing one
 * time axis, drawn at the SAME pace (`BRIEF.md`'s "The motion problem" — neither may lead the
 * other, because the claim is about the whole span, not who arrives first):
 *
 * - `establish` brings up the title, source line and axis — same rhythm as every prior beat
 *   (0/26).
 * - `reference` draws the ONE thing both series are read against: the 80-year rule, left to
 *   right, before either line — 18-frame pause after it ends (54) and before `reveal` starts
 *   (72), same floor the seed established, long enough to actually read "80 years" before the
 *   lines arrive.
 * - `reveal` draws both lines together, chronologically, 1990 → 2023, at the identical pace
 *   (both windowed off the SAME `reveal` progress fraction) — matches the seed's single-line
 *   reveal duration (78 frames) because this is still one continuous time-axis draw, not a
 *   cascade of discrete rows like the dumbbell's ten.
 * - `subject` cannot start before `reveal` ends (`checkTiming`'s ordering rule) — Switzerland's
 *   ring pops onto its already-landed endpoint once France's line is visible too, never before.
 *   20 frames: shorter than the dumbbell's per-row emphasis because there is exactly one ring to
 *   land, not a highlight band plus a label crossfade.
 * - `conclusion` states the one new fact — the persistent gap ("83,95 · 0,6 an d'avance" /
 *   "0.6 years ahead") — once the subject has landed. 26 frames, room for two short lines of
 *   text.
 * - `hold` — 44 frames, well over the half-second floor, long enough to read the finished
 *   two-line chart and its label.
 *
 * Total: 240 frames, 8 seconds at 30fps — same length as the seed, because this is still a
 * single continuous draw (two lines, not ten discrete arrivals), not a cascade that needs more
 * room.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const LINE_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 78 },
  subject: { start: 150, duration: 20 },
  conclusion: { start: 170, duration: 26 },
  hold: { start: 196, duration: 44 },
};
