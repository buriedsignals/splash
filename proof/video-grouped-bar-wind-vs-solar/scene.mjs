// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, every height on one scale so a part keeps its height as it travels:
//   - MIX: each country's whole electricity rises as one column, source on source, to 100 %; wind and solar on top.
//   - OTHERS: every other source fades out of the columns, leaving wind and solar where they were.
//   - SPLIT: the column's width parts into two bars side by side where wind and solar stand, then the two slide down to the
//     baseline.
//   - CAMERA: the scale closes geometrically from 100 % onto the two; their shares land over them.
//   - COMPARE: group after group, wind's level is carried across over solar as a line; the lead is counted where solar ends
//     under it.
//   - FOCUS: every group but the exception steps back.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.15], furniture: [0.1, 0.4], mix: [0.2, 0.95] },
  reveal: { others: [0, 0.25], split: [0.28, 0.6], camera: [0.66, 0.96] },
  subject: { compare: [0.05, 0.9] },
  conclusion: { focus: [0, 0.5], source: [0.3, 0.8] },
});
const LINEAR = new Set(["mix", "compare", "split"]);
/** Of a staggered field, the share one group's own move takes. */
export const MOVE = 0.35;

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

export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);

/** A share's text: one decimal, a French comma. */
export const shareText = (v) => v.toFixed(1).replace(".", ",");

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, subject: string, baseline: number, units: { whole: number, close: number },
 *   colW: number, barW: number,
 *   groups: Array<{ name: string, wind: number, solar: number, colX: number, windX: number, solarX: number,
 *     mix: Array<{ source: string, share: number }> }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const mix = at("mix");
  const others = at("others");
  const split = at("split");
  const camera = at("camera");
  const compare = at("compare");
  const focus = at("focus");
  const unit = props.units.whole * (props.units.close / props.units.whole) ** camera;
  const n = props.groups.length;
  let lead = 0;
  const groups = props.groups.map((g, i) => {
    const risen = ease(moveOf(mix, i, n)) * 100;
    // The stack, from the bottom: every source's span [low, high] in shares, cut at how far the column has risen.
    let low = 0;
    const segments = g.mix.map((m) => {
      const span = { source: m.source, low, high: low + m.share };
      low += m.share;
      const shown = Math.max(0, Math.min(span.high, risen) - span.low);
      return { source: m.source, y: props.baseline - (span.low + shown) * unit, h: shown * unit, fade: m.source === "Wind" || m.source === "Solar" ? 0 : others };
    });
    const bar = (key, targetX) => {
      const seg = segments.find((s) => s.source === (key === "wind" ? "Wind" : "Solar"));
      const value = g[key];
      const stackBottom = props.baseline - seg.y - seg.h;
      // The column parts side by side where it stands, then the two descend: they never cross.
      const part = ease(clamp01(split * 2));
      const fall = ease(clamp01(split * 2 - 1));
      return {
        x: lerp(g.colX, targetX, part),
        w: lerp(props.colW, props.barW, part),
        y: seg.y + stackBottom * fall,
        h: seg.h,
        top: props.baseline - value * unit,
        value,
      };
    };
    const raw = moveOf(compare, i, n);
    if (raw >= 1 && g.solar < g.wind) lead += 1;
    return {
      segments,
      wind: bar("wind", g.windX),
      solar: bar("solar", g.solarX),
      level: { y: props.baseline - g.wind * unit, reach: ease(raw) },
      shares: clamp01((camera - 0.5) / 0.5),
      stepBack: g.name === props.subject ? 0 : focus,
    };
  });
  return { title: at("title"), furniture: at("furniture"), groups, unit, lead, counting: compare > 0 ? 1 : 0, levels: 1 - focus, source: at("source") };
}
