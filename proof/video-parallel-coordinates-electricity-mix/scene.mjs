// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
// Every height is `props.scale` px per point of share, on every rail, in the bar and in every line; nothing here changes
// a height — the camera moves the rails sideways only.
//
//   - BAR: Finland's whole electricity grows along the foot, 100 points long; SPLIT: gaps cut it into its seven sources
//     and the rest, each piece keeping its length.
//   - STAND: piece after piece, each travels to its rail's foot while turning upright, its length kept; the rail and its
//     name arrive as it lands; the rest, on no rail, fades where it lies.
//   - TRACE: Finland's line joins the tops; SETTLE: the pieces thin into it, its name travels to its seat.
//   - DRAW: the fifteen other lines drawn across the rails one after another, each eased; a name arrives as its tip
//     reaches its seat's rail.
//   - THE CAMERA is the rails' spacing: the whole chart, opened at `zoom` until the nuclear and wind rails span the frame,
//     closed again at `back`. The whole's names give way as it opens, the close-up's arrive as it settles.
//   - NUCLEAR, WIND: a floor rises on each rail at the pace of its own axis (linear); a line steps back once the floor has
//     passed its value, over a fixed number of frames; the count is the lines at or above both floors.
//   - PAIR: the two left take the accent. RELEASE: every line returns.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], bar: [0.06, 0.26], split: [0.26, 0.36], stand: [0.34, 0.74], trace: [0.72, 0.9], settle: [0.84, 1] },
  reveal: { draw: [0, 0.96] },
  subject: { zoom: [0, 0.2], nuclear: [0.24, 0.52], wind: [0.56, 0.82], pair: [0.84, 0.98] },
  conclusion: { back: [0, 0.55], release: [0.1, 0.6], source: [0.35, 0.8] },
});
const LINEAR = new Set(["bar", "nuclear", "wind"]);
/** Of a staggered window, how much one member's own move takes. */
export const MOVE = { stand: 0.3, draw: 0.3 };
/** A line steps back over this share of the subject once a floor has passed it. */
export const STEP_BACK = 0.035;
/** A stepped-back line keeps this much of its ink. */
export const KEPT = 0.22;

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

export const moveOf = (t, k, n, move) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - move) : 0)) / move);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * THE TWO AXES, NAMED RATHER THAN ASSUMED.
 *
 * Landscape lays the rails ACROSS the frame and the values UP it. A narrow frame turns the whole
 * chart a quarter turn — the rails stack DOWN the frame and the values run ACROSS it (`build.mjs`,
 * TRANSPOSED). Everything in this file is arithmetic in two named coordinates instead: `u` along the
 * rails' own stacking, `v` along the values. `pt` is the only place that knows which is x and which
 * is y, so the choreography is written once and reads the same at every frame size.
 */
const pt = (props, u, v) => (props.transposed ? [v, u] : [u, v]);
/** Which way the values run from the foot: up the frame at landscape, right across it transposed. */
const vDir = (props) => (props.transposed ? 1 : -1);

/** Rail `i`'s own coordinate with the camera `c` of the way open — an x at landscape, a y transposed. */
export const railXAt = (props, i, c) => lerp(props.camera.whole.left + i * props.camera.whole.step, props.camera.close.left + i * props.camera.close.step, c);

/** A line drawn `d` of the way across the rails: its vertices so far, the last one cut between two rails.
 *  `vs` is each vertex's VALUE coordinate, in the rails' order. */
export function pointsAt(props, vs, d, c) {
  if (d <= 0) return [];
  const s = d * (vs.length - 1);
  const whole = Math.floor(s + 1e-9);
  const points = [];
  for (let i = 0; i <= Math.min(whole, vs.length - 1); i++) points.push(pt(props, railXAt(props, i, c), vs[i]));
  const part = s - whole;
  if (whole < vs.length - 1 && part > 1e-9)
    points.push(pt(props, lerp(railXAt(props, whole, c), railXAt(props, whole + 1, c), part), lerp(vs[whole], vs[whole + 1], part)));
  return points;
}

/** Where a name seated on a rail is drawn, with the camera `c` of the way open: it travels with its
 *  rail along `u` and stays put along `v`. `clear` pushes it off the piece it rides while that piece
 *  is still drawn. */
export function seatAt(props, seat, c, clear = 0) {
  const [x, y] = pt(props, railXAt(props, seat.axis, c) + seat.du + clear, seat.v);
  return { x, y };
}

/** A close-up name and the hairline back to its vertex on the nuclear rail. At landscape the name is
 *  spread down a gutter beside the rail and reaches it sideways; transposed it is spread across the
 *  frame above the rail and reaches it downwards. */
export function closeAt(props, d, c) {
  const along = railXAt(props, 0, c);
  if (props.transposed) {
    const y = along + d.close.du;
    return { x: d.close.x, y, connector: { x1: d.close.cx, y1: y + d.close.drop, x2: d.vs[0], y2: along } };
  }
  const x = along - d.close.dx;
  return { x, y: d.close.y, connector: { x1: x + d.close.width + props.gap / 4, y1: d.close.cy, x2: along, y2: d.vs[0] } };
}

/** Where a floor at `value` has passed a line at `v`, as progress through the subject. */
const passedAt = ([a, b], floor, v) => a + (v / floor) * (b - a);

export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const bar = at("bar");
  const split = at("split");
  const stand = at("stand");
  const trace = at("trace");
  const settle = at("settle");
  const draw = at("draw");
  const camera = clamp01(at("zoom") - at("back"));
  const nuclear = at("nuclear");
  const wind = at("wind");
  const pair = at("pair");
  const release = at("release");
  const p = progressOf(frame, props.timing.subject);
  const [nuclearFloor, windFloor] = props.floors.map((f, i) => f.value * (i === 0 ? nuclear : wind));
  const wholeNames = clamp01(1 - camera / 0.3);
  const closeNames = clamp01((camera - 0.7) / 0.3);

  // THE BAR: its pieces lying along the foot, then standing on their rails.
  const { pieces: laid, x0, splitGap, thickness } = props.bar;
  const reach = bar * 100 * props.scale;
  const standOf = laid.map((_, k) => ease(moveOf(stand, k, laid.length, MOVE.stand)));
  const pieces = laid.map((piece, k) => {
    const start = piece.cum * props.scale;
    const len = Math.max(0, Math.min(piece.len, reach - start));
    const lying = x0 + start + k * splitGap * split;
    const m = piece.axis === null ? 0 : standOf[k];
    const px = lerp(lying, piece.axis === null ? lying : railXAt(props, piece.axis, camera), m);
    const angle = (m * Math.PI) / 2;
    const fade = piece.axis === null ? 1 - standOf[k] : 1;
    // Lying, the piece runs along the rails' own axis at the value axis's foot; standing, it turns a
    // quarter and runs up the values — which at a narrow frame is a slide to the right, not a rise.
    const [x1, y1] = pt(props, px, props.foot);
    const [x2, y2] = pt(props, px + len * Math.cos(angle), props.foot + vDir(props) * len * Math.sin(angle));
    return { axis: piece.axis, x1, y1, x2, y2, width: thickness * (1 - settle), opacity: fade * (1 - settle) };
  });
  const railOn = props.axes.map((_, i) => clamp01((standOf[laid.findIndex((q) => q.axis === i)] - 0.6) / 0.4));

  let count = 0;
  const lines = props.lines.map((l) => {
    const d = l.shown ? trace : ease(moveOf(draw, l.drawRank, props.lines.length - 1, MOVE.draw));
    const points = pointsAt(props, l.vs, d, camera);
    if (l.values[0] >= nuclearFloor - 1e-9 && l.values[1] >= windFloor - 1e-9) count += 1;
    let back = 0;
    if (!l.pair) {
      const [event, v, floor] = l.values[0] < props.floors[0].value ? [WINDOWS.subject.nuclear, l.values[0], props.floors[0].value] : [WINDOWS.subject.wind, l.values[1], props.floors[1].value];
      back = ease(clamp01((p - passedAt(event, floor, v)) / STEP_BACK));
    }
    const arrived = l.shown ? clamp01(bar * 5) : d <= 0 ? 0 : clamp01((d * (l.vs.length - 1) - l.seat.axis + 0.5) / 0.5);
    // Finland's name rides the top of its first piece as it stands, clear of the piece until the piece thins away.
    const travel = l.shown ? standOf[laid.findIndex((q) => q.axis === l.seat.axis)] : 1;
    const clear = l.shown ? (thickness / 2) * (1 - settle) : 0;
    const seat = seatAt(props, l.seat, camera, clear);
    const name = {
      x: l.shown ? lerp(props.bar.name.x, seat.x, travel) : seat.x,
      y: l.shown ? lerp(props.bar.name.y, seat.y, travel) : seat.y,
      opacity: arrived * wholeNames,
    };
    const close = l.close ? { ...closeAt(props, l, camera), opacity: closeNames } : null;
    return { points, stepBack: back * (1 - release), accent: l.pair ? ease(clamp01(pair)) : 0, lit: l.shown ? 1 - settle : 0, name, close };
  });

  const floors = props.floors.map((f, i) => {
    const value = i === 0 ? nuclearFloor : windFloor;
    const t = i === 0 ? nuclear : wind;
    const u = railXAt(props, f.axis, camera);
    const v = props.foot + vDir(props) * value * props.scale;
    const [x, y] = pt(props, u, v);
    return { value, u, v, x, y, label: String(Math.floor(value + 1e-9)), opacity: clamp01(t * 12) };
  });

  return {
    title: at("title"),
    bar,
    camera,
    rails: props.axes.map((_, i) => ({ u: railXAt(props, i, camera), opacity: railOn[i] })),
    pieces,
    hundred: clamp01((bar - 0.9) / 0.1) * (1 - split),
    lines,
    floors,
    count,
    counter: closeNames * (1 - release),
    source: at("source"),
  };
}
