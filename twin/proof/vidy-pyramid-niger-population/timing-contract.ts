/**
 * The timing contract for "Niger's youngest age band dwarfs its entire population aged 65+."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is not a traced series
 * or ten independent rows of exactly two points (the dumbbell's shape) — it is TWENTY-ONE ordered
 * age bands, each a mirrored PAIR of bars (male, female) sharing one central zero. The shape that
 * follows from `BRIEF.md`'s "The build order":
 *
 * - `establish` brings up the title, the subtitle stating what a bar is, the source line and the
 *   legend (which hue is male, which is female — load-bearing here exactly as it was for the
 *   dumbbell's two-year legend, because a pyramid's two colours have no positional convention of
 *   their own until the bars are on screen) — furniture, same rhythm as every prior beat (0/32).
 * - `reference` draws the ONE thing every band shares: the central zero spine, top to bottom. It is
 *   vertical rather than horizontal, same device the dumbbell's index-100 rule used, and it is
 *   still laid down before any band and left alone to be read — an 18-frame pause follows it before
 *   `reveal` starts, matching the floor every prior beat in this skill has used.
 * - `reveal` is the longest window of any beat built in this skill so far (150 frames, vs the
 *   dumbbell's 96 for ten rows) because it carries TWENTY-ONE discrete band arrivals, not ten. The
 *   cascade runs OLDEST band first (100+, at the top of the frame) to YOUNGEST band last (0-4, at
 *   the bottom) — see `BRIEF.md`'s "Build order and why": every successive band in this dataset is
 *   wider than the one before it, so revealing in this direction is a steady escalation that ends
 *   on the frame's single widest, most dramatic pair of bars, rather than spoiling the finding in
 *   the first arrivals and trailing off. Because the youngest band (0-4) is also the confirmed
 *   subject, it is structurally the LAST thing `reveal` draws, which sets up `subject` to add its
 *   emphasis with no further cascade needed underneath it.
 * - `subject` cannot start until every band has landed (`checkTiming`'s ordering rule leaves no
 *   other option; `subject.start` is set to exactly `endOf(reveal)`), which already satisfies the
 *   motion grammar's "the subject arrives as a distinct event, separated in time." It gets 28
 *   frames — close to the dumbbell's 26 for its own single-row emphasis — for three things: an
 *   outline pops onto both of the 0-4 row's already-landed bars, a highlight wash washes in behind
 *   the row, and the row's age-band label crossfades from ink to bold.
 * - `conclusion` extends the 0-4 row's already-visible total-population label ("4.67M") in place
 *   into the one new fact the beat has not yet stated: the ratio against the 65-and-older
 *   population ("4.67M · ~6.9× the 65+ population (673K)") — the same two-stage in-place label
 *   technique `DumbbellVideo.tsx`'s `conclusionLabelFor` uses, chosen for the same reason: the 0-4
 *   row sits at the very bottom of the frame with the whole margin below it free, so there is no
 *   collision to solve with a detached leader-line callout.
 * - `hold` is comfortably over the half-second floor — 50 frames — and a little longer than the
 *   dumbbell's 46, because the conclusion sentence here is longer and needs more time to read.
 *
 * Total: 336 frames, 11.2 seconds at 30fps — longer than the dumbbell's 9, because a 21-band
 * cascade needs more room to breathe than a 10-row one.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const PYRAMID_TIMING: BeatTiming = {
  fps: 30,
  total: 336,
  establish: { start: 0, duration: 32 },
  reference: { start: 36, duration: 22 },
  reveal: { start: 76, duration: 150 },
  subject: { start: 226, duration: 28 },
  conclusion: { start: 254, duration: 32 },
  hold: { start: 286, duration: 50 },
};
