/**
 * The timing contract for "Four regions emptied in 2025 — and one of them did most of it."
 *
 * Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`). The six-event shape is the
 * seed's; the numbers are this beat's own, and every one of them has a reason:
 *
 * - The journalist asked for "fifteen seconds at most" and this is a story-format vertical, watched
 *   with a thumb hovering over the next card. 330 frames — **11 seconds** — sits under that ceiling
 *   with room, and spends the difference on the hold rather than on a faster reveal.
 * - `establish` (30) brings up the title, the caveat, the axis title and the seven region names.
 *   On screen from frame 0, never faded in, so the poster frame is never blank.
 * - `reference` (26) draws the ZERO LINE, top to bottom. This beat's values are signed and four of
 *   the seven are negative, so the zero line is not furniture here — it is the level every bar is
 *   read against, and the motion grammar puts the level down before the evidence.
 * - The 18-frame gap between `reference` ending (62) and `reveal` starting (80) is the pause that
 *   lets the reader see there is a line before anything grows out of it. It is a gap, not an event,
 *   because nothing arrives during it.
 * - `reveal` (110) grows the seven bars out of that line, in the data's own order (largest gain to
 *   largest loss). Longer than the seed's 78 because seven staggered rows have to land one at a
 *   time and still leave the smallest bar — Montagne's 780, a thirtieth of Centre's — enough frames
 *   to be seen arriving at all.
 * - `subject` (24) is Centre's own emphasis, once all seven have landed: the region the takeaway is
 *   about, and the only one whose loss is in a different order of magnitude.
 * - `conclusion` (32) states the one number no bar on screen shows — the national balance, -9,380.
 * - `hold` (84) is 2.8 seconds of finished, still picture. Deliberately generous: a vertical watched
 *   in a story tray is read in whatever time is left after the motion stops.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const MIGRATION_TIMING: BeatTiming = {
  fps: 30,
  total: 330,
  establish: { start: 0, duration: 30 },
  reference: { start: 36, duration: 26 },
  reveal: { start: 80, duration: 110 },
  subject: { start: 190, duration: 24 },
  conclusion: { start: 214, duration: 32 },
  hold: { start: 246, duration: 84 },
};
