// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT IN THREE MOVES, every length on one scale (pixels per percentage point) so a segment keeps its length as it
// travels:
//   - GROW: each country's whole mix grows from one left edge, row after row — coal, oil, gas, nuclear, bioenergy, other,
//     hydropower, solar, wind — to 100 %. Linear: it traverses a measured axis.
//   - SLIDE: each bar slides, unchanged, until its nuclear's middle is on the anchor: the lean appears. (Poland, no nuclear,
//     already sits there.)
//   - COMPARE: France's bar parts — nuclear up by `lift`, its two sides down by `lift` — then fossil, and after it
//     renewables, slide along the lower track to lie end to end from the nuclear's left edge. They stop short of its end.
//     The conclusion plays it backwards.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], furniture: [0.06, 0.3], grow: [0.12, 0.95] },
  reveal: { slide: [0.02, 0.9] },
  subject: { focus: [0, 0.22], split: [0.12, 0.38], carry: [0.4, 0.82], sum: [0.82, 0.96] },
  conclusion: { sum: [0, 0.12], carry: [0.05, 0.38], split: [0.32, 0.55], focus: [0.35, 0.6], ring: [0.55, 0.85], source: [0.35, 0.8] },
});
const LINEAR = new Set(["grow"]);
/** A row's share of a staggered move; the carry's two sides overlap more. */
export const MOVE = 0.3;
export const CARRY_MOVE = 0.65;
/** How far a stepped-back row fades. */
export const DIMMED = 0.22;

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

export const moveOf = (t, k, n, move = MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - move) : 0)) / move);

/** A share's text: one decimal, a French comma; a share under 0,05 is « 0 ». */
export const shareText = (v) => (v < 0.05 ? "0" : v.toFixed(1).replace(".", ","));

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, subject: string, plotLeft: number, anchor: number, unit: number, lift: number,
 *   gap: number, rows: Array<{ key: string, y: number, fossil: number, centre: number, renewable: number,
 *   segments: Array<{ key: string, group: "left" | "centre" | "right", share: number }> }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const grow = at("grow");
  const slide = at("slide");
  const focus = clamp01(at("focus"));
  const split = clamp01(at("split"));
  const carry = clamp01(at("carry"));
  const sum = clamp01(at("sum"));
  const { unit } = props;
  const n = props.rows.length;

  let sumAt = null;
  const rows = props.rows.map((r, i) => {
    const grown = moveOf(grow, i, n) * 100 * unit;
    const moved = ease(moveOf(slide, i, n));
    const landed = ease(clamp01((moveOf(slide, i, n) - 0.6) / 0.4));
    const start = lerp(props.plotLeft, props.anchor - (r.centre / 2 + r.fossil) * unit, moved);
    const nuclearLeft = start + r.fossil * unit;
    const isSubject = r.key === props.subject;
    const fossilGo = isSubject ? ease(moveOf(carry, 0, 2, CARRY_MOVE)) : 0;
    const renewableGo = isSubject ? ease(moveOf(carry, 1, 2, CARRY_MOVE)) : 0;
    const parted = isSubject ? split : 0;

    let cursor = start;
    const segments = r.segments.map((seg) => {
      const w = seg.share * unit;
      const x0 = cursor;
      cursor += w;
      // The growth reveals the bar from its left edge.
      const shown = Math.max(0, Math.min(w, grown - (x0 - start)));
      if (seg.group === "centre") return { key: seg.key, group: seg.group, x: x0, y: r.y - props.lift * parted, w: shown };
      const dx = seg.group === "left" ? r.fossil * unit * fossilGo : (r.fossil - r.centre) * unit * renewableGo;
      return { key: seg.key, group: seg.group, x: x0 + dx, y: r.y + props.lift * parted, w: shown };
    });
    const first = segments[0];
    const lastSeg = segments.at(-1);
    if (isSubject) sumAt = { x: nuclearLeft + (r.fossil + r.renewable) * unit + props.gap / 2, y: r.y + props.lift, top: r.y - props.lift };
    return {
      segments,
      dim: isSubject ? 0 : focus,
      nuclear: { x: nuclearLeft, w: r.centre * unit, y: r.y - props.lift * parted },
      leftTotal: { x: first.x - props.gap / 2, opacity: landed * (1 - parted) },
      rightTotal: { x: lastSeg.x + lastSeg.w + props.gap / 2, opacity: landed * (1 - parted) },
      centreValue: { x: nuclearLeft + (r.centre * unit) / 2, dy: -props.lift * parted, opacity: landed },
    };
  });

  const hundred = clamp01(moveOf(grow, 0, n) * 4) * (1 - clamp01(slide * 6));
  return {
    title: at("title"),
    furniture: at("furniture"),
    hundred,
    sides: ease(clamp01((slide - 0.35) / 0.5)),
    // The anchor steps back with the five rows: the comparison is between France's two tracks, not against the anchor.
    anchor: ease(clamp01((slide - 0.25) / 0.5)) * (1 - (1 - DIMMED) * focus),
    rows,
    sum: { ...sumAt, opacity: sum },
    ring: at("ring"),
    source: at("source"),
  };
}
