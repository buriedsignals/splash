// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - THE TRACE: the bands, largest first, each drawing itself over its own slice of the reveal (a dash offset along
//     its measured length), eased; its host's name lands just after the band has arrived. The count is the people of
//     the bands that have arrived.
//   - THE FOCUS: every band but the top two steps back; the top two's share climbs, in whole percents, then exact.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
// Zone kit: the shared browser-safe copy (`ease`/`clamp01` byte-identical to skills/scrolly/assets/reveal.mjs).
import { clamp01, ease } from "#shared/chart-video/series.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.2, 0.7] },
  reveal: { trace: [0.02, 0.88] },
  subject: { focus: [0, 0.3], share: [0.25, 0.75] },
  conclusion: { focus: [0, 0.4], source: [0.3, 0.7] },
});
const LINEAR = new Set(["trace", "share"]);
/** Each band's slice overlaps the next by this share of a slice, so the fan reads as one gesture. */
export const OVERLAP = 0.6;
/** A stepped-back band keeps this much of its ink. */
export const STEPPED_BACK = 0.22;

/** The jumps no reader sees as a cut (`every-map-video-glides.test.ts`): a band's opacity switches on in one frame, but
 *  on the frame its trace starts, when `arcAt` has drawn at most 0.7% of its arc (measured 2026-09-29) — the tip of
 *  the line beginning its trace, not a band appearing (`mapStateAt`). */
export const HIDDEN_CUTS = Object.freeze([
  {
    layers: /^band-/,
    property: "line-opacity",
    when: (state, layer) => state[`drawn${layer.slice("band-".length)}`] < 0.01,
    why: "switches on as its trace starts, under 1% of the arc drawn",
  },
]);

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));
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

/** How far band `i` of `n` has drawn at `trace`. */
export function bandAt(trace, i, n) {
  const slot = 1 / (n - (n - 1) * OVERLAP);
  const start = i * slot * (1 - OVERLAP);
  return ease(clamp01((trace - start) / slot));
}

/** @param {{ states: any[], timing: any, bands: Array<{ code: string, people: number, top: boolean }>, topTwoShare: number }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const trace = at("trace");
  const focus = at("focus");
  const share = at("share");
  const n = props.bands.length;
  const bands = {};
  let arrived = 0;
  let people = 0;
  props.bands.forEach((b, i) => {
    const t = bandAt(trace, i, n);
    if (t >= 1) {
      arrived++;
      people += b.people;
    }
    bands[b.code] = { drawn: t, name: clamp01((t - 0.85) / 0.15), opacity: b.top ? 1 : 1 - (1 - STEPPED_BACK) * focus };
  });
  return {
    title: at("title"),
    furniture: at("furniture"),
    bands,
    /** The count: the number of bands arrived — the key picks its measured text by it. */
    arrived,
    people,
    countShown: clamp01(trace * 10),
    share: share >= 1 ? props.topTwoShare : Math.floor(props.topTwoShare * share),
    shareShown: clamp01(share * 6),
    source: at("source"),
  };
}

// ── the live map ─────────────────────────────────────────────────────────────────────────────────────

/** The fields the map plan's paints are bound to, besides the camera (`map-plan.mjs`): the node's, and each drawn
 *  band's and each named host's opacity. */
export const mapFieldsOf = (bands, named) => ["furniture", ...bands.filter((b) => b.drawn).map((b) => `band${b.code}`), ...named.map((code) => `name${code}`)];

/**
 * THE LIVE MAP AT `frame`, IN NUMBERS: the still camera, the node's presence, each band's opacity (stepped back unless
 * it is one of the top two) and drawn share (`drawn<code>`, what `arcAt` cuts its line by), each host's name.
 *
 * @param {{ cameras: { whole: any } } & Parameters<typeof sceneAt>[0]} props
 */
export function mapStateAt(props, frame) {
  const scene = sceneAt(props, frame);
  const state = { ...props.cameras.whole, furniture: scene.furniture };
  for (const b of props.bands) {
    const s = scene.bands[b.code];
    state[`band${b.code}`] = s.drawn > 0 ? s.opacity : 0;
    state[`drawn${b.code}`] = s.drawn;
    state[`name${b.code}`] = s.name * s.opacity;
  }
  return state;
}

/**
 * A BAND'S LINE AT `t` OF ITS LENGTH: the arc's vertices up to `t` × its length in stage px (`cumulative`), the last
 * one interpolated. Nothing before the band starts; the whole arc once it has arrived.
 *
 * @param {number[][]} coordinates  @param {number[]} cumulative  @param {number} t
 */
export function arcAt(coordinates, cumulative, t) {
  if (!(t > 0)) return [];
  if (t >= 1) return coordinates;
  const reach = t * cumulative.at(-1);
  const out = [coordinates[0]];
  for (let i = 1; i < coordinates.length; i++) {
    if (cumulative[i] < reach) {
      out.push(coordinates[i]);
      continue;
    }
    const u = (reach - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1] || 1);
    const [a, b] = [coordinates[i - 1], coordinates[i]];
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    break;
  }
  return out;
}

// ── carried from proof/video-choropleth-europe-lowcarbon/scene.mjs (zone kit: a beat cannot import another proof) ──

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

