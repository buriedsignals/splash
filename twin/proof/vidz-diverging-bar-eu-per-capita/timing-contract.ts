/**
 * The timing contract for "Croatia is the only EU country emitting more CO₂ per person than in
 * 1990."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). The argument problem here is a SIGN: twenty-seven
 * rows whose values straddle zero, twenty-six one way and one the other, and the finding is which
 * side each row lands on rather than how far it goes. The shape that follows from `BRIEF.md`'s "The
 * motion problem":
 *
 * - `establish` brings up the title, source, caveat, axis ticks and their gridlines (0 to −20 t)
 *   — furniture. The title is on screen from frame 0; see the component's `axisOpacity` comment.
 * - `reference` draws the ONE thing that gives every bar its meaning: the zero line, swept top to
 *   bottom. On this type the zero line is not a convention, it is the axis of the argument — the
 *   sheet requires it drawn ON TOP of the bars so a bar's own fill can never cover it. Same 18-frame
 *   pause as every prior beat (`reference` ends at 54, `reveal` starts at 72).
 * - `reveal` grows the twenty-seven bars OUT from that line, in sorted order, top to bottom: the
 *   single rise first, then the falls from smallest to largest. Growth outward from zero is the
 *   encoding — a bar that faded in at final length would show its sign without ever showing it
 *   being taken. 118 frames for 27 rows.
 * - `subject` is Croatia's own emphasis, once every bar has landed: a highlight wash behind its
 *   row, a ring at its bar's end, its category label to bold. Note what it is NOT: a recolour. On
 *   this type the fill encodes the sign, so Croatia's bar is already the positive fill from the
 *   moment it arrives, and the accent cannot also be held back to mark the subject.
 * - `conclusion` states the one thing nothing on screen has said: how far the other twenty-six fell
 *   on average, drawn as a rule at that mean with its own label, plus the sentence naming the
 *   largest fall. 44 frames.
 * - `hold` gets 48 frames on a closing frame carrying 27 labelled rows and a summary rule.
 *
 * Total: 300 frames, 10 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const DIVERGING_TIMING: BeatTiming = {
  fps: 30,
  total: 300,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 118 },
  subject: { start: 190, duration: 18 },
  conclusion: { start: 208, duration: 44 },
  hold: { start: 252, duration: 48 },
};
