// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, every length on one scale so a bar keeps its length as it travels:
//   - GROW: band after band from the foot, each pair of bars grows out of the spine.
//   - FOLD: every men's bar slides across the spine onto the women's, keeping its length.
//   - COMMON: the part both share turns neutral.
//   - DETACH: the shared part leaves; what one sex has over the other — the difference — slides to the spine, on its side.
//   - CAMERA: the scale multiplies (geometrically, so the move reads at an even pace) around the spine; the whole scale's
//     ticks run out of the halves while the magnified scale's arrive at the same places.
//   - CROSS: a rule between the last band the men lead and the first the women lead; the two differences print their values.
//   - BACK + REBUILD: the camera returns ×1, then the shared part grows back out of the spine on both sides, pushing each
//     difference out to the end of its bar — the whole pyramid.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.4], grow: [0.1, 0.95] },
  reveal: { fold: [0, 0.42], common: [0.4, 0.55], detach: [0.55, 0.97] },
  subject: { camera: [0, 0.5], cross: [0.5, 0.85] },
  conclusion: { back: [0, 0.35], rebuild: [0.35, 0.85], source: [0.3, 0.75] },
});
const LINEAR = new Set(["grow", "fold"]);
/** Of a staggered field, the share one band's own move takes. */
export const MOVE = 0.4;
/** Of the detach, the share the shared part takes to leave, and the point the difference starts to slide. */
const LEAVE = 0.4;
const SLIDE_FROM = 0.25;

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

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {{ states: any[], timing: any, unit: number, zoomBy: number, halfWidth: number, crossing: number,
 *   spine: { left: number, right: number },
 *   rows: Array<{ band: string, male: number, female: number }>,
 *   ticks: Array<{ value: number, text: string, width: number, scale: "whole" | "close" }>,
 *   values: Array<{ row: number, text: string, width: number }>, valueGap: number }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const { left: sL, right: sR } = props.spine;
  const u = props.unit;
  const grow = at("grow");
  const fold = at("fold");
  const common = at("common");
  const detach = at("detach");
  const camera = clamp01(at("camera") - at("back"));
  const rebuild = at("rebuild");
  const zoom = props.zoomBy ** camera;
  const leave = clamp01(detach / LEAVE);
  const slide = ease(clamp01((detach - SLIDE_FROM) / (1 - SLIDE_FROM)));
  const n = props.rows.length;

  const rows = props.rows.map((r, i) => {
    const womenLead = r.female > r.male;
    const shared = Math.min(r.male, r.female) * u;
    const w = Math.abs(r.female - r.male) * u * zoom;
    if (rebuild > 0) {
      // The shared part grows out of the spine on both sides; the difference rides on the leader's end.
      const base = shared * rebuild;
      const left = base + (womenLead ? 0 : w);
      const right = base + (womenLead ? w : 0);
      return { bars: [{ fill: "men", x: sL - left, w: left, opacity: 1 }, { fill: "women", x: sR, w: right, opacity: 1 }] };
    }
    const g = ease(moveOf(grow, i, n));
    const f = ease(moveOf(fold, i, n));
    const men = r.male * u * g;
    const bars = [
      { fill: "women", x: sR, w: r.female * u * g, opacity: 1 - leave },
      { fill: "men", x: lerp(sL - men, sR, f), w: men, opacity: 1 - leave },
      { fill: "common", x: sR, w: shared, opacity: common * (1 - leave) },
    ];
    if (detach > 0) {
      const target = womenLead ? sR : sL - w;
      bars.push({ fill: womenLead ? "women" : "men", x: lerp(sR + shared, target, slide), w, opacity: 1 });
    }
    return { bars };
  });

  // The two scales' ticks: the whole one leaves over the first 60 % of the camera's move, the close one arrives over the last 60 %.
  const ticks = props.ticks.flatMap((t) => {
    const reach = t.value * u * zoom;
    const limit = props.halfWidth - t.width / 2;
    const edge = clamp01((limit - reach) / (limit * 0.08));
    const phase = t.scale === "whole" ? clamp01(1 - camera / 0.6) : clamp01((camera - 0.4) / 0.6);
    return [-1, 1].map((side) => ({ ...t, side, x: side < 0 ? sL - reach : sR + reach, opacity: reach <= limit ? phase * edge : 0 }));
  });

  const named = clamp01(at("cross") - at("back"));
  const values = props.values.map((v) => {
    const bar = rows[v.row].bars.at(-1);
    const toLeft = bar.fill === "men";
    return { ...v, x: toLeft ? bar.x - props.valueGap - v.width : bar.x + bar.w + props.valueGap, opacity: named };
  });

  return { title: at("title"), furniture: at("furniture"), rows, zoom, camera, ticks, values, zoomWord: camera, rule: at("cross"), source: at("source") };
}
