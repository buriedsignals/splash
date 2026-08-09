/**
 * The timing contract for "More than half of Switzerland's all-time CO₂ has been emitted since
 * 1986." — 8 seconds, 30fps, 1080 × 1080.
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is not sequencing
 * inside a single moving line but the shape of an AREA: the subject — 1986 — sits well inside the
 * series by YEAR COUNT (about three-quarters of the way through 1858→2024) but nowhere near half
 * of the fill's eventual AREA, because the fill is thin for a century and only steepens near the
 * end (BRIEF.md, "The motion problem"). So `reveal` draws the WHOLE fill, 1858 → 2024,
 * chronologically, before `subject` ever starts — the same fix `life-expectancy`'s contract uses
 * for its own interior subject (2020): `subject` does not draw new fill, it is a distinct
 * emphasis event landing on a mark already on screen once the whole 1858–2024 fill, including the
 * 2024 total, is visible. `reveal` itself runs a little longer than the seed's or
 * `life-expectancy`'s (84 vs 78 frames) because a 167-point fill needs a touch more time for its
 * own shape — thin, then steepening — to actually register before the emphasis lands.
 *
 * `establish` and `reference` reuse the seed's exact numbers and its 18-frame reading pause — see
 * `../life-expectancy/timing-contract.ts` for why that rhythm travels between stories unchanged.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const CUMULATIVE_CO2_AREA_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 84 },
  subject: { start: 156, duration: 20 },
  conclusion: { start: 176, duration: 24 },
  hold: { start: 200, duration: 40 },
};
