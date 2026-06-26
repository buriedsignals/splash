// Pure geometry core for MARIMEKKO / mosaic charts — framework-free (D3 = math).
// Columns of VARYING WIDTH (width = column share of the total) are each split into
// vertical SEGMENTS (height = series share within the column). A cell's area is the
// joint share. Both axes are 0–100%. Cells never move; the reveal only fades/scales
// them, so frame N is a pure function of the frame.

export interface MarimekkoColumn {
  label: string;
  /** the column's weight; widths are normalised to these */
  weight: number;
  /** within-column series values (any units; normalised to the column height) */
  values: number[];
}

export interface MarimekkoData {
  seriesFields: string[]; // stacking order, top → bottom
  columns: MarimekkoColumn[];
}

export interface MarimekkoDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface MarimekkoCell {
  colIndex: number;
  seriesIndex: number;
  colLabel: string;
  seriesKey: string;
  /** within-column share 0..1 (the segment's height fraction) */
  share: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MarimekkoColLayout {
  index: number;
  label: string;
  /** column share of the whole 0..1 (its width fraction) */
  widthShare: number;
  x: number;
  w: number;
}

export interface MarimekkoLayout {
  innerWidth: number;
  innerHeight: number;
  cols: MarimekkoColLayout[];
  cells: MarimekkoCell[];
}

export function computeMarimekkoLayout(
  data: MarimekkoData,
  dims: MarimekkoDims,
): MarimekkoLayout {
  if (!data.columns.length)
    throw new Error("computeMarimekkoLayout: no columns");
  if (!data.seriesFields.length)
    throw new Error("computeMarimekkoLayout: no series");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeMarimekkoLayout: padding exceeds dimensions");

  const totalWeight = data.columns.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0)
    throw new Error("computeMarimekkoLayout: total column weight must be > 0");

  const cols: MarimekkoColLayout[] = [];
  const cells: MarimekkoCell[] = [];
  let cx = 0;
  data.columns.forEach((col, ci) => {
    if (col.values.length !== data.seriesFields.length)
      throw new Error(
        `column "${col.label}" has ${col.values.length} values, expected ${data.seriesFields.length}`,
      );
    const widthShare = col.weight / totalWeight;
    const w = widthShare * innerWidth;
    cols.push({ index: ci, label: col.label, widthShare, x: cx, w });

    const colSum = col.values.reduce((s, v) => s + v, 0);
    if (colSum <= 0) throw new Error(`column "${col.label}" values sum to 0`);
    let cy = 0;
    col.values.forEach((v, si) => {
      if (v < 0) throw new Error(`negative marimekko value in "${col.label}"`);
      const share = v / colSum;
      const h = share * innerHeight;
      cells.push({
        colIndex: ci,
        seriesIndex: si,
        colLabel: col.label,
        seriesKey: data.seriesFields[si],
        share,
        x: cx,
        y: cy,
        w,
        h,
      });
      cy += h;
    });
    cx += w;
  });

  return { innerWidth, innerHeight, cols, cells };
}
