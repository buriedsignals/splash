import type { ChartSpec } from "./chart-spec";
import {
  MULTI_SERIES_TYPES,
  normalizeNumberFormat,
  type ChartType,
} from "./chart-spec";
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
  // quadrant model in placeAnnotation.
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

// A label box in fractional plot coords (x,y each 0..1; y=0 is the plot TOP).
interface FracBox {
  xL: number;
  xR: number;
  top: number; // smaller yFrac (higher on screen)
  bottom: number; // larger yFrac (lower on screen)
}

// Does the plotted series pass through the INTERIOR of a fractional box? The anchor
// data point sits on the line at a CORNER of every candidate box, so corner/edge
// contact is expected and must NOT count — only a sample strictly inside (by `tol`)
// means the label body would overlap the curve. Sampled densely along each segment.
function lineCrossesBox(
  poly: { xFrac: number; yFrac: number }[],
  box: FracBox,
  tol = 0.01,
): boolean {
  const xL = box.xL + tol;
  const xR = box.xR - tol;
  const top = box.top + tol;
  const bot = box.bottom - tol;
  if (xR <= xL || bot <= top) return false;
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const steps = 24;
    for (let s = 0; s <= steps; s++) {
      const x = a.xFrac + ((b.xFrac - a.xFrac) * s) / steps;
      const y = a.yFrac + ((b.yFrac - a.yFrac) * s) / steps;
      if (x > xL && x < xR && y > top && y < bot) return true;
    }
  }
  return false;
}

// DECIDE where an annotation label sits, in a WIDTH-INVARIANT way. With dx=dy=0 the
// label box is anchored AT the data point and extends into one quadrant (up/down ×
// left/right/centre). We pick the quadrant whose box is clear of the plotted series
// (so the label never sits ON the curve) and needs the least axis headroom, then
// return the DW `align` plus how far the chosen box spills past the top/bottom of the
// data range (as a fraction of the y-span) — the caller extends the axis by that much
// so the label has real whitespace to occupy at EVERY render width. Horizontal spill
// is left to Datawrapper's own annotation clamp (it keeps text on-canvas), so only the
// vertical axis needs extending. Deterministic: same geometry → same placement.
export interface Placement {
  align: string; // DW anchor, e.g. "br"
  headroomTopFrac: number; // extend y-axis ABOVE data max by this × span (>=0)
  headroomBottomFrac: number; // extend BELOW data min by this × span (>=0)
}
export function placeAnnotation(
  polys:
    { xFrac: number; yFrac: number }[] | { xFrac: number; yFrac: number }[][],
  anchorX: number,
  anchorY: number,
  labelSpanFrac = 0.42,
): Placement {
  // Accept a single polyline (single-series) OR an array of polylines (multi-series).
  // On a multi-series chart a label must clear EVERY plotted line, not just its own —
  // otherwise it sits on a sibling series. Normalise to an array of polylines.
  const lines: { xFrac: number; yFrac: number }[][] =
    polys.length > 0 && Array.isArray((polys as unknown[])[0])
      ? (polys as { xFrac: number; yFrac: number }[][])
      : [polys as { xFrac: number; yFrac: number }[]];
  const hFrac = 0.09; // label height as a fraction of plot height (bold, + gap)
  // Candidate quadrants. vUp = box sits ABOVE the point (DW anchor bottom → "b");
  // vDown = below (anchor top → "t"). h="r": box extends LEFT (anchor right); h="l":
  // extends RIGHT; h="c": centred.
  const verticals = [
    { up: true, v: "b" },
    { up: false, v: "t" },
  ];
  const horizontals = [
    { key: "r", from: -labelSpanFrac, to: 0 },
    { key: "l", from: 0, to: labelSpanFrac },
    { key: "c", from: -labelSpanFrac / 2, to: labelSpanFrac / 2 },
  ];
  let best: {
    align: string;
    top: number;
    bottom: number;
    cost: number;
  } | null = null;
  for (const vert of verticals) {
    const top = vert.up ? anchorY - hFrac : anchorY;
    const bottom = vert.up ? anchorY : anchorY + hFrac;
    for (const hz of horizontals) {
      const box: FracBox = {
        xL: anchorX + hz.from,
        xR: anchorX + hz.to,
        top,
        bottom,
      };
      if (lines.some((line) => lineCrossesBox(line, box))) continue; // clear EVERY series
      const headTop = Math.max(0, -box.top); // spills above the plot top
      const headBot = Math.max(0, box.bottom - 1); // spills below the plot bottom
      // Horizontal spill is ASYMMETRIC in Datawrapper (measured): it CLAMPS a label
      // that would run off the LEFT back on-canvas, but lets a label overflow off the
      // RIGHT (it renders past the frame → a real clip). So a right overflow must
      // DOMINATE the cost (any on-canvas placement beats it), while a left overflow is
      // cheap (DW absorbs it; only mildly penalised so we don't bury the label under
      // the y-axis). Vertical spill (headroom) is NOT a clip — the axis is extended to
      // absorb it — so it is cheap too. All else equal, prefer the label ABOVE the
      // curve (reads better) via a small down-bias.
      const rightOverflow = Math.max(0, box.xR - 1);
      const leftOverflow = Math.max(0, -box.xL);
      const cost =
        rightOverflow * 20 +
        leftOverflow * 1 +
        (headTop + headBot) * 3 +
        (vert.up ? 0 : 0.3);
      if (!best || cost < best.cost)
        best = {
          align: `${vert.v}${hz.key}`,
          top: box.top,
          bottom: box.bottom,
          cost,
        };
    }
  }
  // Degenerate fallback (every quadrant crosses the line — a label wider than the
  // local relief): place above, centred, and let the measured remediation + headroom
  // in produce() resolve it. Never returns a placement that we know sits on the line
  // when a clear one exists.
  if (!best) {
    const top = anchorY - hFrac;
    return {
      align: "bc",
      headroomTopFrac: Math.max(0, -top),
      headroomBottomFrac: 0,
    };
  }
  return {
    align: best.align,
    headroomTopFrac: Math.max(0, -best.top),
    headroomBottomFrac: Math.max(0, best.bottom - 1),
  };
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
  // Normalise the number token so a printf/Python mistake (".1f") becomes a valid
  // Datawrapper token ("0.0") instead of shipping garbage value labels.
  const numberFormat = spec.numberFormat
    ? normalizeNumberFormat(spec.numberFormat)
    : undefined;
  const valueFormat = spec.valueFormat
    ? normalizeNumberFormat(spec.valueFormat)
    : undefined;
  describe["number-format"] = numberFormat ?? "0,0.[00]";

  const visualize: Record<string, unknown> = {};
  // bar/column value labels honour `value-label-format`, NOT describe.number-format
  if (numberFormat) visualize["value-label-format"] = numberFormat;
  // The numeric axis honours `y-grid-format` (numeral.js token). Prefer an
  // explicit valueFormat (e.g. '$0,0a' currency, or '00:00:00' → h:mm:ss for a
  // seconds axis), else fall back to the number format so the axis and the
  // value labels stay in sync.
  const axisFormat = valueFormat ?? numberFormat;
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
    const span = dom.yMax - dom.yMin || 1;
    // Every VALUE column's polyline (all columns after the label column). A label must
    // clear EVERY plotted series, not only the one it annotates — on a multi-series
    // chart the label would otherwise sit on a sibling line (F6). Built once.
    const header = csv
      .trim()
      .split("\n")[0]
      .split(",")
      .map((c) => c.trim());
    const allPolys = header
      .slice(1)
      .map((col) => seriesPolyline(csv, dom, col))
      .filter((p) => p.length >= 2);
    // Accumulate the axis headroom every annotation needs, as a fraction of the
    // y-span, so a near-extreme label (a peak at the max) has real whitespace to sit
    // in — the extension is in DATA space, therefore identical at every render width.
    let headTopFrac = 0;
    let headBotFrac = 0;
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

      // WIDTH-INVARIANT PLACEMENT. The label is anchored at the DATA point (x,y) with
      // NO pixel dx/dy — absolute offsets are exactly what broke at responsive widths,
      // because they clear the curve at one export width but push the label off-canvas
      // / onto the ticks at every other width. Instead `placeAnnotation` picks the
      // quadrant (align) whose box clears the plotted series, and reports how much
      // axis headroom that box needs; both are data-space, so the label stays off the
      // curve and on-canvas at ALL widths. Datawrapper clamps any horizontal overflow.
      const { xFrac, yFrac } = pointFraction(dom, a.x, y);
      // Clear ALL series (multi-series safe), falling back to the annotated column's
      // own polyline if the header scan found nothing.
      const polys =
        allPolys.length > 0 ? allPolys : [seriesPolyline(csv, dom, column)];
      const place = placeAnnotation(polys, xFrac, yFrac);
      headTopFrac = Math.max(headTopFrac, place.headroomTopFrac);
      headBotFrac = Math.max(headBotFrac, place.headroomBottomFrac);

      return {
        text: a.text,
        x: a.x !== undefined ? String(a.x) : "",
        y: y !== undefined ? String(y) : "",
        bold: true,
        color: "#333333",
        align: place.align,
        dx: 0,
        dy: 0,
        // The text lives off its data point by design → always draw the connector.
        connectorLine: { enabled: true, type: "straight", arrowHead: "none" },
        showMobile: true,
        showDesktop: true,
      };
    });

    // Extend the numeric axis so the chosen label boxes have whitespace to occupy.
    // A small base pad (0.06) is always added so a label anchored exactly at the data
    // extent is never flush against the frame; the per-annotation headroom is added on
    // top. Both bounds are pinned (deterministic) — DW then renders identical geometry
    // at every width, which is what makes the guardrail's "validated == delivered"
    // hold across the whole responsive envelope, not just the export width.
    const BASE = 0.06;
    const rangeMax = dom.yMax + (headTopFrac + BASE) * span;
    const rangeMin = dom.yMin - (headBotFrac + BASE) * span;
    visualize["custom-range-y"] = [
      String(Math.round(rangeMin)),
      String(Math.round(rangeMax)),
    ];
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
