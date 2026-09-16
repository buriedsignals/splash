// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
// Every height is in px of one scale (`props.scale` px per TWh), on both rails, in the bar and in its copy; nothing here
// changes a height, only where a mark sits and how far a ribbon has poured.
//
//   - WHOLE: one bar grows down the left rail, its height the running total, the total counting beside it.
//   - SPLIT: gaps open in the bar, cutting it into the nine sources; each keeps its height, its words arriving.
//   - POUR: source after source, the ribbons run to the right along their own curve; a country's node fills by the
//     ribbons landed in it, its words arriving when it is full.
//   - FILTER: every ribbon but the subject source's steps back, and every node but the two the claim names.
//   - TRACE: the tracked ribbon fills with the accent, left to right, along the same curve.
//   - SLIDE: a copy of the subject source's bar travels to the tracked country's node, widening, its height kept; the
//     share arrives inside the ribbon beside it when it lands.
//   - BACK: the same move reversed, the others returning; the share travels inside the ribbon, along its middle, to the
//     source's end; the credit.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], whole: [0.12, 0.95] },
  reveal: { split: [0, 0.28], pour: [0.2, 0.98] },
  subject: { filter: [0, 0.2], trace: [0.1, 0.42], slide: [0.46, 0.86] },
  conclusion: { back: [0, 0.5], mark: [0.05, 0.6], source: [0.3, 0.75] },
});
const LINEAR = new Set(["whole"]);
/** Of a staggered window, how much one member's move takes. */
export const MOVE = { split: 0.4, pour: 0.3 };
/** Where, in a ribbon's own pour, its end starts filling its country's node. */
export const LANDING = 0.85;

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

export const twhText = (v) => `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")}\u00A0TWh`;
export const shareText = (v) => `${v}\u00A0%`;

export const moveOf = (t, k, n, move) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - move) : 0)) / move);
const lerp = (a, b, t) => a + (b - a) * t;
const r2 = (v) => Math.round(v * 100) / 100;

/** A cubic from `a` to `b`, its two controls at the middle x, cut at `t` (de Casteljau): the sub-curve's four points. */
function cut(x0, x1, ya, yb, t) {
  const mid = (x0 + x1) / 2;
  const P = [[x0, ya], [mid, ya], [mid, yb], [x1, yb]];
  const L = (p, q) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  const a = L(P[0], P[1]);
  const b = L(P[1], P[2]);
  const c = L(P[2], P[3]);
  const ab = L(a, b);
  const bc = L(b, c);
  return [P[0], a, ab, L(ab, bc)];
}

/** THE RIBBON POURED TO `t` of its own curve: the top edge cut at t, down the tip, the bottom edge cut at t back. */
export function ribbonAt(f, t) {
  if (t <= 0) return { d: "", tipX: f.x0 };
  const top = cut(f.x0, f.x1, f.ay, f.by, t);
  const bottom = cut(f.x0, f.x1, f.ay + f.h, f.by + f.h, t);
  const p = (q) => `${r2(q[0])} ${r2(q[1])}`;
  return {
    d: `M${p(top[0])} C${p(top[1])} ${p(top[2])} ${p(top[3])} L${p(bottom[3])} C${p(bottom[2])} ${p(bottom[1])} ${p(bottom[0])} Z`,
    tipX: top[3][0],
  };
}

/** A ribbon's top and bottom edge at the abscissa `x`. */
export function edgesAt(f, x) {
  const xOf = (t) => f.x0 + (f.x1 - f.x0) * (1.5 * t - 1.5 * t * t + t * t * t);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (xOf(m) < x) lo = m;
    else hi = m;
  }
  const t = (lo + hi) / 2;
  const top = f.ay + (f.by - f.ay) * (3 * t * t - 2 * t * t * t);
  return { top, bottom: top + f.h };
}

/** The share's word at `travel` of its way from where the copy lands to the source's end: along the ribbon's middle. */
export function labelAt(props, travel) {
  const { share, mark } = props;
  if (travel <= 0) return { x: share.x, y: share.y };
  if (travel >= 1) return { x: mark.x, y: mark.y };
  const tracked = props.flows.find((f) => f.tracked);
  const middle = (cx) => {
    const { top, bottom } = edgesAt(tracked, cx);
    return (top + bottom) / 2;
  };
  const cx = lerp(share.cx, mark.cx, travel);
  const off = lerp(share.y - middle(share.cx), mark.y - middle(mark.cx), travel);
  return { x: cx - share.width / 2, y: middle(cx) + off };
}

/**
 * @param {any} props — see `build.mjs`: `sources` and `countries` (homes, heights), `flows` (in the sources' order,
 *   each with its source index `si`), `whole`, `copy`, `rail`, the subject source's key and the tracked flow's.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const whole = at("whole");
  const split = at("split");
  const pour = at("pour");
  const filter = at("filter") - at("back");
  const trace = at("trace");
  const slideIn = at("slide");
  const back = at("back");
  const slide = slideIn - back;
  const n = props.sources.length;
  const mark = at("mark");

  const sources = props.sources.map((s, k) => ({
    key: s.key,
    y0: split >= 1 ? s.y0 : split <= 0 ? s.yWhole : lerp(s.yWhole, s.y0, split),
    w: lerp(props.rail.wide, props.rail.w, split),
    words: ease(moveOf(split, k, n, MOVE.split)),
    dim: s.key === props.subjectKey ? 0 : filter,
    accent: s.key === props.subjectKey ? trace : 0,
  }));
  const pours = sources.map((_, k) => ease(moveOf(pour, k, n, MOVE.pour)));
  const flows = props.flows.map((f) => ({
    t: pours[f.si],
    dim: f.from === props.subjectKey ? 0 : filter,
    accent: f.tracked ? trace : 0,
    dy: sources[f.si].y0 - props.sources[f.si].y0,
  }));
  const countries = props.countries.map((c) => {
    const fill = props.flows.reduce((sum, f, j) => (f.to === c.key ? sum + f.hTrue * clamp01((flows[j].t - LANDING) / (1 - LANDING)) : sum), 0);
    return {
      key: c.key,
      fill,
      words: fill >= c.h - 1e-6 ? 1 : clamp01((fill / c.h - 0.9) / 0.1),
      dim: c.key === props.trackedTo ? 0 : filter,
      accent: c.key === props.trackedTo ? trace : 0,
    };
  });
  const { from, to } = props.copy;
  return {
    title: at("title"),
    split,
    whole: {
      h: props.whole.h * whole,
      count: Math.round(props.whole.total * whole),
      opacity: whole > 0 ? 1 - clamp01(split * 4) : 0,
    },
    sources,
    flows,
    countries,
    copy: slide <= 0 ? null : { rect: slide >= 1 ? { ...to } : { x: lerp(from.x, to.x, slide), y: lerp(from.y, to.y, slide), w: lerp(from.w, to.w, slide), h: from.h } },
    share: clamp01(slideIn * 5 - 4),
    mark,
    label: labelAt(props, mark),
    source: at("source"),
  };
}
