// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - THE HANDOVER (addendum §5: the form leaves geography): while the countries are geography they are the LIVE MAP's
//     fills (`mapStateAt`). Before anything moves, the SVG shapes — the same countries projected at the map's camera —
//     rise over the fills, then the fills leave under them; the travel then belongs to the SVG.
//   - THE MORPH IS AN AFFINE MAP PER COUNTRY, from its shape's box onto its hexagon's, eased; the shape gives way to a
//     hexagon drawn in that same box over the last third, and a ground rect rises over the basemap with it, so the
//     cells end on no map at all.
//   - COUNT: a cell takes its count class when the class reveal reaches it, lowest first.
//   - RATE: every cell's fill travels from its count class's colour to its rate class's; the key's bornes cross-fade.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  // The map is up by 0.08 and the key by 0.2; the SVG takes over from the map over [0.28, 0.36] (`HANDOVER`); only
  // then does anything move.
  reference: { title: [0, 0.08], furniture: [0.06, 0.2], morph: [0.36, 0.86], codes: [0.84, 1] },
  reveal: { count: [0, 0.7], largest: [0.72, 0.9] },
  subject: { rate: [0.05, 0.6], leader: [0.62, 0.8] },
  conclusion: { source: [0, 0.4] },
});
/** The share of `reference` over which the SVG shapes take over from the map's fills: rising over its first half, the
 *  fills leaving under them over its second. Carried by the morph's own state change, so it runs with it. */
export const HANDOVER = Object.freeze([0.28, 0.36]);
/** Of the eased travel, the share after which a shape gives way to its hexagon. */
export const SHAPE_TO_CELL = Object.freeze([0.62, 0.92]);
const LINEAR = new Set(["count"]);

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));
export function fieldAt(field, frame, states, timing, windows = WINDOWS) {
  let value = 0;
  EVENT_ORDER.forEach((event, i) => {
    const before = i === 0 ? 0 : states[i - 1][field];
    const delta = states[i][field] - before;
    if (delta === 0) return;
    const t = windowed(frame, timing, event, windows[event]?.[field] ?? [0, 1]);
    value += delta * (LINEAR.has(field) ? t : ease(t));
  });
  return value;
}

export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** A country's box carried `m` of the way onto its hexagon's: the transform that draws it there. */
export function morphOf(box, cell, m) {
  const sx = 1 + (cell.w / box.w - 1) * m;
  const sy = 1 + (cell.h / box.h - 1) * m;
  const x = box.x + (cell.x - box.x) * m;
  const y = box.y + (cell.y - box.y) * m;
  return { x, y, sx, sy, transform: `translate(${x - box.x * sx} ${y - box.y * sy}) scale(${sx} ${sy})` };
}

/**
 * WHAT THE MAP AND THE SHAPES SHARE AT `frame`: the SVG shapes risen over the map's fills, and the fills still under
 * them. Read by `sceneAt` and `mapStateAt` alike, so the two pictures cannot disagree.
 *
 * @param {{ states: Record<string, number>[], timing: any }} props
 */
export function geographyAt(props, frame) {
  const handover = fieldAt("morph", frame, props.states, props.timing, { reference: { morph: HANDOVER } });
  return { shapesIn: clamp01(handover * 2), fills: 1 - clamp01(handover * 2 - 1) };
}

/** THE LIVE MAP AT `frame`, IN NUMBERS: the one camera, and the fills still on the map (`map-plan.mjs`).
 *  @param {{ camera: any } & Parameters<typeof geographyAt>[0]} props */
export function mapStateAt(props, frame) {
  return { ...props.camera, fills: geographyAt(props, frame).fills };
}

/** @param {{ states: any[], timing: any, cells: Array<{ code: string, origin: boolean, countClass: number|null, rateClass: number|null, box: any, cellBox: any }>, colours: { neutral: string, origin: string, classFills: string[] } }} props */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const m = at("morph");
  const shapeOut = clamp01((m - SHAPE_TO_CELL[0]) / (SHAPE_TO_CELL[1] - SHAPE_TO_CELL[0]));
  const { shapesIn, fills: mapFills } = geographyAt(props, frame);
  /** Where each country is on its way to its cell. */
  const travel = {};
  for (const c of props.cells) travel[c.code] = morphOf(c.box, c.cellBox, m).transform;
  const count = at("count");
  const rate = at("rate");
  const n = props.colours.classFills.length;
  const fills = {};
  /** Which stage each cell's code ink is at: the neutral's, the count class's, or the rate class's. */
  const inkStage = {};
  for (const c of props.cells) {
    if (c.origin) {
      fills[c.code] = props.colours.origin;
      inkStage[c.code] = "neutral";
      continue;
    }
    const reached = ease(clamp01(count * n - c.countClass));
    const byCount = blend(props.colours.neutral, props.colours.classFills[c.countClass], reached);
    fills[c.code] = blend(byCount, props.colours.classFills[c.rateClass], rate);
    inkStage[c.code] = rate >= 0.5 ? "rate" : reached >= 0.5 ? "count" : "neutral";
  }
  return {
    title: at("title"),
    furniture: at("furniture"),
    morph: m,
    travel,
    /** The shape, over the map's fills then giving way; the hexagon it becomes. */
    shape: shapesIn * (1 - shapeOut),
    cell: shapeOut,
    mapFills,
    /** The ground rect over the live map: the basemap fades out as the countries leave geography. */
    basemapOut: m,
    codes: at("codes"),
    fills,
    inkStage,
    /** Each key swatch lands with its class during the count reveal. */
    swatches: Array.from({ length: n }, (_, i) => ease(clamp01(count * n - i))),
    rate,
    largest: at("largest"),
    leader: at("leader"),
    source: at("source"),
  };
}
