// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun.
// One state per event (the picture at its end), each event's change run through its window; the live map is driven
// in numbers (`mapStateAt`), the SVG overlay by `sceneAt`. Browser-safe: no Node import.

import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";
import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.1], furniture: [0.1, 0.25], count: [0.1, 0.25], classes: [0.25, 1] },
  reveal: { year: [0.03, 0.97] },
  subject: { furniture: [0, 0.08], rewind: [0.04, 0.12], zoom: [0.06, 0.4], odd: [0.42, 0.5], neighbours: [0.46, 0.54], replay: [0.56, 0.9] },
  conclusion: { neighbours: [0, 0.08], zoom: [0.1, 0.45], furniture: [0.45, 0.55], source: [0.6, 0.75] },
});

/** The overview's words leave before the camera departs and return once it is back; the close-up's arrive once it has
 *  settled and leave before it departs. */
export const GATES = Object.freeze({
  overview: { leaves: ["subject", 0, 0.06], returns: ["conclusion", 0.45, 0.57] },
  closeUp: { arrives: ["subject", 0.42, 0.5], leaves: ["conclusion", 0, 0.08] },
});

const LINEAR = new Set(["classes", "year", "rewind", "replay"]);
const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));

const BLANK = { title: 0, furniture: 0, count: 0, classes: 0, year: 0, rewind: 0, replay: 0, zoom: 0, odd: 0, neighbours: 0, source: 0 };
export function statesByEvent() {
  const establish = { ...BLANK, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, count: 1, classes: 1 };
  const reveal = { ...reference, year: 1 };
  // THE CLOSE-UP REPLAYS THE YEARS: the fills rewind to 2010 as the camera leaves, then run to 2024 again with the gauges.
  const subject = { ...reveal, furniture: 0, rewind: 1, replay: 1, zoom: 1, odd: 1, neighbours: 1 };
  const conclusion = { ...subject, zoom: 0, neighbours: 0, furniture: 1, source: 1 };
  return { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
}

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

export function gatesAt(frame, timing) {
  const w = ([event, a, b]) => ease(windowed(frame, timing, event, [a, b]));
  return {
    overview: clamp01(1 - w(GATES.overview.leaves) + w(GATES.overview.returns)),
    closeUp: clamp01(w(GATES.closeUp.arrives) - w(GATES.closeUp.leaves)),
  };
}

export function cameraAt({ whole, closeUp }, t) {
  if (t <= 0) return { ...whole };
  if (t >= 1) return { ...closeUp };
  const at = (k) => whole[k] + (closeUp[k] - whole[k]) * t;
  return { camX: at("camX"), camY: at("camY"), camZoom: at("camZoom"), camBearing: 0, camPitch: 0 };
}

/** The live map at `frame`: the camera and the fields the plan's paints are bound to (`plan.mjs`, `MAP_FIELDS`). */
export function mapStateAt(props, frame) {
  const { states, timing } = props;
  const at = (field) => fieldAt(field, frame, states, timing);
  const gates = gatesAt(frame, timing);
  const zoom = at("zoom");
  return {
    ...cameraAt(props.cameras, zoom),
    classes: at("classes"),
    year: at("year") - at("rewind") + at("replay"),
    ring: clamp01(at("odd") * Math.max(gates.overview, gates.closeUp)),
    regions: clamp01((zoom - 0.75) / 0.25),
  };
}

/** Everything the SVG overlay draws that moves, at `frame`. */
export function sceneAt(props, frame) {
  const { states, timing, colours, yearCount } = props;
  const at = (field) => fieldAt(field, frame, states, timing);
  const gates = gatesAt(frame, timing);
  const n = colours.classFills.length;
  const classes = at("classes");
  const role = { odd: at("odd"), neighbour: at("neighbours") };
  const names = {};
  for (const name of props.names) names[name.key] = clamp01(role[name.role] * gates[name.camera]);
  const yearStep = Math.min(yearCount - 1, Math.floor(at("year") * (yearCount - 1) + 1e-9));
  return {
    title: at("title"),
    furniture: at("furniture"),
    source: at("source"),
    swatches: Array.from({ length: n }, (_, i) => ease(clamp01(classes * n - i))),
    counter: { step: yearStep, opacity: clamp01(at("count")) },
    /** The close-up's shares run from 2010 (0) to 2024 (1) with the map's replay. */
    replay: clamp01(at("replay")),
    names,
    gates,
  };
}
