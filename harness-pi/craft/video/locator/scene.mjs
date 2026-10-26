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
// Zone kit: the shared browser-safe copy (`ease`/`clamp01` byte-identical to skills/scrolly/assets/reveal.mjs);
// `cameraAt` and `placePills` are carried from proof/video-choropleth-europe-lowcarbon/scene.mjs (end of this file).
import { clamp01, ease } from "#shared/chart-video/series.mjs";

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

/** @param {{ states: any[], timing: any, capacity: number, countStep: number }} props */
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
    /** The capacity, stepped by `countStep` while it climbs (the proof's hundred) — the composition picks the text Bun
     *  measured for it. Zone kit: the step is the story's (`countStepOf`), rounded so Bun's keys and these agree. */
    capacity: counted >= 1 ? props.capacity : stepOf(Math.floor((props.capacity * counted) / props.countStep), props.countStep),
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

/** Zone kit: the count's n-th step, rounded off float noise (0.1 × 3), so Bun's measured texts and the frame's key agree. */
export const stepOf = (i, step) => Math.round(i * step * 1e6) / 1e6;

// ── carried from proof/video-choropleth-europe-lowcarbon/scene.mjs (zone kit: a beat cannot import another proof) ──

/** The camera between the whole map (t = 0) and the close-up (t = 1): every field linear in t — the zoom is
 *  already logarithmic, the centre is in Web Mercator units, the plane MapLibre moves in (the pilot's rule). */
export function cameraAt(cameras, t) {
  const { whole, closeUp } = cameras;
  if (t <= 0) return { ...whole };
  if (t >= 1) return { ...closeUp };
  const at = (k) => whole[k] + (closeUp[k] - whole[k]) * t;
  return { camX: at("camX"), camY: at("camY"), camZoom: at("camZoom"), camBearing: 0, camPitch: 0 };
}


const hits = (a, b, gap) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

/**
 * `keepApart`, for a frame with no DOM. The scrolly steps a name that would touch an earlier one down under
 * it; at the video's size that walks a name off its country, so every clear position near the seat is
 * tried — centred on it, shifted by a quarter or a half of the pill either way, stacked under or over any
 * pill already placed, set beside one — and the cheapest wins:
 *
 *   cost = distance from the centred position, across in half-widths and down in heights
 *        + COVER_WEIGHT × the share of the pill lying over another country's land (`cover`, optional)
 *
 * A position is clear when it is inside the stage by `gap`, touches no placed pill or obstacle by `gap`, and
 * keeps the seat within one pill height of the pill — a name stays against its country. When no clear
 * position keeps that promise, the nearest clear position anywhere is taken; when there is none, it throws.
 * An item's own `avoid` boxes are ones only that item may not touch (Albania's land, for every close-up
 * name but Albania's).
 * Items come in priority order. Returns top-left corners in stage pixels.
 *
 * @param {{ obstacles?: Array<{x:number,y:number,width:number,height:number}>,
 *           cover?: (box: {x:number,y:number,width:number,height:number}, key: string) => number,
 *           allowed?: (box: {x:number,y:number,width:number,height:number}, key: string) => boolean }} [options]
 *   `allowed` refuses a position outright — a word whose ink cannot be read on the cell it would land on.
 */
export const COVER_WEIGHT = 2;
export function placePills(items, stage, gap, { obstacles = [], cover = () => 0, allowed = () => true } = {}) {
  const eps = 1e-6;
  const inside = (b) => b.x >= gap - eps && b.y >= gap - eps && b.x + b.width <= stage.width - gap + eps && b.y + b.height <= stage.height - gap + eps;
  const pull = (b) => ({
    ...b,
    x: Math.min(Math.max(b.x, gap), stage.width - gap - b.width),
    y: Math.min(Math.max(b.y, gap), stage.height - gap - b.height),
  });
  const placed = [...obstacles];
  const out = {};
  for (const item of items) {
    const w = item.width;
    const h = item.height;
    const origin = pull({ x: item.cx - w / 2, y: item.cy - h / 2, width: w, height: h });
    const edges = [...placed, ...(item.avoid ?? [])];
    // A name that may be led to its seat is also tried standing clear of the seat, one to three of its heights off.
    const off = item.beside ? [1, 2, 3].map((k) => item.beside + (k - 1) * h) : [];
    const ys = [...[-1, -0.5, 0, 0.5, 1].map((k) => origin.y + k * h), ...edges.flatMap((p) => [p.y + p.height + gap + eps, p.y - gap - h - eps]), ...off.flatMap((d) => [item.cy + d, item.cy - d - h])];
    const xs = [...[-0.5, -0.25, 0, 0.25, 0.5].map((k) => origin.x + k * w), ...edges.flatMap((p) => [p.x + p.width + gap + eps, p.x - gap - w - eps]), ...off.flatMap((d) => [item.cx + d, item.cx - d - w])];
    const clear = xs.flatMap((x) => ys.map((y) => ({ x, y, width: w, height: h }))).filter((b) => inside(b) && !placed.some((p) => hits(b, p, gap)) && !(item.avoid ?? []).some((a) => hits(b, a, gap)) && allowed(b, item.key));
    const reach = (b) => Math.hypot(Math.max(b.x - item.cx, 0, item.cx - b.x - w), Math.max(b.y - item.cy, 0, item.cy - b.y - h));
    const moved = (b) => Math.hypot((b.x - origin.x) / (w / 2), (b.y - origin.y) / h);
    // A name kept clear of an obstacle around its own seat (Albania's ring) may stand that obstacle's width further off.
    const near = clear.filter((b) => reach(b) <= h + (item.slack ?? 0));
    const box = near.length
      ? near.map((b) => ({ b, cost: moved(b) + COVER_WEIGHT * cover(b, item.key) })).sort((a, z) => a.cost - z.cost)[0].b
      : clear.sort((a, z) => moved(a) - moved(z))[0];
    if (!box) throw new Error(`no clear position for the name ${item.key} inside a ${stage.width}×${stage.height} stage`);
    placed.push(box);
    out[item.key] = { x: box.x, y: box.y };
  }
  return out;
}

