/**
 * The timing contract for "Poland's per-capita CO2 emissions have overtaken Germany's, even as
 * both have fallen sharply since their 1979-80 peaks." — 11 seconds, 30fps, 1080 × 1080.
 *
 * Small multiples add one thing to the six-event contract that a single-panel beat does not have:
 * FOUR series need to draw, and the argument here is specifically their ORDER — the reveal plays
 * the panels one at a time, in ascending order of their own 2024 value (Switzerland, France,
 * Germany, Poland), so the reader watches the ranking build up to its own subject rather than
 * seeing four lines appear at once with no hierarchy (`motion-grammar.md`'s "uniform cascade"
 * anti-pattern — four panels animating on the same schedule is exactly that failure, wearing a
 * grid). `reveal`'s own duration is split into four equal, non-overlapping windows in the
 * composition (`panelProgress` below) — the contract itself only states the outer envelope, per
 * `motion-grammar.md`'s "one typed object" rule; the four-way split is arithmetic derived from it,
 * not a second set of frame literals living beside it.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const SMALL_MULTIPLES_CO2_TIMING: BeatTiming = {
  fps: 30,
  total: 330,
  establish: { start: 0, duration: 24 },
  reference: { start: 30, duration: 20 },
  reveal: { start: 64, duration: 176 },
  subject: { start: 240, duration: 20 },
  conclusion: { start: 260, duration: 26 },
  hold: { start: 286, duration: 44 },
};
