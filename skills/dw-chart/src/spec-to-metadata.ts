import type { ChartSpec } from "./chart-spec";
import { MULTI_SERIES_TYPES, type ChartType } from "./chart-spec";
import { dataShape, renameColumns, sortCsv, valueAt } from "./csv";

// Line/area chart types whose default "direct labelling" puts the series name at
// the line end — the clip/overlap source on a single series (the title + subtitle
// already name it, and DW reserves no right gutter for the wrapped label).
const LINE_LIKE_TYPES = new Set<ChartType>([
  "d3-lines",
  "multiple-lines",
  "d3-area",
]);

// A single value column means a single series: the title/subtitle already name
// it, so the line-end direct label adds nothing and is the clip source.
function isSingleSeries(spec: ChartSpec): boolean {
  if (MULTI_SERIES_TYPES.has(spec.type)) return false;
  const csv = spec.seriesLabels
    ? renameColumns(spec.data, spec.seriesLabels)
    : spec.data;
  return dataShape(csv).columns.length <= 2; // 1 label + 1 value
}

// The plot's x/y domain, read from the resolved CSV, so an annotation's point can
// be placed as a fraction (0..1) of the plot. x is categorical on a line chart:
// its fraction is the row index over (rows - 1). y is the numeric value domain.
interface PlotDomain {
  labels: string[];
  yMin: number;
  yMax: number;
}
function plotDomain(csv: string): PlotDomain {
  const lines = csv.trim().split("\n");
  const rows = lines.slice(1).map((l) => l.split(","));
  const labels = rows.map((r) => r[0]?.trim() ?? "");
  const values: number[] = [];
  for (const r of rows) {
    for (const cell of r.slice(1)) {
      const n = Number(cell);
      if (Number.isFinite(n)) values.push(n);
    }
  }
  const yMin = values.length ? Math.min(...values) : 0;
  const yMax = values.length ? Math.max(...values) : 1;
  return { labels, yMin, yMax };
}

function pointFraction(
  dom: PlotDomain,
  x: string | number | undefined,
  y: number | undefined,
): { xFrac: number; yFrac: number } {
  const idx = x !== undefined ? dom.labels.indexOf(String(x).trim()) : -1;
  const xFrac =
    idx >= 0 && dom.labels.length > 1 ? idx / (dom.labels.length - 1) : 0.5;
  // yFrac is 0 at the TOP of the plot (high value) → 1 at the bottom, matching the
  // "near top / near bottom" edge test in inwardPlacement.
  const span = dom.yMax - dom.yMin;
  const yFrac = y !== undefined && span > 0 ? (dom.yMax - y) / span : 0.5;
  return { xFrac, yFrac };
}

// Deterministically anchor an annotation INWARD so it can neither be clipped by a
// plot edge nor collide with the last axis tick. `x`/`y` are the point's fractional
// position in the plot (0..1). Near an edge, we flip the anchor to that side and add
// an inward nudge; the label then extends away from the edge, into the plot.
function inwardPlacement(
  xFrac: number,
  yFrac: number,
  preferred?: string,
): { align: string; dx: number; dy: number } {
  // preferred is a DW anchor like "tr" (vertical, horizontal). Start from it when
  // the point is comfortably interior; override the component that faces an edge.
  const NEAR = 0.12; // within 12% of an edge is "near"
  const PULL = 10; // px inward nudge

  let v = preferred?.[0] ?? "b"; // t|m|b
  let h = preferred?.[1] ?? "l"; // l|c|r
  let dx = 0;
  let dy = 0;

  if (xFrac > 1 - NEAR) {
    // near right edge → anchor right so the label extends left (inward)
    h = "r";
    dx = -PULL;
  } else if (xFrac < NEAR) {
    h = "l";
    dx = PULL;
  }
  if (yFrac < NEAR) {
    // near top → anchor top so the label extends down (inward)
    v = "t";
    dy = PULL;
  } else if (yFrac > 1 - NEAR) {
    v = "b";
    dy = -PULL;
  }
  return { align: `${v}${h}`, dx, dy };
}

export interface DwPatch {
  title: string;
  type: string;
  metadata: {
    describe: Record<string, unknown>;
    visualize: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
}

// The single source of truth for the CSV that reaches Datawrapper: apply the
// human column labels first, then the ranking sort. Both the data upload and
// the metadata mapping (annotation y-derivation) must see the SAME CSV, so
// resolve it once here.
export function resolveData(spec: ChartSpec): string {
  let csv = spec.data;
  if (spec.seriesLabels) csv = renameColumns(csv, spec.seriesLabels);
  if (spec.sort) csv = sortCsv(csv, spec.sort);
  return csv;
}

export function specToMetadata(spec: ChartSpec): DwPatch {
  const csv = resolveData(spec);

  const describe: Record<string, unknown> = {
    intro: spec.intro ?? "",
    "source-name": spec.source?.name ?? "",
    "source-url": spec.source?.url ?? "",
    "aria-description": spec.altInsight,
  };
  describe["number-format"] = spec.numberFormat ?? "0,0.[00]";

  const visualize: Record<string, unknown> = {};
  // bar/column value labels honour `value-label-format`, NOT describe.number-format
  if (spec.numberFormat) visualize["value-label-format"] = spec.numberFormat;
  // The numeric axis honours `y-grid-format` (numeral.js token). Prefer an
  // explicit valueFormat (e.g. '$0,0a' currency, or '00:00:00' → h:mm:ss for a
  // seconds axis), else fall back to the number format so the axis and the
  // value labels stay in sync.
  const axisFormat = spec.valueFormat ?? spec.numberFormat;
  if (axisFormat) visualize["y-grid-format"] = axisFormat;
  if (spec.baseColor) visualize["base-color"] = spec.baseColor;
  if (spec.valueLabels !== undefined)
    visualize["value-labels"] = { show: spec.valueLabels };
  if (spec.seriesColors) visualize["custom-colors"] = spec.seriesColors;

  // LABEL SAFETY (publishable-blocker guard): the line-end direct label on a
  // SINGLE-series line/area chart wraps and clips the right edge / collides with
  // the last x-tick (the title + subtitle already name the series). Turn direct
  // labelling OFF for that case — DW then reclaims the right gutter, so nothing
  // can clip. Multi-series keeps `labeling:"right"` (the labels ARE the legend)
  // and DW reserves margin for them.
  if (LINE_LIKE_TYPES.has(spec.type))
    visualize["labeling"] = isSingleSeries(spec) ? "off" : "right";

  if (spec.annotations && spec.annotations.length) {
    const dom = plotDomain(csv);
    // Track placed label anchors to offset a second annotation that would land on
    // the same point (deterministic vertical stacking).
    const placedByKey = new Map<string, number>();
    visualize["text-annotations"] = spec.annotations.map((a) => {
      // Resolve the series column name AFTER renaming, so an annotation pinned
      // to a machine-named column still finds its (renamed) series.
      const column =
        a.column && spec.seriesLabels?.[a.column]
          ? spec.seriesLabels[a.column]
          : a.column;
      // Datawrapper DROPS a line-chart annotation with no numeric y. Derive it
      // from the data at x when the spec pins only an x.
      const y =
        a.y !== undefined
          ? a.y
          : a.x !== undefined
            ? valueAt(csv, a.x, column)
            : undefined;

      // Deterministically clamp the label inside the plot and off the axis ticks:
      // derive align + dx/dy from the point's fractional position. The computed
      // inward placement WINS over the spec near an edge (manual per-chart align/dx
      // is exactly what let case 3 clip/collide); the spec align only seeds the
      // interior direction. Any spec dx/dy is added on top of the inward pull.
      const { xFrac, yFrac } = pointFraction(dom, a.x, y);
      const placed = inwardPlacement(xFrac, yFrac, a.align);
      const align = placed.align;
      let dx = placed.dx + (a.dx ?? 0);
      let dy = placed.dy + (a.dy ?? 0);

      // Collision offset: if another annotation already anchored the same point,
      // push this one down a line-height so the two texts can't overlap.
      const key = `${a.x ?? ""}|${align}`;
      const stacked = placedByKey.get(key) ?? 0;
      if (stacked > 0) dy += stacked * 18; // ~one bold line-height per prior label
      placedByKey.set(key, stacked + 1);

      const nudged = dx !== 0 || dy !== 0;
      return {
        text: a.text,
        x: a.x !== undefined ? String(a.x) : "",
        y: y !== undefined ? String(y) : "",
        bold: true,
        color: "#333333",
        align,
        dx,
        dy,
        // Give a near-edge callout a connector so, once nudged inward, it still
        // points at its data point.
        connectorLine: nudged
          ? { enabled: true, type: "straight", arrowHead: "none" }
          : { enabled: false },
        showMobile: true,
        showDesktop: true,
      };
    });
  }

  const patch: DwPatch = {
    title: spec.title,
    type: spec.type,
    metadata: { describe, visualize },
  };
  if (spec.transpose !== undefined)
    patch.metadata.data = { transpose: spec.transpose };
  return patch;
}
