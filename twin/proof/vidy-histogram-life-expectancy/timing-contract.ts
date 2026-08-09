/**
 * The timing contract for "In 2023, more countries reach 75-to-80 years of life expectancy than
 * any other five-year span."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). `BRIEF.md`'s "The motion judgement" explains
 * why this beat's reveal is a SINGLE simultaneous rise rather than a per-item cascade like
 * `../video-population-growth-dumbbell/timing-contract.ts`'s ten rows: a histogram's bins carry
 * no order beyond their position on the variable's own axis, so staggering bar N before bar N+1
 * would assert a sequence the data does not contain. The six-event shape below still holds —
 * `checkTiming` does not bend for a simple build — but three of the six events do less work than
 * the dumbbell's:
 *
 * - `establish` brings up the title, source line, the bin-edge x-axis (the type's own requirement
 *   — `twin-chart-beat/references/types/histogram.md`: "the x-axis is the continuous variable
 *   itself, in its real unit, with bin edges markable on it") and the zero baseline the count axis
 *   is read against — furniture, same 26-frame rhythm as every prior beat.
 * - `reference` draws the ONE thing every bar is read against: the vertical median line. Same
 *   device and the same 18-frame pause afterwards as `../video-population-growth-dumbbell`'s
 *   index-100 rule and `co2-suisse`'s 1967 level — laid down, then left alone long enough to read
 *   before the bars arrive (`reference` ends at 54, `reveal` starts at 72).
 * - `reveal` is ONE simultaneous rise, all eight bars sharing one eased progress value — shorter
 *   than the dumbbell's 96-frame ten-row cascade (this beat's whole reveal is a single build, not
 *   ten arrivals) but a little longer than a bare fade so the rise itself is legible as bars
 *   growing from the baseline, not popping in.
 * - `subject` starts only once every bar is fully up (`checkTiming`'s ordering rule leaves no
 *   other option, same as the dumbbell), and belongs to exactly one bin — the 75-to-80 band, the
 *   tallest bar and the one immediately to the right of the median line just drawn. It crossfades
 *   from the shared neutral fill to the one accent and gets its count value.
 * - `conclusion` extends that count into the sentence the beat is actually making — the modal
 *   span holds more countries than any other — at the same anchor, the same two-stage label
 *   technique `EmissionsVideo.tsx`'s `endLabel` and the dumbbell's gap-extension both use.
 * - `hold` matches the seed's floor and then some: 42 frames, well over the half-second minimum.
 *
 * Total: 228 frames, 7.6 seconds at 30fps — shorter than the dumbbell's 9s (one build, not a
 * ten-row cascade) and close to the seed's 8s (one reference, one reveal, one subject).
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const HISTOGRAM_TIMING: BeatTiming = {
  fps: 30,
  total: 228,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 60 },
  subject: { start: 132, duration: 22 },
  conclusion: { start: 154, duration: 26 },
  hold: { start: 180, duration: 48 },
};
