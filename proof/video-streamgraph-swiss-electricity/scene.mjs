// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE FLOW is linear in years: the stream is revealed up to the x of the fractional year reached.
//
// THE ARGUMENT moves every band's edges through four arrangements measured in Bun — the stream; the giants closed to
// nothing with the small sources gathered on the same scale; the small stream magnified; the small sources as lines from
// zero — each point carried the field's share of the way from one to the next. The paths are drawn from those edges
// every frame, on a curve that passes through the readings.
//
// THE RACE is linear in years too: a cursor from the first year to the last, solar's rank of the last whole year riding
// solar's band at the cursor — its middle while it is a stream, its top while it is a line.

import { area, curveMonotoneX, line } from "d3-shape";
import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.3], furniture: [0.3, 0.8] },
  reveal: { flow: [0.02, 0.96] },
  subject: { aside: [0, 0.16], magnify: [0.1, 0.3], lines: [0.32, 0.5], race: [0.54, 0.96] },
  conclusion: { lines: [0, 0.4], magnify: [0.2, 0.6], aside: [0.35, 0.8], source: [0.4, 0.9] },
});
const LINEAR = new Set(["flow", "race"]);
/** Where the mark comes in, in years after the cursor passes it. */
const MARK_ARRIVES = 0.5;
/** A giant's name waits until its band is back to three quarters of its thickness, so it never floats on nothing. */
const NAME_RETURNS = 4;

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

const STAGES = ["stream", "aside", "magnify", "lines"];

/** Every band's edges at this frame: the stream, carried `aside`, `magnify` and `lines` of the way on. */
export function bandsAt(geometry, keys, fields) {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      geometry.stream[key].map((_, i) => {
        const edge = (e) => STAGES.slice(1).reduce((v, stage, s) => v + (geometry[stage][key][i][e] - geometry[STAGES[s]][key][i][e]) * fields[stage], geometry.stream[key][i][e]);
        return [edge(0), edge(1)];
      }),
    ]),
  );
}

/** @param {{ states: any[], timing: any, keys: string[], giants: string[], lineKeys: string[], geometry: any, xs: number[], years: Array<{ year: number, rank: number }>, mark: { year: number }, bandNames: Array<{ key: string, revealAt: number }> }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const fields = { aside: at("aside"), magnify: at("magnify"), lines: at("lines") };
  const flow = at("flow");
  const race = at("race");
  const bands = bandsAt(props.geometry, props.keys, fields);
  const xs = props.xs;
  const ys = props.years;

  const shape = area().x((_, i) => xs[i]).y0((d) => d[0]).y1((d) => d[1]).curve(curveMonotoneX).digits(1);
  const top = line().x((_, i) => xs[i]).y((d) => d[1]).curve(curveMonotoneX).digits(1);
  const opacity = Object.fromEntries(props.keys.map((key) => [key, props.giants.includes(key) ? 1 - fields.aside : 1]));
  const layers = props.keys.map((key) => ({ key, d: shape(bands[key]), edge: props.lineKeys.includes(key) ? top(bands[key]) : "" }));

  const reach = race * (ys.length - 1);
  const whole = Math.min(Math.floor(reach), ys.length - 1);
  const f = reach - whole;
  const next = Math.min(whole + 1, ys.length - 1);
  const cursorYear = ys[0].year + reach;
  const anchorOf = (i) => {
    const [y0, y1] = bands.Solar[i];
    return (y0 + y1) / 2 + ((y1 - y0) / 2) * fields.lines;
  };

  return {
    title: at("title"),
    furniture: at("furniture"),
    flow,
    front: xs[0] + (xs.at(-1) - xs[0]) * flow,
    ...fields,
    bands,
    opacity,
    layers,
    race,
    cursor: { x: xs[whole] + (xs[next] - xs[whole]) * f, year: ys[whole].year },
    rank: ys[whole].rank,
    anchor: { x: xs[whole] + (xs[next] - xs[whole]) * f, y: anchorOf(whole) + (anchorOf(next) - anchorOf(whole)) * f },
    labelShown: race > 0 ? 1 : 0,
    names: Object.fromEntries(props.bandNames.map((n) => [n.key, clamp01((xs[0] + (xs.at(-1) - xs[0]) * flow - n.revealAt) / 40) * clamp01(1 - NAME_RETURNS * fields.aside)])),
    mark: clamp01((cursorYear - props.mark.year) / MARK_ARRIVES),
    source: at("source"),
  };
}
