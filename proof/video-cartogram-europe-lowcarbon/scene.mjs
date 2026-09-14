// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun.
//
// `cartogram-drive.mjs`'s painting (the scrolly), re-expressed as a function of the frame:
//
//   - THE MORPH IS AN AFFINE MAP PER COUNTRY, from its shape's drawn box onto its tile, eased; the shape fades
//     into a rect drawn in that same box over the last third of the travel, so Russia is seen shrinking and
//     Malta swelling into two tiles of one size. Strokes do not scale.
//   - FILL = CLASS × REVEAL: before its class arrives a country is the neutral; then its class, lowest first.
//   - FOCUS: every country but the widest steps back to 30 %.
//   - A COUNT counts up from zero to its value, one decimal, over its window, and stays.
//
// Browser-safe: no Node module, no `#shared/chart-beat` import.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

/** The share of its own event each field changes over. A field not named here changes over the whole event. */
export const WINDOWS = Object.freeze({
  // The title card is up from frame 0: its window closes before the first frame, so frame 0 is the title.
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.1], furniture: [0.08, 0.2], classes: [0.2, 1] },
  reveal: { focus: [0, 0.25], widest: [0.22, 0.32], area: [0.3, 0.62] },
  subject: { focus: [0, 0.1], widest: [0, 0.08], morph: [0.1, 0.75], codes: [0.8, 0.94] },
  conclusion: { country: [0, 0.4], source: [0.55, 0.7] },
});

/** The fields that travel a scale move linearly; each class eases its own arrival in `sceneAt`. */
const LINEAR = new Set(["classes"]);
/** Of the eased travel, the share after which a shape gives way to its tile's rect. */
export const SHAPE_TO_TILE = Object.freeze([0.62, 0.92]);
/** A country the focus steps back keeps this much of its ink. */
export const STEPPED_BACK = 0.3;

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));

/** A field's value at `frame`: every event's change run through its window. */
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

/** `a` carried `t` of the way to `b`, channel by channel. */
export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** A country's box carried `m` of the way onto its tile: where it is, and the scale on each axis. */
export function morphOf(box, tile, m) {
  const sx = 1 + (tile.w / box.w - 1) * m;
  const sy = 1 + (tile.h / box.h - 1) * m;
  const x = box.x + (tile.x - box.x) * m;
  const y = box.y + (tile.y - box.y) * m;
  return { x, y, sx, sy, transform: `translate(${x - box.x * sx} ${y - box.y * sy}) scale(${sx} ${sy})` };
}

/** A count's text at `t` of its climb: the template's `{n}` from 0 to `value`, one decimal, a French comma. */
export function countText(template, value, t) {
  return template.replace("{n}", (value * clamp01(t)).toFixed(1).replace(".", ","));
}

/**
 * Everything the composition draws that moves, at `frame`.
 *
 * @param {{ states: Record<string, number>[], timing: any, widest: string,
 *   countries: Array<{ iso: string, classIndex: number|null, box: any, tile: any }>,
 *   colours: { neutral: string, classFills: string[], sea: string, ground: string } }} props
 */
export function sceneAt(props, frame) {
  const { states, timing, colours } = props;
  const at = (field) => fieldAt(field, frame, states, timing);
  const classes = at("classes");
  const focus = at("focus");
  const m = at("morph");
  const n = colours.classFills.length;
  const shapeOut = clamp01((m - SHAPE_TO_TILE[0]) / (SHAPE_TO_TILE[1] - SHAPE_TO_TILE[0]));

  const countries = {};
  for (const c of props.countries) {
    const reached = c.classIndex === null ? 1 : ease(clamp01(classes * n - c.classIndex));
    const fill = c.classIndex === null ? null : blend(colours.neutral, colours.classFills[c.classIndex], reached);
    const { transform } = morphOf(c.box, c.tile, m);
    countries[c.iso] = {
      transform,
      fill,
      shape: 1 - shapeOut,
      tile: shapeOut,
      opacity: c.iso === props.widest ? 1 : 1 - (1 - STEPPED_BACK) * focus,
    };
  }
  return {
    title: at("title"),
    furniture: at("furniture"),
    swatches: Array.from({ length: n }, (_, i) => ease(clamp01(classes * n - i))),
    countries,
    morph: m,
    /** The sea and the land no tile carries fade as the countries leave the map. */
    map: 1 - m,
    /** The ground a word on the key stands on: the sea on the map, the direction's ground under the tiles. */
    keyGround: blend(colours.sea, colours.ground, m),
    widest: at("widest"),
    area: at("area"),
    codes: at("codes"),
    country: at("country"),
    source: at("source"),
  };
}
