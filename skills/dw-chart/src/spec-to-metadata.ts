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

// The series as a polyline in fractional plot coords: x = row index / (n-1) left
// → right; y = 0 at the top (max value) → 1 at the bottom (min value). Only the
// column pinned by the annotation is walked (or the first value column).
export function seriesPolyline(
  csv: string,
  dom: PlotDomain,
  column?: string,
): { xFrac: number; yFrac: number }[] {
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",").map((c) => c.trim());
  const colIdx = column ? Math.max(1, header.indexOf(column)) : 1;
  const span = dom.yMax - dom.yMin;
  const pts: { xFrac: number; yFrac: number }[] = [];
  const rows = lines.slice(1);
  rows.forEach((line, i) => {
    const cells = line.split(",");
    const v = Number(cells[colIdx]);
    if (!Number.isFinite(v)) return;
    const xFrac = rows.length > 1 ? i / (rows.length - 1) : 0.5;
    const yFrac = span > 0 ? (dom.yMax - v) / span : 0.5;
    pts.push({ xFrac, yFrac });
  });
  return pts;
}

// Interpolate the series' yFrac at an arbitrary xFrac (linear between vertices).
function lineYAt(
  poly: { xFrac: number; yFrac: number }[],
  xFrac: number,
): number | undefined {
  if (!poly.length) return undefined;
  if (xFrac <= poly[0].xFrac) return poly[0].yFrac;
  if (xFrac >= poly[poly.length - 1].xFrac) return poly[poly.length - 1].yFrac;
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    if (xFrac >= a.xFrac && xFrac <= b.xFrac) {
      const t =
        b.xFrac === a.xFrac ? 0 : (xFrac - a.xFrac) / (b.xFrac - a.xFrac);
      return a.yFrac + t * (b.yFrac - a.yFrac);
    }
  }
  return poly[poly.length - 1].yFrac;
}

// The series' yFrac extent over the horizontal band the label body occupies.
// A right-anchored label extends LEFT of the anchor, a left-anchored one RIGHT.
// Returns the min (highest) and max (lowest) line yFrac across that band — the
// vertical slab the label must clear to sit in whitespace.
function lineExtentOverLabel(
  poly: { xFrac: number; yFrac: number }[],
  anchorX: number,
  horiz: "l" | "c" | "r",
  wFrac: number,
): { yMin: number; yMax: number } {
  const from = horiz === "r" ? -wFrac : horiz === "l" ? 0 : -wFrac / 2;
  const to = from + wFrac;
  let yMin = Infinity;
  let yMax = -Infinity;
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const xf = anchorX + from + ((to - from) * i) / steps;
    const y = lineYAt(poly, Math.min(1, Math.max(0, xf)));
    if (y === undefined) continue;
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  return { yMin, yMax };
}

// Choose the vertical side (above vs below the anchor) AND the displacement (in
// plot-height fractions) that puts the WHOLE label in whitespace, off the curve.
// Deterministic and consistent with the render guardrail: the displacement clears
// the line's full vertical excursion over the label's horizontal band (so a wide
// label over a steep line is pushed far enough), and the side is chosen so the
// label does not run off the padded plot. `dyFrac` is signed (negative = up); the
// caller scales it to pixels by the estimated plot height.
export function clearVerticalSide(
  poly: { xFrac: number; yFrac: number }[],
  anchorX: number,
  anchorY: number,
  labelSpanFrac = 0.48,
  horiz: "l" | "c" | "r" = "c",
): { v: "t" | "b"; dySign: number; dyFrac: number; horiz: "l" | "c" | "r" } {
  const hFrac = 0.06; // ~one bold line-height as a fraction of plot height
  const gap = 0.09; // clear gap between the line and the nearest label edge
  const AXIS_PAD = 0.08; // DW pads the numeric axis beyond the data extent
  if (poly.length < 2)
    return { v: "t", dySign: -1, dyFrac: -(hFrac + gap), horiz };

  // Evaluate one horizontal extension direction: the vertical push each side needs
  // to clear the line under the label, whether that side fits the padded plot, and
  // a penalty (clip = huge, else the displacement magnitude). Extending the label
  // toward the GENTLER slope needs a smaller push — so we also try the opposite
  // horizontal anchor and keep whichever placement is cheapest.
  const evalHoriz = (hz: "l" | "c" | "r") => {
    const { yMin, yMax } = lineExtentOverLabel(
      poly,
      anchorX,
      hz,
      labelSpanFrac,
    );
    // Horizontal box extent, to penalise a label running off the left/right edge
    // (r → extends left, l → right, c → half each way).
    const x0 =
      hz === "r"
        ? anchorX - labelSpanFrac
        : hz === "l"
          ? anchorX
          : anchorX - labelSpanFrac / 2;
    const hClip = x0 < 0 || x0 + labelSpanFrac > 1;
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax))
      return {
        hz,
        below: false,
        dyFrac: -(hFrac + gap),
        cost: (hClip ? 10 : 0) + hFrac + gap,
      };
    const upFrac = anchorY - yMin + gap; // upward near-edge travel
    const downFrac = yMax - anchorY + gap; // downward near-edge travel
    const fitsAbove = anchorY - upFrac - hFrac >= -AXIS_PAD;
    const fitsBelow = anchorY + downFrac + hFrac <= 1 + AXIS_PAD;
    let below: boolean;
    if (fitsAbove && !fitsBelow) below = false;
    else if (fitsBelow && !fitsAbove) below = true;
    else below = downFrac < upFrac;
    const dyFrac = below ? downFrac + hFrac / 2 : -(upFrac + hFrac / 2);
    const travel = below ? downFrac : upFrac;
    const vClip = below ? !fitsBelow : !fitsAbove;
    // Vertical or horizontal clipping is a hard penalty; else prefer the smaller
    // vertical push (keeps the label tighter to its data point).
    return {
      hz,
      below,
      dyFrac,
      cost: (vClip ? 10 : 0) + (hClip ? 10 : 0) + travel,
    };
  };

  // Candidate horizontal anchors: the requested one, plus — for an INTERIOR anchor
  // — its mirror (l↔r) and CENTER, so a near-apex label can extend toward the
  // calmer side of the curve or straddle the apex (half the width each way, so it
  // clears the descending arms with a small push and stays on-canvas). Near a plot
  // edge the horizontal anchor is fixed by edge-clamping (flipping it would push
  // the label off-canvas), so only widen the choice when the anchor is interior.
  const NEAR_EDGE = 0.15;
  const interior = anchorX > NEAR_EDGE && anchorX < 1 - NEAR_EDGE;
  const mirror: Record<string, "l" | "c" | "r"> = { l: "r", r: "l", c: "c" };
  const candidates = [evalHoriz(horiz)];
  if (interior) {
    if (mirror[horiz] !== horiz) candidates.push(evalHoriz(mirror[horiz]));
    if (horiz !== "c") candidates.push(evalHoriz("c"));
  }
  candidates.sort((a, b) => a.cost - b.cost);
  const best = candidates[0];
  return best.below
    ? { v: "b", dySign: 1, dyFrac: best.dyFrac, horiz: best.hz }
    : { v: "t", dySign: -1, dyFrac: best.dyFrac, horiz: best.hz };
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

// The horizontal position (0..1, left→right) of an annotation's data-x within the
// plotted row range — the same mapping DW uses to place the connector origin.
// Exposed so produce() can recover the on-curve ANCHOR x-pixel at the measured
// export width (map this fraction onto the measured series x-extent), independent
// of any dx the label carries. Width-independent by construction.
export function annotationXFrac(
  csv: string,
  x: string | number | undefined,
): number {
  const dom = plotDomain(csv);
  return pointFraction(dom, x, undefined).xFrac;
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
    // Plot-area height (px) of a 600px-wide Datawrapper line/area export, used to
    // convert the fractional off-line displacement into a pixel dy nudge.
    const PLOT_H_PX = 320;
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

      // OFF-LINE PLACEMENT (text-vs-data): put the label in the empty whitespace
      // beside the curve, never ON it. `clearVerticalSide` picks the side
      // (above/below the anchor) with the most clearance from the local series
      // geometry and OWNS the vertical entirely — the anchor's vertical component
      // and the whole dy displacement — so the inward edge-pull (which points
      // toward the line at a peak/trough) can't drag the text back onto the curve.
      // It may also flip the horizontal anchor to extend the label over the calmer
      // side of the curve. This is what the completed guardrail enforces; here we
      // satisfy it deterministically. The authored dy is intentionally dropped: a
      // manual vertical nudge is exactly what put earlier labels on the line.
      const poly = seriesPolyline(csv, dom, column);
      const h = placed.align[1] as "l" | "c" | "r";
      const side = clearVerticalSide(poly, xFrac, yFrac, 0.48, h);
      const align = `${side.v}${side.horiz}`;
      // HORIZONTAL nudge: the inward edge-clamp always applies; the authored dx is
      // only kept when the horizontal anchor was NOT flipped (a flip re-references
      // the offset, so an authored nudge for the old side no longer makes sense).
      let dx = placed.dx + (side.horiz === h ? (a.dx ?? 0) : 0);
      // Convert the fractional displacement to pixels using the export plot height
      // (600px-wide Datawrapper line chart renders a plot area ~320px tall). The
      // sign is carried by dyFrac (negative = up, into whitespace above the curve).
      let dy = Math.round(side.dyFrac * PLOT_H_PX);

      // Collision offset: if another annotation already anchored the same point,
      // push this one further along its clear side so the two texts can't overlap.
      const key = `${a.x ?? ""}|${align}`;
      const stacked = placedByKey.get(key) ?? 0;
      if (stacked > 0) dy += side.dySign * stacked * 18; // one line-height/prior
      placedByKey.set(key, stacked + 1);

      // Always connect: the text now lives off its data point by design.
      const nudged = true;
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
