/**
 * The timing contract for "Switzerland's share of renewable electricity trails Norway's by more
 * than 31 points."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is FOURTEEN independent
 * rows, each with exactly one value measured against a shared zero baseline — not a time axis, and
 * not the dumbbell's two-points-per-row gap. The shape that follows from `BRIEF.md`'s "The motion
 * problem":
 *
 * - `establish` brings up the title, source line and the scale's tick gridlines (25/50/75/100%) —
 *   furniture, same rhythm as every prior beat (0/26).
 * - `reference` draws the ONE thing every row is measured from: the zero baseline itself, a vertical
 *   rule at the value axis's zero point. This type's doctrine (`lollipop.md`) makes the zero baseline
 *   non-negotiable in a way the dumbbell's position-encoded axis never was — so unlike the dumbbell's
 *   shared "index 100" rule (an arbitrary common start point), this beat's reference line IS the
 *   value axis's own origin. Same 18-frame pause as every prior beat (`reference` ends at 54,
 *   `reveal` starts at 72), so the reader has read "this is zero" before any stem starts growing
 *   from it.
 * - `reveal` carries FOURTEEN discrete stems, more than the dumbbell's ten, so it gets more room
 *   (112 vs 96 frames) even though each row here is a simpler mark (one stem + one dot, not a
 *   connector plus two dots): every stem GROWS from the zero line to its value — rather than fading
 *   in at final length — because "the data arriving" is the stem's length itself, the one thing this
 *   type's whole argument rests on. Rows cascade in rank order, largest share first, the same order
 *   the rows are sorted in, so the ranking the reader watches assemble is the ranking the chart ends
 *   on — same device the dumbbell beat used.
 * - `subject` cannot start until every row has landed (`checkTiming`'s ordering rule leaves no other
 *   option, `subject.start` sits exactly at `reveal`'s end), which already satisfies `BRIEF.md`'s
 *   requirement that Switzerland's own emphasis never lands before its own stem has. Same 26-frame
 *   window as the dumbbell's subject event, because it does the same three things: a ring pops onto
 *   Switzerland's dot, a soft highlight band washes in behind its row, its stem and dot recolour from
 *   neutral to accent, and its category label crossfades from ink to bold accent.
 * - `conclusion` extends Switzerland's already-visible value label ("67.8%") into the one new fact
 *   the beat has not yet stated — the gap to Norway ("67.8% · 31.2 pts behind Norway") — in place, at
 *   the same anchor point, the same two-stage label technique `DumbbellVideo.tsx`'s `conclusion`
 *   block uses for its own subject row.
 * - `hold` gets extra room over the seed's floor — 60 frames, a full two seconds — because fourteen
 *   rows plus a longer conclusion sentence need more time to actually be read than a single-line
 *   beat's finding does.
 *
 * Total: 300 frames, 10 seconds at 30fps — longer than the dumbbell's 9, because four more rows need
 * four more rows' worth of room to cascade and grow, not just fade in.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const LOLLIPOP_TIMING: BeatTiming = {
  fps: 30,
  total: 300,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 112 },
  subject: { start: 184, duration: 26 },
  conclusion: { start: 210, duration: 30 },
  hold: { start: 240, duration: 60 },
};
