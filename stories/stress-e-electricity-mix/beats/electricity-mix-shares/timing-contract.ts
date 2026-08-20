/**
 * The timing contract for "Hydro and nuclear supply seven in ten units of the country's
 * electricity; the six reported shares fall short of the whole."
 *
 * Its own instance of `BeatTiming` (`#shared/chart-video/timing.ts`). Copied unchanged from the
 * seed's own `CO2_TIMING` proportions (`chart-video/assets/timing.ts`) and from the sibling
 * diverging-bar beat's shape (`proof/vidz-diverging-bar-eu-per-capita/timing-contract.ts`) — six
 * rows need far less `reveal` time than that beat's twenty-seven, but the six-event shape and the
 * reasoning behind each gap is the same:
 *
 * - `establish` brings up the title, source, caveat, axis ticks and gridlines. On screen from
 *   frame 0 — never faded in, so the poster frame is never blank.
 * - `reference` draws the zero line, top to bottom — the axis every bar's sign is read against,
 *   drawn ON TOP of the bars so no fill can ever cover it.
 * - `reveal` grows the six bars out from that line, sorted descending by share (the five positive
 *   shares first, Imports last) — 78 frames is generous for six rows, kept at the seed's own
 *   duration rather than shortened, since nothing about this beat's argument is served by a faster
 *   reveal.
 * - `subject` is Imports' own emphasis, once every bar has landed: the one row that breaks the
 *   reader's part-to-whole instinct.
 * - `conclusion` states the one thing nothing on screen has said: the six shares sum to 95.2%, not
 *   the 100% the article claims.
 * - `hold` gets 48 frames on the finished chart.
 *
 * Total: 240 frames, 8 seconds at 30fps.
 */

// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const ELECTRICITY_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 78 },
  subject: { start: 150, duration: 18 },
  conclusion: { start: 168, duration: 24 },
  hold: { start: 192, duration: 48 },
};
