// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
// THE ARGUMENT, one square a country and one square size throughout:
//   - SWEEP: a front travels the axis from 0 to 100 % at the data's pace; a square drops onto its column as it passes.
//   - SPLIT: the cuts rise; the part under 60 % slides left by the gap, the part from 75 % right by the gap, every column
//     keeping its squares; the cuts ride the middle of their gaps.
//   - GATHER: each part's squares settle into columns of six from its anchor, in the order of their distance from it; the
//     j-th square of every block moves in the same window, so the blocks fill at one pace and the middle stops first. A
//     block's count is its landed squares.
//   - CLOSE: the parts come together into the pictogram, a cut in the middle of each gap, every square magnified by one
//     factor about its block's corner — each block keeps its shape; the words re-seat, they do not grow.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.12], furniture: [0.05, 0.35], sweep: [0.15, 0.97] },
  reveal: { cuts: [0, 0.45], split: [0.3, 0.95] },
  subject: { counts: [0, 0.12], gather: [0.02, 0.97] },
  conclusion: { close: [0, 0.55], ring: [0.5, 0.9], source: [0.35, 0.85] },
});
/** Traversals of a measured axis run at the data's pace: the sweep along the share, the squares counted into blocks. */
const LINEAR = new Set(["sweep", "gather"]);
/** A square's drop, as a share of the sweep. */
export const DROP = 0.06;
/** How far above its seat a square starts its drop, in cells. */
export const DROP_CELLS = 0.6;
/** A cut's word arrives over the last part of the axis parting, clear of the end words it would touch before. */
export const CUT_WORDS_FROM = 0.6;
/** Each square's move into its block is this share of `gather`; the moves overlap. */
export const MOVE = 0.22;

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

const lerp = (a, b, t) => a + (b - a) * t;
/** The k-th square of every block moves in the same window; `most` squares in the largest block. */
export const moveOf = (t, k, most) => (t >= 1 ? 1 : clamp01((t - (most > 1 ? (k / (most - 1)) * (1 - MOVE) : 0)) / MOVE));

/**
 * WHERE THE FURNITURE STANDS for a given parting and closing — the baseline, the axis in three parts, the cuts, the axis
 * words and the counts' seats. Shared with `build.mjs`, which holds every word clear of every other along it.
 */
export function layoutAt(layout, split, close) {
  const c = ease(close);
  const baseline = lerp(layout.baseline, layout.baselineF, c);
  const parted = (x, part) => x + layout.shift[part] * split;
  const cuts = layout.cuts.map((cut) => ({ x: lerp(lerp(cut.from, cut.to, split), cut.final, c), top: lerp(cut.top, cut.topF, c) }));
  const wordsY = baseline + layout.wordsLift;
  return {
    baseline,
    cell: lerp(layout.cell, layout.cellF, c),
    side: lerp(layout.side, layout.sideF, c),
    segments: layout.segments.map((s, part) => [lerp(parted(s.from[0], part), s.final[0], c), lerp(parted(s.from[1], part), s.final[1], c)]),
    cuts,
    cutWords: layout.cutWords.map((w, n) => ({ x: cuts[n].x - w.half, y: wordsY })),
    ends: {
      zero: { x: lerp(parted(layout.ends.zero.x, 0), layout.ends.zero.finalX, c), y: wordsY },
      hundred: { x: lerp(parted(layout.ends.hundred.x, 2), layout.ends.hundred.finalX, c), y: wordsY },
    },
    counters: layout.counters.map((k) => ({ x: lerp(k.centre, k.centreF, c), y: lerp(layout.baseline - layout.counterLift, layout.baselineF - layout.counterLiftF, c) })),
  };
}

/**
 * @param {{ states: any[], timing: any, cell: number, most: number, layout: any,
 *   squares: Array<{ block: number, k: number, share: number, x: number, y: number }>,
 *   slots: Array<{ x: number, y: number }>, finals: Array<{ x: number, y: number }> }} props
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const sweep = at("sweep");
  const split = at("split");
  const gather = at("gather");
  const close = at("close");
  const c = ease(close);
  const layout = layoutAt(props.layout, split, close);
  const landed = props.layout.counters.map(() => 0);

  const squares = props.squares.map((sq, i) => {
    const drop = clamp01((sweep * (1 + DROP) - sq.share / 100) / DROP);
    const arrive = ease(drop);
    const p = moveOf(gather, sq.k, props.most);
    const move = ease(p);
    const from = { x: sq.x + props.layout.shift[sq.block] * split, y: sq.y - (1 - arrive) * DROP_CELLS * props.cell };
    const slot = props.slots[i];
    const final = props.finals[i];
    if (p >= 1) landed[sq.block] += 1;
    return {
      x: lerp(lerp(from.x, slot.x, move), final.x, c),
      y: lerp(lerp(from.y, slot.y, move), final.y, c),
      side: layout.side,
      opacity: arrive,
      landed: p >= 1,
      resting: (drop === 0 || drop >= 1) && (p === 0 || p >= 1) && (close === 0 || close >= 1),
    };
  });

  const counts = at("counts");
  return {
    title: at("title"),
    furniture: at("furniture"),
    split,
    close,
    ...layout,
    squares,
    cutsRise: at("cuts"),
    cutsOpacity: at("cuts") * ease(clamp01((split - CUT_WORDS_FROM) / (1 - CUT_WORDS_FROM))),
    counters: layout.counters.map((seat, block) => ({ block, key: String(landed[block]), opacity: counts, ...seat })),
    ring: at("ring"),
    source: at("source"),
  };
}
