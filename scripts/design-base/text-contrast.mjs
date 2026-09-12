// twin/scripts/design-base/text-contrast.mjs
//
// EVERY TEXT RUN, MEASURED AGAINST WHAT IS ACTUALLY BEHIND IT IN THE DELIVERED PIXELS.
//
// THE DEFECT THIS EXISTS FOR, found twice by a reader and never by a guard. A label's ink is chosen
// against the page — `adjustToContrast(accent, ground)` — and then the label is drawn on a BAND,
// whose fill is not the page: an accent number over a pale stream in `creme`, a mint number over a
// mint band in `nocturne`. Both cleared every floor this tree measured, because the floor was
// measured against the wrong thing.
//
// WHY IT READS THE PNG RATHER THAN THE SVG. A first version read the markup, matched each run
// against the `<rect>`s under it, and produced two findings, both false:
//
//   - `pic de 1973` at 1.00 against `#61605a` — the rect under it is an era band carrying
//     `opacity="0.09"`, so the actual ground behind the text is nine per cent of that grey over
//     cream. Element opacity is not fill opacity and the markup reader saw neither.
//   - `Hydraulique` at 1.00 against the page — a streamgraph's bands are PATHS, so the only rect
//     under that text is the background, and the checker reported the page it was not on.
//
// A composited pixel has no such argument. The delivered PNG is what a reader sees; this reads it.

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { inkBoxes } from "./text-boxes.mjs";

/** WCAG 2.2 SC 1.4.3: 4.5:1 for body text, 3:1 for large text — 24px, or 18.66px at bold. */
export const TEXT_FLOOR = 4.5;
export const LARGE_TEXT_FLOOR = 3;

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrastOf(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

/** How far a pixel must be from the ink, summed over the channels, before it counts as ground
 *  rather than as an anti-aliased edge of the glyph itself. */
const NOT_THE_INK = 90;

/**
 * The colour a run of text actually sits on: the most common pixel inside its ink box that is not
 * the ink or a blend of it.
 */
export function groundUnder(png, box, ink, scale) {
  const x0 = Math.max(0, Math.round(box.x * scale));
  const y0 = Math.max(0, Math.round(box.y * scale));
  const x1 = Math.min(png.width, Math.round((box.x + box.width) * scale));
  const y1 = Math.min(png.height, Math.round((box.y + box.height) * scale));
  if (x1 <= x0 || y1 <= y0) return null;

  const counts = new Map();
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const at = (y * png.width + x) * 4;
      const pixel = [png.data[at], png.data[at + 1], png.data[at + 2]];
      const key = pixel.join(",");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key] of ranked) {
    const pixel = key.split(",").map(Number);
    const distance = pixel.reduce((sum, v, i) => sum + Math.abs(v - ink[i]), 0);
    if (distance > NOT_THE_INK) return pixel;
  }
  return null;
}

/**
 * Every run whose ink fails its floor against the pixels behind it.
 *
 * @param {string} svgPath  the delivered SVG, read for the runs and their boxes
 * @param {string} pngPath  the delivered PNG, read for what is behind them
 */
export function runsUnderTheContrastFloor(svgPath, pngPath) {
  const svg = readFileSync(svgPath, "utf8");
  const png = PNG.sync.read(readFileSync(pngPath));
  const runs = inkBoxes(svg);
  const frameWidth = Number(/<svg[^>]*\bwidth="([^"]+)"/.exec(svg)?.[1]);
  const scale = png.width / frameWidth;

  const findings = [];
  for (const run of runs) {
    if (!/^#[0-9a-fA-F]{6}$/.test(run.fill ?? "")) continue;
    const ink = hexToRgb(run.fill);
    const ground = groundUnder(png, run.box, ink, scale);
    if (!ground) continue;
    const large =
      run.fontSize >= 24 || (run.fontSize >= 18.66 && Number(run.fontWeight) >= 700);
    const floor = large ? LARGE_TEXT_FLOOR : TEXT_FLOOR;
    const ratio = contrastOf(ink, ground);
    if (ratio < floor)
      findings.push({
        text: run.text,
        fill: run.fill,
        ground: `rgb(${ground.join(", ")})`,
        ratio,
        floor,
      });
  }
  return findings;
}
