/**
 * The timing contract for "Switzerland's population grew fastest of ten European countries since
 * 2000."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is not a single
 * traced series — it is TEN independent rows, each with exactly two points, not a time axis. The
 * shape that follows from `BRIEF.md`'s "The motion problem":
 *
 * - `establish` brings up the title, source line and legend (which hue is 2000, which is 2023) —
 *   furniture, same rhythm as every prior beat (0/26).
 * - `reference` draws the ONE thing every row shares: the vertical rule at index 100. Because it
 *   is vertical rather than horizontal, it draws top-to-bottom instead of left-to-right, but it
 *   is still laid down before the evidence and left alone to be read — same 18-frame pause beat
 *   1 established (`reference` ends at 54, `reveal` starts at 72).
 * - `reveal` is longer than the single-line beats' (96 vs 78 frames) because it carries TEN
 *   discrete arrivals, not one continuous draw. All ten LEFT dots land together in the first
 *   slice of the window (they are all index 100 — the shared rule already says so, staggering
 *   ten identical points would teach the reader nothing new ten times over); the rest of the
 *   window cascades each row's right dot, connector and category label in gap-size order,
 *   largest first — the same order the rows are sorted in, so the ranking the reader sees
 *   assemble is the ranking the chart ends on.
 * - `subject` cannot start until every row has landed (`checkTiming`'s ordering rule leaves no
 *   other option), which already satisfies `BRIEF.md`'s requirement that Switzerland's own
 *   emphasis never lands before its own connector has. It gets more room than beat 1's dot-land
 *   (26 vs 18 frames) because it does three things at once: a ring pops onto both of Switzerland's
 *   already-landed dots, a soft highlight band washes in behind its row, and its category label
 *   crossfades from ink to bold accent.
 * - `conclusion` extends Switzerland's already-visible value label ("123.5") into the one new fact
 *   the beat has not yet stated — the gap itself ("123.5 · +23.5 pts") — in place, at the same
 *   anchor point. A detached leader-line callout (`../migration/MigrationVideo.tsx`'s technique,
 *   built for a label wider than the two years it named were apart) was considered and set aside:
 *   Switzerland's row sits at the top, right after the furniture block, with a full row's own
 *   height and the whole right margin free — there is no collision to solve with a leader line,
 *   so the simpler in-place extension (the same two-stage label technique `EmissionsVideo.tsx`'s
 *   `endLabel` and `LifeExpectancyVideo.tsx`'s `subjectLabel` already use) says the same thing
 *   with one fewer moving part.
 * - `hold` matches the seed's floor and then some — 46 frames, comfortably over the half-second
 *   minimum, long enough to read the extended label.
 *
 * Total: 270 frames, 9 seconds at 30fps — longer than the single-line beats' 8, because a
 * ten-row cascade needs more room to breathe than a single traced curve.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const DUMBBELL_TIMING: BeatTiming = {
  fps: 30,
  total: 270,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 96 },
  subject: { start: 168, duration: 26 },
  conclusion: { start: 194, duration: 30 },
  hold: { start: 224, duration: 46 },
};
