// skills/map-beat/scripts/video-placement.mjs
//
// WHERE A LIVE-MAP VIDEO'S OVERLAY MAY STAND — subject-agnostic placement over what `measure-live-map.mjs` measured.
// Every map video wrote these again in its own `build.mjs` (the cold-test friction log, F8): the cell under a point,
// two colours that are one, boxes that touch, the share of a box's cells that is land, the credit seated on open sea,
// and the whole map's bounds fitted "meet" into the stage as a camera. What a beat places, and why there, stays the
// beat's: nothing here knows a country, a claim or a gesture.
//
// A measured grid is `{ cell, cols, rows, colours }` — the mean `#rrggbb` of every `cell`-pixel square, row by row.

import { mercatorOf } from "#shared/map-beat/scrolly.mjs";

/** How far, per channel, two measured cells may differ and still be one colour (antialiasing, tile seams). */
export const SAME_CELL = 3;

/** The measured colour under a point; a point off the grid reads its nearest edge cell. */
export function cellAt(grid, x, y) {
  const i = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)));
  const j = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell)));
  return grid.colours[j * grid.cols + i];
}

/** Two `#rrggbb` colours within `tolerance` on every channel. */
export function nearColour(a, b, tolerance = SAME_CELL) {
  return [1, 3, 5].every((i) => Math.abs(Number.parseInt(a.slice(i, i + 2), 16) - Number.parseInt(b.slice(i, i + 2), 16)) <= tolerance);
}

/** Two boxes closer than `air` on both axes. */
export function touches(a, b, air = 0) {
  return a.x < b.x + b.width + air && b.x < a.x + a.width + air && a.y < b.y + b.height + air && b.y < a.y + a.height + air;
}

/** How far a box stands off a point: 0 when the point is inside it. */
export function offSeat(box, point) {
  return Math.hypot(Math.max(box.x - point.x, 0, point.x - box.x - box.width), Math.max(box.y - point.y, 0, point.y - box.y - box.height));
}

/** The measured colour of every cell a box covers, clipped to the grid. */
export function cellsUnder(grid, box) {
  const out = [];
  const j0 = Math.max(0, Math.floor(box.y / grid.cell));
  const j1 = Math.min(grid.rows - 1, Math.floor((box.y + box.height) / grid.cell));
  const i0 = Math.max(0, Math.floor(box.x / grid.cell));
  const i1 = Math.min(grid.cols - 1, Math.floor((box.x + box.width) / grid.cell));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) out.push(grid.colours[j * grid.cols + i]);
  return out;
}

/**
 * The share of a box's cells `predicate` holds for.
 *
 * A BOX OFF THE GRID IS UNMEASURED, NOT CLEAR. `cellsUnder` clips to the grid, so a box outside it
 * comes back with no cells at all — and answering `0` for that made "no land under this box" and
 * "nothing was measured under this box" the same number. Measured 2026-09-23 on a portrait map
 * video whose grid had been measured at landscape: the credit's search walked to y≈1848 in a grid
 * that ended at y=1072, every candidate scored a perfect 0, and the credit was seated on North
 * Africa with the beat's own suite at 20 pass / 0 fail. `NaN` is the honest answer to a share of
 * nothing, and it fails every comparison a caller makes, so an unmeasured box is refused by
 * whichever rule was about to accept it rather than welcomed by all of them.
 */
export function shareUnder(grid, box, predicate) {
  const cells = cellsUnder(grid, box);
  return cells.length ? cells.filter(predicate).length / cells.length : Number.NaN;
}

/**
 * THE FIRST PLACE ON OPEN SEA. For each size in order (a credit's forms, longest first), rows from the bottom of
 * `within` upward — a credit anchors to the frame's bottom — each row left to right: the first box whose cells, on
 * EVERY grid it is seen over, are at most `landShare` not the sea's colour, and that stands `air` clear of every box
 * in `avoid`. The sea's colour is the plan's own water tint: the dataviz style paints its water flat, and the
 * measured cell equals the tint.
 *
 * @param {{ grids: Array<{cell: number, cols: number, rows: number, colours: string[]}>, sea: string,
 *   sizes: Array<{width: number, height: number}>, within: {x: number, y: number, width: number, height: number},
 *   step?: {x: number, y: number}, avoid?: Array<{x: number, y: number, width: number, height: number}>,
 *   air?: number, landShare?: number, tolerance?: number }} input
 * @returns {{ index: number, box: {x: number, y: number, width: number, height: number} } | null}
 */
export function seatOnSea({ grids, sea, sizes, within, step = { x: 20, y: 5 }, avoid = [], air = 0, landShare = 0, tolerance = SAME_CELL }) {
  if (!(step.x > 0 && step.y > 0)) throw new Error(`seatOnSea: a step must be positive, got ${JSON.stringify(step)}`);
  const isLand = (c) => !nearColour(c, sea, tolerance);
  for (const [index, size] of sizes.entries())
    for (let y = within.y + within.height - size.height; y >= within.y; y -= step.y)
      for (let x = within.x; x + size.width <= within.x + within.width; x += step.x) {
        const box = { x, y, width: size.width, height: size.height };
        if (avoid.some((b) => touches(box, b, air))) continue;
        if (grids.every((grid) => shareUnder(grid, box, isLand) <= landShare)) return { index, box };
      }
  return null;
}

/**
 * THE WHOLE MAP AS A CAMERA: `bounds` ([[west, south], [east, north]]) fitted "meet" into the share `fit` of the stage
 * — by the tighter axis, as a picture is fitted — and centred on the bounds' middle in Web Mercator, the plane the map
 * itself moves in (the middle latitude in degrees is not the middle of the picture). Returns the camera fields a state
 * carries (`shared/map-beat/scrolly.mjs`). Bounds across the antimeridian are refused, not guessed.
 */
export function fitBoundsMeet({ bounds, stage, fit = 1 }) {
  const [[west, south], [east, north]] = bounds;
  if (!(west < east)) throw new Error(`fitBoundsMeet: the bounds' west (${west}) must be west of their east (${east})`);
  if (!(south < north)) throw new Error(`fitBoundsMeet: the bounds' south (${south}) must be south of their north (${north})`);
  if (!(fit > 0 && fit <= 1)) throw new Error(`fitBoundsMeet: fit is a share of the stage, 0 < fit <= 1, got ${fit}`);
  const [x0, y1] = mercatorOf([west, south]);
  const [x1, y0] = mercatorOf([east, north]);
  const worldPx = fit * Math.min(stage.width / (x1 - x0), stage.height / (y1 - y0));
  return { camX: (x0 + x1) / 2, camY: (y0 + y1) / 2, camZoom: Math.log2(worldPx / 512), camBearing: 0, camPitch: 0 };
}
