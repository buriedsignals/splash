// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun.
//
// `cartogram-drive.mjs`'s painting (the scrolly), re-expressed as a function of the frame:
//
//   - THE MORPH IS AN AFFINE MAP PER COUNTRY, from its shape's drawn box onto its tile, eased; the shape fades
//     into a rect drawn in that same box over the last third of the travel, so Russia is seen shrinking and
//     Malta swelling into two tiles of one size. Strokes do not scale.
//   - FILL = CLASS × REVEAL: before its class arrives a country is the neutral; then its class, lowest first.
//   - FOCUS: every country but the widest steps back to 30 %.
//   - THE BALANCE: every country a column standing on a 0–100 % beam at its share, its height its weight — its
//     territory's share on the map, one in forty on the tiles, carried with the morph — so the columns' heights
//     always sum to the beam's height. The pivot stands under the mean those weights strike: the area mean first,
//     then, as the weights travel, a live pivot sliding to the country mean. The same `m` moves the map and the
//     weights, so what the picture shows and what the pivot says cannot drift apart.
//   - THE HANDOVER (addendum §5: the form leaves geography): while the countries are geography they are the LIVE
//     MAP's fills (`mapStateAt`). Once the others have returned and before anything moves, the SVG shapes — the same
//     countries projected at the map's camera — rise over the fills, then the fills leave under them; the morph
//     then belongs to the SVG, and a ground rect rises over the basemap with `m`, so the tiles end on no map at all.
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
  // The others are back and the name gone by 0.08; the SVG takes over from the map over [0.08, 0.14] (`HANDOVER`);
  // only then does anything move.
  subject: { focus: [0, 0.08], widest: [0, 0.08], morph: [0.14, 0.72], codes: [0.78, 0.94] },
  conclusion: { source: [0.3, 0.7] },
});
/** The share of `subject` over which the SVG shapes take over from the map's fills: rising over its first half, the
 *  fills leaving under them over its second. Carried by the morph's own state change, so it runs with it. */
export const HANDOVER = Object.freeze([0.08, 0.14]);

/** The fields that travel a scale move linearly; each class eases its own arrival in `sceneAt`. */
const LINEAR = new Set(["classes"]);
/** Of the eased travel, the share after which a shape gives way to its tile's rect. */
export const SHAPE_TO_TILE = Object.freeze([0.62, 0.92]);
/** A country the focus steps back keeps this much of its ink. */
export const STEPPED_BACK = 0.3;

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));

/** A field's value at `frame`: every event's change run through its window. */
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

/** A mean's text: the template's `{n}` at one decimal, a French comma. */
export function meanText(template, value) {
  return template.replace("{n}", value.toFixed(1).replace(".", ","));
}

/**
 * WHAT THE MAP AND THE SHAPES SHARE AT `frame`: each class's eased arrival, the others' ink under the focus, the SVG
 * shapes risen over the map's fills and the fills still under them. Read by `sceneAt` and `mapStateAt` alike, so the
 * two pictures cannot disagree.
 *
 * @param {{ states: Record<string, number>[], timing: any, colours: { classFills: string[] } }} props
 */
export function geographyAt(props, frame) {
  const { states, timing } = props;
  const at = (field) => fieldAt(field, frame, states, timing);
  const classes = at("classes");
  const n = props.colours.classFills.length;
  const handover = fieldAt("morph", frame, states, timing, { subject: { morph: HANDOVER } });
  return {
    reached: Array.from({ length: n }, (_, i) => ease(clamp01(classes * n - i))),
    others: 1 - (1 - STEPPED_BACK) * at("focus"),
    /** The SVG shapes over the map's fills, and the fills still on the map under them. */
    shapesIn: clamp01(handover * 2),
    fills: 1 - clamp01(handover * 2 - 1),
    widest: at("widest"),
  };
}

/**
 * Everything the composition draws that moves, at `frame`.
 *
 * @param {{ states: Record<string, number>[], timing: any, widest: string,
 *   countries: Array<{ iso: string, classIndex: number|null, box: any, tile: any }>,
 *   colours: { neutral: string, classFills: string[], beamHalo: string, ground: string } }} props
 */
export function sceneAt(props, frame) {
  const { states, timing, colours } = props;
  const at = (field) => fieldAt(field, frame, states, timing);
  const m = at("morph");
  const shapeOut = clamp01((m - SHAPE_TO_TILE[0]) / (SHAPE_TO_TILE[1] - SHAPE_TO_TILE[0]));
  const { reached, others, shapesIn, fills, widest } = geographyAt(props, frame);

  const countries = {};
  for (const c of props.countries) {
    const fill = c.classIndex === null ? null : blend(colours.neutral, colours.classFills[c.classIndex], reached[c.classIndex]);
    const { transform } = morphOf(c.box, c.tile, m);
    countries[c.iso] = {
      transform,
      fill,
      shape: shapesIn * (1 - shapeOut),
      tile: shapeOut,
      opacity: c.iso === props.widest ? 1 : others,
    };
  }
  // ── the balance ─────────────────────────────────────────────────────────────────────────────────────
  const { beam } = props;
  const weighed = props.countries.filter((c) => c.weight !== null);
  const weightOf = (c) => (1 - m) * c.weight + m / weighed.length;
  const columns = {};
  const stacked = new Map();
  let mean = 0;
  for (const c of [...weighed].sort((a, b) => a.value - b.value || a.iso.localeCompare(b.iso))) {
    const w = weightOf(c);
    mean += w * c.value;
    const below = stacked.get(c.bin) ?? 0;
    const h = w * beam.height;
    columns[c.iso] = { x: beam.x + c.bin * beam.binWidth, y: beam.y - below - h, w: beam.binWidth, h };
    stacked.set(c.bin, below + h);
  }
  const xOf = (v) => beam.x + (beam.width * v) / 100;
  const live = meanText(beam.liveTemplate, mean);
  const pivots = {
    area: { x: xOf(beam.areaValue), opacity: at("area") },
    live: { x: xOf(mean), value: mean, text: live, opacity: m > 0 ? Math.min(1, m * 8) : 0 },
  };

  return {
    title: at("title"),
    furniture: at("furniture"),
    columns,
    pivots,
    swatches: reached,
    countries,
    morph: m,
    others,
    shapesIn,
    fills,
    /** The ground rect over the live map: the basemap fades out as the countries leave geography. */
    basemapOut: m,
    /** The ground a word of the balance stands on: what the measured map paints under it, then the direction's ground
     *  under the tiles. The key's words blend theirs the same way (`CartogramFrame.tsx`). */
    beamGround: blend(colours.beamHalo, colours.ground, m),
    widest,
    area: at("area"),
    codes: at("codes"),
    source: at("source"),
  };
}

/**
 * THE LIVE MAP AT `frame`, IN NUMBERS: the one camera, and every field the plan's paints are bound to (`map-plan.mjs`):
 * each class's arrival and whether its neutral is still under it, the others' focus, the fills still on the map, the
 * widest country's name.
 *
 * @param {{ camera: any } & Parameters<typeof geographyAt>[0]} props
 */
export function mapStateAt(props, frame) {
  const s = geographyAt(props, frame);
  const state = { ...props.camera, others: s.others, fills: s.fills, widest: s.widest };
  s.reached.forEach((r, k) => {
    state[`reached${k}`] = r;
    // The neutral stays under a class until it has wholly arrived, so the class over it blends as the SVG's colour did;
    // once it has, the neutral leaves, so a stepped-back country is its class over the land, not over the neutral.
    state[`neutral${k}`] = r < 1 ? 1 : 0;
  });
  return state;
}
