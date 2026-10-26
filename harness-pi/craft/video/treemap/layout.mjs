// THE SQUARIFIED TREEMAP (Bruls, Huizing & van Wijk) — the static beat's own layout, pure. Values sorted descending and
// summing to the box's area come back as rectangles tiling the box, each of exactly its value's area.
//
// Browser-safe; used by `build.mjs` for the home layout and for the packing inside the largest cell.

export function squarify(values, box) {
  const out = [];
  let free = { ...box };
  let queue = values.slice();
  const worst = (row, side) => {
    const sum = row.reduce((s, v) => s + v, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    const s2 = sum * sum;
    const side2 = side * side;
    return Math.max((side2 * max) / s2, s2 / (side2 * min));
  };
  const layRow = (row) => {
    const sum = row.reduce((s, v) => s + v, 0);
    const horizontal = free.w >= free.h;
    const thickness = sum / (horizontal ? free.h : free.w);
    let cursor = horizontal ? free.y : free.x;
    for (const v of row) {
      const length = v / thickness;
      out.push(horizontal ? { x: free.x, y: cursor, w: thickness, h: length } : { x: cursor, y: free.y, w: length, h: thickness });
      cursor += length;
    }
    if (horizontal) free = { x: free.x + thickness, y: free.y, w: free.w - thickness, h: free.h };
    else free = { x: free.x, y: free.y + thickness, w: free.w, h: free.h - thickness };
  };
  let row = [];
  while (queue.length) {
    const side = Math.min(free.w, free.h);
    const next = queue[0];
    if (!row.length || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      queue = queue.slice(1);
    } else {
      layRow(row);
      row = [];
    }
  }
  if (row.length) layRow(row);
  return out;
}
