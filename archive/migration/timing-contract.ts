/**
 * The timing contract for "Twice since 1991, more people left Switzerland than arrived."
 *
 * RETRACTION, 2026-08-09. Every figure in the paragraph below was wrong until this edit, and they
 * were the SAME wrong figures that reached readers in `proof/comparison/3-MIGRATION--twin.png`:
 * "Twice since 1990", a subject of "1997, 1998" at "−1.9 and −3.4", against "swings up to +84.1".
 * None of those numbers is in `data.csv`. The file holds 34 rows, 1991–2024; its only negative
 * years are **1996 (−5.807)** and **1997 (−6.834)**, 1998 is **positive** at +1.177, and the series
 * peaks at **2023 (+139.118)**. `MigrationVideo.tsx` was corrected in an earlier pass and this file
 * was not, so the corrected component sat beside a contract still describing the invented series it
 * had been corrected away from — and `BRIEF.md`'s own "not fixed here" note named the component,
 * never this file. The numbers below are recomputed from `data.csv`; the frame counts were never in
 * question and are unchanged.
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is not sequencing —
 * the subject (1996, 1997) is early in the series but still drawn in its own chronological place
 * inside `reveal`, the same as any other year — it is SCALE: those two years sit at −5.8 and −6.8
 * against swings up to +139.1, so on an honest fitted axis the dip is a few pixels tall. `subject`
 * is given more room than beat 1's (24 vs 18 frames) because it has to do more work in that time:
 * pop both years together, AND lay down a shaded band between the line and the zero rule so the
 * sub-zero area is findable at a glance, not just inferable from two small dots. `conclusion` gets
 * a matching callout with a leader line rather than a same-size in-place label, because a label
 * sized to read at 46px would be wider than the two years are apart on the time axis.
 *
 * `establish` and `reference` reuse beat 1's exact numbers and its 18-frame reading pause — see
 * `../life-expectancy/timing-contract.ts` for why that rhythm travels between stories unchanged.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

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
