// The video scheduler of the point / line / field maps (craft/gestures/GRAMMAR.md §5): three composed gestures placed
// into the six-event timing contract. `establish` (the title card) and `reference` (the map and its key arriving at
// the whole camera) are the scheduler's; the gestures fill `reveal`, `subject` and `conclusion` in story order; the
// conclusion stands at the whole camera — a close-up or a filter still active is released there, what was shown stays
// marked — and `hold` repeats it. Each event's state is a declaration (camera, accent, rings, step-back, notes, how
// many marks have arrived) the per-frame map plan reads; between two cameras the camera moves LINEARLY in Web-Mercator
// numbers, and words exist only at a measured camera: a note is gated off while its event's camera travels.
// Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";

export const EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];

/** The share of an event the camera travels in; words wait until it has landed. */
export const TRAVEL = [0, 0.4];

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * @param gestures validateGestures' gestures — exactly three (the core refuses any other count for video)
 * @param adapter  createGeoPoint(…)
 * @returns        { states: { [event]: state }, cameras: { [event]: { camX, camY, camZoom } }, travels: { [event]: bool } }
 */
export function scheduleGeoPointVideo({ gestures, adapter }) {
  if (gestures.length !== VIDEO_EVENTS.length)
    throw new GestureRefusal("gestures", `a video takes exactly ${VIDEO_EVENTS.length} gestures; this list has ${gestures.length}`, { remove: gestures.length - 1 });
  const implicit = implicitAccent(gestures);
  const base = adapter.rest();
  // Marks arrive with the map unless the first gesture reveals them, in their order, over its event.
  const arrived = gestures[0].do === "reveal" ? { ...base, shown: 0 } : base;
  const states = { establish: { ...arrived, shown: 0 }, reference: arrived };
  let s = arrived;
  gestures.forEach((g, i) => {
    s = adapter.apply(s, g, i);
    if (!s.accent.length && implicit !== undefined) s = { ...s, accent: [implicit] };
    if (VIDEO_EVENTS[i] === "conclusion") s = { ...s, camera: "whole", focus: null, factor: null, kept: null, shown: adapter.marks.length };
    states[VIDEO_EVENTS[i]] = s;
  });
  states.hold = states.conclusion;
  const sequence = EVENTS.map((e) => states[e]);
  for (let k = 0; k < sequence.length; k++)
    try {
      adapter.invariants(sequence.slice(0, k + 1));
    } catch (error) {
      const i = Math.max(0, k - 2);
      throw new GestureRefusal(`gestures[${i}]`, `${error.message}: drop it`, { remove: i });
    }
  // A gesture that leaves the picture as it was is no event (no-hold-event-computed): the core cannot see it.
  VIDEO_EVENTS.forEach((e, i) => {
    const before = states[EVENTS[EVENTS.indexOf(e) - 1]];
    if (gestures[i].do !== "pull-back" && adapter.equal(states[e], before))
      throw new GestureRefusal(`gestures[${i}]`, `${gestures[i].do} leaves the picture as the event before it left it: an event that changes nothing is a held frame. Drop it, or act on another mark`, { remove: i });
  });
  const cameraOf = (state) => (state.camera === "closeUp" ? adapter.closeUpOn(state.focus) : adapter.cameras.whole);
  const cameras = Object.fromEntries(EVENTS.map((e) => [e, cameraOf(states[e])]));
  const travels = Object.fromEntries(EVENTS.map((e, k) => [e, k > 0 && JSON.stringify(cameras[e]) !== JSON.stringify(cameras[EVENTS[k - 1]])]));
  return { states, cameras, travels };
}

/** The camera at progress t (0..1) of an event: linear in Web-Mercator numbers over TRAVEL, from the event before. */
export function cameraAt(scheduled, event, t) {
  const k = EVENTS.indexOf(event);
  const to = scheduled.cameras[event];
  if (k <= 0 || !scheduled.travels[event]) return to;
  const from = scheduled.cameras[EVENTS[k - 1]];
  const u = clamp01((t - TRAVEL[0]) / (TRAVEL[1] - TRAVEL[0]));
  return { camX: from.camX + (to.camX - from.camX) * u, camY: from.camY + (to.camY - from.camY) * u, camZoom: from.camZoom + (to.camZoom - from.camZoom) * u };
}

/** Whether words may be drawn at progress t of an event: never while its camera travels. */
export const wordsAt = (scheduled, event, t) => !scheduled.travels[event] || t >= TRAVEL[1];

/** How many marks have arrived at progress t of an event (a reveal brings them in their order over the event). */
export function shownAt(scheduled, event, t, total) {
  const k = EVENTS.indexOf(event);
  const now = scheduled.states[event].shown;
  const before = k > 0 ? scheduled.states[EVENTS[k - 1]].shown : 0;
  if (now <= before) return now;
  return Math.round(before + (now - before) * clamp01(t)) || (total === 0 ? 0 : before);
}
