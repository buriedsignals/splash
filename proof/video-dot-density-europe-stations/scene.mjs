// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - ARRIVAL: the fuels one after another over the reference, each easing in over its own slice; the station count
//     is the stations arrived, stepped to the hundred until the last.
//   - FOCUS: the others step back; the nuclear keep their ink and gain their ring. The 72's count lands with it.
//   - WEIGHT: every dot's radius travels from the dot's to the radius whose area is proportional to its capacity; the
//     power count climbs with it.

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

/** @param {{ states: any[], timing: any, fuels: Array<{ fuel: string, n: number }>, total: number, shareCapacity: number }} props */
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
  };
}
