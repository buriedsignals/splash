/**
 * The timing contract for "India has risen from eighth to third among the world's biggest CO₂
 * emitters."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is unlike every prior
 * beat in this corpus: the vertical axis carries RANK, not a value, so nothing on screen has a
 * magnitude and the only thing that can be read is order — and order only changes at a crossing.
 * The shape that follows from `BRIEF.md`'s "The motion problem":
 *
 * - `establish` brings up the title, the source, the rank rows (1 to 10) and the year ticks —
 *   furniture. The title is on screen from frame 0 and does not fade with this event; see the
 *   component's `axisOpacity` comment for the measurement behind that.
 * - `reference` lays down the STARTING ORDER: the six dots at 1990, one per country, in their rank
 *   rows. On a value chart the reference is a level the evidence is measured against; on a rank
 *   chart there is no level, so the thing every later crossing is read against is where everyone
 *   began. It gets the same 18-frame pause afterwards as every prior beat's reference (`reference`
 *   ends at 54, `reveal` starts at 72).
 * - `reveal` runs the clock. All six lines draw together, left to right, 1990 to 2024 — never one
 *   country at a time: a crossing is two lines swapping, and a build that finishes one line before
 *   starting the next has no crossings in it at all, which would remove the only event this type
 *   exists to show. 116 frames for 34 years.
 * - `subject` picks India's line out of the six once the whole race has run: it recolours from
 *   neutral to accent, thickens, redraws on top of the others, and its 1990 and 2024 ends are
 *   ringed. It cannot start before `reveal` ends — `checkTiming` enforces that — which is also the
 *   editorial requirement, because a line already accented while the race is running tells the
 *   reader the answer before the evidence.
 * - `conclusion` marks the crossings themselves: a ring on India's line at each year it passed one
 *   of the five other drawn countries, and the sentence naming those years. 46 frames, because it
 *   is several marks and two lines of type, not one number.
 * - `hold` gets 44 frames, just under a second and a half of stillness on a closing frame that
 *   carries six labelled lines and three marked crossings.
 *
 * Total: 300 frames, 10 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const BUMP_TIMING: BeatTiming = {
  fps: 30,
  total: 300,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 116 },
  subject: { start: 188, duration: 22 },
  conclusion: { start: 210, duration: 46 },
  hold: { start: 256, duration: 44 },
};
