// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, every length on one scale:
//   - RISE: the six 2000 stems rise from the zero line at their slot's centre.
//   - STACK: copies of China's stem fly over, one after another, and stack end to end just left of the American stem; the stack
//     is cut at the American head, so the last copy shows only its fraction; the ratio is the American head over the
//     Chinese one — the number of copies that fit.
//   - TRAVEL: every stem travels to its 2023 level (two dates: an arrival, eased) and slides right, a tint of it left at
//     2000 on the left; the copies grow with China's stem and the stack stays cut at the American head, so fewer fit.
//   - RELEASE: the copies go, the four others come back — the whole chart — China's 2023 head ringed.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
// Zone kit: the easing comes from `#shared/chart-video/series.mjs` (byte-identical to the scrolly skill's reveal.mjs,
// which a beat under stories/ cannot reach by a relative path and the Remotion bundle cannot reach by any other).
import { clamp01, ease } from "#shared/chart-video/series.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.4], rise: [0.1, 0.95] },
  reveal: { focus: [0, 0.25], stack: [0.12, 0.95] },
  subject: { travel: [0, 0.85] },
  conclusion: { release: [0, 0.5], source: [0.25, 0.7] },
});
const LINEAR = new Set(["rise", "stack"]);
export const MOVE = 0.35;
/** Of the stack, the share one copy's flight takes. */
export const FLIGHT = 0.3;

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

/** The worked example's rule: one decimal, a French comma, no thousands separator. */
export const PROOF_FORMAT = Object.freeze({ decimals: 1, small: 1, below: 0, decimal: ",", group: "" });

/**
 * A value's text at `v`, in the story's number format `{ decimals, small, below, decimal, group }`: `small` decimals
 * under `below`, `decimals` from it, `decimal` as the separator, `group` between thousands ("" for none).
 */
export const valueText = (v, f = PROOF_FORMAT) => {
  const [whole, part] = v.toFixed(v >= f.below ? f.decimals : f.small).split(".");
  const grouped = f.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : whole;
  return part ? `${grouped}${f.decimal}${part}` : grouped;
};

/** The ratio's text: always one decimal (« ×7,5 »), the story's decimal separator. */
export const ratioText = (v, f = PROOF_FORMAT) => v.toFixed(1).replace(".", f.decimal);

/** Two #rrggbb colours mixed `t` of the way — the proof imported it from video-cartogram-europe-lowcarbon/scene.mjs. */
export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}


const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, subject: string, other: string, baseline: number, unit: number, copies: number,
 *   stackGap: number, pairs: Array<{ code: string, before: number, after: number, centreX: number, pastX: number, presentX: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const rise = at("rise");
  const stack = at("stack");
  const travel = at("travel");
  const release = at("release");
  const focus = clamp01(at("focus") - release);
  const n = props.pairs.length;
  const pairs = props.pairs.map((p, i) => {
    const up = ease(moveOf(rise, i, n));
    const present = (p.before + (p.after - p.before) * travel) * up;
    return {
      up,
      present,
      past: p.before * up,
      x: lerp(p.centreX, p.presentX, travel),
      pastX: lerp(p.centreX, p.pastX, travel),
      pastShown: travel > 0 ? 1 : 0,
      stepBack: p.code === props.subject || p.code === props.other ? 0 : focus,
    };
  });
  const cn = pairs[props.pairs.findIndex((p) => p.code === props.subject)];
  const us = pairs[props.pairs.findIndex((p) => p.code === props.other)];
  const h = cn.present * props.unit;
  const H = us.present * props.unit;
  const stackX = us.x - props.stackGap - props.stackW;
  const gone = release;
  // Each copy flies from China's stem to its place in the stack: [k·h, (k+1)·h] from the zero line, cut at the American head.
  const copies = Array.from({ length: props.copies }, (_, k) => {
    const flight = ease(moveOf(stack, k, props.copies, FLIGHT));
    const low = k * h;
    const high = Math.min((k + 1) * h, H);
    const shown = Math.max(0, high - low);
    const fromX = cn.x;
    const fromLow = 0;
    return { x: lerp(fromX - props.stackW / 2, stackX, flight), low: lerp(fromLow, low, flight), h: flight > 0 ? (flight < 1 ? h : shown) : 0, flight, opacity: (1 - gone) * (flight > 0 ? 1 : 0) };
  });
  const landed = copies.filter((c) => c.flight >= 1).length;
  const full = copies.every((c) => c.flight >= 1);
  return {
    title: at("title"),
    furniture: at("furniture"),
    pairs,
    copies,
    stackX,
    /** The ratio shows once every copy has landed: before that it would count flights, not the heads. It stands where
     *  the American value stands, so the two hand over by a CUT, never a crossfade (motion-grammar): the ratio goes on
     *  the release's first frame and the value comes back whole on that same frame. */
    ratio: H / Math.max(h, 1e-9),
    ratioShown: full && !(gone > 0) ? 1 : 0,
    landed,
    ratioY: props.baseline - Math.min(H, props.copies * h),
    ring: release,
    source: at("source"),
  };
}
