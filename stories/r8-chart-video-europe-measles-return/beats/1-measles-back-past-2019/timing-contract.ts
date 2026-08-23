/**
 * The timing contract for "Measles in Europe and central Asia fell to 150 cases in 2021 — by 2024
 * it was back above 2019."
 *
 * Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`), because this beat's argument
 * is a THIRD shape, distinct from both beats that came before it. The seed climbs to a peak and
 * falls back through a level shown first. `life-expectancy` dips below a level and climbs back,
 * with the subject INSIDE the series. This one collapses to a floor and returns past a level shown
 * first, with the subject at the very END of the series — so `subject` genuinely is the reveal's
 * last mark landing again as its own event, the seed's shape, on a series whose middle is the
 * evidence.
 *
 * `establish` and `reference` reuse the frame numbers both earlier beats settled on (0/26, 32/22)
 * and the same 18-frame reading pause before `reveal`: the furniture rhythm of an eight-second
 * single-line chart is not this beat's problem to re-solve.
 *
 * WHERE IT DIFFERS, AND WHY, event by event:
 *
 * - `reveal` is 72 frames, not 78. Fourteen readings rather than twenty-five, and the shape the
 *   reader has to see — the cliff into 2020-22 and the wall back out of it — is carried by four
 *   segments, not by a slow accumulation. A longer reveal would spend a quarter of a second per
 *   year on eight years that do nothing.
 * - `conclusion` is 30 frames, not 24, because it states TWO things in sequence rather than one:
 *   the 2024 value, and then, in words, that it is above the 2019 level. The second half is in
 *   words deliberately. The crossing is 1 795 cases on a 110 000 axis — about seven pixels at this
 *   size — so the geometry cannot carry it and nothing here pretends otherwise. See BRIEF.md,
 *   "What the geometry can and cannot carry".
 * - `hold` is 48 frames — 1.6 s, the seed's, not `life-expectancy`'s 42. This beat is delivered as
 *   a social post, where the last frame is the thing people screenshot, and a longer hold is the
 *   cheapest way to make sure a reader who arrives late still meets a finished picture.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const MEASLES_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 72 },
  subject: { start: 144, duration: 18 },
  conclusion: { start: 162, duration: 30 },
  hold: { start: 192, duration: 48 },
};
