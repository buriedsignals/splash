// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// The camera travels between two viewBoxes with the choropleth video's `viewBoxAt` (the scale moves geometrically about
// their fixed point, so the camera closes in rather than panning and zooming side by side). The close-up's names are only
// shown once the camera has settled; the station's ring shrinks from its continental size onto the station.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";
import { viewBoxAt } from "../video-choropleth-europe-lowcarbon/scene.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], country: [0.25, 0.6] },
  reveal: { zoom: [0.02, 0.6], names: [0.66, 0.9] },
  subject: { subject: [0, 0.7] },
  conclusion: { source: [0, 0.4] },
});

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));
export function fieldAt(field, frame, states, timing) {
  let value = 0;
  EVENT_ORDER.forEach((event, i) => {
    const before = i === 0 ? 0 : states[i - 1][field];
    const delta = states[i][field] - before;
    if (delta === 0) return;
    value += delta * ease(windowed(frame, timing, event, WINDOWS[event]?.[field] ?? [0, 1]));
  });
  return value;
}

/** @param {{ states: any[], timing: any, cameras: { overview: any, closeUp: any }, capacity: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const zoom = at("zoom");
  const subject = at("subject");
  const counted = clamp01(subject / 0.8);
  return {
    title: at("title"),
    country: at("country"),
    zoom,
    viewBox: viewBoxAt(props.cameras.overview, props.cameras.closeUp, zoom),
    names: at("names"),
    subject,
    /** The capacity, stepped to the hundred while it climbs — the composition picks the text Bun measured for it. */
    capacity: counted >= 1 ? props.capacity : Math.floor((props.capacity * counted) / 100) * 100,
    source: at("source"),
  };
}
