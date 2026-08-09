/**
 * This beat's own timing contract — the one object a journalist edits to retime it.
 *
 * The vocabulary is not redefined here: `BeatTiming`, `progressOf` and `checkTiming` are
 * `./timing-contract.ts`, a physical copy of the motion grammar's vocabulary
 * (`twin-chart-video/assets/timing.ts` → `twin-map-beat/assets/timing.ts` →
 * `proof/map-quake-symbol/timing-contract.ts` → here). A copy, not an import, because a beat under
 * `proof/` never reaches into a sibling beat or a skill at runtime. What is local to a beat is its
 * EDIT, below.
 *
 * The edit, in words, and why this beat needs MORE total duration than its choropleth/symbol
 * siblings (both 240 frames, 8s): those beats reveal at most a handful of regions whose arrival
 * order carries no independent physical meaning (rank in a value order) — this beat's reveal must
 * carry NINE distinct territory-arrival events, each one tied to a real, measured position along a
 * 2,567 km route (see `geo-flow.ts`, `travelledPath`), and two of those nine (Croatia and Serbia)
 * arrive within 0.3% of the route's own length of each other — genuinely close together, not an
 * artefact of even spacing. Nine events, several of them close, need more air than four or five
 * evenly-spaced ones to read individually — hence 170 frames (5.67s) of `reveal`, not the sibling
 * beats' 86.
 *
 *  - `establish` (0.87s, 26 frames): title, source, basemap, the FULL route — already drawn end to
 *    end in its own pale, dashed, "not yet travelled" treatment (`flow-map.md`'s own accessibility
 *    trap: the whole planned journey must be legible from frame one, never invisible).
 *  - `reference` (0.67s, 20 frames): a pause. Nothing new appears — the reader is given a moment to
 *    read the whole planned corridor before any travel begins, the same way the choropleth sibling
 *    lays its comparison level down and leaves it to be read before the data starts arriving.
 *  - `reveal` (5.67s, 170 frames): the line grows from the origin by REAL arc-length fraction (not
 *    frame count, not SVG stroke-dash), and each of the nine territories fills in and is badged at
 *    the exact moment the growing line's progress first reaches its own crossing point.
 *  - `subject` (0.67s, 20 frames): the journey's own destination — the Black Sea delta, where the
 *    route ends — springs in as its own event, after the line has already finished travelling.
 *  - `conclusion` (0.87s, 26 frames): the assertion that closes the argument — the route's real
 *    total length and territory count, computed from the same frozen data, not typed by hand.
 *  - `hold` (1.33s, 40 frames): the finished map, held still.
 *
 * Total: 326 frames at 30fps = 10.87s — inside the ~10-11s this type's nine discrete events were
 * sized for.
 */

import type { BeatTiming } from "./timing-contract";

export { checkTiming, endOf, progressOf } from "./timing-contract";
export type { BeatTiming, TimingEvent } from "./timing-contract";

export const FLOW_TIMING: BeatTiming = {
  fps: 30,
  total: 326,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 20 },
  reveal: { start: 58, duration: 170 },
  subject: { start: 234, duration: 20 },
  conclusion: { start: 260, duration: 26 },
  hold: { start: 286, duration: 40 },
};

/**
 * How far a territory has arrived, given the reveal's own progress and that territory's real
 * arc-length fraction along the route (0 at the origin, 1 at the destination — see `geo-flow.ts`
 * `territoriesCrossed` + `cumulativeKm`).
 *
 * Deliberately NOT the "one evenly-spaced window per rank" shape `arrivalProgress` uses in
 * `Co2MapVideo.tsx`/`QuakeSymbolVideo.tsx`: those beats' reveal order (emissions value, magnitude)
 * carries no further physical position to anchor an arrival TIME to, so even spacing by rank is the
 * only honest choice available. This beat's route physically passes through each territory at a
 * specific, measured fraction of its own real length, and using even-by-rank spacing instead would
 * let a territory light up before or after the growing line visually reaches it — stating a false
 * position, the same class of dishonesty `flow-map.md`'s own accessibility trap warns about for the
 * line itself. So the window is anchored to the real fraction, and only its WIDTH (how long the
 * crossfade takes) is borrowed from the sibling beats' convention.
 */
export const ARRIVAL_WINDOW = 0.045;

export function territoryArrivalProgress(
  fraction: number,
  reveal: number,
): number {
  const start = Math.max(0, fraction - ARRIVAL_WINDOW);
  return Math.max(0, Math.min(1, (reveal - start) / ARRIVAL_WINDOW));
}
