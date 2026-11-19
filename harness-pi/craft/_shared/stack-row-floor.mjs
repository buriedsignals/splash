// The web Stack kit's row floor. A bar's figures are printed INSIDE its segments, so the row must give the bar room for
// one line of the value register, not only the name in the gutter: floored on the name alone, a 375 px phone drew the
// six Likert bars of gx-likert (2026-11-19) 6.6 px tall and every figure inside them had to go.

/** The bar height GestureStackWeb draws in a row of `row` viewBox units. */
export function stackBarUnits(row, maxBar) {
  return Math.min(row * 0.62, maxBar);
}

/**
 * @param {{ rows: number, height: number, maxBar: number, namePx: number, figurePx: number }} o
 *   height  the plot's viewBox height; namePx / figurePx  the name's and an inside figure's line, in CSS px.
 */
export function stackRowFloor({ rows, height, maxBar, namePx, figurePx }) {
  if (rows < 2) return null;
  const pitch = height / rows;
  const share = stackBarUnits(pitch, maxBar) / pitch;
  return {
    rows,
    pitch,
    px: Math.ceil(Math.max(namePx, figurePx / share)),
    why: `Each of the ${rows} bars carries its name in the gutter and its figures inside its segments; under that pitch a bar is too thin to print them.`,
  };
}
