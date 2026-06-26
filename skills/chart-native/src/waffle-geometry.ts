// Pure geometry core for WAFFLE / square-pie charts — framework-free (D3 = math).
// A grid of `gridN`×`gridN` cells (default 100): each category's share is rounded
// to whole cells with the largest-remainder method (so counts total exactly), and
// cells fill in order (bottom→top). The reveal only animates each cell's
// opacity/scale, so positions/colours are fixed and frame N is a pure function.

export interface WaffleItem {
  label: string;
  value: number;
}

export interface WaffleData {
  items: WaffleItem[];
  gridN?: number; // cells per side (default 10 → 100 cells)
}

export interface WaffleDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface WaffleCell {
  index: number; // fill order 0..N²-1
  categoryIndex: number;
  x: number;
  y: number;
  size: number;
}

export interface WaffleCategory {
  index: number;
  label: string;
  value: number;
  share: number; // value / total
  cells: number; // whole cells assigned
}

export interface WaffleLayout {
  cells: WaffleCell[];
  categories: WaffleCategory[];
  gridN: number;
  cellStep: number;
  cellSize: number;
  gridX: number;
  gridY: number;
}

/** Round shares to whole cells so they total exactly `total` (largest remainder). */
export function allocateCells(values: number[], total: number): number[] {
  const sum = values.reduce((s, v) => s + v, 0) || 1;
  const raw = values.map((v) => (v / sum) * total);
  const floors = raw.map((r) => Math.floor(r));
  let remaining = total - floors.reduce((s, f) => s + f, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; remaining > 0 && k < order.length; k++, remaining--)
    out[order[k].i] += 1;
  // any leftover (all-zero edge case) goes to the largest
  while (remaining > 0) {
    let mi = 0;
    for (let i = 1; i < values.length; i++) if (values[i] > values[mi]) mi = i;
    out[mi] += 1;
    remaining--;
  }
  return out;
}

export function computeWaffleLayout(
  data: WaffleData,
  dims: WaffleDims,
): WaffleLayout {
  if (!data.items.length) throw new Error("computeWaffleLayout: no items");
  if (data.items.some((it) => it.value < 0))
    throw new Error("computeWaffleLayout: values must be ≥ 0");
  const gridN = data.gridN ?? 10;
  const totalCells = gridN * gridN;
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeWaffleLayout: padding exceeds dimensions");

  const total = data.items.reduce((s, it) => s + it.value, 0);
  const counts = allocateCells(
    data.items.map((it) => it.value),
    totalCells,
  );

  const categories: WaffleCategory[] = data.items.map((it, i) => ({
    index: i,
    label: it.label,
    value: it.value,
    share: total > 0 ? it.value / total : 0,
    cells: counts[i],
  }));

  // square grid centred in the plot; cells fill bottom→top, left→right.
  const cellStep = Math.max(1, Math.min(innerWidth, innerHeight) / gridN);
  const gap = cellStep * 0.12;
  const cellSize = cellStep - gap;
  const gridSide = cellStep * gridN;
  const gridX = padding.left + (innerWidth - gridSide) / 2;
  const gridY = padding.top + (innerHeight - gridSide) / 2;

  // assign cell indices to categories in order
  const cellCat: number[] = [];
  counts.forEach((c, ci) => {
    for (let k = 0; k < c; k++) cellCat.push(ci);
  });

  const cells: WaffleCell[] = cellCat.map((ci, i) => {
    const col = i % gridN;
    const rowFromBottom = Math.floor(i / gridN);
    return {
      index: i,
      categoryIndex: ci,
      x: gridX + col * cellStep,
      y: gridY + (gridN - 1 - rowFromBottom) * cellStep,
      size: cellSize,
    };
  });

  return {
    cells,
    categories,
    gridN,
    cellStep,
    cellSize,
    gridX,
    gridY,
  };
}
