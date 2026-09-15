// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// Two pictures are drawn at every frame, one over the other:
//
//   - THE LIVE MAP (`mapStateAt`): a camera in Web Mercator units travelling from Europe onto the close-up, centre and
//     zoom linear in the eased travel (the zoom is already logarithmic; the choropleth video's `cameraAt`), and the
//     fields the plan's paints are bound to: Ukraine tinted and the station ringed, the ring closing with the travel,
//     the regions' borders, the close-up's places — shown only once the camera has settled.
//   - THE OVERLAY (`sceneAt`): what stays SVG — the title card, the station's name and its capacity counting up, the
//     credit.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";
import { cameraAt } from "../video-choropleth-europe-lowcarbon/scene.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], country: [0.25, 0.6] },
  reveal: { zoom: [0.02, 0.6], regions: [0.45, 0.65], names: [0.66, 0.9] },
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

/** @param {{ states: any[], timing: any, capacity: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const subject = at("subject");
  const counted = clamp01(subject / 0.8);
  return {
    title: at("title"),
    country: at("country"),
    zoom: at("zoom"),
    names: at("names"),
    regions: at("regions"),
    subject,
    /** The capacity, stepped to the hundred while it climbs — the composition picks the text Bun measured for it. */
    capacity: counted >= 1 ? props.capacity : Math.floor((props.capacity * counted) / 100) * 100,
    source: at("source"),
  };
}

/** The fields the map plan's paints are bound to, besides the camera (`map-plan.mjs`). */
export const MAP_FIELDS = Object.freeze(["country", "zoom", "regions", "names"]);

/**
 * THE LIVE MAP AT `frame`, IN NUMBERS: the camera between the two fixed cameras at the eased travel, and every bound field.
 *
 * @param {{ cameras: { whole: any, closeUp: any } } & Parameters<typeof sceneAt>[0]} props
 */
export function mapStateAt(props, frame) {
  const s = sceneAt(props, frame);
  return { ...cameraAt(props.cameras, s.zoom), country: s.country, zoom: s.zoom, regions: s.regions, names: s.names };
}

/**
 * THE CLOSE-UP, SETTLED AND BARE: the first frame of reveal at which the camera has arrived and the regions are drawn,
 * and no place is named yet — what the close-up is measured at, so a measured cell is the map's colour, not a word's.
 */
export function settledBareFrameOf(props) {
  const { reveal } = props.timing;
  for (let f = reveal.start; f < reveal.start + reveal.duration; f++) {
    const s = sceneAt(props, f);
    if (s.zoom === 1 && s.regions === 1 && s.names === 0) return f;
  }
  throw new Error("no frame of reveal has the camera settled, the regions drawn and nothing named");
}
