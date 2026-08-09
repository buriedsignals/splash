/**
 * The timing contract for "Germany's electricity generation fell as coal and nuclear losses
 * outpaced renewable growth, 2010–2023."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). This type gets the strongest natural argument of
 * the six beats built alongside it — the running total walked step by step IS the argument, by
 * construction — so it does not get the "maybe a build adds nothing" pass; the shape below is a
 * real staged reveal, not a decorative fade-up of a chart that would read fine as a still.
 *
 * - `establish` brings up the title, source line and a THREE-swatch legend (increase / decrease /
 *   total) — furniture, same rhythm every prior beat in this corpus uses (0/26). A waterfall needs
 *   three swatches where a dumbbell needed two, because the type doctrine's three roles have to be
 *   named before any bar lands, or a reader has no way to read a bar's colour as a direction.
 * - `reference` draws the 2010 opening total as a full bar from zero — the type doctrine's own
 *   words: "the first and last bars — the true totals — are drawn as full bars from zero," and this
 *   one doubles as the reference the whole bridge is read against, same device every prior beat's
 *   `reference` event uses for its baseline. Same 22-frame draw, same 18-frame pause before `reveal`
 *   starts (`reference` ends at 54, `reveal` starts at 72) — long enough that a reader has actually
 *   read "624.21" before the first step arrives.
 * - `reveal` cascades the eight signed steps left to right, one at a time, each floating from
 *   exactly where the previous one ended. 136 frames — nearly twice the seed's single continuous
 *   line draw (78) and somewhat more than the dumbbell's ten-row cascade (96), because each step
 *   here is a discrete, individually-labelled event (connector, bar growth, value label) rather
 *   than one of ten near-identical rows; eight distinct arithmetic facts need more room to land
 *   individually than a repeated row template does.
 * - `subject` cannot start until every step has landed (`checkTiming`'s ordering rule leaves no
 *   other option — `subject.start` sits exactly at `reveal`'s end, 208), which already satisfies
 *   the requirement that the closing total's emphasis never appears before the bridge that produces
 *   it is fully drawn. 26 frames — same room as the dumbbell's subject event — to grow the 2023 bar
 *   from zero AND pop the third-channel emphasis (an ink outline + a wash in the `total` colour,
 *   never a fourth hue — the increase/decrease/total channel is already spent).
 * - `conclusion` extends the already-visible 2023 total label ("506.72 TWh") in place into the one
 *   fact the beat has not yet stated on screen: the net change, "−117.49 TWh net" — same in-place
 *   two-stage label technique `../video-population-growth-dumbbell/DumbbellVideo.tsx`'s
 *   `conclusionLabelFor` uses, for the same reason: no collision to solve, so no detached
 *   leader-line is needed.
 * - `hold` — 50 frames, comfortably over the half-second floor, long enough to read the conclusion
 *   sentence and the finished bridge as a whole (ten bars, eight of them signed, is more to take in
 *   than a single line's end value).
 *
 * Total: 314 frames, ~10.5 seconds at 30fps — longer than the dumbbell's 270, because eight
 * individually-labelled steps need more room to breathe than a ten-row cascade of one repeated
 * template.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const WATERFALL_TIMING: BeatTiming = {
  fps: 30,
  total: 314,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 136 },
  subject: { start: 208, duration: 26 },
  conclusion: { start: 234, duration: 30 },
  hold: { start: 264, duration: 50 },
};
