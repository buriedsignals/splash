/**
 * The timing contract for "CO₂ emissions per capita vary widely within every continent — and in
 * the Americas, the US and Canada each emit over 4× the region's median."
 *
 * Its own instance of `BeatTiming` (`timing.ts`). Unlike a traced line (one continuous series) or a
 * dumbbell (ten independent two-point rows), a box plot's argument is FOUR already-summarised
 * distributions — each one five numbers (plus 0-2 outlier dots) that have no time-ordering of their
 * own. `BRIEF.md`'s "The motion problem — honest judgement" works through why a five-part cascade
 * inside one box would invent motion the data does not contain, and lands on the shape below:
 *
 * - `establish` brings up the title, source line and the value axis with its unit — furniture, same
 *   rhythm as every prior beat (0/26).
 * - `reference` draws the ONE thing every box is implicitly measured against: a dashed horizontal
 *   line at 3.69 t/person, the median of all 53 countries in the underlying dataset (not the mean of
 *   the four group medians — `BRIEF.md`'s own caveat). Laid down before any box arrives and left
 *   alone for the same 18-frame pause beat 1 and the dumbbell beat both established (`reference` ends
 *   at 54, `reveal` starts at 72).
 * - `reveal` brings in the four continent boxes ONE AT A TIME, sorted by median ascending (Africa,
 *   Americas, Asia, Europe — the same "sort tells the story" discipline the type doctrine recommends
 *   for a static box plot's category order). Each continent's own five marks (whisker-min, Q1,
 *   median, Q3, whisker-max) plus its outlier dots draw together as ONE event per category — never a
 *   five-part cascade inside a single box, because none of those five numbers happens "before"
 *   another in any sense a reader could follow. 84 frames for four discrete arrivals — more room than
 *   a single traced line's continuous draw (78), less than the dumbbell's ten-row cascade (96).
 * - `subject` cannot start until every box has landed (`checkTiming`'s ordering rule leaves no other
 *   option, same as the dumbbell), which already satisfies the requirement that the Americas box's
 *   own emphasis never lands before its own marks have. The Americas box is not the highest or lowest
 *   median (Africa is lower; Asia and Europe are both higher) — it is the subject because of what its
 *   box HIDES: a modest median (3.01) with two individual countries, Canada and the United States,
 *   sitting far outside it. The subject event rings both outlier dots and washes the Americas column.
 * - `conclusion` states the one new fact the subject event's ring alone cannot say out loud: the two
 *   outliers' own values and how many times the group median they represent ("US 14.3 · Canada 13.9
 *   — both over 4× the Americas median"). Positioned beside the two already-landed outlier dots, the
 *   same in-place-extension device `video-population-growth-dumbbell/DumbbellVideo.tsx`'s
 *   `conclusionLabelFor` uses, rather than a detached leader-line callout.
 * - `hold` matches the seed's floor and then some — 44 frames, comfortably over the half-second
 *   minimum, long enough to read the extended outlier labels.
 *
 * Total: 260 frames, ~8.7 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/twin-chart-video/timing.ts";

export const BOXPLOT_TIMING: BeatTiming = {
  fps: 30,
  total: 260,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 84 },
  subject: { start: 156, duration: 30 },
  conclusion: { start: 186, duration: 30 },
  hold: { start: 216, duration: 44 },
};
