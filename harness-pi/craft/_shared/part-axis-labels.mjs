// A marimekko's column labels, on two staggered rows. Each label takes the row where it clears the labels already
// placed (the columns the gestures name most first, then the widest), and is shown only at plot widths where it
// clears them. A label is clamped inside the frame's edges (the stylesheet's clamp), so an edge never hides it:
// asking it to clear the edge while centred hid the last, narrow column of a six-country mosaic at every width.

/**
 * @param columns  [{ k, cx, lw }] — centre in frame units (0…W), label width in pixels
 * @param W        the frame's width in its own units
 * @param order    the keys in placement order
 * @param tier     the pixel step widths are rounded up to
 * @returns Map k → { row, need } — need: the narrowest plot width, in pixels, at which the label is shown
 */
export function placeColumnLabels(columns, W, order, tier) {
  const byKey = new Map(columns.map((c) => [c.k, c]));
  const rows = [[], []];
  const placed = new Map();
  for (const k of order) {
    const { cx, lw } = byKey.get(k);
    const needIn = (row) => Math.max(0, ...row.map((q) => (((q.lw + lw) / 2 + 6) * W) / Math.max(Math.abs(q.cx - cx), 0.5)));
    const row = needIn(rows[0]) <= needIn(rows[1]) ? 0 : 1;
    placed.set(k, { row, need: Math.ceil(needIn(rows[row]) / tier) * tier });
    rows[row].push({ cx, lw });
  }
  return placed;
}
