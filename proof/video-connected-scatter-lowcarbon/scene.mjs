// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - TRAVEL: the countries leave their 2000 ring one after another (the largest clean-up first), each eased along its
//     arc (two dates and nothing between them: an arrival, not a time axis), the arc drawn as far as its disc has gone.
//     The count is the number of discs that have landed — every one of them higher than its ring.
//   - THE CAMERA is the x domain: the whole axis, closed onto the crowd at `subject`, opened again at `conclusion`. Every
//     seat and every arc is laid out at the domain of the frame (`seatOf`, the one implementation `build.mjs` measures
//     with), so a disc stays a disc. Names are seated twice in Bun, once per scale, and carried by their disc.
//   - LIGHTER: the five that weigh less are picked out one after another, largest loss first; the others step back as
//     the first is picked.
//   - LEGS: France's arc split into its two moves, the horizontal first, then the vertical.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";
import { arcAt } from "../scrolly-connected-scatter-lowcarbon/scatter-layout.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.14], furniture: [0.05, 0.3], bars: [0.12, 0.96] },
  reveal: { travel: [0, 0.95] },
  subject: { zoom: [0, 0.4] },
  conclusion: { back: [0, 0.16], lighter: [0.18, 0.5], legs: [0.52, 0.7], release: [0.72, 0.92], source: [0.6, 0.9] },
});
const LINEAR = new Set(["travel", "lighter", "bars"]);
/** Of the bars, the share the growing takes, and where the collapse into the rings starts. */
export const GROW = 0.55;
export const COLLAPSE_FROM = 0.62;
/** Of the whole travel, the share one country's own journey takes. */
export const JOURNEY = 0.3;
/** A stepped-back name keeps this much of its ink. */
export const STEPPED_BACK = 0.35;

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));
export function fieldAt(field, frame, states, timing) {
  let value = 0;
  EVENT_ORDER.forEach((event, i) => {
    const before = i === 0 ? 0 : states[i - 1][field];
    const delta = states[i][field] - before;
    if (delta === 0) return;
    const t = windowed(frame, timing, event, WINDOWS[event]?.[field] ?? [0, 1]);
    value += delta * (LINEAR.has(field) ? t : ease(t));
  });
  return value;
}

/** How far the `k`-th of `n` staggered moves has gone when the whole is at `t`. */
export const moveOf = (t, k, n, share = 0.35) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);

/** How far the country leaving `rank`-th of `n` has travelled when the whole travel is at `travel`. */
export const journeyOf = (travel, rank, n) => clamp01((travel - (n > 1 ? (rank / (n - 1)) * (1 - JOURNEY) : 0)) / JOURNEY);

/** A country's two seats and its arc's control point at the x domain `xMax` — the scrolly's bow, a fixed share of the
 *  chord, capped at `bowCap`. */
export function seatOf(e, xMax, plot, bowCap) {
  const xOf = (v) => plot.left + (v / xMax) * (plot.right - plot.left);
  const p0 = [xOf(e.from), e.y0];
  const p1 = [xOf(e.to), e.y1];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(len * 0.18, bowCap);
  return { p0, p1, c: [(p0[0] + p1[0]) / 2 - (dy / len) * bow, (p0[1] + p1[1]) / 2 + (dx / len) * bow] };
}

/**
 * @param {{ states: any[], timing: any, subject: string, lighter: string[], plot: any, bowCap: number,
 *   domain: { whole: number, close: number },
 *   entities: Array<{ code: string, rank: number, from: number, to: number, y0: number, y1: number,
 *     names: { whole: { dx: number, dy: number } | null, close: { dx: number, dy: number } | null } }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const travel = at("travel");
  const lighter = at("lighter");
  const legs = at("legs");
  const close = clamp01(at("zoom") - at("back"));
  const xMax = props.domain.whole + (props.domain.close - props.domain.whole) * close;
  const n = props.entities.length;
  const m = props.lighter.length;
  const release = at("release");
  const stepBack = ease(clamp01(lighter * m)) * (1 - release);
  const bars = at("bars");
  const collapse = ease(clamp01((bars - COLLAPSE_FROM) / (1 - COLLAPSE_FROM)));
  /** The whole-scale names give way as the camera starts to close; the close-up's land as it settles. */
  const wholeNames = clamp01(1 - close / 0.3);
  const closeNames = clamp01((close - 0.7) / 0.3);
  let landed = 0;
  const entities = {};
  for (const e of props.entities) {
    const raw = journeyOf(travel, e.rank, n);
    if (raw >= 1) landed += 1;
    const t = ease(raw);
    const seat = seatOf(e, xMax, props.plot, props.bowCap);
    const { point, partial } = arcAt(seat.p0, seat.c, seat.p1, Math.max(t, 0.0001));
    const pickedAt = props.lighter.indexOf(e.code);
    const arrived = e.code === props.subject ? 1 : clamp01((raw - 0.85) / 0.15);
    const kept = pickedAt < 0 ? 1 - (1 - STEPPED_BACK) * stepBack : 1;
    // THE BAR THAT EXPLAINS THE AXES: from zero to the country's 2000 weight, at the height of its own mix; it grows, then
    // collapses into its right end — the ring.
    const grow = ease(moveOf(clamp01(bars / GROW), props.entities.indexOf(e), n));
    const barEnd = props.plot.left + (seat.p0[0] - props.plot.left) * grow;
    entities[e.code] = {
      bar: { from: props.plot.left + (seat.p0[0] - props.plot.left) * collapse, to: barEnd, y: seat.p0[1] },
      ringShown: collapse,
      ring: seat.p0,
      point,
      arc: t > 0.001 ? partial : "",
      disc: clamp01(t * 4),
      picked: pickedAt < 0 ? 0 : ease(clamp01(lighter * m - pickedAt)),
      stepBack: pickedAt < 0 ? stepBack : 0,
      whole: e.names.whole ? { x: point[0] + e.names.whole.dx, y: point[1] + e.names.whole.dy, opacity: arrived * wholeNames * kept } : null,
      close: e.names.close ? { x: point[0] + e.names.close.dx, y: point[1] + e.names.close.dy, opacity: arrived * closeNames } : null,
    };
  }
  return {
    title: at("title"),
    furniture: at("furniture"),
    travel,
    xMax,
    close,
    wholeNames,
    closeNames,
    entities,
    cleaner: landed,
    lighterCount: Math.min(m, Math.floor(lighter * m + 1e-9)),
    lighterShown: clamp01(lighter * m * 4),
    legs: { across: ease(clamp01(legs * 2)), up: ease(clamp01(legs * 2 - 1)) },
    release,
    source: at("source"),
  };
}
