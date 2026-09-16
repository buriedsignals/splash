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
import { areaPath, clamp01, drawnTo, ease, fieldAtOf, lerp, moveOf } from "../../skills/chart-video/scripts/series.mjs";

export { clamp01, ease, lerp };

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

/** A field's value at `frame`: every event's change to it, run through its window (the arithmetic is the skill's). */
export const fieldAt = fieldAtOf({ order: EVENT_ORDER, progressOf, windows: WINDOWS, linear: LINEAR });

/** Everything the frame draws that moves, at `frame`. */
export function sceneAt(props, frame) {
  const at = (field) => fieldAt(field, frame, props.states, props.timing);
  const pts = props.points;
  const fill = at("fill");
  const { index: whole, top } = drawnTo(pts, fill);
  const surface = fill > 0 ? areaPath(top, props.baseY) : "";

  const { origin, seats } = props.stack;
  const stack = at("stack");
  const blocks = seats.map((seat, i) => {
    const p = ease(moveOf(stack, i, seats.length, 0.3));
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
