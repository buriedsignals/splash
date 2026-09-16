// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe:
// no Node import.
//
// One state per event (`states.mjs`), each field's change run through its WINDOW inside the event (shares of the
// event's duration), eased unless the field is LINEAR. The live map is driven in numbers (`mapStateAt`: a camera in
// Web Mercator fields, each country's class at the year shown, the arrival, the regions, the ring); the SVG overlay by
// `sceneAt`. The years run CONTINUOUSLY: a frame stands at a fractional year (`yearPhaseAt`), so every quantity is
// read BETWEEN the two years around it — each country's class position is the two classes blended, each gauge the two
// shares blended. Only the WORDS step, because a year, a count and a rounded share have no in-between: they name the
// year the frame has reached. A quantity read at a floored year instead cuts — twelve fills and a key held dead still
// for ten frames and then swapping class in one, three times a second, which is the strobe the owner saw.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** easeInOutQuad — a reading leaves and arrives calmly, and holds still in between. */
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Where, inside its event, each field's change runs: [from, to] as shares of the event. A field not named runs [0, 1]. */
export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], furniture: [0.1, 0.3], arrive: [0.15, 1] },
  reveal: { year: [0.02, 0.98] },
  subject: { furniture: [0, 0.08], zoom: [0, 0.26], rewind: [0.04, 0.24], names: [0.28, 0.34], replay: [0.36, 0.95] },
  conclusion: { names: [0, 0.1], furniture: [0.45, 0.6], zoom: [0.1, 0.5], ring: [0.45, 0.65], source: [0.55, 0.8] },
});

/** The fields that move at constant speed — the years the map runs through, the classes arriving. */
export const LINEAR = new Set(["arrive", "year", "replay"]);

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

/** A camera between two fixed cameras at `t` — linear in the map's own plane, where zoom is already a logarithm. */
export function cameraAt(from, to, t) {
  if (t <= 0) return { ...from };
  if (t >= 1) return { ...to };
  const at = (key) => lerp(from[key] ?? 0, to[key] ?? 0, t);
  return { camX: at("camX"), camY: at("camY"), camZoom: at("camZoom"), camBearing: at("camBearing"), camPitch: at("camPitch") };
}

/**
 * WHERE A FRAME STANDS ON THE YEARS — the one reading everything else is derived from, so nothing can step on its own:
 *
 *   index  the year the frame NAMES, held per year: 0 (the first year) … yearCount - 1. The words read it.
 *   next   the year it is travelling to (itself, at the last year).
 *   t      how far between the two, 0..1. Every quantity blends by it.
 *
 * The years run at the pace the timing contract sets — about ten frames a year in `reveal`, eight in `replay`, and the
 * whole fifteen backwards over `rewind` — so `t` crosses a year in ten frames rather than in one.
 */
export function yearPhaseAt(props, frame) {
  const at = (field) => fieldAt(field, frame, props.states, props.timing);
  const shown = clamp01(at("year") - at("rewind") + at("replay"));
  const n = props.yearCount;
  const travelled = shown * n;
  const index = Math.min(n - 1, Math.floor(travelled + 1e-9));
  return { index, next: Math.min(n - 1, index + 1), t: clamp01(travelled - index) };
}

/** The year a frame names — what every word of the overlay reads. */
export const yearIndexAt = (props, frame) => yearPhaseAt(props, frame).index;

/** The live map at `frame`: the camera, and every field the plan's bindings read (`map-plan.mjs`, mapFieldsOf). */
export function mapStateAt(props, frame) {
  const at = (field) => fieldAt(field, frame, props.states, props.timing);
  const { index, next, t } = yearPhaseAt(props, frame);
  // A country's CLASS POSITION, not its class: a float between the two years' classes, which the plan's `fill-color`
  // ramp reads (`map-plan.mjs`, `ramp`). A country that changes class crosses to the next class's colour over the
  // year, and one hovering at a borne pulses instead of flickering between two colours frame after frame.
  const classes = Object.fromEntries(Object.entries(props.classTable).map(([iso2, row]) => [`k_${iso2}`, lerp(row[index], row[next], t)]));
  return {
    ...cameraAt(props.cameras.whole, props.cameras.closeUp, at("zoom")),
    arrive: at("arrive"),
    regions: at("names"),
    ring: at("ring"),
    ...classes,
  };
}

/** Everything the SVG overlay draws that moves, at `frame`. */
export function sceneAt(props, frame) {
  const at = (field) => fieldAt(field, frame, props.states, props.timing);
  const { index, next, t } = yearPhaseAt(props, frame);
  return {
    title: at("title"),
    furniture: at("furniture"),
    source: at("source"),
    year: index,
    // Each close-up gauge's fill: the two years' shares blended, so the bar GLIDES past the notch while its word steps.
    gauges: Object.fromEntries((props.names ?? []).map((n) => [n.code, lerp(n.shares[index].fill, n.shares[next].fill, t)])),
    names: at("names"),
    ring: at("ring"),
    // The key's swatches arrive with their class on the map.
    swatches: Array.from({ length: props.classCount }, (_, k) => clamp01(at("arrive") * props.classCount - k)),
  };
}
