/**
 * The timing contract for "Covid cost Switzerland nearly a year of life expectancy — and it took
 * three years to win it back."
 *
 * Its own instance of `BeatTiming` (`timing.ts`), because the argument this beat draws is a
 * different shape from beat 1's: the subject — 2020 — sits *inside* the series, four years before
 * the series ends, not at its tail. A reveal that stopped at 2020 would hide the very fact the
 * takeaway needs: that the line climbs back above the 2019 level by 2023. So `reveal` here always
 * draws the WHOLE series, 2000 → 2024, before `subject` ever starts — `subject` does not draw new
 * data, it is a distinct emphasis event that lands on a mark already on screen. See
 * `LifeExpectancyVideo.tsx` for the reasoning written out in full.
 *
 * `establish` and `reference` reuse beat 1's exact frame numbers (0/26, 32/22) and the same 18-frame
 * reading pause before `reveal` — the furniture rhythm of an 8-second single-line chart does not
 * need to be reinvented per story, only the events that carry this story's own argument do.
 * `conclusion` runs longer than beat 1's (30 vs 24 frames) because it states two things in sequence
 * — the 2020 value, then the three-year span back to 2019's level — not one.
 */

import type { BeatTiming } from "./timing";

export const LIFE_EXPECTANCY_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 78 },
  subject: { start: 150, duration: 18 },
  conclusion: { start: 168, duration: 30 },
  hold: { start: 198, duration: 42 },
};
