// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun.
//
// This is `choropleth-drive.mjs`'s painting, re-expressed as a function of the frame. The drive reads the
// DOM (`querySelector`, `getScreenCTM`, `getBoundingClientRect`) because a scroll can resize the page under
// it; a video frame has one size, measured in Bun, so the same rules become numbers:
//
//   - THE ZOOM IS THE CAMERA: a viewBox travelling from the whole frame onto the close-up, both fitted to
//     the stage with the scrolly's `fitViewBox` so the map runs edge to edge, eased with its `ease`. The
//     travel keeps the one point that sits at the same pixel in both views where it is, and moves the
//     scale geometrically, so the camera closes in rather than panning and zooming side by side.
//   - FILL = CLASS × REVEAL × FILTER: a class arriving on bare land, lowest first; under the floor, a
//     country steps back to bare land while the seven keep their ink.
//   - NAMES AT THEIR SEATS, KEPT APART: every pill is placed once per camera, in Bun, for the whole set that
//     camera ever shows (`placePills`), so a name never moves when another arrives. A name is only shown
//     once its camera has settled.
//
// Browser-safe: no Node module, no `#shared/chart-beat` import (those read the file system).

import { clamp01, ease, fitViewBox } from "../../skills/scrolly/assets/reveal.mjs";
import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";

/** The share of its own event each field changes over. A field changing in an event not named here
 *  changes over the whole event. */
export const WINDOWS = Object.freeze({
  establish: { title: [0, 0.001] },
  // The lowest class lands at 0.375 of reference; its three names follow it.
  reference: { title: [0, 0.15], furniture: [0.12, 0.25], count: [0.12, 0.25], classes: [0.25, 1], context: [0.42, 0.52] },
  // The floor passes the lowest borne at 0.17 of reveal; its three names step back with it.
  reveal: { filter: [0.03, 0.73], floor: [0.03, 0.73], context: [0.03, 0.15], top: [0.8, 0.95] },
  subject: { top: [0, 0.05], furniture: [0, 0.04], filter: [0.04, 0.22], zoom: [0.04, 0.24], odd: [0.27, 0.32], neighbours: [0.31, 0.38], callout: [0.44, 0.5] },
  conclusion: { neighbours: [0, 0.08], callout: [0, 0.08], zoom: [0.1, 0.42], furniture: [0.4, 0.5], top: [0.45, 0.55], context: [0.45, 0.55], missing: [0.47, 0.57], end: [0.78, 0.92] },
});

/** When the names of each camera may be seen: the overview's leave before the camera departs and return
 *  after it has come back; the close-up's arrive after it has settled and leave before it departs. */
export const GATES = Object.freeze({
  overview: { leaves: ["subject", 0, 0.05], returns: ["conclusion", 0.45, 0.57] },
  closeUp: { arrives: ["subject", 0.27, 0.32], leaves: ["conclusion", 0, 0.08] },
});

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));

/** The fields that travel a scale — the classes arriving, the floor rising — move linearly; each class or
 *  step eases its own arrival in `sceneAt`. */
const LINEAR = new Set(["classes", "filter", "floor"]);

/** When the close-up's shares count up from zero: after the camera has settled, each over its own window. */
export const COUNT_UP = Object.freeze({ odd: ["subject", 0.27, 0.37], neighbour: ["subject", 0.31, 0.41] });

/** A field's value at `frame`: nothing before `establish`, then every event's change run through its window.
 *  The class reveal is linear across the classes (each class eases its own arrival, below); everything
 *  else eases. */
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

export function gatesAt(frame, timing) {
  const w = ([event, a, b]) => ease(windowed(frame, timing, event, [a, b]));
  return {
    overview: clamp01(1 - w(GATES.overview.leaves) + w(GATES.overview.returns)),
    closeUp: clamp01(w(GATES.closeUp.arrives) - w(GATES.closeUp.leaves)),
  };
}

// ── the camera ───────────────────────────────────────────────────────────────────────────────────────

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/** The whole frame, fitted to the stage and widened to it (the scrolly's own call). */
export function overviewViewBox(frame, stage) {
  return fitViewBox({ x: 0, y: 0, w: frame.width, h: frame.height }, stage, NO_INSETS);
}

/**
 * THE CLOSE-UP, CENTRED ON ALBANIA — the scrolly's zoom box (`render-directions-scrolly.mjs`: centred on the
 * odd one's seat, both axes, reaching every neighbour's seat), sized for the video's stage. The scrolly
 * padded that reach by 2.2 for 12 px pills beside a card; here the scale is the largest at which every
 * close-up name's seat, with its pill around it and `gap` of air, stays inside the stage — so the close-up
 * is as close as the names allow, and Albania stays at the centre.
 */
export function closeUpViewBox(stage, centre, names, gap) {
  let scale = Infinity;
  for (const n of names) {
    const dx = Math.abs(n.seat.x - centre.x);
    const dy = Math.abs(n.seat.y - centre.y);
    if (dx > 0) scale = Math.min(scale, (stage.width / 2 - n.width / 2 - gap) / dx);
    if (dy > 0) scale = Math.min(scale, (stage.height / 2 - n.height / 2 - gap) / dy);
  }
  if (!(scale > 0 && Number.isFinite(scale))) throw new Error(`no close-up scale keeps every name inside a ${stage.width}×${stage.height} stage`);
  const w = stage.width / scale;
  const h = stage.height / scale;
  return fitViewBox({ x: centre.x - w / 2, y: centre.y - h / 2, w, h }, stage, NO_INSETS);
}

/** Between two viewBoxes of the stage's aspect: the scale moves geometrically, about their fixed point. */
export function viewBoxAt(from, to, t) {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const w = from.w * (to.w / from.w) ** t;
  const k = w / from.w;
  if (Math.abs(to.w - from.w) < 1e-9) return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, w: from.w, h: from.h };
  const px = (from.x * to.w - to.x * from.w) / (to.w - from.w);
  const py = (from.y * to.h - to.y * from.h) / (to.h - from.h);
  return { x: px - (px - from.x) * k, y: py - (py - from.y) * k, w, h: from.h * k };
}

/** A point of the map, in stage pixels, under a viewBox. */
export function toStage(vb, stage, p) {
  return { x: ((p.x - vb.x) / vb.w) * stage.width, y: ((p.y - vb.y) / vb.h) * stage.height };
}

// ── names ────────────────────────────────────────────────────────────────────────────────────────────

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

// ── colour ───────────────────────────────────────────────────────────────────────────────────────────

/** `a` carried `t` of the way to `b`, channel by channel — the drive's own blend. */
export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

// ── the frame ────────────────────────────────────────────────────────────────────────────────────────

/**
 * Everything the composition draws that moves, at `frame`.
 *
 * @param {{ states: Record<string, number>[], timing: any, stage: {width:number,height:number},
 *   cameras: { overview: any, closeUp: any }, shapes: Array<{ key: string, classIndex: number|null, kept: boolean }>,
 *   colours: { land: string, classFills: string[], missingFill: string },
 *   names: Array<{ key: string, role: "top"|"odd"|"neighbour"|"missing"|"context", camera: "overview"|"closeUp" }>,
 *   waters: Array<{ key: string }> }} props
 */
export function sceneAt(props, frame) {
  const { states, timing, cameras, colours } = props;
  const at = (field) => fieldAt(field, frame, states, timing);
  const classes = at("classes");
  const filter = at("filter");
  const gates = gatesAt(frame, timing);
  const n = colours.classFills.length;

  const fills = {};
  for (const shape of props.shapes) {
    if (shape.classIndex === null) continue;
    const reached = ease(clamp01(classes * n - shape.classIndex));
    // THE FLOOR: a class steps back once the cursor has passed its upper borne, the lowest class first.
    const kept = shape.kept ? 1 : 1 - ease(clamp01(filter * (n - 1) - shape.classIndex));
    fills[shape.key] = blend(colours.land, colours.classFills[shape.classIndex], reached * kept);
  }

  const role = { top: at("top"), odd: at("odd"), neighbour: at("neighbours"), missing: at("missing"), context: at("context") };
  const names = {};
  for (const name of props.names) names[name.key] = clamp01(role[name.role] * gates[name.camera]);
  const count = at("count");
  const cursor = at("floor") * (n - 1);
  const countUp = Object.fromEntries(Object.entries(COUNT_UP).map(([role, [event, a, b]]) => [role, ease(windowed(frame, timing, event, [a, b]))]));

  return {
    title: at("title"),
    furniture: at("furniture"),
    callout: at("callout"),
    end: at("end"),
    swatches: Array.from({ length: n }, (_, i) => ease(clamp01(classes * n - i))),
    /** How far each class's swatch has stepped back with the floor — the key follows the map. */
    swatchesBack: Array.from({ length: n }, (_, i) => (i === n - 1 ? 0 : ease(clamp01(filter * (n - 1) - i)))),
    counter: { step: Math.min(n - 1, Math.floor(cursor + 1e-9)), opacity: clamp01(count) },
    cursor: { at: cursor, opacity: clamp01(count) },
    countUp,
    viewBox: viewBoxAt(cameras.overview, cameras.closeUp, at("zoom")),
    fills,
    names,
    waters: gates.overview,
    ring: clamp01(role.odd * Math.max(gates.overview, gates.closeUp)),
    gates,
  };
}
