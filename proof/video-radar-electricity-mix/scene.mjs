// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - GROW: both bars grow from the left at one px-per-TWh speed, each stopping at its own total (a measured axis: linear).
//   - STRETCH: Germany's bar stretches to France's length — each bar's px per % travels to the wheel's px per %.
//   - CUT: gaps open at the source boundaries; every part keeps its length.
//   - CARRY: source after source (an arrival, eased), both parts swing onto their spoke, the inner end travelling to the
//     centre, the angle to the spoke's, the width thinning — the LENGTH NEVER CHANGES; each tip joins the tip before it
//     once both have landed.
//   - CLOSE: the last tip joins the first, the outlines fill, the parts give way to the vertices.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], bars: [0.1, 0.85] },
  reveal: { stretch: [0, 0.55], cut: [0.35, 0.95] },
  subject: { grid: [0, 0.22], fly: [0.12, 0.97] },
  conclusion: { close: [0, 0.55], ring: [0.4, 0.8], source: [0.2, 0.7] },
});
const LINEAR = new Set(["bars", "fly"]);
/** Of the carry, the share one source's own swing takes. */
export const MOVE = 0.3;
/** An edge starts once its move is this far along — after the move before it has landed. */
export const EDGE_FROM = 0.8;
const TURN = 2 * Math.PI;

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

export const moveOf = (t, k, n, share = MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);
/** A move has landed at 1 — floating point leaves the last one a hair short of it. */
const LANDED = 1 - 1e-9;
const landed = (t) => (t >= LANDED ? 1 : t);
/** Exact at both ends: `lerp(a, b, 1)` is `b`, not `a + (b - a)`. */
const lerp = (a, b, t) => a * (1 - t) + b * t;
const phase = (t, a, b) => ease(clamp01((t - a) / (b - a)));

/** Spoke `j` of `n`, clockwise from twelve o'clock, as a screen angle (y down), in (-π, π]. */
export function spokeAngle(j, n) {
  const a = (j / n) * TURN - Math.PI / 2;
  return a > Math.PI ? a - TURN : a;
}

/**
 * @param {{ states: any[], timing: any,
 *   wheel: { x: number, y: number, pxPerPct: number },
 *   bars: { x0: number, zoom: number, pxPerTwh: number, gap: number, thickness: number, labelGap: number, landed: { width: number, offset: number } },
 *   countries: Array<{ total: number, shares: number[], bar: { y: number }, side: number,
 *     name: { dx: number, dy: number }, key: { x: number, y: number } }> }} props
 *   `side`: which side of its spoke a country's part lands on, -1 or +1.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const bars = at("bars");
  const stretch = at("stretch");
  const cut = at("cut");
  const grid = at("grid");
  const fly = at("fly");
  const close = at("close");
  const { wheel, bars: b, countries } = props;
  const n = countries[0].shares.length;
  const largest = Math.max(...countries.map((c) => c.total));
  const grownTwh = bars * largest;
  const moves = Array.from({ length: n }, (_, j) => landed(moveOf(fly, j, n)));
  const partsOut = 1 - phase(close, 0, 0.5);
  const fill = phase(close, 0.2, 0.8);
  /** The camera: every mark scaled about the wheel's centre by `z`, pulling back from the bars' zoom to 1. */
  const z = lerp(b.zoom, 1, grid);
  const sx = (x) => wheel.x + (x - wheel.x) * z;
  const sy = (y) => wheel.y + (y - wheel.y) * z;

  const drawn = countries.map((c) => {
    const scale = lerp((b.pxPerTwh * c.total) / 100, wheel.pxPerPct, stretch);
    const grownShare = (Math.min(grownTwh, c.total) / c.total) * 100;
    const done = clamp01(grownTwh / c.total);
    let cum = 0;
    const parts = c.shares.map((share, j) => {
      const start = b.x0 + cum * scale + j * cut * b.gap;
      const grown = share > 0 ? clamp01((grownShare - cum) / share) : 0;
      cum += share;
      const t = ease(moves[j]);
      const theta = spokeAngle(j, n);
      const angle = theta * t;
      const normal = { x: -Math.sin(theta), y: Math.cos(theta) };
      const inner = {
        x: lerp(start, wheel.x + normal.x * c.side * b.landed.offset, t),
        y: lerp(c.bar.y, wheel.y + normal.y * c.side * b.landed.offset, t),
      };
      const length = share * scale * grown * z;
      const x1 = sx(inner.x);
      const y1 = sy(inner.y);
      return {
        x1,
        y1,
        x2: x1 + Math.cos(angle) * length,
        y2: y1 + Math.sin(angle) * length,
        length,
        width: lerp(b.thickness, b.landed.width, t) * z,
        opacity: partsOut,
      };
    });
    const end = b.x0 + 100 * scale + (n - 1) * cut * b.gap;
    /** Under the parts until the cut opens, one bar the parts' grown length — so no seam shows between two butted parts. */
    const backing = {
      x1: sx(b.x0),
      x2: sx(b.x0) + parts.reduce((sum, p) => sum + p.length, 0),
      y: sy(c.bar.y),
      width: b.thickness * z,
      opacity: fly > 0 ? 0 : 1 - clamp01(cut * 20),
    };
    const vertices = c.shares.map((share, j) => {
      const theta = spokeAngle(j, n);
      return { x: wheel.x + Math.cos(theta) * share * wheel.pxPerPct, y: wheel.y + Math.sin(theta) * share * wheel.pxPerPct };
    });
    /** Edge j joins vertex j-1 to vertex j (j = 1..n-1); edge 0 closes the outline, from the last vertex to the first. */
    const edges = vertices.map((_, j) => (j === 0 ? phase(close, 0, 0.4) : phase(moves[j], EDGE_FROM, 1)));
    const segments = [];
    for (let j = 1; j <= n; j++) {
      const p = edges[j % n];
      if (!(p > 0)) continue;
      const A = vertices[j - 1];
      const B = vertices[j % n];
      segments.push(`M ${A.x.toFixed(2)} ${A.y.toFixed(2)} L ${lerp(A.x, B.x, p).toFixed(2)} ${lerp(A.y, B.y, p).toFixed(2)}`);
    }
    const toKey = grid;
    const barY = sy(c.bar.y);
    const bar = { x: sx(b.x0) + c.name.dx, y: barY + c.name.dy };
    return {
      parts,
      backing,
      edges,
      vertices,
      outline: segments.join(" ") || null,
      area: `${vertices.map((v, j) => `${j === 0 ? "M" : "L"} ${v.x.toFixed(2)} ${v.y.toFixed(2)}`).join(" ")} Z`,
      fill,
      name: { x: lerp(bar.x, c.key.x, toKey), y: lerp(bar.y, c.key.y, toKey), opacity: phase(bars, 0, 0.25) },
      totals: {
        x: sx(end) + b.labelGap,
        y: barY + c.totals.dy,
        twh: phase(done, 0.85, 1) * (1 - phase(stretch, 0, 0.35)),
        full: phase(stretch, 0.6, 1) * (1 - phase(fly, 0, 0.05)),
      },
    };
  });

  return {
    title: at("title"),
    grid,
    z,
    countries: drawn,
    moves,
    labels: moves.map((m) => phase(m, 0.7, 1)),
    ring: at("ring"),
    source: at("source"),
  };
}
