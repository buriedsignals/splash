/**
 * The timing contract for "Twice since 1990, more people left Switzerland than arrived."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is not sequencing —
 * the subject (1997, 1998) is early in the series but still drawn in its own chronological place
 * inside `reveal`, the same as any other year — it is SCALE: those two years sit at −1.9 and −3.4
 * against swings up to +84.1, so on an honest fitted axis the dip is a few pixels tall. `subject`
 * is given more room than beat 1's (24 vs 18 frames) because it has to do more work in that time:
 * pop both years together, AND lay down a shaded band between the line and the zero rule so the
 * sub-zero area is findable at a glance, not just inferable from two small dots. `conclusion` gets
 * a matching callout with a leader line rather than a same-size in-place label, because a label
 * sized to read at 46px would be wider than the two years are apart on the time axis.
 *
 * `establish` and `reference` reuse beat 1's exact numbers and its 18-frame reading pause — see
 * `../life-expectancy/timing-contract.ts` for why that rhythm travels between stories unchanged.
 */

// Temporary relative path into the skill — Task 8 vendors this as #shared/twin-chart-video/timing
import type { BeatTiming } from "../../skills/twin-chart-video/assets/timing";

export const MIGRATION_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 78 },
  subject: { start: 150, duration: 24 },
  conclusion: { start: 174, duration: 26 },
  hold: { start: 200, duration: 40 },
};
