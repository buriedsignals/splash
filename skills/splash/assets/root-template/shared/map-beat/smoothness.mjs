// shared/map-beat/smoothness.mjs
//
// A BOUND PAINT MUST NOT CUT — the companion to `validateScrollyPlan`'s "a bound paint must be data-constant".
//
// MapLibre animates nothing in a directed video: the frame owns time and the runner kills the paint transitions on
// purpose, so a bound paint is exactly what the state says at that frame and nothing softens the gap to the next one.
// A binding that reads a QUANTISED number — a class index, a floored year — therefore changes by a whole step in one
// frame, which on screen is a cut, not a movement. Measured on `proof/video-cold2-coal-share-europe` before the fix:
// four consecutive frames whose largest pixel change was 3, then one frame changing 6 420 pixels by up to 246, three
// times a second. The choreography was right; the map strobed.
//
// `paintAt` evaluates a plan's bound paints the way the map will paint them — a `step` over a class number reads here
// exactly as it reads there, and an `interpolate` ramp blends here exactly as it blends there (MapLibre interpolates
// colours channel by channel, in sRGB, which is what `mixChannels` does). An operator this evaluator does not know is
// REFUSED rather than skipped: a binding that slipped past the guard unmeasured would be the one that cuts.
//
// `paintCuts` walks consecutive states and returns the changes that exceed the ceilings, in `validateScrollyPlan`'s
// shape: an empty array means every change is a movement. The ceilings are the CALLER's, because only the beat knows
// how fast its own gestures are meant to run — they come from its timing contract (a window's length in frames) and
// from its scale (how far apart two class colours are). Either may be a number, or a function of the later frame's
// index when a beat's pace changes through the video.

import { bindState } from "./scrolly.mjs";

/** A paint property whose value is a colour; everything else bound here is a number (an opacity, a width, a radius). */
const isColour = (property) => property.endsWith("-color");

/** A colour as its three channels, 0..255: `#rgb`, `#rrggbb`, or an `rgb()`/`rgba()` the plan carried through. */
export function channelsOf(colour) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(colour).trim());
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  }
  const parts = String(colour).match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`a bound paint evaluated to ${colour}, which is not a colour`);
  return parts.slice(0, 3).map(Number);
}

const mixChannels = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * ONE BOUND PAINT VALUE, EVALUATED. `wantsColour` says which of the two readings is wanted, because the same
 * `interpolate` returns a colour or a number depending on its stops. Numbers come back as numbers, colours as three
 * channels 0..255.
 */
export function evaluatePaint(value, { colour = false } = {}) {
  const read = (v) => evaluatePaint(v, { colour });
  if (typeof value === "number") return value;
  if (typeof value === "string") return colour ? channelsOf(value) : Number(value);
  if (!Array.isArray(value)) throw new Error(`a bound paint carries ${JSON.stringify(value)}, which is not a paint value`);
  const [op, ...rest] = value;
  switch (op) {
    case "literal":
      return read(rest[0]);
    case "+":
      return rest.reduce((a, v) => a + read(v), 0);
    case "-":
      return rest.length === 1 ? -read(rest[0]) : read(rest[0]) - read(rest[1]);
    case "*":
      return rest.reduce((a, v) => a * read(v), 1);
    case "/":
      return read(rest[0]) / read(rest[1]);
    case "min":
      return Math.min(...rest.map(read));
    case "max":
      return Math.max(...rest.map(read));
    case "step": {
      const [input, first, ...stops] = rest;
      const x = evaluatePaint(input, { colour: false });
      let out = first;
      for (let i = 0; i < stops.length; i += 2) if (x >= stops[i]) out = stops[i + 1];
      return read(out);
    }
    case "interpolate": {
      const [kind, input, ...stops] = rest;
      if (kind?.[0] !== "linear") throw new Error(`this guard reads a linear interpolation; the binding asks for ${JSON.stringify(kind)}`);
      const x = evaluatePaint(input, { colour: false });
      const at = (i) => read(stops[i * 2 + 1]);
      const n = stops.length / 2;
      if (x <= stops[0]) return at(0);
      if (x >= stops[(n - 1) * 2]) return at(n - 1);
      let i = 0;
      while (i < n - 2 && x >= stops[(i + 1) * 2]) i += 1;
      const t = (x - stops[i * 2]) / (stops[(i + 1) * 2] - stops[i * 2]);
      const [a, b] = [at(i), at(i + 1)];
      return colour ? mixChannels(a, b, t) : a + (b - a) * t;
    }
    default:
      throw new Error(`this guard does not know the paint operator "${op}" — teach it, or the binding goes unmeasured`);
  }
}

/**
 * EVERY BOUND PAINT OF A PLAN, EVALUATED AT ONE STATE: `{ layer, property, colour }` with the three channels 0..255,
 * or `{ layer, property, number }`.
 */
export function paintAt(plan, state) {
  const out = [];
  for (const layer of plan.layers ?? [])
    for (const [property, binding] of Object.entries(layer.bindings ?? {})) {
      const colour = isColour(property);
      const value = evaluatePaint(bindState(binding, state), { colour });
      out.push(colour ? { layer: layer.id, property, colour: value } : { layer: layer.id, property, number: value });
    }
  return out;
}

/**
 * THE CUTS A PLAN'S BOUND PAINTS MAKE across a run of consecutive frames' states.
 *
 * @param {object} plan
 * @param {Array<Record<string, number>>} states one per frame, in order
 * @param {{ colour?: number | ((i: number) => number), number?: number | ((i: number) => number) }} ceilings
 *   `colour` in channels 0..255, `number` in the property's own units; `i` is the index of the LATER state.
 * @returns {string[]} one line per cut, the worst first. Empty means nothing cuts.
 */
export function paintCuts(plan, states, ceilings = {}) {
  const ceilingOf = (which, i) => (typeof ceilings[which] === "function" ? ceilings[which](i) : ceilings[which]);
  const found = [];
  let previous = null;
  states.forEach((state, i) => {
    const now = paintAt(plan, state);
    if (previous)
      now.forEach((value, k) => {
        const was = previous[k];
        const colour = value.colour !== undefined;
        const ceiling = ceilingOf(colour ? "colour" : "number", i);
        if (!(ceiling >= 0)) return;
        const moved = colour ? Math.max(...value.colour.map((c, ch) => Math.abs(c - was.colour[ch]))) : Math.abs(value.number - was.number);
        if (moved > ceiling)
          found.push({ moved, line: `layer "${value.layer}": "${value.property}" moves ${moved.toFixed(2)} between frames ${i - 1} and ${i}, past the ${ceiling.toFixed(2)} a reader reads as motion — it cuts` });
      });
    previous = now;
  });
  return found.sort((a, b) => b.moved - a.moved).map((f) => f.line);
}
