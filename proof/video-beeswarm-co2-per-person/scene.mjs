// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - SPLIT: largest first, each country leaves the world disc and flies to its seat (an arrival, eased); the disc's area
//     is always the population that has not left — one area scale, so the burst conserves the people; the countries are
//     counted as they land.
//   - GHOST: the world disc's outline, back where it stood, glides to the empty top right (eased).
//   - GATHER: one after another, a copy of each of the six beyond 20 t flies into the outline; on landing it merges, the
//     merged disc's area the people of the copies that have landed.
//   - SETTLE: in the same order the copies leave the merged disc and fly back onto their seats; the outline goes; the share
//     travels under the bracket's count.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.6] },
  reveal: { split: [0, 0.95] },
  subject: { ring: [0, 0.18], ghost: [0.1, 0.4], gather: [0.36, 0.84], share: [0.82, 1] },
  conclusion: { settle: [0, 0.6], source: [0.3, 0.75] },
});
const LINEAR = new Set(["split", "gather", "settle"]);
/** Of the split, the share one country's own flight takes; of the gather and the settle, one copy's. */
export const MOVE = 0.3;
export const SLIDE = 0.3;

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
const lerp = (a, b, t) => a * (1 - t) + b * t;

/**
 * @param {{ states: any[], timing: any, radiusPerRootPerson: number,
 *   world: { x: number, y: number, r: number },
 *   compare: { x: number, y: number, share: { x: number, y: number } },
 *   bracket: { share: { x: number, y: number } },
 *   members: Array<{ people: number, x: number, y: number, order: number, high: boolean, highRank: number }> }} props
 *   `order`: the rank the country leaves the disc in (largest first); `highRank`: the rank its copy flies in, among the six.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const split = at("split");
  const gather = at("gather");
  const settle = at("settle");
  const ghost = at("ghost");
  const n = props.members.length;
  const highs = props.members.filter((m) => m.high);
  const h = highs.length;
  const { world, compare, radiusPerRootPerson: c } = props;

  let counted = 0;
  let remaining = 0;
  const members = props.members.map((m) => {
    const mv = landed(moveOf(split, m.order, n));
    if (mv === 0) {
      remaining += m.people;
      return { x: world.x, y: world.y, shown: 0, landed: 0, arrived: 0 };
    }
    if (mv === 1) {
      counted += 1;
      return { x: m.x, y: m.y, shown: 1, landed: 1, arrived: 1 };
    }
    const t = ease(mv);
    return { x: lerp(world.x, m.x, t), y: lerp(world.y, m.y, t), shown: 1, landed: 0, arrived: clamp01((mv - 0.85) / 0.15) };
  });

  let merged = 0;
  const copies = highs.map((m) => {
    const out = landed(moveOf(gather, m.highRank, h, SLIDE));
    const back = landed(moveOf(settle, m.highRank, h, SLIDE));
    if (out === 1 && back === 0) merged += m.people;
    const going = out > 0 && out < 1;
    const returning = back > 0 && back < 1;
    const t = going ? ease(out) : 1 - ease(back);
    return {
      x: lerp(m.x, compare.x, t),
      y: lerp(m.y, compare.y, t),
      on: going || returning ? 1 : 0,
      landed: out === 1 ? 1 : 0,
    };
  });

  const ghostAt = ease(clamp01(ghost));
  const travel = ease(clamp01((settle - 0.3) / 0.5));
  const ring = at("ring");
  return {
    title: at("title"),
    furniture: at("furniture"),
    world: { r: c * Math.sqrt(remaining), label: 1 - ease(clamp01(split / 0.08)) },
    members,
    counted,
    counter: split > 0 ? 1 - ring : 0,
    ring,
    ghost: {
      x: lerp(world.x, compare.x, ghostAt),
      y: lerp(world.y, compare.y, ghostAt),
      r: world.r,
      opacity: clamp01(ghost / 0.2) * (1 - ease(clamp01((settle - 0.35) / 0.4))),
    },
    copies,
    merged: { r: c * Math.sqrt(merged) },
    share: {
      x: lerp(compare.share.x, props.bracket.share.x, travel),
      y: lerp(compare.share.y, props.bracket.share.y, travel),
      opacity: at("share"),
    },
    source: at("source"),
  };
}
