// Pure geometry core for HEATMAPS — framework-free. First type where COLOUR is
// the quantitative channel, so it uses a SEQUENTIAL single-hue ramp (ColorBrewer
// "Blues" — monotonic luminance → CVD-safe & greyscale-readable), NOT the Okabe-
// Ito categorical palette. Cells never move; the reveal (in the component) only
// fades/scales them, so frame N stays a pure function of the frame.

import { scaleLinear } from "d3-scale";
import { HEATMAP_RAMP_LIGHT, heatmapRamp } from "./core/tokens";

export interface HeatmapData {
  rowField: string;
  colFields: string[]; // the columns (second dimension), in order
  rows: Record<string, string | number>[];
}

export interface HeatmapDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface HeatCell {
  rowIndex: number;
  colIndex: number;
  rowLabel: string;
  colLabel: string;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string; // sequential ramp colour for the value
}

export interface HeatmapLayout {
  innerWidth: number;
  innerHeight: number;
  cellW: number;
  cellH: number;
  cells: HeatCell[];
  rowLabels: string[];
  colLabels: string[];
  valueDomain: [number, number];
  /** the ramp stops (light → dark), exposed for the colourbar + conformance */
  rampStops: string[];
  /** sample the ramp at t∈[0,1] (for the colourbar gradient) */
  ramp: (t: number) => string;
}

// ColorBrewer single-hue "Blues" (light → dark), luminance strictly decreasing. The
// light-theme ramp lives in core/tokens (HEATMAP_RAMP_LIGHT) now — the SAME stops, kept
// here as a named re-export because the calendar heatmap (calendar-geometry.ts) still
// binds its ramp to BLUES directly. Byte-identical to the original literal.
export const BLUES = HEATMAP_RAMP_LIGHT;

function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function sampleRamp(stops: string[], t: number): string {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  if (stops.length === 1) return stops[0];
  const seg = clamped * (stops.length - 1);
  const i = Math.min(Math.floor(seg), stops.length - 2);
  return lerpHex(stops[i], stops[i + 1], seg - i);
}

export function computeHeatmapLayout(
  data: HeatmapData,
  dims: HeatmapDims,
  opts?: { baseColor?: string; themeBg?: string },
): HeatmapLayout {
  if (!data.rows.length)
    throw new Error("computeHeatmapLayout: data.rows is empty");
  if (!data.colFields.length)
    throw new Error("computeHeatmapLayout: colFields is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeHeatmapLayout: padding exceeds dimensions");

  const rowLabels = data.rows.map((r) => String(r[data.rowField]));
  const colLabels = [...data.colFields];

  // parse + collect values
  const grid = data.rows.map((r) =>
    data.colFields.map((c) => {
      const v = Number(r[c]);
      if (Number.isNaN(v))
        throw new Error(`invalid heatmap value for "${c}": ${r[c]}`);
      return v;
    }),
  );
  const flat = grid.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);

  // The sequential ramp DERIVED from the subject/house baseColor (heatmapRamp) and oriented for
  // the theme background: on a light ground pale→deep, on a dark ground visible-mid→bright so high
  // values read on the dark ground. Falls back to the Okabe-Ito blue default when no baseColor.
  // Cells, colourbar and the produce-time guard all read `stops` / rampStops → they never drift.
  const stops = heatmapRamp(opts?.baseColor, opts?.themeBg);
  const color = scaleLinear().domain([lo, hi]).range([0, 1]);
  const ramp = (t: number) => sampleRamp(stops, t);

  const nRows = rowLabels.length;
  const nCols = colLabels.length;
  const cellW = innerWidth / nCols;
  const cellH = innerHeight / nRows;

  const cells: HeatCell[] = [];
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const value = grid[r][c];
      cells.push({
        rowIndex: r,
        colIndex: c,
        rowLabel: rowLabels[r],
        colLabel: colLabels[c],
        value,
        x: c * cellW,
        y: r * cellH,
        w: cellW,
        h: cellH,
        color: ramp(color(value)),
      });
    }
  }

  return {
    innerWidth,
    innerHeight,
    cellW,
    cellH,
    cells,
    rowLabels,
    colLabels,
    valueDomain: [lo, hi],
    rampStops: stops,
    ramp,
  };
}
