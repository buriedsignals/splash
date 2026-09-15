// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, every height on the one value axis so a reading keeps its value as it travels:
//   - READINGS: the 75 annual readings appear in chronological order, each at its year inside its decade's slot.
//   - GATHER: decade after decade, the readings slide sideways into one column — only x moves.
//   - BOX: through the column, the median draws; the box opens from it to Q1 and Q3; the whiskers run from the box to the
//     furthest readings inside the fence; the one reading past a whisker is ringed.
//   - LIFT: the box, its whiskers and its ring slide out to the right, the readings left beside them.
//   - WALK: a copy of the first median slides to each next box at its own height, then climbs or drops onto that box's
//     median. Landing on the peak lights it; its value arrives once the walker has slid past the place it prints.
//   - RELEASE: the walker dissolves into the last median.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.4], readings: [0.12, 0.97] },
  reveal: { gather: [0, 0.4], box: [0.28, 0.74], lift: [0.68, 0.97] },
  subject: { walk: [0, 0.96] },
  conclusion: { release: [0, 0.4], source: [0.2, 0.7] },
});
/** The readings arrive at the pace of the years; the walk steps through decades at an even pace; a staggered field runs
 *  linearly so every decade gets an equal share, its own move eased. */
const LINEAR = new Set(["readings", "gather", "box", "lift", "walk"]);
/** Of a staggered field, the share one decade's own move takes. */
export const MOVE = 0.4;
/** Of one step of the walk, the share spent sliding to the next box; the rest climbs or drops onto its median. */
export const SLIDE = 0.55;
/** The steps of the walk: one fewer than the decades. The walk adds half a step before the first slide and half after the last landing. */
export const STEPS_OF = (n) => n - 1;
/** A reading fades in over this many years' worth of the reveal. */
const ARRIVE = 2;

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

export const moveOf = (t, k, n) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - MOVE) : 0)) / MOVE);
const lerp = (a, b, t) => a + (b - a) * t;
/** Within a decade's box build: the median, then the box opening, then the whiskers, then the ring. */
const phase = (t, a, b) => ease(clamp01((t - a) / (b - a)));

/**
 * @param {{ states: any[], timing: any, peak: number,
 *   readings: Array<{ year: number, decade: number, index: number, x0: number, y: number }>,
 *   decades: Array<{ start: number, slotLeft: number, slot: number, sampleX: number, cx: number, boxWidth: number,
 *     yMedian: number, yQ1: number, yQ3: number, yLo: number, yHi: number, outliers: Array<{ year: number, y: number }> }>,
 *   values: Array<{ decade: number, x: number, width: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const n = props.decades.length;
  const readingsT = at("readings");
  const gather = at("gather");
  const box = at("box");
  const lift = at("lift");
  const steps = STEPS_OF(n);
  const s = at("walk") * (steps + 1) - 0.5;
  const release = at("release");
  const total = props.readings.length;

  const dots = props.readings.map((r) => {
    const d = props.decades[r.decade];
    const g = ease(moveOf(gather, r.decade, n));
    return { x: lerp(r.x0, d.sampleX, g), y: r.y, opacity: ease(clamp01((readingsT * (total - 1 + ARRIVE) - r.index) / ARRIVE)) };
  });

  const boxes = props.decades.map((d, k) => {
    const b = moveOf(box, k, n);
    const x = lerp(d.sampleX, d.cx, ease(moveOf(lift, k, n)));
    const open = phase(b, 0.15, 0.6);
    const reach = phase(b, 0.5, 0.85);
    const yQ3 = lerp(d.yMedian, d.yQ3, open);
    const yQ1 = lerp(d.yMedian, d.yQ1, open);
    return {
      x,
      opacity: phase(b, 0, 0.2),
      yMedian: d.yMedian,
      yQ3,
      yQ1,
      yHi: lerp(yQ3, d.yHi, reach),
      yLo: lerp(yQ1, d.yLo, reach),
      whiskers: reach,
      rings: d.outliers.map((o) => ({ x, y: o.y, opacity: phase(b, 0.8, 1) })),
      accent: k === props.peak ? phase(s, props.peak, props.peak + 0.3) : 0,
    };
  });

  // THE WALKER: before the first slide it arrives on the first median; step k slides from box k to box k+1 at median k,
  // then climbs or drops onto median k+1; after the last landing it stays.
  const left = (d) => d.cx - d.boxWidth / 2;
  const clamped = Math.min(Math.max(s, 0), steps);
  const k = Math.min(Math.floor(clamped), steps - 1);
  const u = clamped - k;
  const from = props.decades[k];
  const to = props.decades[k + 1];
  const walker = {
    x: lerp(left(from), left(to), ease(clamp01(u / SLIDE))),
    y: lerp(from.yMedian, to.yMedian, ease(clamp01((u - SLIDE) / (1 - SLIDE)))),
    w: from.boxWidth,
    opacity: s > -0.5 ? ease(clamp01((s + 0.5) / 0.4)) * (1 - release) : 0,
  };

  const values = props.values.map((v) => ({
    ...v,
    opacity: v.decade === props.peak ? phase(s, props.peak + SLIDE, props.peak + 1) : phase(s, v.decade - 0.3, v.decade),
  }));

  return { title: at("title"), furniture: at("furniture"), source: at("source"), dots, boxes, walker, values };
}
