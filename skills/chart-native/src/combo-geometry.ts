// Pure geometry core for the LINE + COLUMN combo (dual-axis) — framework-free
// (D3 = math). Columns encode one series against the LEFT axis (length → the axis
// MUST include 0, like any bar); a line encodes a second series against an
// INDEPENDENT right axis (a rate/ratio → not forced to 0). Shared x. A dual axis
// can mislead, so the honest discipline is enforced elsewhere: both axes labelled,
// each series coloured to its own axis (checkComboConformance). The reveal grows
// the columns and draws the line in the component (pure fn of progress).
//
// ★ THE BANDS. The two scales do NOT share the frame. The column axis is mapped onto the
// BOTTOM `COLUMN_BAND` of the inner height and the line axis onto the TOP band, with a gutter
// between them, so the line can never cross the column tops.
//
// That is not decoration. With two independent scales the author can place the line anywhere
// relative to the columns: a reader who sees the line rise above the columns in July reads an
// overtake that exists only in the choice of right-hand domain — nudge that domain and the
// crossing moves to March, or disappears. The units differ by construction
// (checkComboConformance refuses a combo whose two series share a unit), so the crossing can
// never be a fact about the data. It is the most-cited dual-axis abuse, and the standard
// newsroom fix is exactly this: give the line its own band above the columns. Co-movement
// still reads; the manufactured event cannot occur.
//
// Cost, stated plainly: each series gets a fraction of the height rather than all of it, so
// both are drawn smaller than a single-axis chart would draw them. That is the price of not
// lying, and it is a knob (COLUMN_BAND) rather than a hidden constant.

import { scaleBand, scaleLinear } from "d3-scale";
import { formatNumber } from "./core/math";

export interface ComboData {
  categoryField: string;
  columnField: string; // left-axis series
  lineField: string; // right-axis series
  rows: Record<string, string | number>[];
}

export interface ComboDims {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ComboColumn {
  index: number;
  category: string;
  value: number;
  x: number; // left edge of the band-padded column
  w: number;
  y: number; // top of the column at full value
  h: number; // height at full value
}

export interface ComboLinePoint {
  index: number;
  category: string;
  value: number;
  cx: number; // band centre
  cy: number; // y on the right axis
}

export interface ComboLayout {
  innerWidth: number;
  innerHeight: number;
  columns: ComboColumn[];
  linePoints: ComboLinePoint[];
  leftTicks: { value: number; y: number; label: string }[];
  rightTicks: { value: number; y: number; label: string }[];
  leftDomain: [number, number];
  rightDomain: [number, number];
  /** MEASURED on the laid-out marks (not assumed from the constants): every line point sits
   *  strictly above the tallest column top. checkComboConformance refuses a false value, so a
   *  regression in the band constants fails the produce instead of shipping a fake crossing. */
  lineClearsColumns: boolean;
  /** does the right (line) axis show its own zero? A rate axis legitimately does not — but the
   *  guard needs to know, because a suppressed zero is what turns a flat series into a mountain. */
  rightAxisIncludesZero: boolean;
  /** (max − min) / max(|max|, |min|) for the line series — its variation RELATIVE to its own
   *  level. A series that moves by a fraction of a percent of itself must not be drawn as a
   *  full-height trend on a zero-suppressed axis. 0 when the series is flat or all-zero. */
  lineRelativeRange: number;
}

/** Fraction of the inner height the COLUMN axis is mapped onto (from the baseline up). Knob. */
const COLUMN_BAND = 0.62;
/** Fraction of the inner height left EMPTY between the top of the column band and the bottom
 *  of the line band — the separation the no-crossing invariant is bought with. Knob. */
const BAND_GUTTER = 0.04;
/** Fraction of the inner height reserved above the line band, so the highest line point does
 *  not touch the plot ceiling. Knob. */
const LINE_HEADROOM = 0.02;
/** Minimum vertical distance, in px, between two tick labels on the same axis. Knob.
 *
 *  This exists because the bands made it necessary and a real render proved it: giving the line
 *  axis a third of the frame left d3's default five-ish ticks stacked ~6 px apart, and the
 *  produce-time contrast snap failed with a 1:1 ratio — each label was sampling its NEIGHBOUR as
 *  its background. Overlapping labels are illegible before they are anything else, so the tick
 *  count is derived from the height each axis actually got rather than fixed at 5. */
const MIN_TICK_SPACING_PX = 28;

/**
 * Drop ticks until no two labels are closer than MIN_TICK_SPACING_PX in `bandPx`.
 *
 * HALVES (keeps every other tick) rather than thinning to a target count: an evenly spaced list
 * strided by 2 is still evenly spaced, whereas picking N of M by rounded index is not — the
 * first version of this did exactly that and produced gaps of 24/47/24 px on a 480 px frame,
 * which is worse than the crowding it replaced.
 *
 * Never goes below TWO ticks, even if they are then closer than the floor: that is the count
 * checkComboConformance requires on a zero-suppressed axis, because one tick cannot show a
 * reader where the scale starts. A band too small for two legible ticks is a frame-size problem,
 * not a reason to hide the scale.
 */
export function fitTicks<T>(ticks: T[], yOf: (t: T) => number): T[] {
  // Measured from the ticks' OWN rendered positions, not from the band height. The right
  // domain is padded 10% at each end, so its ticks never span the whole band — dividing the
  // band by the tick count over-estimated the gap by a fifth and let five labels through at
  // 23.7 px on a 480 px frame, under the 28 px floor. Ask the positions.
  const minGap = (list: T[]) => {
    const ys = list.map(yOf).sort((a, b) => a - b);
    let m = Infinity;
    for (let i = 1; i < ys.length; i++) m = Math.min(m, ys[i] - ys[i - 1]);
    return m;
  };
  let out = ticks;
  while (out.length > 2 && minGap(out) < MIN_TICK_SPACING_PX)
    out = out.filter((_, i) => i % 2 === 0);
  return out;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** A "nice" [min,max] for the right (rate) axis — NOT forced to 0. */
function niceExtent(lo: number, hi: number): [number, number] {
  if (lo === hi) return [lo - 1, hi + 1];
  const span = hi - lo;
  const pad = span * 0.1;
  return [lo - pad, hi + pad];
}

export function computeComboLayout(
  data: ComboData,
  dims: ComboDims,
): ComboLayout {
  if (!data.rows.length)
    throw new Error("computeComboLayout: data.rows is empty");
  const { width, height, padding } = dims;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  if (innerWidth <= 0 || innerHeight <= 0)
    throw new Error("computeComboLayout: padding exceeds dimensions");

  const parsed = data.rows.map((r) => {
    const colV = Number(r[data.columnField]);
    const lineV = Number(r[data.lineField]);
    if (Number.isNaN(colV))
      throw new Error(`invalid column value: ${r[data.columnField]}`);
    if (Number.isNaN(lineV))
      throw new Error(`invalid line value: ${r[data.lineField]}`);
    if (colV < 0)
      throw new Error("combo column cannot encode a negative value as length");
    return { category: String(r[data.categoryField]), colV, lineV };
  });

  const band = scaleBand<number>()
    .domain(parsed.map((_, i) => i))
    .range([0, innerWidth])
    .padding(0.3);

  // The two bands (see the header): columns own the bottom COLUMN_BAND of the frame, the line
  // owns the top, and BAND_GUTTER of empty height separates them.
  const columnBandTop = innerHeight * (1 - COLUMN_BAND);
  const lineBandBottom = columnBandTop - innerHeight * BAND_GUTTER;
  const lineBandTop = innerHeight * LINE_HEADROOM;

  // LEFT axis: columns → must include 0 (length encoding), mapped onto the bottom band.
  const leftMax = niceMax(Math.max(...parsed.map((d) => d.colV)));
  const left = scaleLinear()
    .domain([0, leftMax])
    .range([innerHeight, columnBandTop]);

  // RIGHT axis: line (a rate) → independent, nice extent, not forced to 0, mapped onto the
  // TOP band so it can never cross the columns.
  const lineLo = Math.min(...parsed.map((d) => d.lineV));
  const lineHi = Math.max(...parsed.map((d) => d.lineV));
  const rightDomain = niceExtent(lineLo, lineHi);
  const right = scaleLinear()
    .domain(rightDomain)
    .range([lineBandBottom, lineBandTop]);

  const bw = band.bandwidth();
  const columns: ComboColumn[] = parsed.map((d, i) => {
    const y = left(d.colV);
    return {
      index: i,
      category: d.category,
      value: d.colV,
      x: band(i) ?? 0,
      w: bw,
      y,
      h: innerHeight - y,
    };
  });

  const linePoints: ComboLinePoint[] = parsed.map((d, i) => ({
    index: i,
    category: d.category,
    value: d.lineV,
    cx: (band(i) ?? 0) + bw / 2, // exactly the column band centre
    cy: right(d.lineV),
  }));

  // compact tick labels (1000000 → "1M") so wide axes never overflow the gutter, and a tick
  // COUNT derived from the height each band actually received (see MIN_TICK_SPACING_PX).
  // d3's `.ticks(n)` treats n as a hint and may return more, so the result is trimmed to the
  // count that fits — evenly, keeping the first and last so the axis still shows its range.
  const leftTicks = fitTicks(left.ticks(5), left).map((t) => ({
    value: t,
    y: left(t),
    label: formatNumber(t),
  }));
  const rightTicks = fitTicks(right.ticks(5), right).map((t) => ({
    value: t,
    y: right(t),
    label: formatNumber(t),
  }));

  // MEASURED, not assumed. curveMonotoneX (the component's interpolation) never overshoots the
  // y-range of the points it joins, so the extremes of the drawn path are the extremes of these
  // points — checking the points checks the path.
  const lowestLinePoint = Math.max(...linePoints.map((p) => p.cy));
  const highestColumnTop = Math.min(...columns.map((c) => c.y));
  const lineMagnitude = Math.max(Math.abs(lineHi), Math.abs(lineLo));

  return {
    innerWidth,
    innerHeight,
    columns,
    linePoints,
    leftTicks,
    rightTicks,
    leftDomain: [0, leftMax],
    rightDomain,
    lineClearsColumns: lowestLinePoint < highestColumnTop,
    rightAxisIncludesZero: rightDomain[0] <= 0 && rightDomain[1] >= 0,
    lineRelativeRange:
      lineMagnitude === 0 ? 0 : (lineHi - lineLo) / lineMagnitude,
  };
}
