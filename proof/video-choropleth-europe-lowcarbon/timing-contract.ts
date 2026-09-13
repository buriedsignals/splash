/**
 * The timing contract for "Seven European countries drew more than 94 % of their 2024 electricity
 * from low-carbon sources. Six of them are north or west of the seventh — and the seventh is
 * Albania, whose every measured neighbour is under 60 %."
 *
 * Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`), read against the
 * choreography `BRIEF.md` wrote before any code (`skills/chart-video/references/
 * directed-type-choreography.md`, rule 1). Four gestures, not one continuous draw and not one
 * discrete cascade — the shape that follows:
 *
 * - `establish` brings up the title, the key with its six swatches and five break labels, and the
 *   source — furniture, same rhythm as every prior beat (0/26): a key with six swatches is more to
 *   paint than a single axis, but it still lands as one furniture block, not a cascade.
 * - `reference` marks the ONE thing the title counts from: the top class and its 94 % borne take
 *   the accent, « plus de 94 % » sets beside it — same 22-frame beat and the same 18-frame pause
 *   before `reveal` starts (`reference` ends at 54, `reveal` starts at 72) as every prior beat,
 *   because this is still "draw the reference, then leave it to be read" before the evidence moves.
 * - `reveal` is SIX discrete class arrivals (`class counts low → high = 8·6·6·8·5·7`, BRIEF.md),
 *   not one continuous time-axis draw like the line beat's 78 frames, and not ten independent rows
 *   like the dumbbell's 96 — six classes, each with its own count of countries inking at once. 84
 *   frames, 14 per class: enough room for a class's fill to visibly land before the next begins,
 *   short of the dumbbell's ten-row cascade because six steps read faster than ten.
 * - `subject` is a CAMERA MOVE, which none of this project's prior video beats have needed: the
 *   camera has to travel from the overview to the Balkans window before anything can be read at
 *   that scale, and only once it settles do Albania's ring and name, and its three neighbours'
 *   values, arrive — five labels in total (Albania, Montenegro, North Macedonia, Greece, Kosovo
 *   "hors données"). A zoom that resolves in under a second reads as a cut, not a move; 72 frames
 *   (2.4 s) splits roughly 30 for the travel to visibly register as motion and the remaining ~40 for
 *   the labels to land once the camera is still — more than the dumbbell's 26-frame ring-pop, which
 *   never moved the camera at all.
 * - `conclusion` reverses the move: the camera pulls back to the SAME overview `establish` used
 *   (BRIEF.md's "conclusion camera = establish camera"), the 33 countries under 94 % step back to
 *   the neutral land step as the seven keep their ink, and the two-clause conclusion sentence
 *   arrives once the camera is still. 60 frames: less than `subject`'s 72 because pulling back to a
 *   camera already shown once needs less time to read than arriving somewhere new, but still real
 *   travel time, not a jump cut, plus room for the filter and the sentence.
 * - `hold` — 72 frames (2.4 s), over the plain half-second floor and over the 2-second floor this
 *   beat's own frame needs: BRIEF.md's conclusion is two clauses ("Sept pays dépassent 94 %. Les 3
 *   voisins mesurés de l'Albanie sont tous sous 60 %."), longer than a single reading line, so the
 *   hold gets more than the single-line beats' 44-48 frames.
 *
 * Total: 360 frames, 12 seconds at 30 fps — longer than every prior beat in this project (8-9 s),
 * because this is the first video beat whose choreography moves the camera at all: two travels
 * (`subject`'s arrival and `conclusion`'s pull-back) on top of a six-step reveal, where the prior
 * beats had at most one continuous draw or one row cascade and no camera motion.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const CHOROPLETH_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 360,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 84 },
  subject: { start: 156, duration: 72 },
  conclusion: { start: 228, duration: 60 },
  hold: { start: 288, duration: 72 },
};
