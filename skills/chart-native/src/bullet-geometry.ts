// Pure geometry core for BULLET charts — framework-free (D3 = math). Each row is
// a measure vs a target on a backdrop of qualitative bands, on its OWN scale
// ([0, max] → the same pixel width). The measure bar grows from zero (baseline
// rule). The reveal grows the measure from 0 — a pure function of a per-row
// progress computed in the component.

import { scaleLinear } from "d3-scale";

export interface BulletRow {
  label: string;
  unit: string;
  value: number; // the measure
  target: number;
  max: number; // top of this row's own scale
  bands: number[]; // 1–2 interior thresholds splitting [0,max] into 2–3 zones
}

export interface BulletData {
  rows: BulletRow[];
}

export interface BulletDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface BulletBand {
  x: number;
  w: number;
  shade: string;
}

export interface BulletLaidRow {
  index: number;
  label: string;
  unit: string;
  value: number;
  target: number;
  hitTarget: boolean;
  y: number; // band top
  h: number; // row height
  valueX: number; // measure end px
  targetX: number; // target marker px
  measureY: number;
  measureH: number;
  bands: BulletBand[];
}

export interface BulletLayout {
  innerWidth: number;
  innerHeight: number;
  rows: BulletLaidRow[];
}

const BAND_SHADES = ["#ECECEC", "#DBDBDB", "#C9C9C9"];

export function computeBulletLayout(
  data: BulletData,
  dims: BulletDims,
  // px reserved on the right for the measure's value label.
  labelInset = 0,
): BulletLayout {
  if (!data.rows.length)
    throw new Error("computeBulletLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeBulletLayout: padding exceeds dimensions");

  const inset = Math.min(labelInset, innerWidth / 2 - 1);
  const rowStep = innerHeight / data.rows.length;
  const rowH = rowStep * 0.62; // leave a gap between rows

  const rows: BulletLaidRow[] = data.rows.map((r, i) => {
    const max = Number(r.max);
    if (Number.isNaN(max) || max <= 0)
      throw new Error(`invalid bullet max for "${r.label}": ${r.max}`);
    const value = Number(r.value);
    const target = Number(r.target);
    if (Number.isNaN(value) || Number.isNaN(target))
      throw new Error(`invalid bullet value/target for "${r.label}"`);

    const x = scaleLinear()
      .domain([0, max])
      .range([0, innerWidth - inset]);
    const edges = [0, ...r.bands.map(Number), max];
    const bands: BulletBand[] = [];
    for (let b = 0; b < edges.length - 1; b++) {
      const x0 = x(edges[b]);
      const x1 = x(edges[b + 1]);
      bands.push({
        x: x0,
        w: x1 - x0,
        shade: BAND_SHADES[b] ?? BAND_SHADES[2],
      });
    }

    const y = i * rowStep + (rowStep - rowH) / 2;
    return {
      index: i,
      label: r.label,
      unit: r.unit,
      value,
      target,
      hitTarget: value >= target,
      y,
      h: rowH,
      valueX: x(value),
      targetX: x(target),
      measureY: y + rowH * 0.3,
      measureH: rowH * 0.4,
      bands,
    };
  });

  return { innerWidth, innerHeight, rows };
}

/** Measure-bar end x as it grows from zero to the value at `progress`. Pure. */
export function growMeasure(row: BulletLaidRow, progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return row.valueX * p;
}
