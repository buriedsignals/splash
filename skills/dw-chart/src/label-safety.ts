import { chromium, type Browser } from "playwright";

// Label-safety guardrail. Loads a published/exported Datawrapper chart, enumerates
// the bounding rects of every text element (series direct labels, text-annotations,
// axis tick labels, title/subtitle) and FAILS if any rect (a) extends beyond the
// chart's content box (clipped / off-canvas) or (b) intersects another text rect.
//
// This is deterministic: same DOM → same rects → same verdict. It runs headless at
// a fixed viewport so a chart that clips or overlaps a label cannot pass produce().

export interface TextRect {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  // "annotation" = a callout / direct series label that MUST live in whitespace
  // (checked against the series line). "furniture" = axis ticks, title, subtitle
  // — those sit outside the plot area and are only clip/overlap-checked.
  kind?: "annotation" | "furniture";
}

// A sampled point of a plotted series (either a vertex of the data polyline or a
// point sampled along a <path>). The series is the ordered list of these points.
export interface Point {
  x: number;
  y: number;
}

export interface LabelSafetyResult {
  ok: boolean;
  violations: string[];
  rects: TextRect[];
}

const EDGE_TOLERANCE = 1.5; // px slack for sub-pixel rounding / antialiasing
const OVERLAP_TOLERANCE = 2; // px of intersection ignored (touching descenders etc.)
const LINE_TOLERANCE = 1; // px of text-vs-line intersection ignored (antialiasing)

function overlapArea(a: TextRect, b: TextRect): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ix > OVERLAP_TOLERANCE && iy > OVERLAP_TOLERANCE ? ix * iy : 0;
}

// Two rects are the SAME logical label rendered twice (Datawrapper sometimes emits a
// tick both as an SVG <text> and as an `export-text` span at the same spot — most
// visibly on multi-series charts) when they carry identical text and their boxes very
// nearly coincide. That is a duplicate, NOT a collision, so it must not be flagged as
// an overlap. Require identical text AND a high intersection-over-union.
function isDuplicateRender(a: TextRect, b: TextRect): boolean {
  if (a.text !== b.text) return false;
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  if (inter <= 0) return false;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 && inter / union > 0.6;
}

// Shrink a rect by `pad` on every side, so a segment that only grazes the very
// edge (antialiasing slack) is not counted as an intersection.
function padRect(r: TextRect, pad: number): TextRect {
  return {
    text: r.text,
    x: r.x + pad,
    y: r.y + pad,
    w: r.w - 2 * pad,
    h: r.h - 2 * pad,
  };
}

// Does axis-aligned rect `r` intersect the line segment p→q? Uses the slab
// (Liang–Barsky) clip: the segment enters the rect iff the parametric overlap of
// its x-range and y-range against the rect is non-empty.
export function segmentIntersectsRect(
  p: Point,
  q: Point,
  r: TextRect,
): boolean {
  const rx0 = r.x;
  const ry0 = r.y;
  const rx1 = r.x + r.w;
  const ry1 = r.y + r.h;
  if (r.w <= 0 || r.h <= 0) return false;
  // Either endpoint inside the rect → intersects.
  const inside = (pt: Point) =>
    pt.x >= rx0 && pt.x <= rx1 && pt.y >= ry0 && pt.y <= ry1;
  if (inside(p) || inside(q)) return true;

  const dx = q.x - p.x;
  const dy = q.y - p.y;
  let t0 = 0;
  let t1 = 1;
  // Liang–Barsky: for each boundary, pk is the direction coefficient and qk the
  // signed distance from p to the boundary. Reject if parallel & outside; else
  // narrow the [t0,t1] parametric window. The segment hits the rect iff t0 <= t1.
  const pk = [-dx, dx, -dy, dy];
  const qk = [p.x - rx0, rx1 - p.x, p.y - ry0, ry1 - p.y];
  for (let k = 0; k < 4; k++) {
    if (pk[k] === 0) {
      if (qk[k] < 0) return false; // parallel to this edge and outside the slab
      continue;
    }
    const t = qk[k] / pk[k];
    if (pk[k] < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return t0 <= t1;
}

// Does a text rect sit on the plotted series? True if any polyline segment (or a
// data-point marker, i.e. any vertex) crosses the rect. This is the missing
// text-vs-DATA check: annotations must live in whitespace, not on the curve.
export function rectHitsSeries(rect: TextRect, series: Point[]): boolean {
  const r = padRect(rect, LINE_TOLERANCE);
  if (r.w <= 0 || r.h <= 0) return false;
  for (let i = 0; i + 1 < series.length; i++)
    if (segmentIntersectsRect(series[i], series[i + 1], r)) return true;
  return false;
}

// Pure geometry core, testable without a browser: given the content box, every
// text rect, and the sampled series polyline(s), return the list of violations:
//   - clipped: a rect extends beyond the content box
//   - overlap: two text rects intersect
//   - on-line: an ANNOTATION/label rect sits on the plotted series (text-vs-data)
export function findLabelViolations(
  content: { x: number; y: number; w: number; h: number },
  rects: TextRect[],
  series: Point[][] = [],
): string[] {
  const violations: string[] = [];
  const left = content.x - EDGE_TOLERANCE;
  const top = content.y - EDGE_TOLERANCE;
  const right = content.x + content.w + EDGE_TOLERANCE;
  const bottom = content.y + content.h + EDGE_TOLERANCE;
  for (const r of rects) {
    if (r.x < left || r.y < top || r.x + r.w > right || r.y + r.h > bottom)
      violations.push(
        `clipped: "${r.text}" extends beyond the chart content box`,
      );
  }
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      if (
        overlapArea(rects[i], rects[j]) > 0 &&
        !isDuplicateRender(rects[i], rects[j])
      )
        violations.push(
          `overlap: "${rects[i].text}" intersects "${rects[j].text}"`,
        );
  // Text-vs-data: only annotation/label rects must clear the plotted series —
  // axis ticks and title/subtitle furniture legitimately live off the plot.
  for (const r of rects) {
    if (r.kind === "furniture") continue;
    for (const line of series)
      if (rectHitsSeries(r, line)) {
        violations.push(`on-line: "${r.text}" sits on the plotted series line`);
        break;
      }
  }
  return violations;
}

// Collect the content box, every text rect, and the sampled series polyline(s)
// from a rendered Datawrapper chart page.
async function collect(page: import("playwright").Page): Promise<{
  content: { x: number; y: number; w: number; h: number };
  rects: TextRect[];
  series: Point[][];
}> {
  return page.evaluate(() => {
    // The chart's content box: the visualization container DW renders into.
    const container =
      document.querySelector(
        ".chart-body, .dw-chart-body, main, .vis-container",
      ) || document.body;
    const cb = container.getBoundingClientRect();
    const seen = new Set<Element>();
    const rects: {
      text: string;
      x: number;
      y: number;
      w: number;
      h: number;
      kind: "annotation" | "furniture";
    }[] = [];
    // Furniture = axis ticks, title, subtitle, source: these live off the plot
    // and are only clip/overlap-checked. Everything else (callouts, direct series
    // labels) is an annotation that must clear the plotted line.
    const isFurniture = (el: Element): boolean => {
      let n: Element | null = el;
      while (n) {
        const c = (n.getAttribute("class") || "") + " " + (n.tagName || "");
        if (
          /\b(tick|axis|grid|headline|description|title|subtitle|source|footer|dw-chart-header|dw-chart-footer)\b/i.test(
            c,
          )
        )
          return true;
        n = n.parentElement;
      }
      return false;
    };
    // Every leaf-ish text node: SVG <text>/<tspan> (axis ticks, direct labels),
    // and HTML text blocks. Datawrapper renders line-chart text-annotations as an
    // absolutely-positioned `span.export-text` overlay (NOT an SVG <text>), so it
    // MUST be included — missing it is exactly what let on-line annotations slip
    // past the guardrail.
    const nodes = Array.from(
      document.querySelectorAll(
        "svg text, span.export-text, .annotation, .dw-text-annotation, .headline, .description, .title, .subtitle",
      ),
    );
    for (const el of nodes) {
      const t = (el.textContent || "").trim();
      if (!t) continue;
      // Skip a parent when a child already covers the same text (avoid self-overlap).
      let anc = el.parentElement;
      let nested = false;
      while (anc) {
        if (seen.has(anc)) {
          nested = true;
          break;
        }
        anc = anc.parentElement;
      }
      if (nested) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      seen.add(el);
      rects.push({
        text: t,
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        kind: isFurniture(el) ? "furniture" : "annotation",
      });
    }

    // Series geometry: DW draws each line/area series as an SVG <path> with a
    // stroke and no fill. Sample each candidate path with getPointAtLength (path
    // user units) and map every sample through the path's own screen CTM, so the
    // result is in client px — the same coordinate space as the text rects, no
    // matter how many transformed <g> wrappers DW nests the plot in.
    const series: { x: number; y: number }[][] = [];
    const svg = document.querySelector("svg") as SVGSVGElement | null;
    if (svg) {
      const paths = Array.from(
        svg.querySelectorAll("path"),
      ) as SVGPathElement[];
      for (const p of paths) {
        const cls = (p.getAttribute("class") || "").toLowerCase();
        // Exclude axis/grid/annotation-connector paths by class when DW labels them.
        if (/axis|grid|tick|annotation|connector|arrow|legend/.test(cls))
          continue;
        // A plotted series line is stroked and unfilled; skip filled shapes and
        // strokeless paths (area fills, clip paths, decorative marks).
        const stroke = p.getAttribute("stroke") || getComputedStyle(p).stroke;
        const fill = p.getAttribute("fill") || getComputedStyle(p).fill;
        const hasStroke =
          !!stroke && stroke !== "none" && stroke !== "transparent";
        const filled = !!fill && fill !== "none" && fill !== "transparent";
        if (!hasStroke || filled) continue;
        let total = 0;
        try {
          total = p.getTotalLength();
        } catch {
          continue;
        }
        if (total < 20) continue; // decorative / marker stub
        const ctm = p.getScreenCTM();
        if (!ctm) continue;
        const steps = Math.max(24, Math.min(240, Math.round(total / 4)));
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          let q;
          try {
            q = p.getPointAtLength((total * i) / steps);
          } catch {
            break;
          }
          // Apply the CTM (path user space → screen px).
          pts.push({
            x: ctm.a * q.x + ctm.c * q.y + ctm.e,
            y: ctm.b * q.x + ctm.d * q.y + ctm.f,
          });
        }
        if (pts.length >= 2) series.push(pts);
      }
    }

    return {
      content: { x: cb.x, y: cb.y, w: cb.width, h: cb.height },
      rects,
      series,
    };
  });
}

export interface ChartGeometry {
  content: { x: number; y: number; w: number; h: number };
  rects: TextRect[];
  series: Point[][];
}

// Load a published chart and return its real rendered geometry (content box, text
// rects with kind, sampled series polylines). This is the ground truth used both
// by the guardrail and by the render-time placement correction — measuring beats
// predicting, because the plot's pixel position shifts with subtitle length, axis
// label width, etc. that a fractional model cannot know ahead of the render.
export async function measureChart(
  url: string,
  opts: { width?: number; height?: number; browser?: Browser } = {},
): Promise<ChartGeometry> {
  const width = opts.width ?? 600;
  const height = opts.height ?? 450;
  const browser = opts.browser ?? (await chromium.launch());
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector("svg text", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    const g = await collect(page);
    await page.close();
    return g;
  } finally {
    if (!opts.browser) await browser.close();
  }
}

// For an annotation text rect that sits ON the series, compute the vertical pixel
// shift (dyPx) that moves the WHOLE rect off the line into the nearer clear side,
// while staying inside the content box. Returns 0 when the rect is already clear or
// no clear side exists. Deterministic from the measured geometry.
export function resolveOnLineDy(
  rect: TextRect,
  series: Point[][],
  content: { x: number; y: number; w: number; h: number },
  gap = 6,
  others: TextRect[] = [],
): number {
  if (!series.some((line) => rectHitsSeries(rect, line))) return 0;
  // Would the rect, shifted by dy, collide with another annotation label?
  const hitsOther = (dy: number): boolean => {
    const moved: TextRect = { ...rect, y: rect.y + dy };
    return others.some((o) => overlapArea(moved, o) > 0);
  };
  // The line's vertical extent under the rect's horizontal span. Sample each
  // SEGMENT (not just its vertices) so a segment spanning the rect without a
  // vertex inside it still registers — the vertical slab the rect must clear.
  const x0 = rect.x - 1;
  const x1 = rect.x + rect.w + 1;
  let lineLo = Infinity; // smallest y (highest on screen)
  let lineHi = -Infinity; // largest y (lowest on screen)
  for (const line of series)
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i];
      const b = line[i + 1];
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const px = a.x + ((b.x - a.x) * s) / steps;
        const py = a.y + ((b.y - a.y) * s) / steps;
        if (px >= x0 && px <= x1) {
          lineLo = Math.min(lineLo, py);
          lineHi = Math.max(lineHi, py);
        }
      }
    }
  if (!Number.isFinite(lineLo)) return 0;
  // Move up so the rect BOTTOM clears lineLo, or down so its TOP clears lineHi.
  const upShift = rect.y + rect.h - (lineLo - gap); // >0 = px to move up
  const downShift = lineHi + gap - rect.y; // >0 = px to move down
  const upTop = rect.y - upShift; // rect top after moving up
  const downBottom = rect.y + rect.h + downShift; // rect bottom after moving down
  // A side is usable if it stays in the content box AND does not land on another
  // annotation label. Prefer the smaller shift, but fall back to the other side
  // when the preferred one would collide with a neighbour.
  const upOk = upTop >= content.y && !hitsOther(-upShift);
  const downOk = downBottom <= content.y + content.h && !hitsOther(downShift);
  if (upOk && (!downOk || upShift <= downShift)) return -upShift;
  if (downOk) return downShift;
  // Neither side is collision-free: take whichever at least stays in-bounds.
  if (
    upTop >= content.y &&
    (downBottom > content.y + content.h || upShift <= downShift)
  )
    return -upShift;
  if (downBottom <= content.y + content.h) return downShift;
  return upTop >= content.y ? -upShift : 0;
}

// The width every produced chart is EXPORTED at, and therefore the width the
// placement correction AND the guardrail must run at — so what is validated is
// exactly what is delivered. Datawrapper annotation dx/dy are ABSOLUTE pixel
// offsets that do NOT scale with export width, so a placement measured at one
// width and delivered at another is wrong by construction. Pin all three
// (export, measure, guardrail) to this single width. Height is the DW default
// line-chart export aspect for this width.
export const EXPORT_WIDTH = 1200;
export const EXPORT_HEIGHT = 800;

// Interpolate the series polyline's screen-y at a screen-x (the anchor point on
// the curve for a given data-x pixel). Returns undefined if x is outside the
// sampled range or there is no series.
function seriesYAtX(series: Point[][], x: number): number | undefined {
  let best: number | undefined;
  let bestDx = Infinity;
  for (const line of series) {
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i];
      const b = line[i + 1];
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      if (x < lo - 0.5 || x > hi + 0.5) continue;
      const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
      const y = a.y + t * (b.y - a.y);
      // Prefer the segment whose midpoint is closest in x (stable pick).
      const dx = Math.abs((a.x + b.x) / 2 - x);
      if (dx < bestDx) {
        bestDx = dx;
        best = y;
      }
    }
  }
  return best;
}

// Anchor-aware placement of an annotation label at the DELIVERED (measured) size.
// Given the annotation's measured rect, the pixel point on the curve it describes
// (its ANCHOR), the sampled series, the content box, and the other annotation
// rects, return the {dx,dy} pixel shift that moves the label into the nearest
// clear whitespace NEAR its anchor — never on the series, never overlapping another
// label, never clipped — keeping the connector short. Deterministic from geometry.
//
// This replaces predicting a fractional dy at one width and delivering at another:
// it measures the real render and places against real pixels, so validated ==
// delivered. Candidates ring the anchor (up / up-side / side / down-side / down),
// scored by connector length with a mild upward/sideways preference.
export function resolveAnchorPlacement(
  rect: TextRect,
  anchor: Point,
  series: Point[][],
  content: { x: number; y: number; w: number; h: number },
  others: TextRect[] = [],
  gap = 12,
): { dx: number; dy: number } {
  const w = rect.w;
  const h = rect.h;
  const cx0 = content.x;
  const cy0 = content.y;
  const cx1 = content.x + content.w;
  const cy1 = content.y + content.h;

  // A placement is valid if, once clamped into the content box, the box stays in
  // bounds, off every series line, and off every other text rect (labels + ticks).
  // Returns the accepted box or null. Bias penalises going DOWN vs UP/side so the
  // label prefers the whitespace above the curve when both are clear.
  const tryAt = (
    px: number,
    py: number,
    bias: number,
  ): { box: TextRect; score: number } | null => {
    const x = Math.min(Math.max(px, cx0), cx1 - w);
    const y = Math.min(Math.max(py, cy0), cy1 - h);
    if (
      x < cx0 - 0.5 ||
      y < cy0 - 0.5 ||
      x + w > cx1 + 0.5 ||
      y + h > cy1 + 0.5
    )
      return null;
    const box: TextRect = { text: rect.text, x, y, w, h };
    if (series.some((line) => rectHitsSeries(box, line))) return null;
    if (others.some((o) => overlapArea(box, o) > 0)) return null;
    const nx = Math.min(Math.max(anchor.x, x), x + w);
    const ny = Math.min(Math.max(anchor.y, y), y + h);
    const conn = Math.hypot(anchor.x - nx, anchor.y - ny); // connector length
    return { box, score: conn + bias };
  };

  // Sweep candidate box positions in rings of increasing radius around the anchor,
  // so we always find the NEAREST clear whitespace when any exists (a corner anchor
  // whose immediate ring is blocked by ticks still resolves — into the open area
  // further up). Eight directions per ring; up and the two upper diagonals are
  // preferred (smaller bias), down last.
  const dirs: { dx: number; dy: number; bias: number }[] = [
    { dx: 0, dy: -1, bias: 0 }, // up
    { dx: 1, dy: -1, bias: 6 }, // up-right
    { dx: -1, dy: -1, bias: 6 }, // up-left
    { dx: 1, dy: 0, bias: 14 }, // right
    { dx: -1, dy: 0, bias: 14 }, // left
    { dx: 1, dy: 1, bias: 26 }, // down-right
    { dx: -1, dy: 1, bias: 26 }, // down-left
    { dx: 0, dy: 1, bias: 30 }, // down
  ];
  let best: { box: TextRect; score: number } | null = null;
  for (let ring = 1; ring <= 14; ring++) {
    const r = gap + (ring - 1) * Math.max(h, 18); // grow by ~one line-height/ring
    for (const d of dirs) {
      // Box top-left so the anchor sits at the box's near edge/corner in direction d.
      const bx =
        d.dx === 0
          ? anchor.x - w / 2
          : d.dx > 0
            ? anchor.x + r
            : anchor.x - r - w;
      const by =
        d.dy === 0
          ? anchor.y - h / 2
          : d.dy > 0
            ? anchor.y + r
            : anchor.y - r - h;
      const cand = tryAt(bx, by, d.bias);
      if (cand && (!best || cand.score < best.score)) best = cand;
    }
    // Once a ring yields any placement, one more ring can only be farther; the
    // near-anchor requirement is satisfied, so stop expanding.
    if (best) break;
  }
  return best
    ? { dx: best.box.x - rect.x, dy: best.box.y - rect.y }
    : { dx: 0, dy: 0 };
}

// Public helper: resolve the on-curve anchor pixel for a data-x pixel. Exposed so
// produce() can map a measured annotation back to the point on the series it
// describes without duplicating the interpolation.
export function anchorOnSeries(
  series: Point[][],
  anchorX: number,
): Point | undefined {
  const y = seriesYAtX(series, anchorX);
  return y === undefined ? undefined : { x: anchorX, y };
}

export async function checkPublishedChart(
  url: string,
  opts: { width?: number; height?: number; browser?: Browser } = {},
): Promise<LabelSafetyResult> {
  const g = await measureChart(url, opts);
  const violations = findLabelViolations(g.content, g.rects, g.series);
  return { ok: violations.length === 0, violations, rects: g.rects };
}

// The representative widths the RESPONSIVE embed is validated at: a phone, a tablet
// column, and the desktop export width. A Datawrapper embed is `min-width:100%`, so
// the delivered chart re-renders at every width in this envelope — validating only at
// the export width (== the PNG) is what let labels clip/collide on mobile while the
// guardrail passed. Both bounds of the range are checked so "validated == delivered"
// holds across the whole responsive envelope, not one width.
export const RESPONSIVE_WIDTHS = [340, 600, EXPORT_WIDTH];

export interface ResponsiveSafetyResult {
  ok: boolean;
  violations: string[]; // each prefixed with the width it occurred at
  byWidth: { width: number; violations: string[] }[];
}

// Load the published chart at several widths (reusing ONE browser) and fail if any
// text clips, overlaps, or sits on the series at ANY width. This is the guardrail
// that observes the real responsive deliverable.
export async function checkResponsive(
  url: string,
  opts: { widths?: number[]; browser?: Browser } = {},
): Promise<ResponsiveSafetyResult> {
  const widths = opts.widths ?? RESPONSIVE_WIDTHS;
  const browser = opts.browser ?? (await chromium.launch());
  try {
    const byWidth: { width: number; violations: string[] }[] = [];
    for (const width of widths) {
      const height = Math.round((width * EXPORT_HEIGHT) / EXPORT_WIDTH);
      const g = await measureChart(url, { width, height, browser });
      const violations = findLabelViolations(g.content, g.rects, g.series).map(
        (v) => `@${width}px ${v}`,
      );
      byWidth.push({ width, violations });
    }
    const violations = byWidth.flatMap((b) => b.violations);
    return { ok: violations.length === 0, violations, byWidth };
  } finally {
    if (!opts.browser) await browser.close();
  }
}
