// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe:
// no Node import.
//
// One state per event (`states.mjs`), each field's change run through its WINDOW inside the event (shares of the
// event's duration), eased unless the field is LINEAR. The live map is driven in numbers (`mapStateAt`: a camera in
// Web Mercator fields, each country's class at the year shown, the arrival, the regions, the ring); the SVG overlay by
// `sceneAt`. The year a frame shows is HELD per year: the fills, the key's year, the count and every gauge read the
// same step, never an interpolation between two readings.

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

/** The index of the year a frame shows, held per year: 0 (the first year) … yearCount - 1. */
export function yearIndexAt(props, frame) {
  const at = (field) => fieldAt(field, frame, props.states, props.timing);
  const shown = clamp01(at("year") - at("rewind") + at("replay"));
  const n = props.yearCount;
  return Math.min(n - 1, Math.floor(shown * n + 1e-9));
}

/** The live map at `frame`: the camera, and every field the plan's bindings read (`map-plan.mjs`, mapFieldsOf). */
export function mapStateAt(props, frame) {
  const at = (field) => fieldAt(field, frame, props.states, props.timing);
  const i = yearIndexAt(props, frame);
  const classes = Object.fromEntries(Object.entries(props.classTable).map(([iso2, row]) => [`k_${iso2}`, row[i]]));
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
  return {
    title: at("title"),
    furniture: at("furniture"),
    source: at("source"),
    year: yearIndexAt(props, frame),
    names: at("names"),
    ring: at("ring"),
    // The key's swatches arrive with their class on the map.
    swatches: Array.from({ length: props.classCount }, (_, k) => clamp01(at("arrive") * props.classCount - k)),
  };
}
