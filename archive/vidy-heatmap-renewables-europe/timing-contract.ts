/**
 * The timing contract for "Iceland has run almost entirely on renewable electricity every year
 * since 2016 — most of Europe is still catching up."
 *
 * Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`). The argument here is a
 * GRID, not a traced series or a set of independent rows: eight countries (rows), nine years
 * 2016–2024 (columns, chronological), one cell per country×year, colour is the only value channel.
 * The shape that follows from `BRIEF.md`'s "The build":
 *
 * - `establish` brings up the title, source line, the empty grid's outlines, and BOTH axes (row
 *   country labels, column year headers) together — furniture, same rhythm as every prior beat in
 *   this corpus (0/26). Colour carries no meaning yet: no cell is filled.
 * - `reference` draws the colour legend — the gradient bar with its min and max labelled. This is
 *   the reference the whole reveal is read against: a filled grid means nothing to a reader who
 *   has not yet been told what dark and pale stand for, so the legend must land, and be left alone
 *   to be read, BEFORE the first cell fills. Same 18-frame pause every prior beat in this corpus
 *   has used (`reference` ends at 54, `reveal` starts at 72).
 * - `reveal` is longer than a single-line beat's (108 vs 78 frames) because it carries 72 discrete
 *   cell arrivals, not one continuous draw. The x axis is time (years), so the columns themselves
 *   proceed at a strictly LINEAR, un-eased pace (`motion-grammar.md`: "when the x axis is time,
 *   the reveal is linear" — easing the column traversal would make 2016 and 2024 occupy different
 *   amounts of screen time, a lie about the pace of the data); only each cell's own fade-in within
 *   its column's window is eased, the same way a dot arriving is eased elsewhere in this corpus.
 *   All eight rows of a given year-column fill together, so the reader watches the pattern (a
 *   column of highs, a column of lows) accumulate year by year, left to right.
 * - `subject` cannot start until every column has landed (`checkTiming`'s ordering rule leaves no
 *   other option), which already satisfies `BRIEF.md`'s requirement that Iceland's own emphasis
 *   never lands before its own row is fully on screen. It gets the same shape of room beat 2
 *   (the dumbbell) gave its own subject event (26 frames): an outline pops onto the whole row.
 * - `conclusion` does two things, both new facts the beat has not yet stated in words: a callout
 *   sentence naming Iceland's row as literally unbroken across the whole period, and — fading in
 *   across the grid's final column only, one label per row, each coloured by that cell's OWN fill
 *   — the actual finishing numbers for every country, so the ranking the reader has been watching
 *   build ends on real values, not just relative colour. Slightly longer than the dumbbell's
 *   conclusion (34 vs 30 frames): it is stating two things, not extending one label in place.
 * - `hold` matches the corpus floor and then some — 48 frames, comfortably over the half-second
 *   minimum, long enough to read the callout and the eight closing numbers.
 *
 * Total: 288 frames, 9.6 seconds at 30fps — longer than the dumbbell's 9s, because a 72-cell grid
 * needs more room to breathe than ten rows of two points each.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const HEATMAP_TIMING: BeatTiming = {
  fps: 30,
  total: 288,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 108 },
  subject: { start: 180, duration: 26 },
  conclusion: { start: 206, duration: 34 },
  hold: { start: 240, duration: 48 },
};
