/**
 * The timing contract for "China emits more CO₂ than the next five biggest emitters combined."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is TEN columns, each one
 * value measured from a shared zero baseline, ordered by that value — and a conclusion that is not
 * a property of any single column but of five of them added together. The shape that follows from
 * `BRIEF.md`'s "The motion problem":
 *
 * - `establish` brings up the title, the source line, the value-axis ticks and their gridlines
 *   (0/2/…/12 Gt) — furniture, one fade, then still (0/26).
 * - `reference` draws the ONE thing every column is measured from: the zero baseline, swept left to
 *   right along the foot of the plot. A bar chart's baseline is not a stylistic choice — the type
 *   sheet (`references/types/bar-and-column.md`) calls a truncated one "a false statement about the
 *   data dressed up as a stylistic choice" — so it is laid down as its own event, before any column
 *   exists to be measured against it, and left for 18 frames to be read (`reference` ends at 54,
 *   `reveal` starts at 72).
 * - `reveal` grows the ten columns UP from that baseline, in rank order, largest first. Growth, not
 *   a fade at final height: length from zero is the entire encoding of this type, so the length
 *   arriving IS the data arriving. 112 frames for ten columns.
 * - `subject` is China's own emphasis — highlight wash behind its band, its column cross-dissolving
 *   from neutral to accent, its category label to bold accent. It cannot start before every column
 *   has landed, because `checkTiming`'s ordering rule puts `subject.start` at or after `reveal`'s
 *   end, which is also the editorial requirement: a reader must have seen the whole ranking before
 *   one column is picked out of it.
 * - `conclusion` states the one fact nothing on screen has stated yet, and the only one that needs
 *   arithmetic: the next five columns added together. It arrives as a rule drawn across the plot at
 *   that summed height, with a bracket under the five columns it sums — so the reader sees China's
 *   column standing above the line rather than reading a claim about it. 40 frames, longer than a
 *   single label's fade, because it is two marks and a sentence, not one number.
 * - `hold` gets 50 frames, a full 1.67 seconds of stillness, because the closing frame carries more
 *   than a headline: ten labelled columns, a summed rule and its bracket.
 *
 * Total: 300 frames, 10 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const COLUMN_RANKING_TIMING: BeatTiming = {
  fps: 30,
  total: 300,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 112 },
  subject: { start: 184, duration: 26 },
  conclusion: { start: 210, duration: 40 },
  hold: { start: 250, duration: 50 },
};
