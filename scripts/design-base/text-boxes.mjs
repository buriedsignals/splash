// twin/scripts/design-base/text-boxes.mjs
//
// THE INK A DELIVERED PLATE ACTUALLY CARRIES, read back out of the file it wrote.
//
// Every guard upstream of this one measures an INTENTION: the arbiter refuses a collision between
// the boxes it was asked to place, `type-at-size.mjs` refuses type under a floor, `sizes.mjs`
// measures the PNG's own IHDR. None of them can see a text run the component drew directly —
// a title, a source line, a row name in a gutter, an axis tick — and those are most of the words on
// a plate. Measured on the 27-row diverging bar: the arbiter reported a clean placement while the
// standfirst printed the average of the falls twice and the subject's note ran through the name of
// the country it was about. Both were drawn outside the arbiter, so nothing was watching.
//
// This file reads the SVG, rebuilds each run's ink box with the same instrument the renderer uses
// (`measureText` / `measureTextBand`, which are resvg's own bounding box), and answers two
// questions: does any ink overlap other ink, and does any ink leave the frame.
//
// WHAT IT CANNOT SEE, stated rather than hidden. `measureText` takes family, size and weight, so an
// italic run is measured in its upright width — usually narrower than the truth, which makes this
// checker optimistic on italics rather than noisy. And a `<tspan>` inside a run carries its own
// position; runs are read whole, so a component that positions tspans needs its own guard.

import { measureText, measureTextBand } from "#shared/chart-beat/render-still.mjs";

/** The body is `[^<]*` rather than a lazy `[\s\S]*?`: on the dot map's 1 MB plate the lazy form
 *  backtracked for 4.2 seconds, and a guard nobody can afford to run is a guard nobody runs. A run
 *  containing a `<tspan>` no longer matches at all, which is the same outcome as the skip below. */
const TEXT = /<text\b([^>]*)>([^<]*)<\/text>/g;
const ATTR = /([a-zA-Z-]+)="([^"]*)"/g;

/** Entities decoded before measuring, HEX FORMS INCLUDED. React writes an apostrophe as `&#x27;`,
 *  and a decoder that only knows the decimal form measures six characters where the plate draws
 *  one — which reported a 2.7px overlap between a title and a standfirst that a look at the render
 *  showed to be comfortably apart. A checker that cries wolf is worse than no checker. */
const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/** Every `<text>` run in the markup, with the attributes that decide where its ink lands. */
export function textRuns(svg) {
  const runs = [];
  for (const [, rawAttrs, body] of svg.matchAll(TEXT)) {
    if (/<tspan/.test(body)) continue;
    const attrs = {};
    for (const [, name, value] of rawAttrs.matchAll(ATTR)) attrs[name] = value;
    const text = decode(body).trim();
    if (!text) continue;
    /** A HALO IS NOT A SECOND LABEL. A `<text>` that paints no fill and does paint a stroke is the
     *  halo of the glyphs drawn over it — same string, same position, one behind the other — and
     *  this tree draws one wherever a label can land on more than one colour (the map's country
     *  names, the calendar's streak outline). Counted as ink of its own, every haloed label
     *  collided with itself and the overlap guard reported thirteen collisions on a plate that had
     *  none. Its extent is a hair wider than the run it sits under, so skipping it under-measures
     *  by the halo's own stroke — half of it, at the edges — which is the honest trade for not
     *  drowning the guard in pairs it can never mean. */
    if ((attrs.fill ?? "") === "none" && attrs.stroke && attrs.stroke !== "none") continue;
    runs.push({
      text,
      x: Number(attrs.x ?? 0),
      y: Number(attrs.y ?? 0),
      fontFamily: attrs["font-family"],
      fontSize: Number(attrs["font-size"]),
      fontWeight: Number(attrs["font-weight"] ?? 400),
      letterSpacing: Number(attrs["letter-spacing"] ?? 0),
      anchor: attrs["text-anchor"] ?? "start",
      fill: attrs.fill,
    });
  }
  return runs;
}

/** The box each run's ink occupies, in the plate's own coordinates. */
export function inkBoxes(svg) {
  return textRuns(svg).map((run) => {
    const options = {
      fontSize: run.fontSize,
      fontWeight: run.fontWeight,
      fontFamily: run.fontFamily,
    };
    const width =
      measureText(run.text, options) +
      run.letterSpacing * Math.max(0, run.text.length - 1);
    const band = measureTextBand(run.text, options);
    const left =
      run.anchor === "middle" ? run.x - width / 2 : run.anchor === "end" ? run.x - width : run.x;
    return {
      ...run,
      box: { x: left, y: run.y - band.ascent, width, height: band.ascent + band.descent },
    };
  });
}

/** The frame the plate declares for itself. */
export function frameOf(svg) {
  const width = Number(/<svg[^>]*\bwidth="([^"]+)"/.exec(svg)?.[1]);
  const height = Number(/<svg[^>]*\bheight="([^"]+)"/.exec(svg)?.[1]);
  return { width, height };
}

/**
 * Pairs of runs whose ink overlaps on both axes by more than `tolerance`.
 *
 * WHY THE TOLERANCE IS 2px AND NOT 0. A box around ink is not the ink. Measured on
 * `proof/co2-suisse/renders/nocturne.svg`: `2024 · 32,1 Mt` and the annotation under it share
 * 1.3px of vertical box, and the only glyph reaching down into that band is the comma of `32,1` —
 * which sits above the `2023` of the line below, not above a letter. Cropped at 3x, they do not
 * touch. Two rectangles can share a corner where no two glyphs do, and a checker that reports it
 * teaches its reader to ignore it.
 */
export function overlappingRuns(boxes, { tolerance = 2 } = {}) {
  const hits = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].box;
      const b = boxes[j].box;
      const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (x > tolerance && y > tolerance)
        hits.push({ a: boxes[i], b: boxes[j], overlap: { x, y } });
    }
  return hits;
}

/** Runs whose ink leaves the frame — an off-frame label is worse than an absent one. */
export function runsOutsideFrame(boxes, frame, { tolerance = 1 } = {}) {
  return boxes.filter(
    ({ box }) =>
      box.x < -tolerance ||
      box.y < -tolerance ||
      box.x + box.width > frame.width + tolerance ||
      box.y + box.height > frame.height + tolerance,
  );
}

/** The halos a plate draws: a `<text>` that paints no fill and does paint a stroke, keyed by where
 *  it sits and what it says, so a run can be asked whether it has one. */
export function haloedRuns(svg) {
  const keys = new Set();
  for (const [, rawAttrs, body] of svg.matchAll(TEXT)) {
    if (/<tspan/.test(body)) continue;
    const attrs = {};
    for (const [, name, value] of rawAttrs.matchAll(ATTR)) attrs[name] = value;
    if ((attrs.fill ?? "") !== "none" || !attrs.stroke || attrs.stroke === "none") continue;
    const text = decode(body).trim();
    if (!text) continue;
    keys.add(`${attrs.x ?? 0}|${attrs.y ?? 0}|${text}`);
  }
  return keys;
}

const LINE = /<line\b[^>]*>/g;

/** Every straight stroke the plate draws, as a segment. Only `<line>`: a gridline, a rule, a
 *  connector, a leader — the furniture that actually runs across a plate. Curved paths are not read,
 *  which makes this checker optimistic rather than noisy. */
export function strokeSegments(svg) {
  const segments = [];
  for (const [tag] of svg.matchAll(LINE)) {
    const at = (name) => Number(new RegExp(`\\b${name}="([^"]+)"`).exec(tag)?.[1]);
    const stroke = /\bstroke="([^"]+)"/.exec(tag)?.[1];
    if (!stroke || stroke === "none") continue;
    const seg = { ax: at("x1"), ay: at("y1"), bx: at("x2"), by: at("y2") };
    if (Object.values(seg).every((v) => Number.isFinite(v))) segments.push(seg);
  }
  return segments;
}

/**
 * THE RUNS A STROKE RUNS THROUGH, WITH NO HALO UNDER THEM.
 *
 * A gridline, a connector or a leader crossing a word is the plate's own furniture cutting the
 * plate's own evidence, and no other guard here can see it: the overlap guard compares two text
 * boxes, and a stroke is not a text box. Rémy read it off three plates at once — *les textes sur le
 * graphe sont coupés par les lignes*.
 *
 * A run is exempt when the plate draws a halo under it: same string, same position, painted as a
 * stroke with no fill. That is this tree's answer to the problem wherever it has already been
 * solved — the map's country names, the contour's own numbers — and it is the fix this guard asks
 * for. The inset is the overlap guard's own tolerance and for the same reason: a box around ink is
 * not the ink, and a line grazing a corner crosses no glyph.
 */
export function runsCrossedByAStroke(boxes, segments, haloed, { inset = 2 } = {}) {
  const hits = [];
  for (const run of boxes) {
    if (haloed.has(`${run.x}|${run.y}|${run.text}`)) continue;
    const x0 = run.box.x + inset;
    const x1 = run.box.x + run.box.width - inset;
    const y0 = run.box.y + inset;
    const y1 = run.box.y + run.box.height - inset;
    if (x1 <= x0 || y1 <= y0) continue;
    const inside = (px, py) => px >= x0 && px <= x1 && py >= y0 && py <= y1;
    const cuts = (s, p0x, p0y, p1x, p1y) => {
      const d = (s.bx - s.ax) * (p1y - p0y) - (s.by - s.ay) * (p1x - p0x);
      if (Math.abs(d) < 1e-9) return false;
      const t = ((p0x - s.ax) * (p1y - p0y) - (p0y - s.ay) * (p1x - p0x)) / d;
      const u = ((p0x - s.ax) * (s.by - s.ay) - (p0y - s.ay) * (s.bx - s.ax)) / d;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };
    for (const s of segments) {
      if (
        inside(s.ax, s.ay) ||
        inside(s.bx, s.by) ||
        cuts(s, x0, y0, x1, y0) ||
        cuts(s, x1, y0, x1, y1) ||
        cuts(s, x1, y1, x0, y1) ||
        cuts(s, x0, y1, x0, y0)
      ) {
        hits.push({ run, segment: s });
        break;
      }
    }
  }
  return hits;
}
