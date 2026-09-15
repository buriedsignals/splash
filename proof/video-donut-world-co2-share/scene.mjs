// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - TRACE: the world's 2000 ring draws clockwise from twelve o'clock, the six arcs end to end at their shares.
//   - GROW: a copy of the ring grows out of it; its circumference is the world's tonnes and every country's arc its own
//     tonnes, on ONE px-per-Gt scale at every frame — the tonnes between the two years are interpolated, never labelled,
//     so no word is written until the ring has landed on 2023.
//   - SPLIT: country by country, both arcs leave the world for their own ring (an arrival, eased): the centre, the radius
//     and the start angle travel, the SWEEP NEVER CHANGES — one turn is the world on every ring.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], world: [0.05, 1] },
  reveal: { grow: [0.06, 0.66], relabel: [0, 1] },
  subject: { split: [0, 0.95] },
  conclusion: { ring: [0, 0.5], source: [0.2, 0.75] },
});
const LINEAR = new Set(["world", "relabel", "split"]);
/** Of the split, the share one country's own flight takes. */
export const MOVE = 0.34;
const TURN = 2 * Math.PI;

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

export const moveOf = (t, k, n, share = MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);
/** A move has landed at 1 — floating point leaves the last one a hair short of it. */
const LANDED = 1 - 1e-9;
const landed = (t) => (t >= LANDED ? 1 : t);
/** Exact at both ends: `lerp(a, b, 1)` is `b`, not `a + (b - a)`. */
const lerp = (a, b, t) => a * (1 - t) + b * t;
const phase = (t, a, b) => ease(clamp01((t - a) / (b - a)));

/** An arc from `start` clockwise from twelve o'clock, `drawn` long, its seam of ground taken out of both ends. */
export function arcPath({ x, y, r, start, drawn, seam }) {
  const cut = seam / r;
  const from = start + cut / 2;
  const sweep = Math.min(drawn - cut, TURN * 0.9999);
  if (!(sweep > 0)) return null;
  const to = from + sweep;
  const at = (a) => `${(x + Math.sin(a) * r).toFixed(2)} ${(y - Math.cos(a) * r).toFixed(2)}`;
  return `M ${at(from)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${sweep > Math.PI ? 1 : 0} 1 ${at(to)}`;
}

/**
 * @param {{ states: any[], timing: any,
 *   world: { x: number, y: number, r0: number, r1: number, width: number, seam: number, pxPerGt: number },
 *   small: { outer: number, inner: number, width: number },
 *   countries: Array<{ gt0: number, gt1: number, share0: number, share1: number, seat: { x: number, y: number } }> }} props
 *   `countries` in the order they sit on the ring, the order they fly in and the order of the seats, left to right.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const world = at("world");
  const grow = at("grow");
  const relabel = at("relabel");
  const split = at("split");
  const { world: w, small, countries } = props;
  const n = countries.length;

  const trace = phase(world, 0, 0.75) * TURN;
  const worldR = lerp(w.r0, w.r1, grow);
  const grown = clamp01(grow / 0.06);
  const wordsOut = 1 - phase(split, 0, 0.1);
  const tracksOut = 1 - phase(split, 0, 0.4);

  let start0 = 0;
  let start1 = 0;
  const arcs = countries.map((c, i) => {
    const sweep0 = (c.share0 / 100) * TURN;
    const sweep1 = (w.pxPerGt * lerp(c.gt0, c.gt1, grow)) / worldR;
    const mv = landed(moveOf(split, i, n));
    const t = ease(mv);
    const place = (start, sweep, from, to, opacity) => ({
      x: lerp(w.x, c.seat.x, t),
      y: lerp(w.y, c.seat.y, t),
      r: lerp(from, to, t),
      start: lerp(start, 0, t),
      sweep,
      drawn: Math.min(sweep, Math.max(0, trace - lerp(start, 0, t))),
      width: lerp(w.width, small.width, t),
      seam: w.seam * (1 - t),
      opacity,
    });
    const arc = {
      before: place(start0, sweep0, w.r0, small.inner, 1),
      after: place(start1, sweep1, worldR, small.outer, grown),
      arrived: phase(mv, 0.7, 1),
    };
    start0 += sweep0;
    start1 += sweep1;
    return arc;
  });

  return {
    title: at("title"),
    tracks: phase(world, 0, 0.3) * tracksOut,
    copy: grown * tracksOut,
    worldR,
    labels: { before: phase(world, 0.55, 1) * (1 - phase(relabel, 0, 0.12)), after: phase(relabel, 0.62, 0.82) * wordsOut },
    centre: { before: phase(world, 0.4, 0.8) * wordsOut, after: phase(relabel, 0.62, 0.82) * wordsOut },
    arcs,
    ring: at("ring"),
    source: at("source"),
  };
}
