// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - ARRIVAL: the fuels one after another over the reference, each easing in over its own slice; the station count
//     is the stations arrived, stepped to the hundred until the last.
//   - FOCUS: the others step back; the nuclear keep their ink and gain their ring. The 72's count lands with it.
//   - WEIGHT: every dot's AREA travels from the dot's to the area proportional to its capacity; the power count climbs
//     with it, and the bar's nuclear segment widens from the share of the sites to the share of the power — the weights
//     carried from one each to their capacity, on one bar.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.1], furniture: [0.08, 0.2], arrive: [0.15, 0.95] },
  reveal: { focus: [0, 0.4], named: [0.35, 0.6] },
  subject: { focus: [0, 0.15], weight: [0.12, 0.72] },
  conclusion: { source: [0, 0.4] },
});
const LINEAR = new Set(["arrive", "weight"]);
/** A stepped-back station keeps this much of its ink. */
export const STEPPED_BACK = 0.18;

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

/** The station count at `arrive`: the stations whose fuel has arrived, weighted by each fuel's own arrival. */
export function arrivedAt(arrive, fuels) {
  const n = fuels.length;
  let count = 0;
  const shown = {};
  fuels.forEach((f, i) => {
    const t = ease(clamp01(arrive * n - i));
    shown[f.fuel] = t;
    count += f.n * clamp01(arrive * n - i);
  });
  return { shown, count };
}

/** A dot's radius at `t` of its growth: its area carried linearly from the dot's to its weight's. */
export function radiusAt(dotR, weightR, t) {
  if (t <= 0) return dotR;
  if (t >= 1) return weightR;
  return Math.sqrt((1 - t) * dotR * dotR + t * weightR * weightR);
}

/** @param {{ states: any[], timing: any, fuels: Array<{ fuel: string, n: number }>, total: number, shareCapacity: number, shareSites: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const arrive = at("arrive");
  const { shown, count } = arrivedAt(arrive, props.fuels);
  const weight = at("weight");
  return {
    title: at("title"),
    furniture: at("furniture"),
    shown,
    focus: at("focus"),
    weight,
    source: at("source"),
    /** The station count, stepped to the hundred while it climbs, exact once every station is in. */
    stations: arrive >= 1 ? props.total : Math.floor(count / 100) * 100,
    /** The power count, in tenths of a percent: whole percents while it climbs, exact once every dot has grown. */
    power: weight >= 1 ? props.shareCapacity : Math.floor(props.shareCapacity * weight),
    stationsShown: clamp01(arrive * 8),
    named: at("named"),
    powerShown: clamp01(weight * 6),
    /** The nuclear share of the weights, in %: of the sites, then carried with the dots to the share of the power. */
    bar: { share: props.shareSites + (props.shareCapacityExact - props.shareSites) * weight, shown: at("named") },
  };
}

// ── the live map ─────────────────────────────────────────────────────────────────────────────────────

/** The fields the map plan's paints are bound to, besides the camera (`map-plan.mjs`). */
export const mapFieldsOf = (fuels) => ["weight", "named", ...fuels.flatMap((_, i) => [`fill${i}`, `edge${i}`])];

/**
 * THE LIVE MAP AT `frame`, IN NUMBERS: the still camera, the weight every radius grows with, the rings' presence, and
 * for each fuel (in arrival order) its dots' fill and outline opacity — arrived, stepped back unless it is the subject,
 * the fill lightening and the outline set once the dots grow.
 *
 * @param {{ cameras: { whole: any }, subjectFuel: string } & Parameters<typeof sceneAt>[0]} props
 */
export function mapStateAt(props, frame) {
  const scene = sceneAt(props, frame);
  const state = { ...props.cameras.whole, weight: scene.weight, named: scene.named };
  props.fuels.forEach(({ fuel }, i) => {
    const stepped = fuel === props.subjectFuel ? 1 : 1 - (1 - STEPPED_BACK) * scene.focus;
    const shown = scene.shown[fuel] * stepped;
    state[`fill${i}`] = shown * (1 - 0.45 * scene.weight);
    state[`edge${i}`] = scene.weight > 0 ? shown : 0;
  });
  return state;
}
