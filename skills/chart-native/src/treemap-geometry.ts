// Pure geometry core for TREEMAPS — framework-free (D3 = math, but the squarify
// algorithm is hand-rolled so it stays a unit-testable pure function). A space-
// filling layout: each item's AREA is proportional to its value; cells are kept
// near-square (Bruls/Huizing/van Wijk "squarified"). When the items carry a
// category, the layout is GROUPED (2-level): the rectangle is first split among
// the categories by their total, then each category's sub-rectangle is squarified
// — so same-coloured cells stay contiguous. The reveal only scales each cell from
// its centre, so rectangles are fixed and frame N is a pure function of the frame.

export interface TreemapItem {
  label: string;
  value: number;
  category?: string;
}

export interface TreemapData {
  unit: string;
  items: TreemapItem[];
  categories?: string[]; // group order; omit (or items without category) → flat
}

export interface TreemapDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface TreemapCell {
  index: number; // original index
  order: number; // rank by value desc (for staggered reveal)
  label: string;
  value: number;
  category?: string;
  share: number; // value / total
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreemapLayout {
  innerWidth: number;
  innerHeight: number;
  cells: TreemapCell[];
  total: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const worstRatio = (areas: number[], side: number, sum: number): number => {
  if (sum <= 0 || areas.length === 0) return Infinity;
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const s2 = sum * sum;
  const side2 = side * side;
  return Math.max((side2 * max) / s2, s2 / (side2 * min));
};

/** Squarify a list of weighted entries into `rect`; returns each payload placed.
 *  Pure: same input → same tiling. */
function squarify<T>(
  entries: { value: number; payload: T }[],
  rect: Rect,
): { payload: T; x: number; y: number; w: number; h: number }[] {
  const totalVal = entries.reduce((s, e) => s + e.value, 0);
  const plotArea = rect.w * rect.h;
  const items = [...entries]
    .sort((a, b) => b.value - a.value)
    .map((e) => ({
      payload: e.payload,
      area: (e.value / totalVal) * plotArea,
    }));

  const placed: { payload: T; x: number; y: number; w: number; h: number }[] =
    [];
  let rx = rect.x;
  let ry = rect.y;
  let rw = rect.w;
  let rh = rect.h;
  let cursor = 0;

  while (cursor < items.length) {
    const side = Math.min(rw, rh);
    const row: { payload: T; area: number }[] = [];
    let rowSum = 0;
    while (cursor < items.length) {
      const a = items[cursor].area;
      const cur = worstRatio(
        row.map((r) => r.area),
        side,
        rowSum,
      );
      const next = worstRatio(
        [...row, items[cursor]].map((r) => r.area),
        side,
        rowSum + a,
      );
      if (row.length === 0 || next <= cur) {
        row.push(items[cursor]);
        rowSum += a;
        cursor++;
      } else break;
    }
    const thick = rowSum / side;
    if (rw >= rh) {
      let oy = ry;
      for (const it of row) {
        const ch = it.area / thick;
        placed.push({ payload: it.payload, x: rx, y: oy, w: thick, h: ch });
        oy += ch;
      }
      rx += thick;
      rw -= thick;
    } else {
      let ox = rx;
      for (const it of row) {
        const cw = it.area / thick;
        placed.push({ payload: it.payload, x: ox, y: ry, w: cw, h: thick });
        ox += cw;
      }
      ry += thick;
      rh -= thick;
    }
  }
  return placed;
}

export function computeTreemapLayout(
  data: TreemapData,
  dims: TreemapDims,
): TreemapLayout {
  if (!data.items.length) throw new Error("computeTreemapLayout: no items");
  if (data.items.some((it) => Number(it.value) <= 0))
    throw new Error("computeTreemapLayout: every value must be > 0");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeTreemapLayout: padding exceeds dimensions");

  const total = data.items.reduce((s, it) => s + Number(it.value), 0);
  const plot: Rect = { x: 0, y: 0, w: innerWidth, h: innerHeight };

  // global value-desc rank for the staggered reveal.
  const orderRank = new Map<number, number>();
  data.items
    .map((it, i) => ({ i, v: Number(it.value) }))
    .sort((a, b) => b.v - a.v)
    .forEach(({ i }, rank) => orderRank.set(i, rank));

  // placement per original index
  const place = new Map<number, Rect>();

  const grouped =
    (data.categories?.length ?? 0) > 0 &&
    data.items.every((it) => it.category != null);

  if (grouped) {
    // keep only categories that actually have items, in declared order.
    const groups = data
      .categories!.map((cat) => ({
        cat,
        items: data.items
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => it.category === cat),
      }))
      .filter((g) => g.items.length > 0);
    const groupRects = squarify(
      groups.map((g) => ({
        value: g.items.reduce((s, { it }) => s + Number(it.value), 0),
        payload: g,
      })),
      plot,
    );
    for (const gr of groupRects) {
      const itemRects = squarify(
        gr.payload.items.map(({ it, i }) => ({
          value: Number(it.value),
          payload: i,
        })),
        { x: gr.x, y: gr.y, w: gr.w, h: gr.h },
      );
      for (const ir of itemRects)
        place.set(ir.payload, { x: ir.x, y: ir.y, w: ir.w, h: ir.h });
    }
  } else {
    const itemRects = squarify(
      data.items.map((it, i) => ({ value: Number(it.value), payload: i })),
      plot,
    );
    for (const ir of itemRects)
      place.set(ir.payload, { x: ir.x, y: ir.y, w: ir.w, h: ir.h });
  }

  const cells: TreemapCell[] = data.items.map((it, i) => {
    const r = place.get(i)!;
    return {
      index: i,
      order: orderRank.get(i) ?? 0,
      label: it.label,
      value: Number(it.value),
      category: it.category,
      share: Number(it.value) / total,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
    };
  });

  return { innerWidth, innerHeight, cells, total };
}
