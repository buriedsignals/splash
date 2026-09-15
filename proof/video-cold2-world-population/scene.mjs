// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe:
// no Node import.
//
// The shared mechanics: one state per event (`states.mjs`), each field's change run through its WINDOW inside the
// event (shares of the event's duration), eased unless the field is LINEAR.
//
// THE FILL is linear in years: the surface reaches the fractional year `first + fill × span`, closed down to zero.
// THE STACK is linear too; each of the eight copies of the 1800 slice starts its own eased journey in turn, from the
// slice at the left edge to its seat in the column beside 2023, one level above the one before — on the plot's scale.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** easeInOutQuad — a reading leaves and arrives calmly, and holds still in between. */
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Where, inside its event, each field's change runs: [from, to] as shares of the event. A field not named runs [0, 1]. */
export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.1, 0.8] },
  reveal: { fill: [0.02, 0.96], counter: [0, 0.05] },
  subject: { tint: [0, 0.12], lift: [0.04, 0.18], stack: [0.18, 0.97] },
  conclusion: { tint: [0, 0.4], counter: [0, 0.3], named: [0.15, 0.55], source: [0.3, 0.9] },
});

/** The fields that move at constant speed — a count, a fill in the data's own units. Every other field is eased. */
export const LINEAR = new Set(["fill", "stack"]);

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));

/** A field's value at `frame`: every event's change to it, run through its window. */
export function fieldAt(field, frame, states, timing) {
  let value = 0;
  EVENT_ORDER.forEach((event, i) => {
    const delta = states[i][field] - (i === 0 ? 0 : states[i - 1][field]);
    if (delta === 0) return;
    const t = windowed(frame, timing, event, WINDOWS[event]?.[field] ?? [0, 1]);
    value += delta * (LINEAR.has(field) ? t : ease(t));
  });
  return value;
}

/** Everything the frame draws that moves, at `frame`. */
export function sceneAt(props, frame) {
  const at = (field) => fieldAt(field, frame, props.states, props.timing);
  const r1 = (v) => Math.round(v * 10) / 10;
  const pts = props.points;
  const fill = at("fill");
  const reach = fill * (pts.length - 1);
  const whole = Math.min(Math.floor(reach), pts.length - 1);
  const f = reach - whole;
  const top = pts.slice(0, whole + 1).map((p) => [p.x, p.y]);
  if (whole + 1 < pts.length && f > 0) top.push([lerp(pts[whole].x, pts[whole + 1].x, f), lerp(pts[whole].y, pts[whole + 1].y, f)]);
  const surface = fill > 0 && top.length > 1 ? `M${r1(top[0][0])} ${r1(props.baseY)}${top.map((p) => `L${r1(p[0])} ${r1(p[1])}`).join("")}L${r1(top.at(-1)[0])} ${r1(props.baseY)}Z` : "";

  const { origin, seats } = props.stack;
  const stack = at("stack");
  const share = 0.3;
  const blocks = seats.map((seat, i) => {
    const p = ease(clamp01((stack - (i * (1 - share)) / (seats.length - 1)) / share));
    return { p, x: lerp(origin.x, seat.x, p), y: lerp(origin.y, seat.y, p) };
  });

  return {
    title: at("title"),
    furniture: at("furniture"),
    fill,
    surface,
    year: pts[whole].year,
    counter: at("counter"),
    tint: at("tint"),
    lift: at("lift"),
    blocks: stack > 0 ? blocks : [],
    count: blocks.filter((b) => b.p >= 1).length,
    named: at("named"),
    source: at("source"),
  };
}
